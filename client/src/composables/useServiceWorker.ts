import { onMounted, ref } from "vue";

export interface ServiceWorkerState {
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const state = ref<ServiceWorkerState>({
    isRegistered: false,
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null
  });

  const isSupported = "serviceWorker" in navigator;

  async function register() {
    if (!isSupported) {
      console.warn("Service Worker not supported");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/"
      });

      state.value.registration = registration;
      state.value.isRegistered = true;

      console.log("Service Worker registered:", registration);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              state.value.isUpdateAvailable = true;
              console.log("Service Worker update available");
            }
          });
        }
      });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("Service Worker controller changed - reloading");
        window.location.reload();
      });

      return true;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return false;
    }
  }

  async function update() {
    if (!state.value.registration) {
      console.warn("No service worker registration found");
      return;
    }

    try {
      await state.value.registration.update();
      console.log("Service Worker update check completed");
    } catch (error) {
      console.error("Service Worker update failed:", error);
    }
  }

  async function skipWaiting() {
    if (!state.value.registration?.waiting) {
      console.warn("No waiting service worker found");
      return;
    }

    // Tell the waiting service worker to skip waiting
    state.value.registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  function setupOfflineDetection() {
    const updateOnlineStatus = () => {
      state.value.isOffline = !navigator.onLine;
      console.log("Network status:", navigator.onLine ? "online" : "offline");
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Cleanup function
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }

  // Background sync for offline actions
  async function backgroundSync(tag: string, data: any) {
    if (!state.value.registration || !("sync" in window.ServiceWorkerRegistration.prototype)) {
      console.warn("Background sync not supported");
      return false;
    }

    try {
      // Store data locally for sync when online
      localStorage.setItem(
        `sync_${tag}`,
        JSON.stringify({
          tag,
          data,
          timestamp: Date.now()
        })
      );

      // Register for background sync
      await state.value.registration.sync.register(tag);
      console.log("Background sync registered:", tag);
      return true;
    } catch (error) {
      console.error("Background sync registration failed:", error);
      return false;
    }
  }

  // Get cached data for offline scenarios
  async function getCachedData(url: string) {
    if (!("caches" in window)) {
      return null;
    }

    try {
      const cache = await caches.open("readwriteburn-runtime-v1");
      const response = await cache.match(url);

      if (response) {
        return response.json();
      }

      return null;
    } catch (error) {
      console.error("Failed to get cached data:", error);
      return null;
    }
  }

  // Pre-cache important routes/data
  async function precacheRoutes(routes: string[]) {
    if (!("caches" in window)) {
      return false;
    }

    try {
      const cache = await caches.open("readwriteburn-v1");

      const cachePromises = routes.map(async (route) => {
        try {
          const response = await fetch(route);
          if (response.ok) {
            await cache.put(route, response);
            console.log("Precached route:", route);
          }
        } catch (error) {
          console.warn("Failed to precache route:", route, error);
        }
      });

      await Promise.allSettled(cachePromises);
      return true;
    } catch (error) {
      console.error("Precaching failed:", error);
      return false;
    }
  }

  // Show install prompt for PWA
  function setupInstallPrompt() {
    let deferredPrompt: any = null;

    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("Install prompt available");
      e.preventDefault();
      deferredPrompt = e;
    });

    const showInstallPrompt = async () => {
      if (!deferredPrompt) {
        console.log("Install prompt not available");
        return false;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install prompt outcome:", outcome);

      deferredPrompt = null;
      return outcome === "accepted";
    };

    return { showInstallPrompt };
  }

  onMounted(() => {
    if (isSupported) {
      register();
      const cleanup = setupOfflineDetection();

      // Cleanup on unmount
      return cleanup;
    }
  });

  return {
    state,
    isSupported,
    register,
    update,
    skipWaiting,
    backgroundSync,
    getCachedData,
    precacheRoutes,
    setupInstallPrompt
  };
}
