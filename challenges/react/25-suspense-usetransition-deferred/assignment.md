# REACT_TEST_29 — Suspense • useTransition • Deferred

**Time:** 25 minutes | **Stack:** React 18+ + TypeScript

---

## Problem 01 — React Suspense & Concurrent Features (Medium)

Build a Suspense-based data fetching layer, use `useTransition` to keep the search input responsive during slow navigation, and `useDeferredValue` to defer expensive list filtering.

---

### Part A — Why concurrent features?

```ts
// Problem: expensive state update blocks the UI thread
const [query, setQuery] = useState("")
// When user types fast:
setQuery("lon")   // renders full filtered list synchronously
setQuery("lond")  // another full render before first paints
setQuery("londo") // UI jank — input feels laggy
```

**Solutions:**
- `useTransition` — marks an update as "non-urgent": UI stays responsive, transition runs in background
- `useDeferredValue` — defers a value update; UI renders with stale value first, updates when idle
- `Suspense` — declarative loading state: component suspends (throws Promise), boundary shows fallback

---

### Part B — `createResource` — the Suspense data pattern

**File:** `lib/createResource.ts`

Suspense works by catching thrown Promises. A "resource" wraps a fetch in a way that throws when pending and returns the value when resolved:

```ts
type ResourceStatus = "pending" | "success" | "error"

interface Resource<T> {
  read(): T   // throws Promise if pending, throws Error if failed, returns T if resolved
}

function createResource<T>(promise: Promise<T>): Resource<T> {
  let status: ResourceStatus = "pending"
  let result: T
  let error: unknown

  // Start fetching immediately
  const suspender = promise.then(
    (data) => { status = "success"; result = data },
    (err)  => { status = "error";   error  = err  }
  )

  return {
    read() {
      if (status === "pending") throw suspender   // Suspense catches this
      if (status === "error")   throw error        // ErrorBoundary catches this
      return result!                               // already resolved
    }
  }
}
```

**Usage:**
```ts
// Create resource OUTSIDE the component (not inside useEffect)
const bookingsResource = createResource(fetch("/api/bookings").then(r => r.json()))

// Component suspends until data is ready
function BookingList() {
  const bookings = bookingsResource.read()  // throws if still loading
  return <ul>{bookings.map(b => <li key={b.id}>{b.school_name}</li>)}</ul>
}

// Wrap with Suspense + ErrorBoundary
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<BookingsSkeleton />}>
    <BookingList />
  </Suspense>
</ErrorBoundary>
```

---

### Part C — `useBookingResource` hook

**File:** `hooks/useBookingResource.ts`

```ts
function useBookingResource(filters: BookingFilters): Resource<Booking[]>
```

**Implementation:**
```ts
// Cache resources by key to avoid re-fetching same data
const resourceCache = new Map<string, Resource<Booking[]>>()

function useBookingResource(filters: BookingFilters): Resource<Booking[]> {
  const key = JSON.stringify(filters)

  if (!resourceCache.has(key)) {
    const params = new URLSearchParams(filters as Record<string, string>)
    const promise = fetch(`/api/bookings?${params}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<Booking[]>
    })
    resourceCache.set(key, createResource(promise))
  }

  return resourceCache.get(key)!
}

