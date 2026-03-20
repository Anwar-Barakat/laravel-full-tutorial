// SOLUTION 02 — TanStack Query: key factory depth, delete mutation, prefetch, suspense
// Focus: cache manipulation patterns, delete from list, advanced query options

// ─── WHY A QUERY KEY FACTORY MATTERS ─────────────────────────────────────────

// Without a factory, keys are scattered strings across the codebase:
//   useQuery({ queryKey: ['bookings', 'list', filters] })   // in PageA
//   invalidateQueries({ queryKey: ['bookings'] })            // in PageB — might not match

// A factory centralises key shapes so every call is consistent:
//   bookingKeys.list(filters)   always produces the same structure
//   bookingKeys.all()           is the common prefix — invalidating it hits ALL booking queries

// TanStack Query matches keys by prefix, so:
//   invalidateQueries({ queryKey: bookingKeys.all() })
//   → invalidates bookingKeys.list(...) AND bookingKeys.detail(...) in one call

// ─── DELETE BOOKING MUTATION ──────────────────────────────────────────────────

// useMutation({
//   mutationFn: (id: number) => deleteBookingApi(id),

//   onMutate: async (id) => {
//     await queryClient.cancelQueries({ queryKey: bookingKeys.all() })

//     // Remove the deleted booking from the list cache immediately
//     queryClient.setQueryData(bookingKeys.list(filters), (old: BookingsResponse) => ({
//       ...old,
//       data: old.data.filter(b => b.id !== id),
//     }))

//     // Also remove the detail cache entry for this booking
//     queryClient.removeQueries({ queryKey: bookingKeys.detail(id) })
//   },

//   onSettled: () => {
//     queryClient.invalidateQueries({ queryKey: bookingKeys.all() })
//   },
// })

// setQueryData with a filter function is the standard way to remove one item
// from a list cache without refetching the whole list first.

// ─── READING FROM CACHE WITHOUT A HOOK ────────────────────────────────────────

// queryClient.getQueryData(bookingKeys.detail(id))
// → returns the cached Booking if it exists, or undefined if not yet fetched
// Useful for: pre-populating a form edit modal from list data before detail loads

// ─── PREFETCH ON HOVER ────────────────────────────────────────────────────────

// On BookingRow mouseEnter, call:
// queryClient.prefetchQuery({
//   queryKey: bookingKeys.detail(booking.id),
//   queryFn:  () => fetchBooking(booking.id),
//   staleTime: 30_000,
// })

// If the user then clicks to open the detail panel, the data is already cached
// and the modal opens instantly with no loading state.
// prefetchQuery is a no-op if the data is already fresh in cache (respects staleTime).

// ─── CONDITIONAL QUERY WITH enabled ──────────────────────────────────────────

// useQuery({
//   queryKey: bookingKeys.detail(selectedId ?? 0),
//   queryFn:  () => fetchBooking(selectedId!),
//   enabled:  selectedId !== null,
// })

// enabled: false → query is "idle", no network request fires, isLoading is false
// enabled: true  → query runs normally
// Transition from false→true (e.g. user selects a row) triggers the first fetch

// ─── INVALIDATE VS REFETCH ────────────────────────────────────────────────────

// invalidateQueries → marks queries as stale; they refetch on next mount/focus
//   Use in onSettled: conservative, does not immediately trigger a request

// refetchQueries → forces an immediate background fetch right now
//   Use when you know the server state has changed and want it now

// For mutations, invalidateQueries in onSettled is the standard pattern:
//   it lets React Query decide when to refetch (respects window focus, mount, etc.)

// ─── SUSPENSE MODE (ALTERNATIVE) ─────────────────────────────────────────────

// useSuspenseQuery({
//   queryKey: bookingKeys.list(filters),
//   queryFn:  () => fetchBookings(filters),
// })

// With suspense mode, data is always defined (no undefined check needed).
// The component suspends (throws a Promise) while loading.
// Wrap with <Suspense fallback={<BookingsSkeleton />}> in the parent.
// Error states handled by the nearest <ErrorBoundary>.

// Trade-off: cleaner component code, but requires Suspense + ErrorBoundary wrappers.
// Regular useQuery is simpler for components that manage their own loading UI.

// ─── SUMMARY OF CACHE OPERATIONS ─────────────────────────────────────────────

// cancelQueries  → abort in-flight refetches before writing optimistically
// getQueryData   → read cache synchronously (for snapshots or pre-population)
// setQueryData   → write to cache synchronously (optimistic updates, delete filter)
// removeQueries  → delete a cache entry entirely (e.g. after delete mutation)
// invalidateQueries → mark stale and schedule a background refetch
// prefetchQuery  → proactively fill cache (hover, route change, pagination next page)
