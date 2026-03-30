# Redux Toolkit & RTK Query

Build state management with Redux Toolkit: createSlice for synchronous state, createAsyncThunk for API calls, and RTK Query for automatic API caching.

| Topic            | Details                                                         |
|------------------|-----------------------------------------------------------------|
| createSlice      | Reducers, actions, selectors                                    |
| createAsyncThunk | Async operations, loading/error                                 |
| RTK Query        | createApi, auto-caching, mutations                              |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Slice & Async Thunks (Medium)

### Scenario

Build a Redux Toolkit store for bookings: `createSlice` with reducers, `createAsyncThunk` for API calls, and typed selectors. Compare with Zustand to understand when to use which.

### Requirements

1. `bookingSlice` with state: `bookings[]`, `status`, `error`, `filters`
2. `fetchBookings` async thunk with loading/success/error handling
3. `createBooking`, `deleteBooking` async thunks
4. Typed `RootState` and `AppDispatch`
5. Typed selectors: `selectAllBookings`, `selectBookingById`
6. Configure store with `configureStore`
7. Use in component with `useAppDispatch`, `useAppSelector`

### Expected Code

```tsx
// store/bookingSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
import { bookingApi } from "@/services/bookingApi"
import type { RootState } from "@/store"

// ── State shape ──────────────────────────────────────────────
interface BookingFilters {
  status: string
  search: string
  page:   number
}

interface BookingState {
  bookings: Booking[]
  status:   "idle" | "loading" | "succeeded" | "failed"
  error:    string | null
  filters:  BookingFilters
  // Pagination from server
  totalPages:   number
  currentPage:  number
}

const initialState: BookingState = {
  bookings:    [],
  status:      "idle",
  error:       null,
  filters:     { status: "all", search: "", page: 1 },
  totalPages:  1,
  currentPage: 1,
}

// ── Async thunks ─────────────────────────────────────────────
export const fetchBookings = createAsyncThunk(
  "bookings/fetchAll",           // action type prefix
  async (params: Partial<BookingFilters>, { rejectWithValue }) => {
    try {
      const response = await bookingApi.getAll(params)
      return response                 // becomes action.payload on fulfilled
    } catch (error: unknown) {
      // rejectWithValue → rejected action has a typed payload (not Error)
      return rejectWithValue((error as Error).message)
    }
  }
)

export const createBooking = createAsyncThunk(
  "bookings/create",
  async (data: CreateBookingData, { rejectWithValue }) => {
    try {
      return await bookingApi.create(data)
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const deleteBooking = createAsyncThunk(
  "bookings/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await bookingApi.delete(id)
      return id     // return the id so the reducer can remove it from state
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// ── Slice ────────────────────────────────────────────────────
const bookingSlice = createSlice({
  name: "bookings",
  initialState,

  // synchronous reducers
  reducers: {
    setFilters(state, action: PayloadAction<Partial<BookingFilters>>) {
      state.filters = { ...state.filters, ...action.payload }
      state.filters.page = 1   // reset pagination when filter changes
    },

    clearError(state) {
      state.error = null
    },

    // Optimistic local delete — before server confirms
    optimisticDelete(state, action: PayloadAction<number>) {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload)
    },
  },

  // async reducers — handle thunk lifecycle actions
  extraReducers: (builder) => {
    // ── fetchBookings ────────────────────────────────────────
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.status = "loading"
        state.error  = null
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.status      = "succeeded"
        state.bookings    = action.payload.data
        state.totalPages  = action.payload.meta.last_page
        state.currentPage = action.payload.meta.current_page
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.status = "failed"
        state.error  = action.payload as string   // from rejectWithValue
      })

    // ── createBooking ────────────────────────────────────────
    builder
      .addCase(createBooking.fulfilled, (state, action) => {
        state.bookings.push(action.payload)    // add to local list
      })

    // ── deleteBooking ────────────────────────────────────────
    builder
      .addCase(deleteBooking.fulfilled, (state, action) => {
        state.bookings = state.bookings.filter((b) => b.id !== action.payload)
      })
      .addCase(deleteBooking.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { setFilters, clearError, optimisticDelete } = bookingSlice.actions
export default bookingSlice.reducer
```

```tsx
// store/index.ts
import { configureStore } from "@reduxjs/toolkit"
import bookingReducer from "./bookingSlice"

export const store = configureStore({
  reducer: {
    bookings: bookingReducer,
    // Add more slices here: auth: authReducer, ui: uiReducer
  },
})

// Typed versions of RootState and AppDispatch — ALWAYS use these, not plain types
export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

```tsx
// store/hooks.ts — typed wrappers to avoid repeating the types
import { useDispatch, useSelector } from "react-redux"
import type { RootState, AppDispatch } from "./index"