// Cache eviction — clear stale entries on filter change
function clearResourceCache() {
  resourceCache.clear()
}
```

---

### Part D — `useTransition` for search

**File:** `components/BookingSearch.tsx`

`useTransition` returns `[isPending, startTransition]`. Wrapping a state update in `startTransition` marks it as interruptible — React can abandon it if a more urgent update arrives (like another keystroke).

```tsx
function BookingSearch() {
  const [query, setQuery]     = useState("")
  const [filters, setFilters] = useState<BookingFilters>({ search: "", status: "" })
  const [isPending, startTransition] = useTransition()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)              // urgent: update input immediately (no transition)

    startTransition(() => {
      setFilters(prev => ({ ...prev, search: value }))
      // ← non-urgent: updating filters may trigger re-suspend or expensive render
      // React can interrupt and restart this if another keystroke arrives
    })
  }

  return (
    <div>
      <div className="relative">
        <input
          value={query}
          onChange={handleSearch}
          placeholder="Search bookings…"
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        />
        {/* Show spinner while transition is in progress */}
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* isPending: show stale results with opacity while new ones load */}
      <div className={`transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}>
        <Suspense fallback={<BookingsSkeleton />}>
          <BookingResultsWithResource filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
```

> **Key distinction:** `setQuery` runs immediately (urgent — input must be responsive). `setFilters` inside `startTransition` is deferrable — React skips intermediate states if input changes again quickly.

---

### Part E — `useDeferredValue` for expensive filtering

**File:** `components/DestinationFilter.tsx`

`useDeferredValue` is simpler than `useTransition` — it defers a value so the render using it runs at lower priority:

```tsx
function DestinationFilter({ destinations }: { destinations: Destination[] }) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)    // lags behind query intentionally

  // This useMemo runs with the DEFERRED value — doesn't block typing
  const filtered = useMemo(() =>
    destinations.filter(d =>
      d.name.toLowerCase().includes(deferredQuery.toLowerCase()) ||
      d.city.toLowerCase().includes(deferredQuery.toLowerCase())
    ),
    [destinations, deferredQuery]   // ← deferredQuery, not query
  )

  // Detect stale: query !== deferredQuery means filtering is in progress
  const isStale = query !== deferredQuery

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full border rounded-lg px-4 py-2 mb-4"
        placeholder="Filter destinations…"
      />

      {/* Fade to indicate stale results */}
      <div className={`transition-opacity ${isStale ? "opacity-50" : "opacity-100"}`}>
        <p className="text-sm text-gray-500 mb-3">{filtered.length} destinations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => <DestinationCard key={d.id} destination={d} />)}
        </div>
      </div>
    </div>
  )
}
```

> **`useTransition` vs `useDeferredValue`:**
> - `useTransition`: you control which state setter is non-urgent (`startTransition(() => setState(...))`)
> - `useDeferredValue`: you give it a value that you want to "lag" behind the real value
> - Use `useTransition` when you trigger the update; `useDeferredValue` when you receive a prop

---

### Part F — `SuspenseList` for coordinated loading

`SuspenseList` controls the order in which multiple `Suspense` boundaries reveal their content:

```tsx
import { SuspenseList } from "react"

function DashboardPage() {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      {/* Reveals in order: summary → recent bookings → chart */}
      {/* "collapsed": only shows the next loading skeleton, not all at once */}

      <Suspense fallback={<SummarySkeleton />}>
        <SummaryCards resource={summaryResource} />
      </Suspense>

      <Suspense fallback={<BookingsSkeleton />}>
        <RecentBookings resource={bookingsResource} />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart resource={chartResource} />
      </Suspense>
    </SuspenseList>
  )
}
```

**`revealOrder` options:**
- `"forwards"` — reveal in order (first → last), even if later ones load first
- `"backwards"` — reveal in reverse order
- `"together"` — wait for ALL to resolve, reveal simultaneously

**`tail` options:**
- `"collapsed"` — only show one loading indicator at a time
- `"hidden"` — hide all loading indicators except the first pending one

---

### Part G — Skeleton components

**File:** `components/skeletons/BookingsSkeleton.tsx`

```tsx
function BookingsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading bookings">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
      {/* aria-busy="true" tells screen readers content is loading */}
    </div>
  )
}
```

---

## Problem 02 — Advanced Concurrent Features (Hard)

Add `useOptimistic` for instant UI feedback, streaming with nested Suspense boundaries, and transition-aware loading states.

---

### Part A — `useOptimistic` for instant booking status updates

**React 19 / Next.js 14 feature:**

```ts
function useOptimistic<T, U>(
  state: T,
  updateFn: (currentState: T, optimisticValue: U) => T
): [T, (optimisticValue: U) => void]
```

**Implementation:**
```tsx
function BookingStatusRow({ booking }: { booking: Booking }) {
  const [optimisticBooking, addOptimisticUpdate] = useOptimistic(
    booking,
    (current, newStatus: Booking["status"]) => ({ ...current, status: newStatus })
  )
  const [isPending, startTransition] = useTransition()

  const updateStatus = (newStatus: Booking["status"]) => {
    startTransition(async () => {
      addOptimisticUpdate(newStatus)   // ← instantly shows new status in UI

      // Actual API call in background
      await fetch(`/api/bookings/${booking.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      // If API fails: optimistic state automatically reverts to original booking
    })
  }

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg
                     ${isPending ? "opacity-75" : ""}`}>
      <span>{optimisticBooking.school_name}</span>
      <StatusBadge status={optimisticBooking.status} />
      <select
        value={optimisticBooking.status}
        onChange={e => updateStatus(e.target.value as Booking["status"])}
        disabled={isPending}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  )
}
```

---

