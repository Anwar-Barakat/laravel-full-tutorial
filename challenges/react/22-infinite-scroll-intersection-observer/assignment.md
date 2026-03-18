# REACT_TEST_22 — Infinite Scroll • IntersectionObserver

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Infinite Booking List (Medium)

Build an infinite scroll booking list that loads 20 bookings at a time using `IntersectionObserver` to detect when to fetch more.

---

### Part A — Types

**File:** `types/pagination.ts`

```ts
interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

type FetchPage<T> = (page: number) => Promise<PaginatedResponse<T>>

interface UseInfiniteScrollReturn<T> {
  items: T[]
  isLoading: boolean
  isFetchingMore: boolean   // true only when loading page 2+
  hasMore: boolean
  error: string | null
  sentinelRef: React.RefCallback<HTMLDivElement>
  retry: () => void
  reset: () => void
}
```

---

### Part B — `useInfiniteScroll` hook

**File:** `hooks/useInfiniteScroll.ts`

```ts
function useInfiniteScroll<T>(fetchFn: FetchPage<T>): UseInfiniteScrollReturn<T>
```

**State:**
- `items: T[]` = `[]`
- `page: number` = `1`
- `hasMore: boolean` = `true`
- `isLoading: boolean` = `true` (true on first load)
- `isFetchingMore: boolean` = `false`
- `error: string | null` = `null`
- `isFetchingRef = useRef(false)` — prevents concurrent fetches (not state, to avoid re-render)

**`loadMore` function:**
```ts
const loadMore = useCallback(async () => {
  if (isFetchingRef.current || !hasMore) return   // debounce: skip if already fetching

  isFetchingRef.current = true
  page === 1 ? setIsLoading(true) : setIsFetchingMore(true)
  setError(null)

  try {
    const response = await fetchFn(page)
    setItems(prev => page === 1 ? response.data : [...prev, ...response.data])
    setHasMore(response.meta.current_page < response.meta.last_page)
    setPage(prev => prev + 1)
  } catch (err) {
    setError((err as Error).message)
  } finally {
    setIsLoading(false)
    setIsFetchingMore(false)
    isFetchingRef.current = false
  }
}, [fetchFn, page, hasMore])
```

**Initial load** `useEffect([], [])`:
```ts
loadMore()
```

**`sentinelRef` — IntersectionObserver:**
```ts
const sentinelRef = useCallback((node: HTMLDivElement | null) => {
  if (!node) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
        loadMore()
      }
    },
    { threshold: 0.1 }   // trigger when 10% of sentinel is visible
  )
  observer.observe(node)
  return () => observer.disconnect()   // cleanup when sentinel unmounts
}, [hasMore, loadMore])
```

> **Why `useCallback` as ref?** A ref callback fires with the DOM node when the element mounts and with `null` when it unmounts — giving you a clean place to `observe` and `disconnect`. A `useRef` + `useEffect` pattern requires extra coordination.

**`retry`:** `setError(null); setPage(1); setItems([]); setHasMore(true)` — triggers re-fetch via `useEffect([page])` dependency, or call `loadMore()` directly.

**`reset`:** same as retry — clears all state back to initial.

---

### Part C — `BookingCard` for the list

**File:** `components/BookingCard.tsx`

```tsx
interface Booking {
  id: number
  school_name: string
  destination: string
  trip_date: string
  student_count: number
  status: "pending" | "confirmed" | "cancelled"
  amount: number
}

interface BookingCardProps {
  booking: Booking
}
```

**Render:**
```tsx
<div className="bg-white rounded-lg shadow-sm border p-4 flex items-start justify-between
                hover:shadow-md transition-shadow">
  <div>
    <p className="font-semibold text-gray-900">{booking.school_name}</p>
    <p className="text-sm text-gray-500">{booking.destination} · {booking.trip_date}</p>
    <p className="text-sm text-gray-500">{booking.student_count} students</p>
  </div>
  <div className="text-right">
    <StatusBadge status={booking.status} />
    <p className="text-sm font-medium text-gray-700 mt-1">£{booking.amount.toLocaleString()}</p>
  </div>
</div>
```

---

### Part D — `InfiniteBookingList` component

**File:** `components/InfiniteBookingList.tsx`