// Use these throughout the app instead of plain useDispatch/useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector)
```

```tsx
// store/selectors.ts
import type { RootState } from "./index"

export const selectAllBookings      = (state: RootState) => state.bookings.bookings
export const selectBookingsStatus   = (state: RootState) => state.bookings.status
export const selectBookingsError    = (state: RootState) => state.bookings.error
export const selectBookingFilters   = (state: RootState) => state.bookings.filters
export const selectTotalPages       = (state: RootState) => state.bookings.totalPages

// Parameterised selector — takes state AND a param
// Use createSelector (from reselect, re-exported by RTK) for expensive memoised versions
export const selectBookingById =
  (id: number) =>
  (state: RootState): Booking | undefined =>
    state.bookings.bookings.find((b) => b.id === id)

// Memoised derived selector (reselect) — only recomputes when bookings[] changes
import { createSelector } from "@reduxjs/toolkit"

export const selectPaidBookings = createSelector(
  selectAllBookings,                     // input selector
  (bookings) => bookings.filter((b) => b.status === "paid")   // result function
)

export const selectTotalRevenue = createSelector(
  selectAllBookings,
  (bookings) => bookings.reduce((sum, b) => sum + b.amount, 0)
)
```

```tsx
// components/BookingList.tsx — using the slice
function BookingList() {
  const dispatch = useAppDispatch()
  const bookings = useAppSelector(selectAllBookings)
  const status   = useAppSelector(selectBookingsStatus)
  const error    = useAppSelector(selectBookingsError)
  const filters  = useAppSelector(selectBookingFilters)

  // Fetch on mount and when filters change
  useEffect(() => {
    dispatch(fetchBookings(filters))
  }, [dispatch, filters])

  const handleStatusChange = (status: string) => {
    dispatch(setFilters({ status }))
    // setFilters resets page to 1 automatically
  }

  const handleDelete = async (id: number) => {
    // Optimistic: remove from UI immediately
    dispatch(optimisticDelete(id))

    // Then confirm with server — if it fails, refetch to restore
    const result = await dispatch(deleteBooking(id))
    if (deleteBooking.rejected.match(result)) {
      dispatch(fetchBookings(filters))   // restore on failure
    }
  }

  if (status === "loading") return <BookingListSkeleton />
  if (status === "failed")  return <ErrorMessage message={error ?? "Unknown error"} />

  return (
    <div>
      <select
        value={filters.status}
        onChange={(e) => handleStatusChange(e.target.value)}
      >
        <option value="all">All</option>
        <option value="paid">Paid</option>
      </select>

      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onDelete={() => handleDelete(booking.id)}
        />
      ))}
    </div>
  )
}
```

```tsx
// main.tsx — Provider setup
import { Provider } from "react-redux"
import { store } from "@/store"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
)
```

### Redux Toolkit vs Zustand

| Concern | Redux Toolkit | Zustand |
|---------|---------------|---------|
| Boilerplate | Medium (slice, store, selectors) | Minimal (one `create()` call) |
| DevTools | Built-in, time-travel | Plugin required |
| Async | `createAsyncThunk` or RTK Query | Inline `async` in store |
| Memoised selectors | `createSelector` (reselect) | Custom hooks or `zustand/middleware` |
| Team familiarity | High in large orgs | Growing |
| Best for | Large apps, strict patterns, teams | Small/medium apps, rapid dev |

### What We're Evaluating

- `createSlice` — `name`, `initialState`, `reducers` (sync), `extraReducers` (async)
- `createAsyncThunk("prefix", async fn)` — generates `pending/fulfilled/rejected` actions
- `rejectWithValue(msg)` — puts error in `action.payload`, not `action.error`
- `builder.addCase(thunk.pending/fulfilled/rejected, reducer)` — type-safe async handling
- `RootState = ReturnType<typeof store.getState>` — inferred from store, not manually typed
- `useAppDispatch` / `useAppSelector` typed wrappers — avoid repeating generic types
- `createSelector` — memoises derived data, same as Zustand selector pattern

---

## Problem 02 — RTK Query — Auto-Caching API (Hard)

### Scenario

Build the same booking API with RTK Query: automatic caching, cache invalidation on mutations, optimistic updates, and polling — without writing any fetch or loading state code.

### Requirements

1. `createApi` with booking endpoints
2. Auto-generated hooks: `useGetBookingsQuery`, `useCreateBookingMutation`
3. Tag-based cache invalidation: creating a booking invalidates the list
4. `pollingInterval` for live data
5. Optimistic update on delete
6. Compare code size: manual thunks vs RTK Query

### Expected Code

```tsx
// store/bookingApiSlice.ts  (RTK Query)
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { RootState } from "@/store"

