# React Performance Optimization

Prevent unnecessary re-renders with React.memo, useMemo, useCallback, and implement code splitting with React.lazy and Suspense.

| Topic         | Details                                                         |
|---------------|-----------------------------------------------------------------|
| Memoization   | memo, useMemo, useCallback                                      |
| Code Splitting | React.lazy, Suspense                                           |
| Virtualization | Render large lists efficiently                                 |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Optimized Booking Dashboard (Medium)

### Scenario

Build an optimized booking dashboard where expensive child components don't re-render unnecessarily. Use `React.memo`, `useMemo` for computed values, `useCallback` for stable references, and `React.lazy` for code splitting.

### Requirements

1. `BookingDashboard` parent with multiple child sections
2. `React.memo` on `BookingStatsCard` — only re-renders when its props change
3. `useMemo` for computed stats (total revenue, booking counts by status)
4. `useCallback` for handlers passed to children (prevent child re-renders)
5. `React.lazy` + `Suspense` for heavy components (charts, reports)
6. Show a profiling example: how to identify unnecessary re-renders
7. Add a `useRenderCount` debug hook

### Expected Code

```tsx
// hooks/useRenderCount.ts
import { useRef, useEffect } from "react"

// Debug hook: logs how many times a component has rendered
export function useRenderCount(componentName: string): number {
  const count = useRef(0)
  count.current += 1

  // Log every render in development only
  if (process.env.NODE_ENV === "development") {
    console.log(`[${componentName}] render #${count.current}`)
  }

  return count.current
}
```

```tsx
// components/BookingStatsCard.tsx
// React.memo: only re-renders when totalRevenue, counts, or onFilter changes
interface BookingStatsCardProps {
  totalRevenue: number
  counts:       Record<string, number>   // { pending: 12, paid: 45, ... }
  onFilter:     (status: string) => void  // stable ref via useCallback
}

// ✓ memo: parent can re-render freely; StatsCard only re-renders when its props differ
const BookingStatsCard = React.memo(function BookingStatsCard({
  totalRevenue,
  counts,
  onFilter,
}: BookingStatsCardProps) {
  const renderCount = useRenderCount("BookingStatsCard")

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm text-gray-500">Total Revenue</p>
        <p className="text-2xl font-bold">
          {new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
            .format(totalRevenue)}
        </p>
      </div>
      {Object.entries(counts).map(([status, count]) => (
        <button
          key={status}
          onClick={() => onFilter(status)}
          className="bg-white rounded-xl p-4 shadow-sm text-left hover:bg-gray-50"
        >
          <p className="text-sm text-gray-500 capitalize">{status}</p>
          <p className="text-2xl font-bold">{count}</p>
        </button>
      ))}
      {process.env.NODE_ENV === "development" && (
        <p className="text-xs text-gray-300">renders: {renderCount}</p>
      )}
    </div>
  )
})

export { BookingStatsCard }
```

```tsx
// components/BookingDashboard.tsx
import React, { useState, useMemo, useCallback, lazy, Suspense } from "react"
import { BookingStatsCard } from "./BookingStatsCard"
import { BookingTable }     from "./BookingTable"
import { ChartSkeleton }    from "./ChartSkeleton"

// Code splitting: chart library only loads when component is rendered
const BookingChart   = lazy(() => import("./BookingChart"))
const ReportsPanel   = lazy(() => import("./ReportsPanel"))

interface BookingDashboardProps {
  bookings: Booking[]
}

