import { onMounted, ref } from "vue";

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export interface UserSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  pageViews: number;
  events: AnalyticsEvent[];
  userAgent: string;
  referrer: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number; // ms
  sessionTimeout: number; // ms
  trackPageViews: boolean;
  trackClicks: boolean;
  trackFormSubmissions: boolean;
  trackErrors: boolean;
}

const defaultConfig: AnalyticsConfig = {
  enabled: import.meta.env.MODE === "production",
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  sessionTimeout: 1800000, // 30 minutes
  trackPageViews: true,
  trackClicks: true,
  trackFormSubmissions: true,
  trackErrors: true
};

export function useAnalytics(config: Partial<AnalyticsConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  const session = ref<UserSession | null>(null);
  const eventQueue = ref<AnalyticsEvent[]>([]);
  const isInitialized = ref(false);

  let flushInterval: NodeJS.Timeout | null = null;
  let activityTimeout: NodeJS.Timeout | null = null;

  // Generate session ID
  function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize session
  function initializeSession() {
    session.value = {
      sessionId: generateSessionId(),
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      events: [],
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    // Store session in localStorage for persistence
    localStorage.setItem(
      "analytics_session",
      JSON.stringify({
        sessionId: session.value.sessionId,
        startTime: session.value.startTime.toISOString()
      })
    );
  }

  // Restore session from localStorage
  function restoreSession(): boolean {
    try {
      const stored = localStorage.getItem("analytics_session");
      if (!stored) return false;

      const sessionData = JSON.parse(stored);
      const startTime = new Date(sessionData.startTime);
      const timeSinceStart = Date.now() - startTime.getTime();

      // Check if session is still valid
      if (timeSinceStart < finalConfig.sessionTimeout) {
        session.value = {
          sessionId: sessionData.sessionId,
          startTime,
          lastActivity: new Date(),
          pageViews: 0,
          events: [],
          userAgent: navigator.userAgent,
          referrer: document.referrer
        };
        return true;
      }
    } catch (error) {
      console.warn("Failed to restore analytics session:", error);
    }

    return false;
  }

  // Track event
  function track(eventName: string, properties: Record<string, any> = {}) {
    if (!finalConfig.enabled || !session.value) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        page_url: window.location.href,
        page_title: document.title,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight
      },
      timestamp: new Date().toISOString(),
      sessionId: session.value.sessionId
    };

    eventQueue.value.push(event);
    session.value.events.push(event);
    session.value.lastActivity = new Date();

    // Auto-flush if batch size reached
    if (eventQueue.value.length >= finalConfig.batchSize) {
      flushEvents();
    }

    // Reset activity timeout
    resetActivityTimeout();
  }

  // Track page view
  function trackPageView(path?: string) {
    if (!finalConfig.trackPageViews) return;

    const properties = {
      path: path || window.location.pathname,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer
    };

    if (session.value) {
      session.value.pageViews++;
      properties.session_page_views = session.value.pageViews;
    }

    track("page_view", properties);
  }

  // Track user engagement
  function trackEngagement(type: string, target?: string, value?: any) {
    track("user_engagement", {
      engagement_type: type,
      target_element: target,
      value
    });
  }

  // Track wallet interactions
  function trackWalletEvent(action: string, details: Record<string, any> = {}) {
    track("wallet_interaction", {
      action,
      ...details
    });
  }

  // Track fire/submission interactions
  function trackContentEvent(action: string, contentType: string, details: Record<string, any> = {}) {
    track("content_interaction", {
      action,
      content_type: contentType,
      ...details
    });
  }

  // Track voting events
  function trackVoteEvent(action: string, details: Record<string, any> = {}) {
    track("vote_interaction", {
      action,
      ...details
    });
  }

  // Track errors
  function trackError(error: Error | string, context: Record<string, any> = {}) {
    if (!finalConfig.trackErrors) return;

    const errorMessage = typeof error === "string" ? error : error.message;
    const errorStack = typeof error === "string" ? undefined : error.stack;

    track("error_occurred", {
      error_message: errorMessage,
      error_stack: errorStack,
      ...context
    });
  }

  // Flush events to endpoint
  async function flushEvents() {
    if (eventQueue.value.length === 0 || !finalConfig.endpoint) {
      return;
    }

    const events = [...eventQueue.value];
    eventQueue.value = [];

    try {
      const payload = {
        events,
        session: session.value,
        timestamp: new Date().toISOString()
      };

      await fetch(finalConfig.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log(`Flushed ${events.length} analytics events`);
    } catch (error) {
      console.warn("Failed to send analytics events:", error);
      // Re-queue events for retry
      eventQueue.value.unshift(...events);
    }
  }

  // Reset activity timeout
  function resetActivityTimeout() {
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }

    activityTimeout = setTimeout(() => {
      track("session_timeout");
      flushEvents();
    }, finalConfig.sessionTimeout);
  }

  // Set up automatic tracking
  function setupAutoTracking() {
    if (!finalConfig.enabled) return;

    // Track clicks
    if (finalConfig.trackClicks) {
      document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        if (target) {
          const properties: Record<string, any> = {
            tag_name: target.tagName.toLowerCase(),
            element_id: target.id || undefined,
            element_classes: target.className || undefined,
            element_text: target.textContent?.substring(0, 100) || undefined
          };

          // Special handling for links
          if (target.tagName === "A") {
            properties.link_url = (target as HTMLAnchorElement).href;
          }

          // Special handling for buttons
          if (target.tagName === "BUTTON" || target.type === "button") {
            properties.button_type = target.type;
          }

          track("click", properties);
        }
      });
    }

    // Track form submissions
    if (finalConfig.trackFormSubmissions) {
      document.addEventListener("submit", (event) => {
        const form = event.target as HTMLFormElement;
        if (form) {
          track("form_submit", {
            form_id: form.id || undefined,
            form_action: form.action || undefined,
            form_method: form.method || "get"
          });
        }
      });
    }

    // Track page visibility changes
    document.addEventListener("visibilitychange", () => {
      track("page_visibility_change", {
        visible: !document.hidden
      });
    });

    // Track beforeunload for session end
    window.addEventListener("beforeunload", () => {
      track("session_end");
      flushEvents();
    });
  }

  // Initialize analytics
  function initialize() {
    if (isInitialized.value || !finalConfig.enabled) return;

    // Try to restore existing session, otherwise create new one
    if (!restoreSession()) {
      initializeSession();
    }

    setupAutoTracking();

    // Set up periodic flushing
    flushInterval = setInterval(flushEvents, finalConfig.flushInterval);

    isInitialized.value = true;

    // Track initial page view
    trackPageView();

    console.log("Analytics initialized with session:", session.value?.sessionId);
  }

  // Cleanup
  function cleanup() {
    if (flushInterval) {
      clearInterval(flushInterval);
      flushInterval = null;
    }

    if (activityTimeout) {
      clearTimeout(activityTimeout);
      activityTimeout = null;
    }

    // Flush remaining events
    flushEvents();

    isInitialized.value = false;
  }

  // Get session info
  function getSessionInfo() {
    return session.value
      ? {
          sessionId: session.value.sessionId,
          duration: Date.now() - session.value.startTime.getTime(),
          pageViews: session.value.pageViews,
          eventCount: session.value.events.length
        }
      : null;
  }

  // Auto-initialize on mount
  onMounted(() => {
    if (typeof window !== "undefined") {
      initialize();
    }
  });

  return {
    session,
    eventQueue,
    isInitialized,
    track,
    trackPageView,
    trackEngagement,
    trackWalletEvent,
    trackContentEvent,
    trackVoteEvent,
    trackError,
    flushEvents,
    initialize,
    cleanup,
    getSessionInfo
  };
}