### Part B — Nested Suspense boundaries (streaming)

Nest `Suspense` boundaries to progressively reveal content — fast data shows first, slow data shows later:

```tsx
function BookingDetailPage({ bookingId }: { bookingId: number }) {
  const bookingResource = useBookingResource({ id: String(bookingId) })

  return (
    // Outer boundary: entire page shell
    <Suspense fallback={<PageSkeleton />}>
      <BookingDetail resource={bookingResource}>
        {/* Inner boundary: comments section loads independently */}
        <Suspense fallback={<CommentsSkeleton />}>
          <CommentsSection bookingId={bookingId} />
        </Suspense>

        {/* Another inner boundary: attachments */}
        <Suspense fallback={<AttachmentsSkeleton />}>
          <AttachmentsList bookingId={bookingId} />
        </Suspense>
      </BookingDetail>
    </Suspense>
  )
}
```

**Why nest?** The booking detail (critical path) loads first. If comments are slow, the user still sees the booking — they don't wait for everything. Each boundary is independent.

---

### Part C — Transition-based navigation

Using `useTransition` for route changes keeps the current page visible until the new page is ready:

```tsx
function NavigationLink({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    startTransition(() => {
      navigate(to)   // navigation wrapped in transition = current page stays visible
    })
  }

  return (
    <a
      href={to}
      onClick={handleClick}
      className={`relative ${isPending ? "text-blue-400" : "text-gray-700"}`}
      aria-disabled={isPending}
    >
      {children}
      {isPending && (
        <span className="absolute -right-4 top-1/2 -translate-y-1/2
                         w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
    </a>
  )
}
```

---

### Part D — `use()` hook — React 19 Suspense integration

React 19 introduces `use(promise)` which suspends inside a component without the resource wrapper boilerplate:

```tsx
import { use } from "react"

// Fetch can be created OUTSIDE the component and passed in as a prop
function BookingDetail({ bookingPromise }: { bookingPromise: Promise<Booking> }) {
  const booking = use(bookingPromise)   // suspends until resolved, no .read() pattern needed

  return (
    <div>
      <h1>{booking.school_name}</h1>
      <p>{booking.destination}</p>
    </div>
  )
}

// Parent creates the promise and passes it in (Suspense handles the loading state)
function BookingsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [bookingPromise, setBookingPromise] = useState<Promise<Booking> | null>(null)

  const handleSelect = (id: number) => {
    setSelectedId(id)
    setBookingPromise(fetch(`/api/bookings/${id}`).then(r => r.json()))
  }

  return (
    <>
      <BookingList onSelect={handleSelect} />
      {bookingPromise && (
        <Suspense fallback={<DetailSkeleton />}>
          <BookingDetail bookingPromise={bookingPromise} />
        </Suspense>
      )}
    </>
  )
}
```

---

### Part E — `startTransition` (standalone, outside hooks)

`startTransition` can also be imported directly from React — no `useTransition` needed:

```ts
import { startTransition } from "react"

// Use when you don't need the isPending flag:
function handleFilterChange(filter: string) {
  startTransition(() => {
    setActiveFilter(filter)
  })
}
```

---

### Key concepts reference

```ts
// Suspense — throw a Promise to suspend:
//   pending  → throws Promise  → Suspense shows fallback
//   resolved → returns value   → component renders normally
//   rejected → throws Error    → ErrorBoundary catches it

// createResource vs use():
//   createResource (React 18): manual wrapper, works today, slightly verbose
//   use(promise) (React 19): built-in, cleaner, same suspension mechanic

// useTransition — when to use:
//   - Tab/page navigation: keep current page while next loads
//   - Search: keep input responsive while results update
//   - Any state update that may trigger Suspense re-suspension
//   ← DO NOT use for: urgent UI (input value, drag position, scroll)

// useDeferredValue — when to use:
//   - You receive a value as prop/from parent (can't wrap in startTransition)
//   - Deferring heavy useMemo computation
//   - query !== deferredQuery detects stale state → show opacity hint

// SuspenseList order matters:
//   "forwards" + "collapsed" = ideal for feeds/lists (each item reveals in sequence)
//   "together" = ideal for dashboards where partial display is confusing

// useOptimistic — revert behaviour:
//   If the async action throws: React automatically reverts to original state
//   If it succeeds: state stays at optimistic value until real state updates

// aria-busy="true" on loading containers:
//   Tells screen readers the content is being loaded
//   Complement to Suspense fallbacks for accessibility
```
