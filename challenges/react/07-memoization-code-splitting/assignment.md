# React Performance Deep Dive

Prevent wasted re-renders and optimize bundle loading.

| Topic               | Details                                        |
|---------------------|------------------------------------------------|
| Memoization         | useMemo, React.memo, useCallback               |
| Context Splitting   | Split by update frequency to prevent re-renders|
| Bundle Optimization | React.lazy, Suspense, prefetch on hover        |
| Virtualization      | Render large lists efficiently                 |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Render Profiling & Debug Hooks (Medium)

### Scenario

Demonstrate the correct vs incorrect usage of `memo`/`useMemo`/`useCallback` and prevent wasted re-renders.

### Requirements

1. Show WRONG usage of `useMemo` (premature optimization) vs RIGHT usage
2. Demonstrate when `React.memo` helps vs when it's useless
3. Show how to split context to prevent unnecessary re-renders

### Expected Code

```tsx
// ── memo / useMemo / useCallback — right vs wrong ────────────

// ✗ WRONG — useMemo with trivial computation (costs more than it saves)
function BookingBadge({ status }: { status: string }) {
  // Memoizing a string lookup — the memo overhead > the computation
  const label = useMemo(() => STATUS_LABELS[status], [status])
  return <span>{label}</span>
}

// ✓ RIGHT — useMemo for expensive derivation
function BookingStats({ bookings }: { bookings: Booking[] }) {
  // Re-computing on every render would sort + filter a large array
  const stats = useMemo(
    () => ({
      total:     bookings.length,
      paid:      bookings.filter((b) => b.status === "paid").length,
      revenue:   bookings.reduce((sum, b) => sum + b.amount, 0),
      topSchool: [...bookings]
        .sort((a, b) => b.amount - a.amount)[0]?.school_name ?? "—",
    }),
    [bookings]   // only recompute when array reference changes
  )
  return <StatsGrid stats={stats} />
}

// ✗ WRONG — React.memo on a component that always gets new props
const MemoizedCard = React.memo(function BookingCard({
  booking,
  style,      // ← object literal created inline — new ref every render
}: {
  booking: Booking
  style: React.CSSProperties
}) {
  return <div style={style}>{booking.id}</div>
})
// Usage: <MemoizedCard booking={b} style={{ color: "red" }} />
// → style is a new object every render → memo never bails out → wasted comparison

// ✓ RIGHT — React.memo when props are stable primitives or memoized values
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  paid:      { color: "green" },
  pending:   { color: "orange" },
  cancelled: { color: "red" },
}
const StableCard = React.memo(function BookingCard({
  booking,
}: {
  booking: Booking
}) {
  const style = STATUS_STYLE[booking.status]   // stable reference from module scope
  return <div style={style}>{booking.id}</div>
})

// ✓ RIGHT — useCallback to stabilise callback passed to memo'd child
function BookingList({ bookings }: { bookings: Booking[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Without useCallback: new function ref every render → StableCard re-renders
  const handleSelect = useCallback((id: number) => {
    setSelectedId(id)
  }, []) // stable — no deps

  return bookings.map((b) => (
    <StableCard key={b.id} booking={b} onSelect={handleSelect} />
  ))
}
```

```tsx
// ── Context splitting — prevent re-renders ───────────────────

// ✗ WRONG — one big context re-renders ALL consumers on any change
const BookingContext = createContext<{
  bookings:    Booking[]
  selectedId:  number | null
  filter:      string
  setFilter:   (f: string) => void
  setSelected: (id: number) => void
} | null>(null)
// Every component using useContext(BookingContext) re-renders when
// selectedId changes, even if they only need bookings[]

// ✓ RIGHT — split by update frequency
// 1. Stable data context (changes rarely)
const BookingDataContext = createContext<Booking[] | null>(null)

// 2. UI state context (changes often — selection, hover)
const BookingUIContext = createContext<{
  selectedId:  number | null
  setSelected: (id: number) => void
} | null>(null)

// 3. Filter context (changes on user input)
const BookingFilterContext = createContext<{
  filter:    string
  setFilter: (f: string) => void
} | null>(null)

function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [selectedId, setSelected]   = useState<number | null>(null)
  const [filter,     setFilter]     = useState("all")

  // Each context value is memoized independently
  const dataValue   = useMemo(() => bookings, [bookings])
  const uiValue     = useMemo(() => ({ selectedId, setSelected }), [selectedId])
  const filterValue = useMemo(() => ({ filter, setFilter }), [filter])

  return (
    <BookingDataContext.Provider value={dataValue}>
      <BookingUIContext.Provider value={uiValue}>
        <BookingFilterContext.Provider value={filterValue}>
          {children}
        </BookingFilterContext.Provider>
      </BookingUIContext.Provider>
    </BookingDataContext.Provider>
  )
}
// Now BookingTable (uses BookingDataContext) doesn't re-render when user
// changes selection — it only re-renders when bookings[] changes.
```

### Optimization Decision Table

| Technique | Use when | Skip when |
|-----------|----------|-----------|
| `React.memo` | Child receives stable props, renders are expensive | Props change every render anyway |
| `useMemo` | Expensive derivation (sort/filter large arrays) | Trivial computation (field lookup) |
| `useCallback` | Passing function to `memo`'d child | Function used only locally |
| Context split | Context mixes fast + slow changing state | Single concern context |

### What We're Evaluating

- Context splitting by update frequency — data / UI state / filter in separate providers

---

## Problem 02 — Dynamic Import & Code Splitting Strategy (Hard)

### Scenario

Implement route-based code splitting for a booking dashboard using `React.lazy` and prefetch on hover.

### Requirements

