// ============================================================
// Problem 02 — Advanced PWA
// ============================================================



// ============================================================
// Background Sync — queue offline mutations
//
// Registration (main thread):
//   const reg = await navigator.serviceWorker.ready
//   await reg.sync.register("sync-bookings")
//   ← deduped by tag — multiple registers = one sync event fired
//   ← browser fires sync event when connectivity is restored
//
// Queue in IndexedDB when offline:
//   const db = await openDB("tripz-sync-queue", 1, { upgrade... })
//   await db.add("bookings", { data: bookingData, queuedAt: Date.now() })
//   await reg.sync.register("sync-bookings")
//
// SW handles "sync" event:
//   self.addEventListener("sync", event => {
//     if event.tag === "sync-bookings":
//       event.waitUntil(syncPendingBookings())
//   })
//
//   syncPendingBookings():
//     pending = await db.getAll("bookings")
//     for each: fetch POST → if ok: db.delete(booking.id)
//     ← if fetch fails: leaves in queue, SW retries on next sync
//
// useOfflineBookingQueue:
//   isOnline: use useOnlineStatus()
//   createBooking: if online → fetch; else → IDB + sync.register
// ============================================================



// ============================================================
// Push Notifications
//
// Permission request:
//   const perm = await Notification.requestPermission()
//   ← "granted" | "denied" | "default"
//   ← "denied": can't re-prompt, direct user to browser settings
//
// Subscribe:
//   const sub = await registration.pushManager.subscribe({
//     userVisibleOnly: true,           ← required: every push must show notification
//     applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
//   })
//   Send sub.toJSON() to server → server sends pushes to this endpoint
//
// VAPID key conversion:
//   urlBase64ToUint8Array(base64): Uint8Array
//   ← URL-safe base64 → Uint8Array (required by pushManager.subscribe)
//
// Unsubscribe:
//   await subscription.unsubscribe()
//   notify server to remove endpoint
//
// SW — push event handler:
//   self.addEventListener("push", event => {
//     const data = event.data?.json()
//     event.waitUntil(
//       self.registration.showNotification(data.title, {
//         body:    data.body,
//         icon:    "/icons/icon-192.png",
//         badge:   "/icons/badge-96.png",
//         data:    { url: data.url },
//         actions: [{ action:"view", title:"View Booking" }]
//       })
//     )
//   })
//
//   notificationclick:
//     event.notification.close()
//     if action === "view": clients.openWindow(notification.data.url)
// ============================================================



// ============================================================
// Periodic Background Sync
//
// Check permission first:
//   const status = await navigator.permissions.query({
//     name: "periodic-background-sync" as PermissionName
//   })
//   if status.state !== "granted": return
//
// Register:
//   await registration.periodicSync.register("check-booking-updates", {
//     minInterval: 24 * 60 * 60 * 1000   ← 24h minimum (browser may extend)
//   })
//
// SW handles "periodicsync" event:
//   if event.tag === "check-booking-updates":
//     event.waitUntil(fetchUpdatesAndNotify())
//
// Requirements for periodic sync:
//   - User must have engaged with site (visits, interactions)
//   - Permission granted
//   - Chrome/Android only (not Safari or Firefox yet)
// ============================================================



// ============================================================
// Cache management — storage quota
//
// navigator.storage.estimate():
//   → { usage: bytes used, quota: bytes available }
//   Show as: `${(usage/1024/1024).toFixed(1)} MB / ${(quota/1024/1024).toFixed(0)} MB`
//
// Clear cache:
//   caches.keys() → Promise.all(keys.map(k => caches.delete(k)))
//
// Request persistent storage:
//   navigator.storage.persist()
//   → true: browser won't evict under storage pressure
//   → false: still evictable (LRU under low disk space)
//   Criteria: user has bookmarked the site, granted notifications, high engagement
//
// Cache eviction order (without persist):
//   Browser evicts least-recently-used origins first under storage pressure
//   SW caches are origin-scoped — one site's cache doesn't affect another
// ============================================================



// ============================================================
// Vite PWA plugin (vite-plugin-pwa)
//
// registerType: "autoUpdate"
//   ← new SW installed silently, reloads when idle
//   vs "prompt": fires sw-update-available event for custom banner
//
// workbox.runtimeCaching:
//   urlPattern: regex matching request URL
//   handler: "NetworkFirst" | "CacheFirst" | "StaleWhileRevalidate" | "NetworkOnly" | "CacheOnly"
//   options.expiration: maxEntries + maxAgeSeconds
//   options.networkTimeoutSeconds: fall back to cache after N seconds
//
// globPatterns: files to pre-cache (app shell)
//   "**/*.{js,css,html,ico,png,svg,woff2}"
//
// workbox handles:
//   - Precache manifest generation with content hashes
//   - Cache versioning and cleanup
//   - Import of workbox libraries into generated SW
// ============================================================



// ============================================================
// Key concepts
//
// SW update flow:
//   1. Browser detects new SW file (byte-change check)
//   2. New SW enters "installing" state → install event fires
//   3. New SW enters "waiting" state (old SW still active)
//   4. skipWaiting() or all tabs close → new SW "activates"
//   5. activate event fires → clean old caches → clients.claim()
//   6. New SW controls all pages
//
// Why clone() responses:
//   Response body is a ReadableStream — consumed ONCE
//   If you cache.put() without cloning, you can't return it to browser
//   Always: cache.put(req, response.clone()); return response
//
// SW security:
//   Only runs on HTTPS (localhost exception)
//   Same origin — can't intercept other domains
//   No CORS override — still subject to CORS for cross-origin fetches
//
// Cache-Control vs SW cache:
//   SW cache is SEPARATE from HTTP cache
//   SW intercepts all fetches — bypasses HTTP cache
//   SW can implement its own expiry via maxAgeSeconds
//
// Testing SW:
//   Chrome DevTools → Application → Service Workers
//   "Update on reload" checkbox for development
//   "Offline" checkbox to test offline behaviour
//   Clear cache via Application → Storage → Clear site data
// ============================================================