```tsx
function InfiniteBookingList(): JSX.Element {
  const { items, isLoading, isFetchingMore, hasMore, error, sentinelRef, retry }
    = useInfiniteScroll<Booking>((page) =>
        fetch(`/api/bookings?page=${page}&per_page=20`).then(r => r.json())
      )

  // Full-page loading skeleton (first load)
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Booking cards */}
      {items.map(booking => (
        <BookingCard key={booking.id} booking={booking} />
      ))}

      {/* Error state (failed to load a page) */}
      {error && (
        <div className="text-center py-6">
          <p className="text-red-600 mb-3">Failed to load: {error}</p>
          <button onClick={retry}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Try again
          </button>
        </div>
      )}

      {/* Loading more spinner (page 2+) */}
      {isFetchingMore && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* End of list */}
      {!hasMore && !isFetchingMore && items.length > 0 && (
        <p className="text-center text-gray-400 py-6 text-sm">
          All {items.length} bookings loaded
        </p>
      )}

      {/* Empty state */}
      {!hasMore && items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No bookings found
        </div>
      )}

      {/* Sentinel — IntersectionObserver target */}
      {hasMore && !error && <div ref={sentinelRef} className="h-1" />}
    </div>
  )
}
```

---

### Part E — Key IntersectionObserver concepts

```ts
// IntersectionObserver fires when observed element enters/exits viewport
new IntersectionObserver(callback, {
  root: null,          // null = browser viewport
  rootMargin: "0px",   // extend detection area (e.g. "200px" = start loading early)
  threshold: 0.1,      // 0 = any pixel visible; 1 = fully visible
})

// Why sentinel at bottom instead of scroll event?
//   scroll events fire ~60fps → need throttle/debounce
//   IntersectionObserver is browser-native, fires only on entry/exit
//   No jank, no missed events, no manual cleanup headaches

// isFetchingRef.current (ref, not state) prevents concurrent fetches:
//   If state were used: setIsLoading(true) → re-render → observer re-fires
//   → loadMore called again before first resolves → duplicate page fetch
//   Ref change does NOT trigger re-render, so observer callback reads current value instantly
```

---

## Problem 02 — Pull-to-Refresh & Scroll Restoration (Hard)

Add pull-to-refresh gesture, scroll position restoration, "new items" banner, and scroll-to-top button.

---

### Part A — `useScrollRestoration` hook

**File:** `hooks/useScrollRestoration.ts`

```ts
function useScrollRestoration(key: string): React.RefObject<HTMLDivElement>
```

**Implementation:**
- `containerRef = useRef<HTMLDivElement>(null)`

- **Restore on mount** `useEffect([], [])`:
  ```ts
  const saved = sessionStorage.getItem(`scroll:${key}`)
  if (saved && containerRef.current) {
    containerRef.current.scrollTop = Number(saved)
  }
  ```

- **Save on scroll** `useEffect([], [])`:
  ```ts
  const el = containerRef.current
  if (!el) return
  const handler = () => sessionStorage.setItem(`scroll:${key}`, String(el.scrollTop))
  el.addEventListener("scroll", handler, { passive: true })
  return () => el.removeEventListener("scroll", handler)
  ```

- Return `containerRef`

**Usage:**
```tsx
const containerRef = useScrollRestoration("bookings-list")
<div ref={containerRef} className="h-screen overflow-y-auto">
  {/* list content */}
</div>
```

---

### Part B — `useScrollToTop` hook

**File:** `hooks/useScrollToTop.ts`

```ts
function useScrollToTop(containerRef: React.RefObject<HTMLElement>, threshold = 500): {
  isVisible: boolean
  scrollToTop: () => void
}
```

**Implementation:**
- `isVisible` state: `boolean` = `false`
- `useEffect`:
  ```ts
  const el = containerRef.current
  if (!el) return
  const handler = () => setIsVisible(el.scrollTop > threshold)
  el.addEventListener("scroll", handler, { passive: true })
  return () => el.removeEventListener("scroll", handler)
  ```
- `scrollToTop = () => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })`
- Return `{ isVisible, scrollToTop }`

**`ScrollToTop` component:**
```tsx
function ScrollToTop({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const { isVisible, scrollToTop } = useScrollToTop(containerRef)
  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg
                  transition-all duration-300
                  ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  )
}
```

---

### Part C — `useNewItemsPoller` hook

**File:** `hooks/useNewItemsPoller.ts`

```ts
function useNewItemsPoller(endpoint: string, interval = 30_000): {
  newCount: number
  clearNewCount: () => void
}
```

**Implementation:**
- `newCount` state: `number` = `0`
- `latestIdRef = useRef<number | null>(null)` — tracks highest ID seen so far

- **Initial fetch** `useEffect([])`:
  ```ts
  fetch(`${endpoint}?page=1&per_page=1`)
    .then(r => r.json())
    .then(res => { latestIdRef.current = res.data[0]?.id ?? null })
  ```

