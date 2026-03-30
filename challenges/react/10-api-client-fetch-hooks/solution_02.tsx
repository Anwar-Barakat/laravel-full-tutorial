// ============================================================
// Problem 02 — Retry, Caching & Polling
// ============================================================



// ============================================================
// lib/requestCache.ts
//
// interface CacheEntry<T>: { data, timestamp, expiresAt }
//
// class RequestCache:
//   private store   = new Map<string, CacheEntry<unknown>>()
//   private inflight = new Map<string, Promise<unknown>>()
//
//   set<T>(key, data, ttl):
//     store.set(key, { data, timestamp: Date.now(), expiresAt: Date.now() + ttl })
//
//   get<T>(key): { data: T, isStale: boolean } | null
//     entry = store.get(key)
//     if !entry → return null
//     return { data: entry.data, isStale: Date.now() > entry.expiresAt }
//
//   getInflight<T>(key): Promise<T> | undefined
//   setInflight<T>(key, promise):
//     inflight.set(key, promise)
//     promise.finally(() => inflight.delete(key))  ← auto-cleanup on settle
//
// export const requestCache = new RequestCache()
// ============================================================



// ============================================================
// lib/ApiClient.ts — add retry
//
// async function withRetry<T>(fn, retries, attempt = 0): Promise<T>
//   try: return await fn()
//   catch:
//     shouldRetry = attempt < retries
//       && code !== "REQUEST_ABORTED"
//       && (status === 0 || status >= 500)   ← never retry 4xx
//     if !shouldRetry: throw
//     delay = Math.min(200 * 2^attempt, 10_000)  ← exponential backoff, max 10s
//     await sleep(delay)
//     return withRetry(fn, retries, attempt + 1)
//
// In ApiClient.request(): wrap fetch with withRetry(fn, this.config.retries ?? 0)
// ============================================================



// ============================================================
// hooks/useFetch.ts — extended
//
// New options: { cacheTime?, staleWhileRevalidate?, pollingInterval? }
// New returns: { isStale, isFetching }
//
// useEffect([url, enabled, trigger]):
//   1. Cache check:
//      cached = requestCache.get<T>(url)
//      if cached:
//        setData(cached.data); setIsStale(cached.isStale)
//        if !cached.isStale: return  ← fresh, skip fetch
//        if staleWhileRevalidate: setIsFetching(true) ← background only
//        else: setIsLoading(true) ← blocking
//
//   2. Deduplication:
//      existing = requestCache.getInflight<T>(url)
//      fetchPromise = existing ?? api.get(url, signal)
//      if !existing && cacheTime: requestCache.setInflight(url, fetchPromise)
//
//   3. On success:
//      if cacheTime: requestCache.set(url, result, cacheTime)
//      setData + setIsStale(false) + setError(null)
//
//   4. Cleanup: only abort if we created the request (!existing)
//
// Polling useEffect([pollingInterval, url, enabled]):
//   if !pollingInterval: return
//   id = setInterval(() => setTrigger(t => t + 1), pollingInterval)
//   return () => clearInterval(id)
// ============================================================



// ============================================================
// Flow summary
//
// First request (no cache):
//   isLoading=true → fetch → cache(url, data, ttl) → render
//
// Within TTL (fresh cache):
//   cache hit, isStale=false → return immediately → no fetch
//
// After TTL + staleWhileRevalidate:
//   cache hit, isStale=true → render stale immediately
//   isFetching=true (background) → fetch → update → isFetching=false
//
// Deduplication:
//   component A and B both mount → A registers inflight Promise
//   B finds inflight → reuses same Promise → one network request, both update
//
// Polling:
//   separate useEffect fires setInterval
//   each tick increments trigger → main useEffect re-runs → fetch
//
// Retry (3 retries, network error):
//   attempt 0 → wait 200ms
//   attempt 1 → wait 400ms
//   attempt 2 → wait 800ms
//   attempt 3 → throw
// ============================================================
