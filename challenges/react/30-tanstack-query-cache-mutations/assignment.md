# REACT_TEST_32 — TanStack Query • Cache • Mutations

**Time:** 25 minutes | **Stack:** React + TypeScript + TanStack Query v5

---

## Problem 01 — Booking Queries & Mutations (Medium)

Build the booking data layer with TanStack Query: typed queries, mutations with cache invalidation, and optimistic updates.

---

### QueryClient setup

```ts
// queryClient.ts
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min — data considered fresh
      gcTime:    1000 * 60 * 10,  // 10 min — cache kept after unmount (was cacheTime in v4)
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
```

**`staleTime` vs `gcTime`:**
- `staleTime`: how long until data is considered stale → background refetch triggered
- `gcTime`: how long unused cache entry is kept in memory before garbage-collected
- Stale data is still shown immediately (stale-while-revalidate) — no loading spinner

```tsx
// main.tsx / App.tsx
<QueryClientProvider client={queryClient}>
  <App />
  {import.meta.env.DEV && <ReactQueryDevtools />}
</QueryClientProvider>
```

---

### Types

```ts
interface Booking {
  id: number
  school_name: string
  contact_email: string
  trip_date: string
  student_count: number
  status: "pending" | "paid" | "cancelled"
  amount: number
}

interface BookingFilters {
  status?: Booking["status"]
  search?: string
  page?: number
}

interface PaginatedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number }
}
```

---

### Query keys factory

```ts
// queryKeys.ts — centralised, composable
export const bookingKeys = {
  all:     ()           => ["bookings"]                  as const,
  lists:   ()           => [...bookingKeys.all(), "list"] as const,
  list:    (f: BookingFilters) => [...bookingKeys.lists(), f] as const,
  details: ()           => [...bookingKeys.all(), "detail"] as const,
  detail:  (id: number) => [...bookingKeys.details(), id]   as const,
}
// bookingKeys.list({ status: "paid" }) → ["bookings", "list", { status: "paid" }]
// bookingKeys.detail(42)               → ["bookings", "detail", 42]
```

**Why a factory?** Invalidating `bookingKeys.lists()` invalidates ALL list queries
regardless of filter — no need to track which exact filters were used.

---

### useBookings — list query

```ts
// hooks/useBookings.ts
import { useQuery } from "@tanstack/react-query"

async function fetchBookings(
  filters: BookingFilters,
  signal: AbortSignal
): Promise<PaginatedResponse<Booking>> {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  )
  const res = await fetch(`/api/bookings?${params}`, { signal })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn:  ({ signal }) => fetchBookings(filters, signal),
    // signal auto-passed by TanStack — cancels fetch when query becomes inactive
    placeholderData: keepPreviousData,
    // keepPreviousData: show old results while new page/filter loads (no blank flash)
  })
}
```

**Usage:**
```tsx
const { data, isLoading, isFetching, error, isPlaceholderData } = useBookings({ status: "paid" })
// isLoading: true only on first fetch (no cached data yet)
// isFetching: true on background refetch too — use for subtle loading indicator
// isPlaceholderData: true when showing previous filter's data
```

---

### useBooking — single booking query

```ts
export function useBooking(id: number | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(id!),
    queryFn:  ({ signal }) => fetchBooking(id!, signal),
    enabled:  id !== undefined,  // ← don't fetch until id is known
    staleTime: 1000 * 60 * 2,   // single booking: shorter stale time
  })
}
```

**`enabled` flag:** prevents query from running when id is undefined/null.
Critical for dependent queries (see Problem 02).

---

### useCreateBooking — mutation

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Booking, "id" | "status" | "amount">) =>
      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.ok ? r.json() : Promise.reject(r)),

    onSuccess: (newBooking: Booking) => {
      // 1. Invalidate all list queries → they refetch in background
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })

      // 2. Seed the detail cache immediately (free — we already have the data)
      queryClient.setQueryData(bookingKeys.detail(newBooking.id), newBooking)
    },

    onError: (error) => {
      console.error("Create booking failed:", error)
    },
  })
}
```

**Usage:**
```tsx
const { mutate, mutateAsync, isPending, isError, error } = useCreateBooking()

// fire-and-forget
mutate(formData, {
  onSuccess: () => navigate(`/bookings/${result.id}`),
  onError:   (e) => toast.error(e.message),
})

