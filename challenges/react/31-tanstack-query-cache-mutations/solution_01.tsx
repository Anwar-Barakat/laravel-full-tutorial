// ============================================================
// Problem 01 — Booking Queries & Mutations
// ============================================================



// ============================================================
// QueryClient setup (queryClient.ts)
//
// new QueryClient({ defaultOptions: { queries: {
//   staleTime: 1000 * 60 * 5,   ← 5 min: data considered fresh (no background refetch)
//   gcTime:    1000 * 60 * 10,  ← 10 min: cache kept after unmount (was cacheTime v4)
//   retry: 1,
//   refetchOnWindowFocus: true,
// }}})
//
// staleTime vs gcTime:
//   staleTime: fresh window — no refetch even if component remounts
//   gcTime:    unused cache lifetime before garbage collection
//   Stale data shown immediately (stale-while-revalidate) — no loading spinner
//
// Wrap app: <QueryClientProvider client={queryClient}>
// Dev tools: {DEV && <ReactQueryDevtools />}   ← shows cache inspector
// ============================================================



// ============================================================
// Query keys factory (queryKeys.ts)
//
// bookingKeys = {
//   all:     ()  => ["bookings"]
//   lists:   ()  => ["bookings", "list"]
//   list:    (f) => ["bookings", "list", f]
//   details: ()  => ["bookings", "detail"]
//   detail:  (id)=> ["bookings", "detail", id]
// }
//
// bookingKeys.list({ status:"paid" }) → ["bookings","list",{status:"paid"}]
// bookingKeys.detail(42)              → ["bookings","detail", 42]
//
// Why factory: invalidateQueries({ queryKey: bookingKeys.lists() })
//   invalidates ALL list queries regardless of filter params
//   hierarchical matching: ["bookings","list"] matches ["bookings","list",{…}]
// ============================================================



// ============================================================
// useBookings — list query with filters
//
// useQuery({
//   queryKey: bookingKeys.list(filters),
//   queryFn:  ({ signal }) => fetchBookings(filters, signal),
//   placeholderData: keepPreviousData,   ← show old data while new filter fetches
// })
//
// signal auto-passed by TanStack → fetch cancelled when query becomes inactive
// keepPreviousData: no blank flash between filter/page changes
//   → isPlaceholderData=true while new data loads (dim the list)
//
// Destructure:
//   data        → PaginatedResponse<Booking>
//   isLoading   → true only on first load (no cache yet)
//   isFetching  → true on background refetch too (use for subtle indicator)
//   isPlaceholderData → true when showing previous filter's results
// ============================================================



// ============================================================
// useBooking — single item query
//
// useQuery({
//   queryKey: bookingKeys.detail(id!),
//   queryFn:  ({ signal }) => fetchBooking(id!, signal),
//   enabled:  id !== undefined,   ← don't fetch until id is known
//   staleTime: 1000 * 60 * 2,    ← shorter stale time for single item
// })
//
// enabled flag: prevents firing with undefined id on first render
// Critical for dependent queries (Problem 02)
// ============================================================



// ============================================================
// useCreateBooking — mutation with cache invalidation
//
// useMutation({
//   mutationFn: (data) => fetch POST /api/bookings → r.json()
//
//   onSuccess: (newBooking) => {
//     queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
//     ← all list queries refetch in background
//     queryClient.setQueryData(bookingKeys.detail(newBooking.id), newBooking)
//     ← seed detail cache immediately — free, we already have the data
//   }
// })
//
// mutate(data)           → fire and forget (no return)
// mutateAsync(data)      → returns Promise<Booking> (use with await)
// isPending              → true while request in flight (was isLoading in v4)
// ============================================================



// ============================================================
// useUpdateBooking — optimistic update pattern
//
// useMutation({
//   mutationFn: ({ id, data }) => fetch PATCH /api/bookings/id
//
//   onMutate: async ({ id, data }) => {
//     await queryClient.cancelQueries({ queryKey: bookingKeys.detail(id) })
//     ← cancel in-flight queries to prevent overwriting optimistic state
//
//     const previous = queryClient.getQueryData(bookingKeys.detail(id))
//     ← snapshot current value for rollback
//
//     queryClient.setQueryData(bookingKeys.detail(id), old => ({ ...old, ...data }))
//     ← apply optimistic update immediately
//
//     return { previous }   ← context passed to onError
//   }
//
//   onError: (_err, { id }, context) => {
//     queryClient.setQueryData(bookingKeys.detail(id), context.previous)
//     ← rollback to snapshot
//   }
//
//   onSettled: (_data, _err, { id }) => {
//     queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })
//     ← always sync with server (whether success or error)
//   }
// })
//
// Lifecycle: onMutate → (request) → onError/onSuccess → onSettled
// onSettled = always runs, like finally
// ============================================================



// ============================================================
// useDeleteBooking — optimistic list removal
//
// onMutate: async (id) => {
//   await queryClient.cancelQueries({ queryKey: bookingKeys.lists() })
//
//   const previousLists = queryClient.getQueriesData({ queryKey: bookingKeys.lists() })
//   ← snapshot ALL list query caches (may be multiple pages/filters)
//
//   queryClient.setQueriesData({ queryKey: bookingKeys.lists() }, old =>
//     ({ ...old, data: old.data.filter(b => b.id !== id) })
//   )
//   ← remove from every cached list simultaneously
//
//   return { previousLists }
// }
//
// onError: (_err, _id, context) =>
//   context.previousLists.forEach(([queryKey, data]) =>
//     queryClient.setQueryData(queryKey, data)
//   )
//   ← restore each list snapshot individually
//
// onSettled: () =>
//   queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
// ============================================================



// ============================================================
// Prefetch on hover
//
// queryClient.prefetchQuery({
//   queryKey: bookingKeys.detail(booking.id),
//   queryFn:  ({ signal }) => fetchBooking(booking.id, signal),
//   staleTime: 1000 * 60,   ← skip prefetch if data already fresh within 1 min
// })
//
// Call on: onMouseEnter + onFocus (both pointer and keyboard users)
// Effect: data in cache before user clicks → detail page renders instantly
// staleTime guard: avoids redundant network request on repeated hover
// ============================================================



// ============================================================
// Key concepts
//
// v5 naming changes (from v4):
//   isLoading → isLoading (first load) + isFetching (any fetch)
//   cacheTime → gcTime
//   isPending on mutations (was isLoading)
//   remove()  → removed, use invalidateQueries instead
//
// Query status vs fetch status:
//   status:      "pending" | "success" | "error"
//   fetchStatus: "fetching" | "paused" | "idle"
//   isLoading = status==="pending" && fetchStatus==="fetching"
//
// ErrorBoundary integration:
//   QueryErrorResetBoundary wraps ErrorBoundary
//   <ErrorBoundary onReset={reset} fallbackRender={...}>
//   Lets user retry failed queries from the error boundary
//
// setQueryData vs invalidateQueries:
//   setQueryData: instant local update (no network)
//   invalidateQueries: marks stale → background refetch triggered
//   Use both in onSuccess: setQueryData for detail + invalidate for lists
// ============================================================