export function BookingDashboard({ bookings }: BookingDashboardProps) {
  const [search,        setSearch]        = useState("")
  const [activeFilter,  setActiveFilter]  = useState("all")
  const [showReports,   setShowReports]   = useState(false)

  // ── useMemo: only recomputes when bookings[] reference changes ──
  // Without memo: recalculates on EVERY render, even when only search changes
  const stats = useMemo(() => ({
    totalRevenue: bookings.reduce((sum, b) => sum + b.amount, 0),
    counts: bookings.reduce(
      (acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1 }),
      {} as Record<string, number>
    ),
  }), [bookings])   // ← deps array: only re-run when bookings changes

  // ── useMemo: expensive filter + sort on large array ─────────
  const filteredBookings = useMemo(() => {
    let result = bookings

    if (activeFilter !== "all") {
      result = result.filter((b) => b.status === activeFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.school_name.toLowerCase().includes(q) ||
          b.id.toString().includes(q)
      )
    }

    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [bookings, activeFilter, search])

  // ── useCallback: stable reference so BookingStatsCard doesn't re-render ──
  // Without useCallback: new function every render → memo on StatsCard is useless
  const handleFilter = useCallback((status: string) => {
    setActiveFilter(status)
  }, [])   // ← no deps: function never changes identity

  const handleDelete = useCallback(async (id: number) => {
    await bookingApi.delete(id)
    // Parent re-fetches — no need to add fetching fn to deps here
  }, [])

  // ── No useCallback needed: used in this component only ──────
  // Local handlers not passed to children don't benefit from useCallback
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  return (
    <div className="space-y-6">
      {/* StatsCard ONLY re-renders when stats or handleFilter changes.
          Typing in the search box does NOT cause StatsCard to re-render. */}
      <BookingStatsCard
        totalRevenue={stats.totalRevenue}
        counts={stats.counts}
        onFilter={handleFilter}           // stable ref via useCallback
      />

      <input
        type="search"
        value={search}
        onChange={handleSearch}           // local — no useCallback needed
        placeholder="Search bookings…"
        className="w-full border rounded-lg px-4 py-2"
      />

      <BookingTable
        bookings={filteredBookings}
        onDelete={handleDelete}           // stable ref — BookingTable is memo'd
      />

      {/* Lazy chart: recharts bundle only loaded when this mounts */}
      <Suspense fallback={<ChartSkeleton />}>
        <BookingChart data={filteredBookings} />
      </Suspense>

      {/* Lazy reports panel: only loaded when user clicks Show Reports */}
      <button onClick={() => setShowReports((v) => !v)}>
        {showReports ? "Hide" : "Show"} Reports
      </button>
      {showReports && (
        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-xl" />}>
          <ReportsPanel bookings={filteredBookings} />
        </Suspense>
      )}
    </div>
  )
}
```

```tsx
// When to use each optimization — decision guide

// ✓ React.memo: expensive component + parent re-renders often + props are stable
const BookingRow = React.memo(function BookingRow({ booking, onDelete }: Props) {
  // Renders 100+ rows — saving each re-render matters
  return <tr>...</tr>
})

// ✗ React.memo: component is cheap, or props always change anyway
// Don't wrap simple components — the comparison overhead may exceed the savings

// ✓ useMemo: expensive derivation (sort/filter large array, complex calculation)
const sorted = useMemo(() => [...items].sort(compareFn), [items])

// ✗ useMemo: trivial computation
const label = useMemo(() => STATUS_LABELS[status], [status])  // WRONG — pointless

// ✓ useCallback: function passed to memo'd child
const onDelete = useCallback((id) => deleteBooking(id), [])

// ✗ useCallback: function used only in this component
const handleChange = useCallback((e) => setValue(e.target.value), [])  // WRONG
// Just write: const handleChange = (e) => setValue(e.target.value)
```

### Memoization Decision Table

| Scenario | Tool | Skip when |
|----------|------|-----------|
| Child with stable props that's expensive to render | `React.memo` | Component is cheap; props change every render |
| Derive value from large array (filter/sort/reduce) | `useMemo` | Trivial computation (field lookup, string concat) |
| Function passed to `memo`'d child | `useCallback` | Function stays inside current component |
| Heavy component not needed on initial load | `React.lazy` | Component is small; always needed on first render |

### What We're Evaluating

- `React.memo(Component)` — wraps component; bails out if props shallowly equal
- `useMemo(() => fn, [deps])` — recalculates only when deps change; value is cached
- `useCallback(fn, [deps])` — same reference as long as deps unchanged (= `useMemo(() => fn, deps)`)
- `React.lazy(() => import("..."))` — returns a lazy component; must be wrapped in `Suspense`
- `useCallback(fn, [])` with empty deps — function identity never changes (safe when fn has no deps)
- `useRenderCount` with `useRef` — `useRef` persists across renders without causing re-renders
- `process.env.NODE_ENV === "development"` guard — debug-only code stripped from production builds

---

## Problem 02 — Virtual List for 10K Items (Hard)

### Scenario

Build a virtualized list that efficiently renders 10,000 bookings by only mounting visible rows — the technique used for infinite scroll and large datasets.

### Requirements

1. `VirtualList` component that only renders visible items
2. Calculate visible range from scroll position and container height
3. `overscan`: render a few extra items above/below for smooth scrolling
4. Dynamic row height support (or fixed height optimization)
5. Smooth scrolling with `transform: translateY`
6. Use `useRef` for scroll container and measurements
7. Handle window resize recalculation

### Expected Code

```tsx
// hooks/useVirtualList.ts
interface UseVirtualListOptions {
  itemCount:   number
  itemHeight:  number | ((index: number) => number)   // fixed or dynamic
  containerHeight: number
  overscan?:   number   // extra items to render outside viewport (default: 3)
}