// or await
try {
  const booking = await mutateAsync(formData)
  navigate(`/bookings/${booking.id}`)
} catch (e) { /* handle */ }
```

---

### useUpdateBooking — mutation with optimistic update

```ts
export function useUpdateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Booking> }) =>
      fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),

    onMutate: async ({ id, data }) => {
      // 1. Cancel in-flight queries to avoid overwriting optimistic state
      await queryClient.cancelQueries({ queryKey: bookingKeys.detail(id) })

      // 2. Snapshot previous value for rollback
      const previous = queryClient.getQueryData<Booking>(bookingKeys.detail(id))

      // 3. Optimistically update cache
      queryClient.setQueryData<Booking>(bookingKeys.detail(id), old =>
        old ? { ...old, ...data } : old
      )

      return { previous }  // ← context passed to onError
    },

    onError: (_err, { id }, context) => {
      // Rollback to snapshot
      if (context?.previous)
        queryClient.setQueryData(bookingKeys.detail(id), context.previous)
    },

    onSettled: (_data, _err, { id }) => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })
    },
  })
}
```

**Optimistic update lifecycle:**
1. `onMutate` — runs before request, returns context (snapshot)
2. `onError` — rollback using context.previous
3. `onSuccess` — update or invalidate
4. `onSettled` — always runs (like finally) — use for cleanup/sync

---

### useDeleteBooking — mutation with list update

```ts
export function useDeleteBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/bookings/${id}`, { method: "DELETE" }).then(r => {
        if (!r.ok) throw new Error("Delete failed")
      }),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookingKeys.lists() })

      // Snapshot all list queries
      const previousLists = queryClient.getQueriesData<PaginatedResponse<Booking>>({
        queryKey: bookingKeys.lists()
      })

      // Remove from all cached list pages
      queryClient.setQueriesData<PaginatedResponse<Booking>>(
        { queryKey: bookingKeys.lists() },
        old => old
          ? { ...old, data: old.data.filter(b => b.id !== id) }
          : old
      )

      return { previousLists }
    },

    onError: (_err, _id, context) => {
      // Restore all list snapshots
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}
```

---

### Prefetch on hover

```tsx
// BookingRow.tsx
function BookingRow({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient()

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: bookingKeys.detail(booking.id),
      queryFn:  ({ signal }) => fetchBooking(booking.id, signal),
      staleTime: 1000 * 60,  // don't prefetch if already fresh within 1 min
    })
  }

  return (
    <tr onMouseEnter={prefetch} onFocus={prefetch}>
      <td>{booking.school_name}</td>
      <td><Link to={`/bookings/${booking.id}`}>{booking.id}</Link></td>
    </tr>
  )
}
```

**Why prefetch on hover/focus?** By the time user clicks, data is already cached →
detail page renders instantly with no loading spinner.

---

### Error handling

```tsx
// Wrap app or subtree
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary onReset={reset} fallbackRender={({ error, resetErrorBoundary }) => (
      <div>
        <p>{error.message}</p>
        <button onClick={resetErrorBoundary}>Retry</button>
      </div>
    )}>
      <Suspense fallback={<Skeleton />}>
        <BookingList />
      </Suspense>
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

---

## Problem 02 — Dependent Queries & Parallel Fetching (Hard)

Advanced query patterns: dependent queries, parallel fetching, data transformation, and background sync.

---

### Dependent query (fetch school after booking)

```ts
// hooks/useBookingWithSchool.ts
export function useBookingWithSchool(bookingId: number) {
  // Step 1: fetch booking
  const {
    data: booking,
    isLoading: isBookingLoading,
  } = useBooking(bookingId)

  // Step 2: fetch school — ONLY when booking.school_id is available
  const {
    data: school,
    isLoading: isSchoolLoading,
  } = useQuery({
    queryKey: ["school", booking?.school_id],
    queryFn:  ({ signal }) => fetchSchool(booking!.school_id, signal),
    enabled:  booking?.school_id !== undefined,
    // ← enabled=false until booking resolves — no requests before we have school_id
  })

  return {
    booking,
    school,
    isLoading: isBookingLoading || isSchoolLoading,
  }
}
```

**Why enabled:** Without `enabled`, query would fire with `undefined` school_id
the moment the component mounts — wasted request + potential 422 error.

---

### useQueries — parallel independent fetches

```ts
import { useQueries } from "@tanstack/react-query"

export function useDashboardData() {
  const results = useQueries({
    queries: [
      {
        queryKey: ["stats"],
        queryFn:  ({ signal }) => fetchStats(signal),
        staleTime: 1000 * 30,
      },
      {
        queryKey: bookingKeys.list({ status: "pending" }),
        queryFn:  ({ signal }) => fetchBookings({ status: "pending" }, signal),
      },
      {
        queryKey: ["schools"],
        queryFn:  ({ signal }) => fetchSchools(signal),
        staleTime: 1000 * 60 * 10,
      },
    ],
  })

  const [statsResult, bookingsResult, schoolsResult] = results

  return {
    stats:    statsResult.data,
    bookings: bookingsResult.data,
    schools:  schoolsResult.data,
    isLoading: results.some(r => r.isLoading),
    isError:   results.some(r => r.isError),
  }
}
```

**`useQueries` vs `Promise.all`:** useQueries caches each query independently —
cache hit on one doesn't trigger the others. Also handles partial failures gracefully.

---

### select — transform cached data

```ts
export function useBookingIds(filters: BookingFilters) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn:  ({ signal }) => fetchBookings(filters, signal),
    select: (data) => data.data.map(b => b.id),
    // ← select transforms the cached data without modifying the cache itself
    // ← cache stores full PaginatedResponse<Booking>
    // ← this hook returns number[]
  })
}

