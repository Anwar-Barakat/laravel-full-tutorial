// ============================================================
// Problem 01 — Booking Store with Zustand + Immer
// ============================================================



// ============================================================
// stores/bookingStore.ts
//
// BookingState interface (state + all action signatures)
// initialState const (reused by reset())
//
// useBookingStore = create<BookingState>()(immer(...))
//   fetchBookings  — get() for filters/pagination, URLSearchParams, isLoading toggle
//   updateBooking  — save original, Object.assign optimistic, rollback on throw
//   deleteBooking  — save original array, filter optimistic, restore on throw
//   createBooking  — POST then fetchBookings()
//   setFilter      — mutate filters[key], reset currentPage to 1
//   setPage        — mutate pagination.currentPage
//   reset          — set(initialState)
//
// usePaidBookings()  — selector hook (outside store)
// useTotalRevenue()  — selector hook (outside store)
// ============================================================
