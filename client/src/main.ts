import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import "./assets/main.css";
import { useAnalytics } from "./composables/useAnalytics";
import { initializeErrorReporting } from "./composables/useErrorReporting";
import { usePerformanceMonitoring } from "./composables/usePerformanceMonitoring";
import { useServiceWorker } from "./composables/useServiceWorker";
import { router } from "./routes";
import { logAccessibilityReport } from "./utils/accessibilityTesting";

// Initialize global error reporting
initializeErrorReporting();

// Initialize service worker for offline support and caching
const { register: registerSW, precacheRoutes } = useServiceWorker();
registerSW().then(() => {
  // Pre-cache important routes
  precacheRoutes(["/", "/firestarter", "/votes", "/account"]);
});

// Initialize performance monitoring
const { startMonitoring, measureRouteChange } = usePerformanceMonitoring({
  reportingEndpoint: import.meta.env.VITE_PERFORMANCE_ENDPOINT,
  enableWebVitals: true,
  enableMemoryMonitoring: true,
  reportingInterval: 60000 // 1 minute
});

// Initialize analytics
const { initialize: initAnalytics, trackPageView } = useAnalytics({
  endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
  enabled: import.meta.env.MODE === "production"
});

const app = createApp(App);
const pinia = createPinia();

// Global error handler for Vue app
app.config.errorHandler = (error: unknown, instance: any, info: string) => {
  import("./composables/useErrorReporting").then(({ useErrorReporting }) => {
    const { reportError } = useErrorReporting();

    reportError(error as Error, {
      component: instance?.$options.name || "Unknown",
      info,
      level: "error",
      type: "vue-error"
    });
  });

  console.error("Vue Error:", error, info);
};

// Global warning handler for development
if (import.meta.env.MODE === "development") {
  app.config.warnHandler = (msg: string, instance: any, trace: string) => {
    console.warn("Vue Warning:", msg, trace);
  };
}

app.use(pinia);
app.use(router);

// Set up router monitoring
router.beforeEach((to, from, next) => {
  const finishMeasurement = measureRouteChange(to.name?.toString() || to.path);

  // Store measurement function for after navigation
  (window as any).__routeMeasurement = finishMeasurement;

  next();
});

router.afterEach((to, from) => {
  // Complete route measurement
  if ((window as any).__routeMeasurement) {
    (window as any).__routeMeasurement();
    delete (window as any).__routeMeasurement;
  }

  // Track page view
  trackPageView(to.path);
});

// Initialize monitoring after app setup
Promise.resolve().then(() => {
  startMonitoring();
  initAnalytics();

  // Run accessibility testing in development
  if (import.meta.env.MODE === "development") {
    // Wait for initial render
    setTimeout(() => {
      logAccessibilityReport();
    }, 2000);
  }
});

app.mount("#app");