interface UseVirtualListReturn {
  virtualItems:  Array<{ index: number; start: number; size: number }>
  totalHeight:   number
  scrollToIndex: (index: number) => void
}

export function useVirtualList(
  containerRef: React.RefObject<HTMLElement>,
  options:      UseVirtualListOptions
): UseVirtualListReturn {
  const { itemCount, itemHeight, containerHeight, overscan = 3 } = options

  const [scrollTop, setScrollTop] = useState(0)

  // Sync scroll position
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [containerRef])

  // ── Helper: get height of a single item ───────────────────
  const getItemHeight = useCallback(
    (index: number) =>
      typeof itemHeight === "function" ? itemHeight(index) : itemHeight,
    [itemHeight]
  )

  // ── Offsets: cumulative top position of each item ─────────
  // For fixed height: offset = index * height (O(1))
  // For dynamic height: must sum all previous heights (O(n)) — memoised
  const itemOffsets = useMemo(() => {
    if (typeof itemHeight === "number") return null   // use formula for fixed

    const offsets = new Array(itemCount + 1)
    offsets[0] = 0
    for (let i = 0; i < itemCount; i++) {
      offsets[i + 1] = offsets[i] + (itemHeight as (i: number) => number)(i)
    }
    return offsets
  }, [itemCount, itemHeight])

  const totalHeight = useMemo(() => {
    if (typeof itemHeight === "number") return itemCount * itemHeight
    return itemOffsets![itemCount]
  }, [itemCount, itemHeight, itemOffsets])

  // ── Visible range calculation ─────────────────────────────
  const { startIndex, endIndex } = useMemo(() => {
    if (typeof itemHeight === "number") {
      // Fixed height: O(1) calculation
      const start = Math.floor(scrollTop / itemHeight)
      const end   = Math.min(
        itemCount - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      )
      return { startIndex: start, endIndex: end }
    }

    // Dynamic height: binary search through offsets
    let lo = 0, hi = itemCount - 1
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (itemOffsets![mid] < scrollTop) lo = mid + 1
      else hi = mid
    }
    const start = Math.max(0, lo - 1)
    let end = start
    while (end < itemCount - 1 && itemOffsets![end + 1] < scrollTop + containerHeight) {
      end++
    }
    return { startIndex: start, endIndex: end }
  }, [scrollTop, containerHeight, itemHeight, itemCount, itemOffsets])

  // Apply overscan — render extra items above and below viewport
  const overscanStart = Math.max(0,          startIndex - overscan)
  const overscanEnd   = Math.min(itemCount - 1, endIndex   + overscan)

  // Build the list of virtual items to render
  const virtualItems = useMemo(() => {
    const items = []
    for (let i = overscanStart; i <= overscanEnd; i++) {
      const start = typeof itemHeight === "number"
        ? i * itemHeight
        : itemOffsets![i]
      items.push({ index: i, start, size: getItemHeight(i) })
    }
    return items
  }, [overscanStart, overscanEnd, itemHeight, itemOffsets, getItemHeight])

  const scrollToIndex = useCallback((index: number) => {
    const el = containerRef.current
    if (!el) return
    const offset = typeof itemHeight === "number"
      ? index * itemHeight
      : itemOffsets![index]
    el.scrollTop = offset
  }, [containerRef, itemHeight, itemOffsets])

  return { virtualItems, totalHeight, scrollToIndex }
}
```

```tsx
// components/VirtualList.tsx
interface VirtualListProps<T> {
  items:       T[]
  itemHeight:  number | ((index: number) => number)
  overscan?:   number
  renderItem:  (item: T, index: number) => React.ReactNode
  className?:  string
  style?:      React.CSSProperties
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  renderItem,
  className = "",
  style,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Measure container height (and re-measure on resize)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(el)

