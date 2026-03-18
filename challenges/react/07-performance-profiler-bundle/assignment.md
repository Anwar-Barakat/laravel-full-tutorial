# React Performance Deep Dive

Profile renders, analyze bundles, prevent wasted re-renders, and build a useWhyDidYouRender debug hook.

| Topic           | Details                                                         |
|-----------------|-----------------------------------------------------------------|
| React Profiler  | Measure component render cost                                   |
| Debug Re-renders | Why did this component render?                                 |
| Bundle Optimization | Dynamic imports, tree shaking                               |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Render Profiling & Debug Hooks (Medium)

### Scenario

Build debugging tools to identify and fix performance problems: a `useWhyDidYouRender` hook that logs which props changed on re-render, a Profiler wrapper, and demonstrate the correct vs incorrect usage of `memo`/`useMemo`/`useCallback`.

### Requirements

1. `useWhyDidYouRender(componentName, props)` — logs which props changed on re-render
2. `ProfilerWrapper` component using `React.Profiler` to measure render times
3. Show WRONG usage of `useMemo` (premature optimization) vs RIGHT usage
4. Demonstrate when `React.memo` helps vs when it's useless
5. `useStableCallback` — a hook that always returns a stable reference without stale closures
6. Show how to split context to prevent unnecessary re-renders

### Expected Code

```tsx
// hooks/useWhyDidYouRender.ts
import { useEffect, useRef } from "react"

export function useWhyDidYouRender<T extends Record<string, unknown>>(
  componentName: string,
  props: T
): void {
  const prevPropsRef = useRef<T>(props)

  useEffect(() => {
    const prevProps = prevPropsRef.current
    const changedProps: Record<string, { from: unknown; to: unknown }> = {}

    // Compare every prop shallowly
    const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(props)])
    for (const key of allKeys) {
      if (prevProps[key] !== props[key]) {
        changedProps[key] = { from: prevProps[key], to: props[key] }
      }
    }

    if (Object.keys(changedProps).length > 0) {
      console.group(`[${componentName}] Re-rendered because:`)
      for (const [key, { from, to }] of Object.entries(changedProps)) {
        const hint =
          typeof from === "function" && typeof to === "function"
            ? " (wrap in useCallback!)"
            : ""
        console.log(`  - ${key} changed:`, from, "→", to, hint)
      }
      console.groupEnd()
    }

    prevPropsRef.current = props
  })
  // No dep array — runs after every render to compare with previous
}
```

```tsx
// Usage in BookingCard
function BookingCard(props: BookingCardProps) {
  useWhyDidYouRender("BookingCard", props as Record<string, unknown>)
  // Console output example:
  // [BookingCard] Re-rendered because:
  //   - booking.status changed: "pending" → "paid"
  //   - onAction is a new reference (wrap in useCallback!)
  return <div>...</div>
}
```

```tsx
// components/ProfilerWrapper.tsx
import { Profiler, type ProfilerOnRenderCallback } from "react"

interface ProfilerWrapperProps {
  id:       string
  children: React.ReactNode
  onRender?: ProfilerOnRenderCallback
}

const defaultOnRender: ProfilerOnRenderCallback = (
  id,
  phase,           // "mount" | "update" | "nested-update"
  actualDuration,  // time spent rendering the committed update
  baseDuration,    // estimated time to render the whole subtree without memoization
  startTime,
  commitTime
) => {
  if (actualDuration > 16) {
    // Warn if render blocks a 60fps frame (> 16ms)
    console.warn(
      `[${id}] Slow render: ${actualDuration.toFixed(1)}ms (${phase})`,
      { baseDuration: baseDuration.toFixed(1) + "ms" }
    )
  } else {
    console.log(
      `[${id}] Render took ${actualDuration.toFixed(1)}ms (${phase})`
    )
  }
}

export function ProfilerWrapper({ id, children, onRender }: ProfilerWrapperProps) {
  return (
    <Profiler id={id} onRender={onRender ?? defaultOnRender}>
      {children}
    </Profiler>
  )
}

// Usage:
// <ProfilerWrapper id="bookings-list">
//   <BookingList bookings={bookings} />
// </ProfilerWrapper>
// Console: [bookings-list] Render took 12.3ms (mount)
// Console: ⚠ [bookings-list] Slow render: 23.1ms (update) { baseDuration: "45.2ms" }
```

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
// hooks/useStableCallback.ts
// Returns a stable function reference that always calls the latest version.
// Solves the stale-closure problem without adding the callback to dep arrays.
import { useCallback, useRef, useLayoutEffect } from "react"

