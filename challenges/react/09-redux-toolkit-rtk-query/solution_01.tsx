// ============================================================
// Problem 01 — Booking Slice & Async Thunks
// ============================================================



// ============================================================
// store/bookingSlice.ts
//
// BookingState interface:
//   bookings[], status: "idle"|"loading"|"succeeded"|"failed",
//   error: string|null, filters: { status, search, page },
//   totalPages, currentPage
//
// fetchBookings = createAsyncThunk("bookings/fetchAll",
//   async (params, { rejectWithValue }) => {
//     try: return await bookingApi.getAll(params)
//     catch: return rejectWithValue(error.message)
//   })
//
// createBooking = createAsyncThunk("bookings/create", ...)
//   → returns new Booking on success
//
// deleteBooking = createAsyncThunk("bookings/delete",
//   async (id: number, ...) => {
//     await bookingApi.delete(id)
//     return id   ← return id so reducer can filter it out
//   })
//
// bookingSlice = createSlice({ name, initialState, reducers, extraReducers })
//
// reducers (sync):
//   setFilters(state, action: PayloadAction<Partial<BookingFilters>>):
//     merge filters; reset page to 1
//   clearError(state): state.error = null
//   optimisticDelete(state, action: PayloadAction<number>):
//     filter out by id
//
// extraReducers builder:
//   fetchBookings.pending:    status="loading", error=null
//   fetchBookings.fulfilled:  status="succeeded", bookings=payload.data, totalPages, currentPage
//   fetchBookings.rejected:   status="failed", error=action.payload as string
//   createBooking.fulfilled:  state.bookings.push(payload)
//   deleteBooking.fulfilled:  filter out by action.payload (id)
//   deleteBooking.rejected:   state.error = action.payload
// ============================================================



// ============================================================
// store/index.ts
//
// configureStore({ reducer: { bookings: bookingReducer } })
// export type RootState   = ReturnType<typeof store.getState>
// export type AppDispatch = typeof store.dispatch
// ============================================================



// ============================================================
// store/hooks.ts
//
// useAppDispatch = () => useDispatch<AppDispatch>()
// useAppSelector<T>(selector: (state: RootState) => T): T
//   = useSelector(selector)
// ============================================================



// ============================================================
// store/selectors.ts
//
// selectAllBookings(state)    → state.bookings.bookings
// selectBookingsStatus(state) → state.bookings.status
// selectBookingsError(state)  → state.bookings.error
// selectBookingFilters(state) → state.bookings.filters
//
// selectBookingById(id) → (state) => bookings.find(b => b.id === id)
//   (curried — takes id first, returns selector fn)
//
// selectPaidBookings = createSelector(selectAllBookings,
//   bookings => bookings.filter(b => b.status === "paid"))
//
// selectTotalRevenue = createSelector(selectAllBookings,
//   bookings => bookings.reduce((sum, b) => sum + b.amount, 0))
// ============================================================



// ============================================================
// Component usage
//
// const dispatch = useAppDispatch()
// const bookings = useAppSelector(selectAllBookings)
// const status   = useAppSelector(selectBookingsStatus)
// const filters  = useAppSelector(selectBookingFilters)
//
// useEffect([dispatch, filters]):
//   dispatch(fetchBookings(filters))
//
// handleDelete(id):
//   dispatch(optimisticDelete(id))               ← remove from UI immediately
//   const result = await dispatch(deleteBooking(id))
//   if deleteBooking.rejected.match(result):
//     dispatch(fetchBookings(filters))            ← restore on failure
//
// main.tsx: <Provider store={store}><App /></Provider>
// ============================================================
