// ============================================================
// Problem 01 — useBookings Custom Hook
// ============================================================



// ============================================================
// types/booking.ts  (additions)
// (BookingFilters, PaginationState, UseBookingsOptions, UseBookingsReturn)
// ============================================================



// ============================================================
// hooks/useBookings.ts
// (useState for bookings/isLoading/error/filters/pagination/refreshToken)
// (useRef for debounce timer)
// (setFilter<K> generic — search debounced, others immediate)
// (useEffect — URLSearchParams, AbortController cleanup)
// (createBooking, updateBooking optimistic, deleteBooking optimistic)
// ============================================================
