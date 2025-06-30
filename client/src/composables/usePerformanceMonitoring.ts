import { onMounted, onUnmounted, ref } from "vue";

export interface PerformanceMetrics {
  // Core Web Vitals
  CLS: number | null; // Cumulative Layout Shift
  FID: number | null; // First Input Delay
  LCP: number | null; // Largest Contentful Paint
  FCP: number | null; // First Contentful Paint
  TTFB: number | null; // Time to First Byte

  // Custom metrics
  bundleSize: number | null;
  memoryUsage: number | null;
  loadTime: number | null;
  routeChangeTime: number | null;
  apiResponseTimes: Record<string, number>;
  errorCount: number;
  userInteractions: number;
}

export interface PerformanceConfig {
  enableWebVitals: boolean;
  enableMemoryMonitoring: boolean;
  enableRouteMonitoring: boolean;
  enableApiMonitoring: boolean;
  reportingEndpoint?: string;
  reportingInterval: number; // ms
  sampleRate: number; // 0-1
}

const defaultConfig: PerformanceConfig = {
  enableWebVitals: true,
  enableMemoryMonitoring: true,
  enableRouteMonitoring: true,
  enableApiMonitoring: true,
  reportingInterval: 30000, // 30 seconds
  sampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0
};

export function usePerformanceMonitoring(config: Partial<PerformanceConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  const metrics = ref<PerformanceMetrics>({
    CLS: null,
    FID: null,
    LCP: null,
    FCP: null,
    TTFB: null,
    bundleSize: null,
    memoryUsage: null,
    loadTime: null,
    routeChangeTime: null,
    apiResponseTimes: {},
    errorCount: 0,
    userInteractions: 0
  });

  const isMonitoring = ref(false);
  let reportingInterval: NodeJS.Timeout | null = null;
  let performanceObserver: PerformanceObserver | null = null;

  // Check if we should monitor this session
  function shouldMonitor(): boolean {
    return Math.random() < finalConfig.sampleRate;
  }

  // Initialize Web Vitals monitoring
  function initWebVitals() {
    if (!finalConfig.enableWebVitals || !("PerformanceObserver" in window)) {
      return;
    }

    try {
      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        metrics.value.LCP = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

      // FCP (First Contentful Paint)
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            metrics.value.FCP = entry.startTime;
          }
        });
      });
      fcpObserver.observe({ entryTypes: ["paint"] });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            metrics.value.CLS = clsValue;
          }
        }
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          metrics.value.FID = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (error) {
      console.warn("Web Vitals monitoring failed to initialize:", error);
    }
  }

  // Monitor memory usage
  function updateMemoryUsage() {
    if (!finalConfig.enableMemoryMonitoring || !("memory" in performance)) {
      return;
    }

    try {
      const memory = (performance as any).memory;
      metrics.value.memoryUsage = memory.usedJSHeapSize;
    } catch (error) {
      console.warn("Memory monitoring failed:", error);
    }
  }

  // Monitor navigation timing
  function updateNavigationTiming() {
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.value.TTFB = navigation.responseStart - navigation.fetchStart;
        metrics.value.loadTime = navigation.loadEventEnd - navigation.fetchStart;
      }
    } catch (error) {
      console.warn("Navigation timing monitoring failed:", error);
    }
  }

  // Monitor API performance
  function monitorApiCalls() {
    if (!finalConfig.enableApiMonitoring) return;

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const startTime = performance.now();
      const url = typeof input === "string" ? input : input.toString();

      try {
        const response = await originalFetch(input, init);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Extract endpoint for grouping
        const endpoint = url.replace(/\/\d+/g, "/:id").split("?")[0];
        metrics.value.apiResponseTimes[endpoint] = duration;

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endpoint = url.replace(/\/\d+/g, "/:id").split("?")[0];
        metrics.value.apiResponseTimes[`${endpoint}_error`] = duration;
        throw error;
      }
    };
  }

  // Monitor user interactions
  function monitorUserInteractions() {
    const interactionEvents = ["click", "keydown", "scroll", "touchstart"];

    interactionEvents.forEach((eventType) => {
      document.addEventListener(
        eventType,
        () => {
          metrics.value.userInteractions++;
        },
        { passive: true }
      );
    });
  }

  // Get performance score
  function getPerformanceScore(): number {
    let score = 100;

    // LCP scoring (0-4s scale)
    if (metrics.value.LCP) {
      if (metrics.value.LCP > 4000) score -= 25;
      else if (metrics.value.LCP > 2500) score -= 15;
    }

    // FID scoring (0-300ms scale)
    if (metrics.value.FID) {
      if (metrics.value.FID > 300) score -= 25;
      else if (metrics.value.FID > 100) score -= 15;
    }

    // CLS scoring (0-0.25 scale)
    if (metrics.value.CLS) {
      if (metrics.value.CLS > 0.25) score -= 25;
      else if (metrics.value.CLS > 0.1) score -= 15;
    }

    // API performance impact
    const apiTimes = Object.values(metrics.value.apiResponseTimes);
    const avgApiTime = apiTimes.length > 0 ? apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length : 0;

    if (avgApiTime > 2000) score -= 15;
    else if (avgApiTime > 1000) score -= 10;

    return Math.max(0, score);
  }

  // Report metrics
  async function reportMetrics() {
    if (!finalConfig.reportingEndpoint) {
      console.log("Performance Metrics:", metrics.value);
      return;
    }

    try {
      const report = {
        ...metrics.value,
        performanceScore: getPerformanceScore(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        connectionType: (navigator as any).connection?.effectiveType || "unknown"
      };

      await fetch(finalConfig.reportingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.warn("Failed to report performance metrics:", error);
    }
  }

  // Start monitoring
  function startMonitoring() {
    if (!shouldMonitor() || isMonitoring.value) return;

    isMonitoring.value = true;

    initWebVitals();
    updateNavigationTiming();
    monitorApiCalls();
    monitorUserInteractions();

    // Set up periodic reporting
    reportingInterval = setInterval(() => {
      updateMemoryUsage();
      reportMetrics();
    }, finalConfig.reportingInterval);

    // Report initial metrics after page load
    setTimeout(() => {
      updateMemoryUsage();
      reportMetrics();
    }, 2000);
  }

  // Stop monitoring
  function stopMonitoring() {
    isMonitoring.value = false;

    if (reportingInterval) {
      clearInterval(reportingInterval);
      reportingInterval = null;
    }

    if (performanceObserver) {
      performanceObserver.disconnect();
      performanceObserver = null;
    }
  }

  // Measure route change performance
  function measureRouteChange(routeName: string) {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      metrics.value.routeChangeTime = endTime - startTime;
      console.log(`Route change to ${routeName}: ${metrics.value.routeChangeTime.toFixed(2)}ms`);
    };
  }

  // Measure component render time
  function measureComponentRender(componentName: string) {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      return renderTime;
    };
  }

  // Get current metrics snapshot
  function getCurrentMetrics(): PerformanceMetrics {
    updateMemoryUsage();
    return { ...metrics.value };
  }

  // Initialize on mount
  onMounted(() => {
    if (typeof window !== "undefined") {
      startMonitoring();
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring();
  });

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    measureRouteChange,
    measureComponentRender,
    getCurrentMetrics,
    getPerformanceScore,
    reportMetrics
  };
}
