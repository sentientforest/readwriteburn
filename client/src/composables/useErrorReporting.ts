import { ref } from "vue";

export interface ErrorReport {
  message: string;
  stack?: string;
  component?: string;
  userAgent?: string;
  timestamp?: string;
  url?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  maxReports: number;
  throttleMs: number;
}

const config: ErrorReportingConfig = {
  enabled: import.meta.env.MODE === "production",
  endpoint: import.meta.env.VITE_ERROR_REPORTING_ENDPOINT,
  maxReports: 50,
  throttleMs: 5000
};

// In-memory error storage for development
const errorStore = ref<ErrorReport[]>([]);
const reportCount = ref(0);
const lastReportTime = ref<Record<string, number>>({});

export function useErrorReporting() {
  function reportError(error: Error | string, metadata: Record<string, any> = {}) {
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorStack = typeof error === "string" ? undefined : error.stack;

    // Throttle duplicate errors
    const errorKey = `${errorMessage}-${metadata.component || "unknown"}`;
    const now = Date.now();

    if (lastReportTime.value[errorKey] && now - lastReportTime.value[errorKey] < config.throttleMs) {
      return; // Skip duplicate error within throttle window
    }

    lastReportTime.value[errorKey] = now;

    // Check rate limit
    if (reportCount.value >= config.maxReports) {
      console.warn("Error reporting rate limit exceeded");
      return;
    }

    const report: ErrorReport = {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...metadata
    };

    // Store error locally
    errorStore.value.unshift(report);
    if (errorStore.value.length > 100) {
      errorStore.value = errorStore.value.slice(0, 100);
    }

    reportCount.value++;

    // Log to console in development
    if (import.meta.env.MODE === "development") {
      console.group("🚨 Error Report");
      console.error("Message:", errorMessage);
      console.error("Stack:", errorStack);
      console.table(metadata);
      console.groupEnd();
    }

    // Send to external service in production
    if (config.enabled && config.endpoint) {
      sendErrorReport(report).catch((sendError) => {
        console.error("Failed to send error report:", sendError);
      });
    }
  }

  async function sendErrorReport(report: ErrorReport): Promise<void> {
    if (!config.endpoint) return;

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        throw new Error(`Error reporting failed: ${response.status}`);
      }
    } catch (error) {
      // Don't create infinite loop by reporting error reporting failures
      console.error("Error reporting service failed:", error);
    }
  }

  function getErrorHistory(): ErrorReport[] {
    return [...errorStore.value];
  }

  function clearErrorHistory(): void {
    errorStore.value = [];
    reportCount.value = 0;
    lastReportTime.value = {};
  }

  function getErrorStats() {
    const errors = errorStore.value;
    const errorCounts = errors.reduce(
      (acc, error) => {
        const key = error.component || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalErrors: errors.length,
      recentErrors: errors.filter(
        (e) => Date.now() - new Date(e.timestamp || 0).getTime() < 3600000 // Last hour
      ).length,
      errorsByComponent: errorCounts,
      reportCount: reportCount.value,
      rateLimited: reportCount.value >= config.maxReports
    };
  }

  // Global error handler setup
  function setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      reportError(event.reason || "Unhandled Promise Rejection", {
        component: "GlobalHandler",
        type: "unhandledrejection",
        promise: event.promise.toString()
      });
    });

    // Handle global JavaScript errors
    window.addEventListener("error", (event) => {
      reportError(event.error || event.message, {
        component: "GlobalHandler",
        type: "javascript",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle resource loading errors
    window.addEventListener(
      "error",
      (event) => {
        if (event.target && event.target !== window) {
          const target = event.target as HTMLElement;
          reportError("Resource loading failed", {
            component: "GlobalHandler",
            type: "resource",
            tagName: target.tagName,
            src: (target as any).src || (target as any).href,
            outerHTML: target.outerHTML?.substring(0, 200)
          });
        }
      },
      true
    );
  }

  return {
    reportError,
    getErrorHistory,
    clearErrorHistory,
    getErrorStats,
    setupGlobalErrorHandling,
    config
  };
}

// Auto-setup global error handling
export function initializeErrorReporting() {
  const { setupGlobalErrorHandling } = useErrorReporting();
  setupGlobalErrorHandling();
}
