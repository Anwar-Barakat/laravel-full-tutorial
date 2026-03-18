// ============================================================
// Problem 02 — Dependent Queries & Parallel Fetching
// ============================================================



// ============================================================
// Dependent query — fetch school after booking loads
//
// Step 1: const { data: booking } = useBooking(bookingId)
//
// Step 2: useQuery({
//   queryKey: ["school", booking?.school_id],
//   queryFn:  ({ signal }) => fetchSchool(booking!.school_id, signal),
//   enabled:  booking?.school_id !== undefined,
//   ← gate on school_id being available
// })
//
// Without enabled: query fires on mount with undefined school_id
//   → wasted request, potential 422 error, error state flash
//
// Chain isLoading: isLoading = isBookingLoading || isSchoolLoading
// Optional chaining ?.school_id: safely handles undefined during first render
// ============================================================



// ============================================================
// useQueries — parallel independent fetches
//
// const results = useQueries({
//   queries: [
//     { queryKey: ["stats"],         queryFn: fetchStats },
//     { queryKey: bookingKeys.list({ status:"pending" }), queryFn: fetchPending },
//     { queryKey: ["schools"],       queryFn: fetchSchools, staleTime: 10 * 60 * 1000 },
//   ]
// })
//
// const [statsResult, bookingsResult, schoolsResult] = results
//
// isLoading: results.some(r => r.isLoading)   ← any still loading
// isError:   results.some(r => r.isError)     ← any failed
//
// useQueries vs Promise.all:
//   Each query cached independently — cache hit on one doesn't re-trigger others
//   Partial failures: other queries still succeed
//   Each query still benefits from staleTime / background refetch
// ============================================================



// ============================================================
// select — transform cached data
//
// useQuery({
//   queryKey: bookingKeys.list(filters),
//   queryFn:  fetchBookings,
//   select: (data) => data.data.map(b => b.id),
//   ← transform data per-subscriber without modifying the cache
//   ← cache stores full PaginatedResponse<Booking>
//   ← this hook returns number[]
// })
//
// Key insight: multiple components can use same queryKey with different select:
//   useBookingIds()          → number[]
//   useExpensiveBookings()   → Booking[] filtered by amount
//   Both share ONE cached network response
//
// Stable select with useCallback:
//   select: useCallback((data) => data.data.filter(b => b.amount > 10_000), [])
//   Without useCallback: new fn reference each render → re-renders even if data unchanged
//   With useCallback: React.memo / subscriber can bail out if data unchanged
// ============================================================



// ============================================================
// placeholderData — instant loading feel
//
// Option 1: keepPreviousData (pagination / filter changes)
//   placeholderData: keepPreviousData
//   ← while new filter fetches: show old data, isPlaceholderData=true
//   ← dim the list with opacity-50 while isPlaceholderData
//
// Option 2: seed from list cache (detail page from list navigation)
//   placeholderData: () =>
//     queryClient
//       .getQueryData<PaginatedResponse<Booking>>(bookingKeys.lists())
//       ?.data.find(b => b.id === id)
//   ← if user came from list page: detail loads with list data instantly
//   ← avoids "loading" state entirely for navigation
//
// isPlaceholderData flag:
//   true when showing placeholder, false when real data arrives
//   Use to show subtle loading indicator (opacity, skeleton overlay)
//   Don't show full skeleton — content is already visible
// ============================================================



// ============================================================
// Background sync — refetchInterval
//
// useQuery({
//   queryKey: [...bookingKeys.detail(id), "live"],
//   queryFn:  ({ signal }) => fetchBookingStatus(id, signal),
//   refetchInterval: isTabVisible ? 5000 : false,
//   ← poll every 5s when tab active, pause when hidden
//   refetchIntervalInBackground: false,
//   ← don't poll when browser tab is backgrounded
// })
//
// isTabVisible: track via document.visibilitychange event
//   document.addEventListener("visibilitychange", () => setVisible(!document.hidden))
//
// Why pause when hidden: save requests + battery for background tabs
// refetchInterval: false disables polling without unmounting query
// ============================================================



// ============================================================
// Query cancellation with AbortSignal
//
// queryFn: ({ signal }) => fetch(url, { signal })
//   ← TanStack passes AbortSignal automatically
//   ← signal aborted when: component unmounts, query key changes, manual cancel
//
// Why signal matters for search:
//   User types fast → rapid key changes → multiple requests in flight
//   Without signal: slow old request can resolve AFTER new one → stale result shown
//   With signal: stale requests cancelled → only latest completes
//
// Manual cancellation:
//   queryClient.cancelQueries({ queryKey: bookingKeys.lists() })
//   ← used in optimistic update onMutate to prevent overwriting local state
//
// Axios cancellation (if not fetch):
//   queryFn: ({ signal }) => axios.get(url, { signal })
//   ← Axios supports AbortSignal since v0.22
// ============================================================



// ============================================================
// useInfiniteQuery — cursor-based infinite scroll
//
// useInfiniteQuery({
//   queryKey: [...bookingKeys.lists(), "infinite", filters],
//   queryFn:  ({ pageParam, signal }) =>
//     fetch(`/api/bookings?cursor=${pageParam}`, { signal }).then(r => r.json()),
//
//   initialPageParam: "",        ← v5 required: first page param value
//   getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
//   ← undefined = no more pages → hasNextPage = false
//
//   select: (data) => ({
//     ...data,
//     allBookings: data.pages.flatMap(p => p.data)
//     ← flatten pages into single array for rendering
//   })
// })
//
// Usage:
//   fetchNextPage()         ← load next page (triggered by scroll sentinel or button)
//   hasNextPage             ← false when getNextPageParam returns undefined
//   isFetchingNextPage      ← true while next page request in flight
//   data.allBookings        ← flattened via select
//
// fetchPreviousPage / hasPreviousPage: for bidirectional feeds
// ============================================================



// ============================================================
// Key concepts
//
// enabled flag patterns:
//   enabled: !!userId           ← wait for truthy value
//   enabled: step === "payment" ← conditional step in wizard
//   enabled: ids.length > 0     ← wait for non-empty array
//
// Query key serialization:
//   Objects compared by deep equality — { status:"paid" } equals { status:"paid" }
//   Arrays: ["bookings","list",{status:"paid"}] vs ["bookings","list",{status:"pending"}]
//     → different cache entries (different query keys)
//
// Stale-while-revalidate:
//   Stale data shown immediately (no spinner)
//   Background refetch runs silently
//   Component re-renders when fresh data arrives
//   UX: feels instant, data stays accurate
//
// When to use each:
//   useQuery:         single resource, any GET
//   useQueries:       multiple independent resources in parallel
//   useInfiniteQuery: paginated lists, feeds, infinite scroll
//   useMutation:      POST/PATCH/DELETE — always use for writes
//   queryClient.prefetchQuery: pre-warm cache on hover/likely navigation
// ============================================================
