// ============================================================
// Problem 02 — RTK Query Auto-Caching API
// ============================================================



// ============================================================
// store/bookingApiSlice.ts
//
// bookingApiSlice = createApi({
//   reducerPath: "bookingApi",
//   baseQuery: fetchBaseQuery({
//     baseUrl: VITE_API_URL ?? "/api",
//     prepareHeaders: (headers, { getState }) => {
//       token from state.auth.token or localStorage
//       headers.set("Authorization", `Bearer ${token}`)
//       headers.set("Accept", "application/json")
//     }
//   }),
//   tagTypes: ["Booking"],
//   endpoints: builder => ({ ... })
// })
//
// getBookings: builder.query<PaginatedResponse<Booking>, GetBookingsParams | void>
//   query: params => ({ url: "/bookings", params })
//   providesTags: result =>
//     result
//       ? [...result.data.map(({ id }) => ({ type: "Booking", id })),
//          { type: "Booking", id: "LIST" }]
//       : [{ type: "Booking", id: "LIST" }]
//
// getBookingById: builder.query<Booking, number>
//   query: id => `/bookings/${id}`
//   providesTags: (_, __, id) => [{ type: "Booking", id }]
//   transformResponse: (res: ApiResponse<Booking>) => res.data
//
// createBooking: builder.mutation<Booking, CreateBookingData>
//   query: body => ({ url: "/bookings", method: "POST", body })
//   invalidatesTags: [{ type: "Booking", id: "LIST" }]
//   transformResponse: res => res.data
//
// updateBooking: builder.mutation<Booking, { id, data }>
//   query: ({ id, data }) => ({ url: `/bookings/${id}`, method: "PATCH", body: data })
//   invalidatesTags: (_, __, { id }) => [{ type: "Booking", id }, { type: "Booking", id: "LIST" }]
//
// deleteBooking: builder.mutation<void, number>
//   query: id => ({ url: `/bookings/${id}`, method: "DELETE" })
//   invalidatesTags: (_, __, id) => [{ type: "Booking", id }, { type: "Booking", id: "LIST" }]
//   onQueryStarted(id, { dispatch, queryFulfilled }):
//     patchResult = dispatch(util.updateQueryData("getBookings", undefined,
//       draft => { draft.data = draft.data.filter(b => b.id !== id) }))
//     try: await queryFulfilled
//     catch: patchResult.undo()   ← revert optimistic update on failure
//
// export { useGetBookingsQuery, useGetBookingByIdQuery,
//          useCreateBookingMutation, useUpdateBookingMutation, useDeleteBookingMutation }
// ============================================================



// ============================================================
// store/index.ts  (add RTK Query)
//
// configureStore({
//   reducer: {
//     bookings: bookingReducer,
//     [bookingApiSlice.reducerPath]: bookingApiSlice.reducer,
//   },
//   middleware: getDefaultMiddleware =>
//     getDefaultMiddleware().concat(bookingApiSlice.middleware)
// })
// ============================================================



// ============================================================
// Component — useGetBookingsQuery
//
// const { data, isLoading, isFetching, isError, error } =
//   useGetBookingsQuery(filters, {
//     pollingInterval: 30_000,   ← auto-refetch every 30s
//   })
//
// isLoading  → true only on FIRST fetch (no cache yet)
// isFetching → true on ANY fetch including background refetch
// Show "Refreshing..." indicator when isFetching && !isLoading
//
// const [deleteBooking, { isLoading: isDeleting }] = useDeleteBookingMutation()
// await deleteBooking(id).unwrap()   ← .unwrap() throws on error
// ============================================================



// ============================================================
// Prefetch on hover
//
// dispatch(bookingApiSlice.util.prefetch(
//   "getBookingById",
//   booking.id,
//   { ifOlderThan: 60 }   ← only prefetch if cache > 60s old
// ))
// ============================================================