export function useExpensiveBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn:  ({ signal }) => fetchBookings(filters, signal),
    select: useCallback(
      (data: PaginatedResponse<Booking>) =>
        data.data.filter(b => b.amount > 10_000),
      []
    ),
    // ← useCallback: select is referentially stable → avoids unnecessary re-renders
    // ← without useCallback: new function each render → component re-renders even if data unchanged
  })
}
```

**Key insight:** Multiple components can use the same `queryKey` with different
`select` transforms — they share one cached response but each receives its own slice.

---

### placeholderData — instant loading feel

```ts
// Option 1: keepPreviousData (pagination / filter changes)
import { keepPreviousData } from "@tanstack/react-query"

export function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn:  ({ signal }) => fetchBookings(filters, signal),
    placeholderData: keepPreviousData,
    // While new filter fetches: show old data + isPlaceholderData=true
    // No blank flash between filter changes
  })
}

// Option 2: static placeholder (skeleton-shaped data)
export function useBooking(id: number) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  ({ signal }) => fetchBooking(id, signal),
    placeholderData: () =>
      // Try to find booking in the list cache (avoids extra request!)
      queryClient
        .getQueryData<PaginatedResponse<Booking>>(bookingKeys.lists())
        ?.data.find(b => b.id === id),
    // If user navigated from list → detail page loads with list data instantly
  })
}
```

---

### Background sync — refetchInterval

```ts
export function useLiveBookingStatus(id: number) {
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden)

  useEffect(() => {
    const handler = () => setIsTabVisible(!document.hidden)
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [])

  return useQuery({
    queryKey: [...bookingKeys.detail(id), "live"],
    queryFn:  ({ signal }) => fetchBookingStatus(id, signal),
    refetchInterval: isTabVisible ? 5000 : false,
    // Poll every 5s when tab active, pause when hidden (save requests)
    refetchIntervalInBackground: false,
    // Don't poll when browser tab is in background
  })
}
```

---

### Query cancellation with AbortController

```ts
// TanStack passes signal automatically to queryFn:
async function fetchBooking(id: number, signal: AbortSignal): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}`, { signal })
  // When component unmounts / query key changes → signal aborted → fetch cancelled
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Manual cancellation:
export function useCancellableSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn:  ({ signal }) => searchBookings(query, signal),
    enabled:  query.length > 2,
    // Query auto-cancelled when query key changes (user types another char)
    // Only the final query actually completes
  })
}
```

**Why cancellation matters:** Without `signal`, a slow request for an old search
term can complete AFTER a newer one — causing a stale result flash.

---

### useInfiniteQuery — infinite scroll

```ts
import { useInfiniteQuery } from "@tanstack/react-query"

interface CursorPage {
  data: Booking[]
  nextCursor: string | null
}

export function useInfiniteBookings(filters: Omit<BookingFilters, "page">) {
  return useInfiniteQuery({
    queryKey: [...bookingKeys.lists(), "infinite", filters],
    queryFn:  ({ pageParam, signal }) =>
      fetch(`/api/bookings?cursor=${pageParam}&${new URLSearchParams(filters as any)}`,
            { signal })
        .then(r => r.json() as Promise<CursorPage>),

    initialPageParam: "",        // ← v5: required, replaces getNextPageParam default
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // undefined = no more pages (hasNextPage = false)

    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      allBookings: data.pages.flatMap(p => p.data),
      // ← flatten for easy rendering
    }),
  })
}

// Usage:
function InfiniteBookingList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteBookings({ status: "paid" })

  return (
    <>
      {data?.allBookings.map(b => <BookingRow key={b.id} booking={b} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      )}
    </>
  )
}
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `staleTime` | How long data is fresh — no background refetch during this window |
| `gcTime` | How long unused cache stays in memory |
| `enabled` | Gate queries on dependent data being available |
| `placeholderData: keepPreviousData` | No blank flash on filter/page change |
| `select` | Transform data per-subscriber without modifying cache |
| `onMutate` | Optimistic update + return snapshot for rollback |
| `onSettled` | Always invalidate after mutation (like `finally`) |
| `refetchInterval` | Polling — disable when tab hidden |
| `signal` | Pass to `fetch` for auto-cancellation |
| `useQueries` | Parallel independent queries with independent caches |
| `queryKeys factory` | Invalidate broad or narrow — `lists()` vs `detail(id)` |
| `prefetchQuery` | Pre-warm cache on hover/focus for instant navigation |