- **Polling** `useEffect([interval])`:
  ```ts
  const timer = setInterval(async () => {
    const res = await fetch(`${endpoint}?page=1&per_page=1`).then(r => r.json())
    const latestId = res.data[0]?.id
    if (latestIdRef.current && latestId > latestIdRef.current) {
      setNewCount(latestId - latestIdRef.current)   // approximate count
    }
  }, interval)
  return () => clearInterval(timer)
  ```

- `clearNewCount = () => { setNewCount(0); latestIdRef.current = ???; }` — update ref to current latest after refresh

**`NewItemsBanner` component:**
```tsx
function NewItemsBanner({ count, onRefresh }: { count: number; onRefresh: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-blue-600 text-white text-sm text-center py-2 cursor-pointer
                    hover:bg-blue-700 transition-colors"
         onClick={onRefresh}>
      ↑ {count} new booking{count !== 1 ? "s" : ""} — click to refresh
    </div>
  )
}
```

---

### Part D — `usePullToRefresh` hook

**File:** `hooks/usePullToRefresh.ts`

```ts
function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement>,
  onRefresh: () => Promise<void>,
  threshold = 80
): { isPulling: boolean; pullDistance: number; isRefreshing: boolean }
```

**Implementation:**
- `touchStartY = useRef(0)`
- `isPulling` state, `pullDistance` state, `isRefreshing` state

- **`touchstart` handler:**
  ```ts
  if (el.scrollTop === 0) touchStartY.current = e.touches[0].clientY
  ```

- **`touchmove` handler:**
  ```ts
  const delta = e.touches[0].clientY - touchStartY.current
  if (delta > 0 && el.scrollTop === 0) {
    e.preventDefault()                     // prevent native scroll bounce
    setPullDistance(Math.min(delta, threshold * 1.5))
    setIsPulling(delta > threshold)
  }
  ```

- **`touchend` handler:**
  ```ts
  if (isPulling) {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }
  setPullDistance(0)
  setIsPulling(false)
  ```

- Attach all three listeners with `{ passive: false }` (needed for `preventDefault` on touchmove)
- Cleanup: `removeEventListener` for all three

**Pull-to-refresh indicator:**
```tsx
{pullDistance > 0 && (
  <div className="flex justify-center py-4 transition-all"
       style={{ height: pullDistance }}>
    <div className={`w-6 h-6 border-2 border-blue-500 rounded-full
                     ${isRefreshing ? "border-t-transparent animate-spin" : ""}`} />
  </div>
)}
```

---

### Part E — Composing everything together

**File:** `components/InfiniteBookingList.tsx` (extended)

```tsx
function InfiniteBookingList(): JSX.Element {
  const containerRef = useScrollRestoration("bookings-list")
  const { newCount, clearNewCount } = useNewItemsPoller("/api/bookings")
  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(containerRef, handleRefresh)

  const { items, isLoading, isFetchingMore, hasMore, error, sentinelRef, reset }
    = useInfiniteScroll<Booking>(...)

  async function handleRefresh() {
    clearNewCount()
    reset()                // clears items and restarts from page 1
  }

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto relative">
      {/* Pull-to-refresh visual */}
      {pullDistance > 0 && <PullIndicator distance={pullDistance} isRefreshing={isRefreshing} />}

      {/* New items banner */}
      {newCount > 0 && <NewItemsBanner count={newCount} onRefresh={handleRefresh} />}

      {/* List + sentinel */}
      <div className="p-4 space-y-4">
        {items.map(booking => <BookingCard key={booking.id} booking={booking} />)}
        {isFetchingMore && <LoadingSpinner />}
        {!hasMore && items.length > 0 && <EndOfListMessage count={items.length} />}
        {hasMore && !error && <div ref={sentinelRef} className="h-1" />}
      </div>

      {/* Scroll to top */}
      <ScrollToTop containerRef={containerRef} />
    </div>
  )
}
```

---

### Key concepts reference

```ts
// useCallback as ref vs useRef + useEffect:
//   ref callback fires synchronously when element mounts/unmounts
//   → perfect for observer.observe(node) + observer.disconnect()
//   useRef misses elements that mount after initial render

// { passive: true } on scroll/touch listeners:
//   Tells browser the handler won't call preventDefault()
//   → browser can start scrolling immediately without waiting for JS
//   → REQUIRED on touchmove only if you DON'T call preventDefault()
//   → use { passive: false } when you DO call preventDefault() (pull-to-refresh)

// sessionStorage vs localStorage for scroll position:
//   sessionStorage: cleared when tab closes — right for per-session position
//   localStorage: persists across sessions — wrong for scroll (stale)

// Sentinel height (h-1 / 4px):
//   Must have non-zero height or IntersectionObserver never fires
//   Keep small so it doesn't affect layout
```