export function useStableCallback<T extends (...args: never[]) => unknown>(
  fn: T
): T {
  const fnRef = useRef<T>(fn)

  // Update ref synchronously after every render (before effects read it)
  useLayoutEffect(() => {
    fnRef.current = fn
  })

  // Stable wrapper — identity never changes, but always calls latest fn
  return useCallback((...args: Parameters<T>) => {
    return fnRef.current(...args)
  }, []) as T
}

// Usage — safe to pass to memo'd children or include in empty dep arrays
function ParentComponent() {
  const [count, setCount] = useState(0)

  const handleAction = useStableCallback((bookingId: number) => {
    console.log("count at call time:", count)  // always fresh, no stale closure
    setCount((c) => c + 1)
  })

  return <ExpensiveChild onAction={handleAction} />
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
| `useStableCallback` | Callback in empty dep array without stale closure | Callback changes deps are fine |
| Context split | Context mixes fast + slow changing state | Single concern context |

### What We're Evaluating

- `useRef` to track previous props — updated at end of each render
- `useEffect` with no dep array — runs after every render for comparison
- `React.Profiler` `onRender` callback signature — `(id, phase, actualDuration, baseDuration, ...)`
- `actualDuration > 16` threshold — 60fps frame budget
- `useStableCallback` uses `useLayoutEffect` not `useEffect` — synchronous before reads
- Context splitting by update frequency — data / UI state / filter in separate providers

---

## Problem 02 — Dynamic Import & Code Splitting Strategy (Hard)

### Scenario

Implement a code splitting strategy for a large booking dashboard: split by route, split heavy libraries, and measure bundle impact.

### Requirements

1. Route-based splitting with `React.lazy` for each page
2. Component-level splitting: load chart library only when chart is visible
3. `useIntersectionObserver` — load component when scrolled into view
4. Prefetch pattern: start loading next page on hover
5. Measure: show component load time to user as skeleton
6. Error handling: fallback when chunk fails to load (network error)

### Expected Code

```tsx
// router/AppRouter.tsx — route-level code splitting
import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

// Each page is its own JS chunk — only loaded when route is visited
const BookingsPage  = lazy(() => import("./pages/BookingsPage"))
const ReportsPage   = lazy(() => import("./pages/ReportsPage"))
const SettingsPage  = lazy(() => import("./pages/SettingsPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))

// Prefetch helper — starts the dynamic import early without rendering
function prefetch(importFn: () => Promise<unknown>) {
  importFn()   // fire and forget — webpack caches the result
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <nav>
        <a href="/bookings">Bookings</a>
        {/* Prefetch ReportsPage chunk on hover — loads before click */}
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

```tsx
// hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from "react"

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean   // stop observing after first intersection
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const { freezeOnceVisible = true, ...observerOptions } = options
  const ref       = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        if (freezeOnceVisible) observer.unobserve(el)  // stop after first trigger
      }
    }, observerOptions)

    observer.observe(el)
    return () => observer.disconnect()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, isVisible]
}
```

```tsx
// components/LazyOnVisible.tsx
// Renders children only after the container scrolls into viewport.
// Until then, shows the fallback skeleton.
import { lazy, Suspense, useState, useEffect } from "react"

interface LazyOnVisibleProps {
  fallback:  React.ReactNode
  children:  React.ReactNode
  rootMargin?: string   // trigger before element enters (e.g. "200px")
}

export function LazyOnVisible({
  fallback,
  children,
  rootMargin = "0px",
}: LazyOnVisibleProps) {
  const [containerRef, isVisible] = useIntersectionObserver({
    rootMargin,
    freezeOnceVisible: true,
  })

  return (
    <div ref={containerRef}>
      {isVisible ? (
        <Suspense fallback={fallback}>{children}</Suspense>
      ) : (
        fallback
      )}
    </div>
  )
}

// Component-level lazy — chart library (~300 KB) only loads when visible
const BookingChart = lazy(() =>
  import("./BookingChart").then((module) => ({
    default: module.BookingChart,
  }))
)