    // Initial measurement
    setContainerHeight(el.clientHeight)

    return () => observer.disconnect()
  }, [])

  const { virtualItems, totalHeight, scrollToIndex } = useVirtualList(
    containerRef,
    { itemCount: items.length, itemHeight, containerHeight, overscan }
  )

  return (
    // Scroll container: fixed height, overflow scroll
    <div
      ref={containerRef}
      className={`overflow-auto relative ${className}`}
      style={{ ...style }}
      role="list"
      aria-rowcount={items.length}
    >
      {/* Total height spacer — creates scrollbar proportional to all items */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {virtualItems.map(({ index, start, size }) => (
          // Each item absolutely positioned via translateY
          // translateY is GPU-composited — no layout reflow
          <div
            key={index}
            role="listitem"
            style={{
              position:  "absolute",
              top:       0,
              left:      0,
              right:     0,
              height:    size,
              transform: `translateY(${start}px)`,   // ← GPU composited
            }}
          >
            {renderItem(items[index], index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// Usage — 10,000 bookings rendered at 60fps
function BookingVirtualList({ bookings }: { bookings: Booking[] }) {
  return (
    <VirtualList
      items={bookings}
      itemHeight={64}         // each row is 64px
      overscan={5}            // render 5 extra above and below viewport
      style={{ height: "600px" }}
      renderItem={(booking, index) => (
        <div
          className="flex items-center px-4 border-b border-gray-100 hover:bg-gray-50"
          style={{ height: 64 }}
        >
          <span className="font-medium">{booking.school_name}</span>
          <span className="ml-auto text-sm text-gray-500">{booking.status}</span>
        </div>
      )}
    />
  )
}

// Dynamic row heights
function DynamicVirtualList({ bookings }: { bookings: Booking[] }) {
  const getRowHeight = useCallback(
    (index: number) => bookings[index].has_notes ? 96 : 64,
    [bookings]
  )

  return (
    <VirtualList
      items={bookings}
      itemHeight={getRowHeight}   // function → dynamic heights
      overscan={3}
      style={{ height: "600px" }}
      renderItem={(booking) => <BookingRow booking={booking} />}
    />
  )
}
```

### Virtualization Algorithm

```
Without virtualization (10,000 items):
  DOM nodes: 10,000  ← browser lays out all of them
  Scroll event: nothing to do
  Initial render: SLOW (seconds)

With virtualization (containerHeight=600, itemHeight=64):
  Visible items: Math.ceil(600 / 64) = 10
  With overscan=5: rendered items = 10 + 5 + 5 = 20
  DOM nodes: 20 at all times — regardless of total items

Scroll to position 1000px:
  startIndex = Math.floor(1000 / 64) = 15
  endIndex   = Math.ceil((1000 + 600) / 64) = 25
  With overscan: render indices 10 → 30
  Items 0-9 are unmounted, items 31+ are not mounted yet
```

### What We're Evaluating

- `ResizeObserver` to track container height — works when container resizes, not just window
- `transform: translateY(Xpx)` over `top: Xpx` — GPU composited, no layout reflow
- Total height spacer div — makes the scrollbar proportional to the full list
- `overscan` buffer — prevents blank rows during fast scrolling (items mount before entering viewport)
- Fixed height formula: `O(1)` — `Math.floor(scrollTop / itemHeight)`
- Dynamic height: `O(log n)` binary search through cumulative offsets array
- `{ passive: true }` on scroll listener — signals no `preventDefault()`, browser can scroll-optimize
- `useCallback` on `getItemHeight` — prevents `useMemo` for `virtualItems` from recalculating when parent re-renders
