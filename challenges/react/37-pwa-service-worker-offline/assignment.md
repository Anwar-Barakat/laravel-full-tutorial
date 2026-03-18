# REACT_TEST_37 — PWA • Service Worker • Offline

**Time:** 25 minutes | **Stack:** React + TypeScript + Service Worker API

---

## Problem 01 — Progressive Web App (Medium)

Build a PWA with offline support, cache strategies, install prompt, and online/offline detection.

---

### PWA checklist

1. `manifest.json` — installability metadata
2. Service Worker — offline caching + background sync
3. HTTPS (or localhost) — required for SW registration
4. Responsive design + icons

---

### manifest.json

```json
{
  "name": "Tripz — School Trip Booking",
  "short_name": "Tripz",
  "description": "School trip booking platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/desktop.png", "sizes": "1280x720", "form_factor": "wide" },
    { "src": "/screenshots/mobile.png",  "sizes": "390x844",  "form_factor": "narrow" }
  ],
  "categories": ["education", "productivity"],
  "shortcuts": [
    {
      "name": "New Booking",
      "url": "/bookings/new",
      "icons": [{ "src": "/icons/add-192.png", "sizes": "192x192" }]
    }
  ]
}
```

**`display` values:**
- `standalone` — looks like native app (no browser UI, own window)
- `minimal-ui` — minimal browser controls visible
- `browser` — regular browser tab
- `fullscreen` — full screen, no status bar

---

### Service Worker — registration

```ts
// src/serviceWorkerRegistration.ts

export async function register() {
  if (!("serviceWorker" in navigator)) return
  // Check support — Safari added SW support in 2022; IE never had it

  try {
    const registration = await navigator.serviceWorker.register(
      "/service-worker.js",
      { scope: "/" }
      // scope: which URLs the SW controls — defaults to SW file directory
      // SW at /sw/service-worker.js would default to scope /sw/
      // Explicit "/" covers the whole app
    )

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New SW installed while old one still controlling page
          // Show "Update available" prompt to user
          dispatchEvent(new CustomEvent("sw-update-available"))
        }
      })
    })

    // Detect SW controller change (after user clicks "Update")
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload()  // reload to get new assets
    })

  } catch (err) {
    console.error("SW registration failed:", err)
  }
}

export function unregister() {
  navigator.serviceWorker.ready.then(reg => reg.unregister())
}
```

---

### Service Worker file — cache strategies

```js
// public/service-worker.js
const CACHE_VERSION = "v1"
const STATIC_CACHE  = `tripz-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `tripz-dynamic-${CACHE_VERSION}`
const API_CACHE     = `tripz-api-${CACHE_VERSION}`

// Assets to pre-cache on install (app shell)
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
]

// ---- Install: pre-cache app shell ----
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      // skipWaiting: activate immediately without waiting for old SW to be released
      // Without this: new SW waits until ALL tabs with old SW are closed
  )
})

// ---- Activate: delete old caches ----
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("tripz-") && ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      // clients.claim: take control of all open pages immediately
      // Without this: pages opened before SW activation aren't controlled until reload
  )
})

// ---- Fetch: routing strategies ----
self.addEventListener("fetch", event => {
  const { request } = event
  const url = new URL(request.url)

  // Strategy 1: Cache-First for static assets (JS, CSS, images)
  if (request.destination === "script" || request.destination === "style" || request.destination === "image") {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Strategy 2: Network-First for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Strategy 3: Stale-While-Revalidate for HTML pages
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
    return
  }
})

// Cache-First: serve from cache, fetch if miss, cache the response
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())  // clone: body stream can only be consumed once
    }
    return response
  } catch {
    // Offline + not in cache → return offline page for navigation requests
    if (request.mode === "navigate") return caches.match("/offline.html")
    return new Response("Offline", { status: 503 })
  }
}

// Network-First: try network, fall back to cache on failure
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response(JSON.stringify({ error: "offline", cached: false }), {
      headers: { "Content-Type": "application/json" },
      status: 503,
    })
  }
}

