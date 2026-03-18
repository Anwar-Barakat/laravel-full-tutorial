// ============================================================
// Problem 01 — Progressive Web App
// ============================================================



// ============================================================
// PWA requirements checklist
//
// 1. manifest.json — installability metadata
//    name, short_name, start_url, display, icons (192 + 512)
//    display: "standalone" → native app feel (no browser chrome)
//    theme_color: colours browser address bar / Android task switcher
//    purpose: "maskable" on icons → adaptive icon support (Android)
//
// 2. Service Worker — offline + caching
//    Register at app startup
//    Served over HTTPS (or localhost)
//
// 3. Icons — at least 192×192 and 512×512 PNG
// ============================================================



// ============================================================
// manifest.json — key fields
//
// display modes:
//   "standalone"   → no browser UI, own window (most native-like)
//   "minimal-ui"   → minimal browser controls
//   "browser"      → regular tab
//   "fullscreen"   → no status bar (games)
//
// shortcuts: app-level shortcuts in OS long-press menu
// screenshots: shown in install dialog (wide=desktop, narrow=mobile)
// orientation: lock orientation if needed ("portrait-primary")
// ============================================================



// ============================================================
// SW registration — serviceWorkerRegistration.ts
//
// if (!("serviceWorker" in navigator)) return   ← feature detect
//
// const registration = await navigator.serviceWorker.register(
//   "/service-worker.js",
//   { scope: "/" }        ← controls all URLs under /
// )
//
// registration.addEventListener("updatefound", () => {
//   const newWorker = registration.installing
//   newWorker.addEventListener("statechange", () => {
//     if (newWorker.state === "installed" && navigator.serviceWorker.controller)
//       dispatchEvent(new CustomEvent("sw-update-available"))
//       ← controller exists = this is an update (not first install)
//   })
// })
//
// navigator.serviceWorker.addEventListener("controllerchange", () => {
//   window.location.reload()   ← new SW took over, get fresh assets
// })
// ============================================================



// ============================================================
// SW lifecycle — install → activate → fetch
//
// INSTALL: pre-cache app shell
//   event.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS)))
//   self.skipWaiting()
//   ← activate immediately without waiting for old SW tabs to close
//   ← without skipWaiting: old SW stays active until ALL tabs refresh
//
// ACTIVATE: delete stale caches from previous versions
//   caches.keys() → filter old "tripz-*" keys → caches.delete()
//   self.clients.claim()
//   ← take control of all open pages NOW (without reload)
//   ← without clients.claim(): pages opened pre-SW aren't controlled
//
// event.waitUntil(): extend SW event lifetime until promise resolves
//   SW would die mid-task without it
// ============================================================



// ============================================================
// Cache strategies — fetch event routing
//
// Cache-First (static assets: JS, CSS, images):
//   cached = await caches.match(request)
//   if cached: return cached
//   fetch → cache.put(request, response.clone()) → return response
//   ← CLONE: body is a ReadableStream — consumed once
//   ← clone before: returning to browser AND storing in cache
//
// Network-First (API calls /api/*):
//   try fetch → cache response → return
//   catch: return caches.match(request) ?? 503 JSON error
//   ← prefer fresh data, cache as fallback when offline
//
// Stale-While-Revalidate (HTML navigation):
//   fetch in background, update cache
//   return cached immediately (or await fetch if no cache)
//   ← instant load + background update
//   ← user sees slightly stale HTML, updated on next visit
//
// Offline fallback for navigate:
//   if request.mode === "navigate": return caches.match("/offline.html")
// ============================================================



// ============================================================
// useOnlineStatus — useSyncExternalStore
//
// subscribe = (callback) => {
//   window.addEventListener("online",  callback)
//   window.addEventListener("offline", callback)
//   return () => removeEventListeners
// }
// getSnapshot       = () => navigator.onLine
// getServerSnapshot = () => true   ← SSR: assume online
//
// useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
// ← React 18 canonical pattern for external store subscription
// ← concurrent-mode safe (no tearing)
// ← vs useEffect + useState: avoids potential snapshot inconsistency
//
// NetworkStatus UI:
//   role="status" aria-live="polite"
//   {!isOnline && <div className="offline-banner">You're offline</div>}
// ============================================================



// ============================================================
// useInstallPrompt
//
// window.addEventListener("beforeinstallprompt", handler)
//   ← fires when browser decides app is installable
//   e.preventDefault()    ← suppress browser's default mini-infobar
//   setPromptEvent(e)     ← store for later use
//
// install():
//   await promptEvent.prompt()
//   const { outcome } = await promptEvent.userChoice
//   ← "accepted" or "dismissed"
//   if accepted: setIsInstalled(true)
//   setPromptEvent(null)  ← event can only be used once
//
// Detect already installed:
//   window.matchMedia("(display-mode: standalone)").matches
//   ← true when running as installed PWA
//
// window.addEventListener("appinstalled", ...)
//   ← fires after successful install (regardless of who prompted)
// ============================================================



// ============================================================
// useSWUpdate — show update banner
//
// Listen for custom "sw-update-available" event (dispatched during SW statechange)
// setUpdateAvailable(true)
//
// applyUpdate():
//   registration.waiting.postMessage({ type:"SKIP_WAITING" })
//   ← tells waiting SW to activate now
//   ← triggers "controllerchange" → window.location.reload()
//
// In SW: self.addEventListener("message", event => {
//   if (event.data.type === "SKIP_WAITING") self.skipWaiting()
// })
//
// UX: show non-dismissable banner until user clicks "Update now"
//   role="alert" for screen reader announcement
// ============================================================
