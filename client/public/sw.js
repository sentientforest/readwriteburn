// Service Worker for ReadWriteBurn dApp
// Provides offline capabilities and caching strategies

const CACHE_NAME = "readwriteburn-v1";
const RUNTIME_CACHE = "readwriteburn-runtime-v1";

// Assets to cache on install
const STATIC_ASSETS = ["/", "/index.html", "/assets/main.css"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("Service Worker: Skip waiting on install");
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Claiming clients");
        self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip requests to external domains (except for specific APIs)
  if (url.origin !== location.origin && !isAllowedExternal(url)) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(navigationHandler(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache strategies

// Cache First - for static assets
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("Cache First failed:", error);
    throw error;
  }
}

// Network First - for API requests
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log("Network First fallback to cache:", request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate - for other resources
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn("Stale While Revalidate fetch failed:", error);
      return cached;
    });

  return cached || fetchPromise;
}

// Navigation handler - serve index.html for SPA routes
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      return response;
    }
  } catch (error) {
    console.log("Navigation handler fallback to index.html");
  }

  // Fallback to cached index.html for SPA routing
  const cache = await caches.open(CACHE_NAME);
  return cache.match("/index.html") || cache.match("/");
}

// Helper functions

function isStaticAsset(url) {
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isApiRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.host.includes("localhost:4000") ||
    url.host.includes("localhost:3000")
  );
}

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept").includes("text/html"))
  );
}

function isAllowedExternal(url) {
  // Allow specific external domains for API calls
  const allowedDomains = [
    "localhost:4000", // Local server
    "localhost:3000" // GalaChain local
  ];

  return allowedDomains.some((domain) => url.host.includes(domain));
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered:", event.tag);

  if (event.tag === "background-sync-votes") {
    event.waitUntil(syncPendingVotes());
  }

  if (event.tag === "background-sync-submissions") {
    event.waitUntil(syncPendingSubmissions());
  }
});

// Sync pending votes when back online
async function syncPendingVotes() {
  console.log("Service Worker: Syncing pending votes");
  // Implementation would sync votes stored locally while offline
  // This is a placeholder for the actual sync logic
}

// Sync pending submissions when back online
async function syncPendingSubmissions() {
  console.log("Service Worker: Syncing pending submissions");
  // Implementation would sync submissions stored locally while offline
  // This is a placeholder for the actual sync logic
}

// Push notifications (for future enhancement)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: data.tag || "default",
        data: data.data || {}
      })
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});

console.log("Service Worker: ReadWriteBurn SW loaded");