1. Route-based splitting with `React.lazy` for each page
2. Prefetch pattern: start loading next page on hover

### Expected Code

```tsx
// Each page is its own JS chunk — only loaded when route is visited
const BookingsPage  = lazy(() => import("./pages/BookingsPage"))
const ReportsPage   = lazy(() => import("./pages/ReportsPage"))
const SettingsPage  = lazy(() => import("./pages/SettingsPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))

// Prefetch helper — starts the download early without rendering
function prefetch(importFn: () => Promise<unknown>) {
  importFn() // fire and forget — browser caches the result
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <nav>
        <a href="/bookings">Bookings</a>
        {/* Prefetch ReportsPage chunk on hover — ready before click */}
        <a
          href="/reports"
          onMouseEnter={() => prefetch(() => import("./pages/ReportsPage"))}
        >
          Reports
        </a>
        <a href="/settings">Settings</a>
      </nav>

      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/reports"  element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

### What We're Evaluating

- `React.lazy(() => import("..."))` — each page becomes its own JS chunk
- `Suspense` boundary required above every lazy component — shows fallback during load
- `prefetch()` — calling import() early starts the download; browser caches it automatically
- onMouseEnter prefetch: user hovers → chunk downloads → by click it's already ready

---

## Problem 03 — Virtual List for 10K Items (Hard)

### Scenario

Build a virtualized list that efficiently renders 10,000 bookings by only mounting visible rows — the technique used by large tables and infinite scroll.

### Requirements

1. `useVirtualList` hook — calculates which items are visible based on scroll position
2. Only render visible items + overscan buffer
3. Fixed item height (simple version)
4. `ResizeObserver` to track container height changes
5. `transform: translateY` for positioning (GPU composited — no layout reflow)
6. Total height spacer div — makes scrollbar proportional to full list

### Expected Code

```tsx
// hooks/useVirtualList.ts
interface UseVirtualListOptions {
    itemCount:       number
    itemHeight:      number   // fixed height per item
    containerHeight: number
    overscan?:       number   // extra items above/below viewport (default 3)
}

export function useVirtualList(
    containerRef: React.RefObject<HTMLElement>,
    options:      UseVirtualListOptions
) {
    const { itemCount, itemHeight, containerHeight, overscan = 3 } = options
    const [scrollTop, setScrollTop] = useState(0)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handleScroll = () => setScrollTop(el.scrollTop)
        el.addEventListener("scroll", handleScroll, { passive: true })
        return () => el.removeEventListener("scroll", handleScroll)
    }, [containerRef])

    const totalHeight = itemCount * itemHeight

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex   = Math.min(
        itemCount - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const virtualItems = []
    for (let i = startIndex; i <= endIndex; i++) {
        virtualItems.push({ index: i, start: i * itemHeight, size: itemHeight })
    }

    return { virtualItems, totalHeight }
}
```

```tsx
// components/VirtualList.tsx
export function VirtualList<T>({
    items,
    itemHeight,
    overscan = 3,
    renderItem,
    style,
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerHeight, setContainerHeight] = useState(600)

    // Measure container height + re-measure on resize
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => {
            setContainerHeight(entry.contentRect.height)
        })
        observer.observe(el)
        setContainerHeight(el.clientHeight)
        return () => observer.disconnect()
    }, [])

    const { virtualItems, totalHeight } = useVirtualList(containerRef, {
        itemCount: items.length,
        itemHeight,
        containerHeight,
        overscan,
    })

    return (
        <div ref={containerRef} style={{ overflow: "auto", ...style }}>
            {/* Spacer — full height so scrollbar is proportional */}
            <div style={{ height: totalHeight, position: "relative" }}>
                {virtualItems.map(({ index, start, size }) => (
                    <div
                        key={index}
                        style={{
                            position:  "absolute",
                            top:       0,
                            left:      0,
                            right:     0,
                            height:    size,
                            transform: `translateY(${start}px)`,
                        }}
                    >
                        {renderItem(items[index], index)}
                    </div>
                ))}
            </div>
        </div>
    )
}

// Usage — 10,000 bookings, only ~20 DOM nodes at a time
function BookingVirtualList({ bookings }: { bookings: Booking[] }) {
    return (
        <VirtualList
            items={bookings}
            itemHeight={64}
            overscan={5}
            style={{ height: "600px" }}
            renderItem={(booking) => (
                <div className="flex items-center px-4 border-b" style={{ height: 64 }}>
                    <span>{booking.school_name}</span>
                    <span className="ml-auto text-sm text-gray-500">{booking.status}</span>
                </div>
            )}
        />
    )
}
```

### Virtualization Algorithm

```
Without virtualization (10,000 items):
  DOM nodes: 10,000 → browser lays out ALL of them → slow

With virtualization (containerHeight=600, itemHeight=64):
  Visible items: Math.ceil(600 / 64) = 10
  With overscan=5: rendered items = 10 + 5 + 5 = 20
  DOM nodes: ~20 at all times — regardless of total items

Scroll to 1000px:
  startIndex = Math.floor(1000 / 64) = 15
  endIndex   = Math.ceil(1600 / 64)  = 25
  With overscan: render indices 10 → 30
  Items 0-9 unmounted, items 31+ not mounted yet
```

### What We're Evaluating

- Only render visible items + overscan — DOM stays at ~20 nodes regardless of list size
- `transform: translateY(Xpx)` over `top: Xpx` — GPU composited, no layout reflow
- Total height spacer — scrollbar proportional to full list without rendering all items
- `ResizeObserver` — re-measures container when layout changes (not just window resize)
- `{ passive: true }` on scroll listener — browser scroll optimization hint
- `overscan` — prevents blank rows during fast scrolling