export const bookingApiSlice = createApi({
  reducerPath: "bookingApi",   // key in the Redux store

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? "/api",

    // Inject auth token into every request
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth?.token
        ?? localStorage.getItem("auth_token")
      if (token) headers.set("Authorization", `Bearer ${token}`)
      headers.set("Accept", "application/json")
      return headers
    },
  }),

  // Cache tags — used for invalidation
  tagTypes: ["Booking"],

  endpoints: (builder) => ({
    // ── GET /bookings ─────────────────────────────────────────
    getBookings: builder.query<PaginatedResponse<Booking>, GetBookingsParams | void>({
      query: (params) => ({ url: "/bookings", params }),
      // Provide a "Booking" tag for the LIST — mutations can invalidate it
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Booking" as const, id })),
              { type: "Booking", id: "LIST" },
            ]
          : [{ type: "Booking", id: "LIST" }],
    }),

    // ── GET /bookings/:id ─────────────────────────────────────
    getBookingById: builder.query<Booking, number>({
      query: (id) => `/bookings/${id}`,
      // Provide a tag for the specific item
      providesTags: (_result, _error, id) => [{ type: "Booking", id }],
      transformResponse: (response: ApiResponse<Booking>) => response.data,
    }),

    // ── POST /bookings ─────────────────────────────────────────
    createBooking: builder.mutation<Booking, CreateBookingData>({
      query: (body) => ({ url: "/bookings", method: "POST", body }),
      // Invalidate LIST tag → all getBookings queries automatically refetch
      invalidatesTags: [{ type: "Booking", id: "LIST" }],
      transformResponse: (response: ApiResponse<Booking>) => response.data,
    }),

    // ── PATCH /bookings/:id ───────────────────────────────────
    updateBooking: builder.mutation<Booking, { id: number; data: Partial<CreateBookingData> }>({
      query: ({ id, data }) => ({ url: `/bookings/${id}`, method: "PATCH", body: data }),
      // Invalidate both the specific item and the list
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Booking", id },
        { type: "Booking", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<Booking>) => response.data,
    }),

    // ── DELETE /bookings/:id ──────────────────────────────────
    deleteBooking: builder.mutation<void, number>({
      query: (id) => ({ url: `/bookings/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Booking", id },
        { type: "Booking", id: "LIST" },
      ],

      // Optimistic update — remove from cache before server responds
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Patch the cached list immediately
        const patchResult = dispatch(
          bookingApiSlice.util.updateQueryData(
            "getBookings",
            undefined,            // cache key (undefined = no params)
            (draft) => {
              draft.data = draft.data.filter((b) => b.id !== id)
            }
          )
        )
        try {
          await queryFulfilled   // wait for actual API call
        } catch {
          patchResult.undo()     // revert optimistic update on failure
        }
      },
    }),
  }),
})

// Auto-generated hooks — export for use in components
export const {
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useDeleteBookingMutation,
} = bookingApiSlice
```

```tsx
// store/index.ts  — add RTK Query reducer + middleware
import { configureStore } from "@reduxjs/toolkit"
import { bookingApiSlice } from "./bookingApiSlice"
import bookingReducer from "./bookingSlice"

export const store = configureStore({
  reducer: {
    bookings:                          bookingReducer,
    [bookingApiSlice.reducerPath]:     bookingApiSlice.reducer,
    // RTK Query needs its own key (reducerPath) in the store
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(bookingApiSlice.middleware),
    // The middleware handles cache lifetime, polling, and invalidation
})
```

```tsx
// components/BookingList.tsx — RTK Query version
// Compare: ~40 lines vs ~80 lines for the manual thunk version
function BookingList() {
  const [filters, setFilters] = useState<GetBookingsParams>({ status: "all", page: 1 })

  // One hook replaces: useEffect + dispatch(fetchBookings) + loading/error state
  const {
    data,
    isLoading,
    isFetching,    // true when refetching in background (e.g. after invalidation)
    isError,
    error,
  } = useGetBookingsQuery(filters, {
    pollingInterval: 30_000,   // auto-refetch every 30s (live dashboard)
    // skip: !isAuthenticated,  // conditionally skip the query
    // refetchOnMountOrArgChange: true,
  })

  const [deleteBooking, { isLoading: isDeleting }] =
    useDeleteBookingMutation()

  const handleDelete = async (id: number) => {
    try {
      await deleteBooking(id).unwrap()   // .unwrap() throws on error (vs fulfilled/rejected)
      // No dispatch needed — cache is invalidated automatically
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  if (isLoading) return <BookingListSkeleton />
  if (isError)   return <ErrorMessage message={(error as Error).message} />

  return (
    <div>
      {/* isFetching: background refetch indicator */}
      {isFetching && <div className="text-sm text-gray-400">Refreshing…</div>}

      {data?.data.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onDelete={() => handleDelete(booking.id)}
          isDeleting={isDeleting}
        />
      ))}

      <Pagination
        currentPage={data?.meta.current_page ?? 1}
        totalPages={data?.meta.last_page ?? 1}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  )
}
```

```tsx
// components/CreateBookingForm.tsx — mutation hook
function CreateBookingForm() {
  const [createBooking, { isLoading, isError, error, isSuccess }] =
    useCreateBookingMutation()

  const handleSubmit = async (data: CreateBookingData) => {
    try {
      const newBooking = await createBooking(data).unwrap()
      console.log("Created:", newBooking.id)
      // BookingList automatically refetches — no dispatch needed
    } catch (err) {
      if (isValidationError(err)) {
        setErrors(extractValidationErrors(err as AxiosError))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating…" : "Create Booking"}
      </button>
      {isError && <p className="text-red-600">{(error as Error).message}</p>}
    </form>
  )
}
```

```tsx
// Advanced: prefetch on hover — load booking detail before user clicks
import { useDispatch } from "react-redux"
import { AppDispatch } from "@/store"

function BookingRow({ booking }: { booking: Booking }) {
  const dispatch = useDispatch<AppDispatch>()

  const handleMouseEnter = () => {
    // Warm up the cache — detail page loads instantly on click
    dispatch(
      bookingApiSlice.util.prefetch("getBookingById", booking.id, {
        ifOlderThan: 60,   // only prefetch if cache is > 60s old
      })
    )
  }

  return (
    <tr onMouseEnter={handleMouseEnter}>
      <td>{booking.school_name}</td>
    </tr>
  )
}
```

### RTK Query Lifecycle

```
Component mounts
  → useGetBookingsQuery({ status: "paid" })
  → Cache miss → fetch /api/bookings?status=paid
  → Store result under cache key "getBookings({ status: 'paid' })"
  → providesTags: [{ type: "Booking", id: "LIST" }, ...]

User creates booking
  → useCreateBookingMutation().mutate(data)
  → POST /api/bookings
  → invalidatesTags: [{ type: "Booking", id: "LIST" }]
  → RTK Query sees the LIST tag is invalid → triggers refetch
  → Component re-renders with fresh data automatically

User deletes booking
  → onQueryStarted: patch cache immediately (optimistic)
  → DELETE /api/bookings/:id
  → if success: invalidate tags → confirm refetch
  → if failure: patchResult.undo() → revert to previous state
```

### Code Size Comparison

| Feature | Manual Thunks | RTK Query |
|---------|--------------|-----------|
| Fetch + loading + error | ~25 lines | 0 lines (automatic) |
| Cache management | Manual | Automatic |
| Invalidation | Manual dispatch | Tag-based |
| Optimistic update | Manual + rollback | `onQueryStarted` + `undo()` |
| Polling | Manual interval + cleanup | `pollingInterval` option |
| Prefetch | Manual dispatch | `util.prefetch()` |
| Total for CRUD | ~150 lines | ~60 lines |

### What We're Evaluating

- `createApi` — `reducerPath`, `baseQuery`, `tagTypes`, `endpoints`
- `providesTags` — marks what the query "owns" (specific items + LIST sentinel)
- `invalidatesTags` — mutations declare what they invalidate; RTK Query triggers refetch
- `{ type: "Booking", id: "LIST" }` sentinel tag — standard pattern for list invalidation
- `transformResponse` — unwrap Laravel's `{ data: T }` envelope at the API layer
- `onQueryStarted` + `util.updateQueryData` — optimistic update pattern
- `patchResult.undo()` — revert optimistic update when server call fails
- `isFetching` vs `isLoading` — `isLoading` true only on first load; `isFetching` true on any fetch including background
- `.unwrap()` — makes the mutation promise reject on error (vs always resolving)
- `pollingInterval` — built-in live data without `setInterval` + cleanup
