// ============================================================
// Problem 02 — Testing Custom Hooks & Async Logic
// ============================================================



// ============================================================
// __tests__/hooks/useDebounce.test.ts
//
// beforeEach: jest.useFakeTimers()
// afterEach:  jest.useRealTimers()
//
// test "returns initial value immediately":
//   renderHook(() => useDebounce("hello", 300))
//   result.current === "hello"
//
// test "does not update before delay elapses":
//   renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: "hello" } })
//   rerender({ value: "hello world" })
//   act(() => jest.advanceTimersByTime(200))   ← partial advance
//   result.current === "hello"  ← not yet updated
//
// test "updates after delay elapses":
//   rerender({ value: "hello world" })
//   act(() => jest.advanceTimersByTime(300))   ← full delay
//   result.current === "hello world"
//
// test "only uses latest value when changed multiple times":
//   rerender "ab" → advance 100 → rerender "abc" → advance 100 → rerender "abcd"
//   act(() => jest.advanceTimersByTime(300))
//   result.current === "abcd"  ← only the last value committed
//
// NOTE: wrap timer advances in act() — they trigger React state updates
// ============================================================



// ============================================================
// __tests__/hooks/useBookings.test.ts
//
// jest.mock("@/services/bookingApi")
// beforeEach: jest.clearAllMocks()
//
// test "starts with loading state":
//   mockReturnValue(new Promise(() => {}))  ← never resolves
//   result.current.isLoading === true
//   result.current.bookings  === []
//   result.current.error     === null
//
// test "loading → data on success":
//   mockResolvedValueOnce({ data: mockBookings, meta: {...} })
//   waitFor(() => result.current.isLoading === false)
//   result.current.bookings === mockBookings
//
// test "loading → error on failure":
//   mockRejectedValueOnce(new Error("Network error"))
//   waitFor(() => result.current.error === "Network error")
//   result.current.bookings === []
//
// test "setFilter refetches with new params":
//   two mockResolvedValueOnce calls (initial + after filter)
//   act(() => result.current.setFilter("status", "paid"))
//   waitFor → bookings = filtered result
//   bookingApi.getAll toHaveBeenCalledTimes(2)
//   toHaveBeenLastCalledWith(expect.objectContaining({ status: "paid" }))
//
// test "optimistic delete removes booking instantly":
//   act(() => result.current.deleteBooking(1))
//   bookings not.toContainEqual({ id: 1 })  ← before server confirms
//   waitFor: bookingApi.delete toHaveBeenCalledWith(1)
//
// test "optimistic delete rolls back on failure":
//   mockRejectedValueOnce(new Error("Server error"))
//   act(() => result.current.deleteBooking(1))
//   waitFor: bookings toContainEqual({ id: 1 })  ← restored after failure
// ============================================================



// ============================================================
// __tests__/stores/bookingStore.test.ts
//
// beforeEach: useBookingStore.getState().reset()  ← isolate test state
//
// Access store outside React:
//   useBookingStore.getState().setBookings(mockBookings)  ← write
//   useBookingStore.getState().bookings                   ← read
//
// Wrap store mutations in act():
//   act(() => { useBookingStore.getState().setBookings(...) })
//
// Test selector with renderHook:
//   renderHook(() => useBookingStore(state => state.bookings.filter(...)))
//   result.current → filtered array
//
// Test "totalRevenue updates when bookings change":
//   renderHook → result.current === 0 (empty)
//   act → setBookings(mockBookings)
//   result.current === 13000  ← sum of amounts
//
// test "reset clears all state":
//   setBookings → reset → bookings === []
// ============================================================