// Stale-While-Revalidate: return cache immediately, update cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached ?? await fetchPromise ?? caches.match("/offline.html")
}
```

---

### useOnlineStatus hook

```ts
// hooks/useOnlineStatus.ts
import { useSyncExternalStore } from "react"

function subscribe(callback: () => void) {
  window.addEventListener("online",  callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online",  callback)
    window.removeEventListener("offline", callback)
  }
}

function getSnapshot()        { return navigator.onLine }
function getServerSnapshot()  { return true }   // SSR: assume online

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // useSyncExternalStore: React 18's canonical way to subscribe to external stores
  // Safe for concurrent mode — no tearing
}

// Usage:
function NetworkStatus() {
  const isOnline = useOnlineStatus()

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {!isOnline && (
        <div className="offline-banner bg-red-500 text-white px-4 py-2">
          You're offline. Some features may be unavailable.
        </div>
      )}
    </div>
  )
}
```

---

### useInstallPrompt hook

```ts
// hooks/useInstallPrompt.ts
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // beforeinstallprompt fires when browser decides app is installable
    const handler = (e: Event) => {
      e.preventDefault()        // prevent browser's default mini-infobar
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)

    // appinstalled fires after successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true)
      setPromptEvent(null)
    })

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const install = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === "accepted") setIsInstalled(true)
    setPromptEvent(null)
  }

  return {
    canInstall:  !!promptEvent && !isInstalled,
    isInstalled,
    install,
  }
}
```

---

### useSWUpdate hook — update prompts

```ts
// hooks/useSWUpdate.ts
export function useSWUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    navigator.serviceWorker?.ready.then(reg => setRegistration(reg))

    const handler = () => setUpdateAvailable(true)
    window.addEventListener("sw-update-available", handler)
    return () => window.removeEventListener("sw-update-available", handler)
  }, [])

  const applyUpdate = () => {
    if (!registration?.waiting) return
    // Tell waiting SW to skip waiting and activate
    registration.waiting.postMessage({ type: "SKIP_WAITING" })
    // controllerchange event → window.location.reload()
  }

  return { updateAvailable, applyUpdate }
}

// UpdateBanner.tsx
function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useSWUpdate()
  if (!updateAvailable) return null
  return (
    <div role="alert" className="update-banner">
      A new version is available.
      <button onClick={applyUpdate}>Update now</button>
    </div>
  )
}
```

---

## Problem 02 — Advanced PWA (Hard)

Background sync, push notifications, periodic background sync, and cache management.

---

### Background Sync — queue offline mutations

```js
// In service worker:
self.addEventListener("sync", event => {
  if (event.tag === "sync-bookings") {
    event.waitUntil(syncPendingBookings())
  }
})

async function syncPendingBookings() {
  const db = await openIDB("tripz-sync-queue")
  const pending = await db.getAll("bookings")

  for (const booking of pending) {
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking.data),
      })
      if (response.ok) {
        await db.delete("bookings", booking.id)  // remove from queue on success
      }
    } catch { /* will retry on next sync */ }
  }
}

// React hook to queue bookings when offline:
export function useOfflineBookingQueue() {
  const isOnline = useOnlineStatus()

  const createBooking = async (data: BookingData) => {
    if (isOnline) {
      // Normal path
      return fetch("/api/bookings", { method: "POST", body: JSON.stringify(data) })
    }

    // Offline: store in IndexedDB, register sync
    const db = await openDB("tripz-sync-queue", 1, {
      upgrade(db) { db.createObjectStore("bookings", { keyPath: "id", autoIncrement: true }) }
    })
    await db.add("bookings", { data, queuedAt: Date.now() })

    // Register background sync — fires when connectivity restored
    const reg = await navigator.serviceWorker.ready
    await reg.sync.register("sync-bookings")
    // "sync-bookings" tag: deduped — multiple registers = one sync event

    return { queued: true }
  }

  return { createBooking }
}
```

---

### Push Notifications

```ts
// hooks/usePushNotifications.ts
const VAPID_PUBLIC_KEY = "your-vapid-public-key"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  )
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  const subscribe = async () => {
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== "granted") return

    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,      // required: all push events must show notification
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    setSubscription(sub)

    // Send subscription to server
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    })
  }

  const unsubscribe = async () => {
    if (!subscription) return
    await subscription.unsubscribe()
    await fetch("/api/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    setSubscription(null)
  }

  return { permission, subscription, subscribe, unsubscribe }
}

