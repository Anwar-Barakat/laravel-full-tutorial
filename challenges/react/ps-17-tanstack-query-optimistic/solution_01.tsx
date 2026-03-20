// SOLUTION 01 — TanStack Query: useQuery + useMutation with optimistic updates
// Focus: core query/mutation hooks, optimistic update cycle, staleTime config

// ─── QUERY KEY FACTORY ────────────────────────────────────────────────────────

// Define a bookingKeys object whose methods return typed const arrays
// This gives every part of the app a single source of truth for cache keys

// bookingKeys.all()              → ['bookings']
// bookingKeys.list(filters)      → ['bookings', 'list', { status: 'pending', ... }]
// bookingKeys.detail(id)         → ['bookings', 'detail', 42]

// Using `as const` on each return makes TypeScript infer literal tuple types
// rather than string[], which is required by TanStack Query's type signatures

// ─── API FUNCTIONS ────────────────────────────────────────────────────────────

// fetchBookings(filters): build URLSearchParams from the filters object,
// GET /api/bookings?status=...&schoolId=..., parse JSON, return data array

// fetchBooking(id): GET /api/bookings/:id, return single Booking object

// confirmBookingApi(id): POST /api/bookings/:id/confirm, return updated Booking

// deleteBookingApi(id): DELETE /api/bookings/:id, return void

// ─── BOOKINGS LIST QUERY ──────────────────────────────────────────────────────

// useQuery({
//   queryKey: bookingKeys.list(filters),
//   queryFn:  () => fetchBookings(filters),
//   staleTime: 30_000,   // treat cached data as fresh for 30 seconds
// })

// staleTime: 30_000 means if you navigate away and back within 30 s,
// TanStack Query returns the cached data immediately without a background fetch.
// After 30 s the data is "stale" and a background refetch fires on next mount.

// Destructure: { data, isLoading, isError, error } from useQuery
// data is undefined while loading — use optional chaining: data?.data ?? []

// ─── SINGLE BOOKING DETAIL QUERY ─────────────────────────────────────────────

// useQuery({
//   queryKey: bookingKeys.detail(id),
//   queryFn:  () => fetchBooking(id),
//   enabled:  id !== null && id > 0,   // do not run if no id is selected
// })

// enabled: false means the query is skipped entirely — no network request fires.
// Useful for detail panels that are only shown when a row is selected.

// ─── CONFIRM BOOKING MUTATION ─────────────────────────────────────────────────

// const queryClient = useQueryClient()

// useMutation({
//   mutationFn: (id: number) => confirmBookingApi(id),

//   onMutate: async (id) => {
//     Step 1: Cancel any outgoing refetches for the list query
//     — so an in-flight GET does not overwrite our optimistic write
//     await queryClient.cancelQueries({ queryKey: bookingKeys.all() })

//     Step 2: Snapshot the current cache value before we change it
//     const previousBookings = queryClient.getQueryData(bookingKeys.list(filters))

//     Step 3: Optimistically update the cache right now (before server responds)
//     queryClient.setQueryData(bookingKeys.list(filters), (old: BookingsResponse) => ({
//       ...old,
//       data: old.data.map(b => b.id === id ? { ...b, status: 'confirmed' } : b),
//     }))

//     Step 4: Return the snapshot as context so onError can restore it
//     return { previousBookings }
//   },

//   onError: (_err, _id, context) => {
//     // The API call failed — roll back to the snapshot we saved in onMutate
//     if (context?.previousBookings) {
//       queryClient.setQueryData(bookingKeys.list(filters), context.previousBookings)
//     }
//   },

//   onSettled: () => {
//     // Whether the mutation succeeded or failed, invalidate so we refetch
//     // the true server state. This is the "reconcile" step after optimistic UI.
//     queryClient.invalidateQueries({ queryKey: bookingKeys.all() })
//   },
// })

// ─── THE THREE-CALLBACK PATTERN EXPLAINED ────────────────────────────────────

// onMutate  → fires synchronously before the network call
//             use it to: cancel queries, snapshot cache, apply optimistic write
//             return value becomes `context` in onError and onSettled

// onError   → fires when mutationFn throws/rejects
//             use context.previousBookings to undo the optimistic write

// onSettled → fires after success OR error (like a finally block)
//             always invalidate here so the cache eventually reflects truth

// ─── RENDERING ────────────────────────────────────────────────────────────────

// isLoading → show skeleton rows
// isError   → show error banner with error.message
// data?.data.map(booking => ...) → render each BookingRow

// Call confirmMutation.mutate(booking.id) on button click
// confirmMutation.isPending indicates which row is in-flight (disable its button)