// Usage in a dashboard page
function DashboardPage() {
  const { data: chartData } = useBookingChartData()

  return (
    <div>
      <BookingStats />

      {/* Chart and recharts library only load when scrolled into view */}
      <LazyOnVisible
        fallback={<ChartSkeleton />}
        rootMargin="100px"   // start loading 100px before entering viewport
      >
        <BookingChart data={chartData} />
      </LazyOnVisible>

      <RecentBookings />
    </div>
  )
}
```

```tsx
// components/ChunkErrorBoundary.tsx
// Catches dynamic import failures (network error, chunk expired after deploy)
"use client"  // or just a class component — error boundaries must be class-based

import { Component, type ReactNode } from "react"

interface Props {
  children:  ReactNode
  fallback?: ReactNode
}

interface State {
  hasError:     boolean
  isChunkError: boolean
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false }

  static getDerivedStateFromError(error: Error): State {
    // Detect chunk load failures specifically
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Failed to fetch dynamically imported module")

    return { hasError: true, isChunkError }
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      // Hard reload to fetch the new chunk after a deploy
      window.location.reload()
    } else {
      this.setState({ hasError: false, isChunkError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            {this.state.isChunkError
              ? "A new version is available. Please refresh."
              : "Something went wrong loading this section."}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {this.state.isChunkError ? "Refresh page" : "Try again"}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

```tsx
// components/TimedSuspense.tsx
// Shows skeleton during load + measures how long the chunk took to load.
import { Suspense, useState, useEffect, useRef } from "react"

interface TimedSuspenseProps {
  fallback:    React.ReactNode
  children:    React.ReactNode
  onLoadTime?: (ms: number) => void
}

function LoadTimer({ onLoadTime }: { onLoadTime?: (ms: number) => void }) {
  const startRef = useRef(performance.now())

  useEffect(() => {
    // This effect only runs when the child resolves (Suspense lifted)
    const elapsed = performance.now() - startRef.current
    console.log(`[TimedSuspense] Loaded in ${elapsed.toFixed(0)}ms`)
    onLoadTime?.(elapsed)
  }, [onLoadTime])

  return null  // renders nothing — only used for timing side-effect
}

export function TimedSuspense({ fallback, children, onLoadTime }: TimedSuspenseProps) {
  return (
    <Suspense fallback={fallback}>
      <LoadTimer onLoadTime={onLoadTime} />
      {children}
    </Suspense>
  )
}

// Full usage pattern with all layers
function ReportsPage() {
  return (
    <ChunkErrorBoundary>
      <TimedSuspense
        fallback={<ReportSkeleton />}
        onLoadTime={(ms) => analytics.track("report_load", { ms })}
      >
        <LazyOnVisible fallback={<ChartSkeleton />} rootMargin="200px">
          {/* Recharts + chart data — lazy loaded on scroll */}
          <BookingChart data={[]} />
        </LazyOnVisible>
      </TimedSuspense>
    </ChunkErrorBoundary>
  )
}
```

```tsx
// ── Webpack magic comments for chunk naming & prefetch ───────

// Named chunk — appears as "reports.[hash].js" in bundle analysis
const ReportsPage = lazy(
  () => import(/* webpackChunkName: "reports" */ "./pages/ReportsPage")
)

// Prefetch directive — browser downloads during idle time
const SettingsPage = lazy(
  () => import(/* webpackPrefetch: true */ "./pages/SettingsPage")
)

// Preload directive — downloads with high priority (use for critical-path chunks)
const DashboardPage = lazy(
  () => import(/* webpackPreload: true */ "./pages/DashboardPage")
)
```

### Bundle Splitting Mental Model

```
Initial load:           app.[hash].js  (React + router + shared code)
Route-level splitting:  bookings.[hash].js  ← loaded on /bookings visit
                        reports.[hash].js   ← loaded on /reports visit
Component splitting:    booking-chart.[hash].js  ← loaded on scroll into viewport
Prefetch:               reports chunk starts downloading on nav hover
Preload:                dashboard chunk downloads in parallel with initial bundle
```

### What We're Evaluating

- `React.lazy(() => import("..."))` — takes a factory returning a Promise
- `Suspense` boundary required above every lazy component
- `prefetch()` — just calling the import factory is enough; webpack caches the module
- `IntersectionObserver` + `freezeOnceVisible` — observe once then disconnect
- `rootMargin: "200px"` — trigger 200px before element enters viewport (preload buffer)
- `ChunkLoadError` detection — different error name than generic runtime errors
- `window.location.reload()` on chunk error — fetch updated chunk after a deploy
- `useLayoutEffect` in `LoadTimer` — fires before paint (more accurate timing)
- Webpack magic comments: `webpackChunkName`, `webpackPrefetch`, `webpackPreload`