// Service Worker — handle push event:
// self.addEventListener("push", event => {
//   const data = event.data?.json()
//   event.waitUntil(
//     self.registration.showNotification(data.title, {
//       body:    data.body,
//       icon:    "/icons/icon-192.png",
//       badge:   "/icons/badge-96.png",
//       data:    { url: data.url },
//       actions: [
//         { action: "view",    title: "View Booking" },
//         { action: "dismiss", title: "Dismiss"      },
//       ],
//     })
//   )
// })
//
// self.addEventListener("notificationclick", event => {
//   event.notification.close()
//   if (event.action === "view") {
//     event.waitUntil(clients.openWindow(event.notification.data.url))
//   }
// })
```

---

### Periodic Background Sync

```ts
// Register (requires user engagement + "periodic-background-sync" permission):
const registration = await navigator.serviceWorker.ready
const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName })

if (status.state === "granted") {
  await registration.periodicSync.register("check-booking-updates", {
    minInterval: 24 * 60 * 60 * 1000,  // minimum 24 hours (browser may extend)
  })
}

// Service worker — handle periodic sync:
// self.addEventListener("periodicsync", event => {
//   if (event.tag === "check-booking-updates") {
//     event.waitUntil(checkForBookingUpdates())
//   }
// })
```

---

### Cache management — storage quota

```ts
// hooks/useCacheManagement.ts
export function useCacheManagement() {
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)

  useEffect(() => {
    navigator.storage?.estimate().then(({ usage = 0, quota = 0 }) => {
      setUsage({ used: usage, quota })
    })
  }, [])

  const clearCache = async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k)))
    setUsage(prev => prev ? { ...prev, used: 0 } : null)
  }

  const requestPersistence = async () => {
    // Request persistent storage — prevents browser from evicting cache
    if (navigator.storage?.persist) {
      const granted = await navigator.storage.persist()
      // granted: true = browser won't evict; false = still evictable
      return granted
    }
    return false
  }

  return { usage, clearCache, requestPersistence }
}
```

---

### Vite PWA plugin (production setup)

```ts
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",  // "autoUpdate" | "prompt"
      // autoUpdate: SW updates silently in background
      // prompt: fires custom event → show your own update banner
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.tripz\.com\/bookings/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },  // 1 hour
              networkTimeoutSeconds: 10,  // fall back to cache after 10s timeout
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },  // 30 days
            },
          },
        ],
      },
      manifest: {
        name: "Tripz",
        short_name: "Tripz",
        theme_color: "#3b82f6",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
})
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `skipWaiting()` | New SW activates immediately (don't wait for all tabs to close) |
| `clients.claim()` | Take control of open pages without reload after activation |
| `event.waitUntil()` | Extend SW event lifetime until promise resolves |
| `response.clone()` | Body is a stream — clone before caching AND consuming |
| Cache-First | Static assets (CSS/JS/images) — fast, serve stale |
| Network-First | API data — fresh preferred, cache as fallback |
| Stale-While-Revalidate | HTML pages — show cache instantly, update in background |
| `beforeinstallprompt` | Capture to show custom install button — `e.preventDefault()` first |
| `display: standalone` | Detect running as installed PWA via `matchMedia` |
| `useSyncExternalStore` | React 18 canonical pattern for external event subscriptions |
| Background Sync | `reg.sync.register(tag)` — retries failed requests when online |
| Push subscription | `userVisibleOnly: true` — browser requires notification shown per push |
| `navigator.storage.estimate()` | Check cache storage usage and quota |
| `navigator.storage.persist()` | Request browser not to evict cache |
