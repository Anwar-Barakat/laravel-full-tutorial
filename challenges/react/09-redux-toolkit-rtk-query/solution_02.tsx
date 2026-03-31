// ============================================================
// Problem 02 — RTK Query Auto-Caching API
// ============================================================

import { createApi, fetchBaseQuery, configureStore } from "@reduxjs/toolkit/query/react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "./solution_01";
import bookingReducer from "./solution_01";

// ============================================================
// Types
// ============================================================

interface Booking {
    id:           number;
    school_name:  string;
    status:       "pending" | "confirmed" | "paid" | "cancelled";
    amount:       number;
}

interface CreateBookingData {
    school_id:     string;
    trip_type:     string;
    student_count: number;
    date_from:     string;
    date_to:       string;
}

interface GetBookingsParams {
    status?: string;
    search?: string;
    page?:   number;
}

interface PaginatedResponse<T> {
    data: T[];
    meta: { current_page: number; last_page: number; total: number };
}

// ============================================================
// createApi — all booking endpoints in one place
// ============================================================

const bookingApiSlice = createApi({
    reducerPath: "bookingApi",   // key in the Redux store

    baseQuery: fetchBaseQuery({ baseUrl: "/api" }),

    tagTypes: ["Booking"],       // cache tag names used for invalidation

    endpoints: (builder) => ({

        // GET /bookings — provides LIST tag so mutations can invalidate it
        getBookings: builder.query<PaginatedResponse<Booking>, GetBookingsParams | void>({
            query:       (params) => ({ url: "/bookings", params }),
            providesTags: [{ type: "Booking", id: "LIST" }],
        }),

        // GET /bookings/:id — provides tag for the specific item
        getBookingById: builder.query<Booking, number>({
            query:       (id) => `/bookings/${id}`,
            providesTags: (_result, _error, id) => [{ type: "Booking", id }],
        }),

        // POST /bookings — invalidates LIST so getBookings auto-refetches
        createBooking: builder.mutation<Booking, CreateBookingData>({
            query:          (body) => ({ url: "/bookings", method: "POST", body }),
            invalidatesTags: [{ type: "Booking", id: "LIST" }],
        }),

        // PATCH /bookings/:id — invalidates both the item and the list
        updateBooking: builder.mutation<Booking, { id: number; data: Partial<CreateBookingData> }>({
            query:          ({ id, data }) => ({ url: `/bookings/${id}`, method: "PATCH", body: data }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: "Booking", id },
                { type: "Booking", id: "LIST" },
            ],
        }),

        // DELETE /bookings/:id — invalidates both the item and the list
        deleteBooking: builder.mutation<void, number>({
            query:          (id) => ({ url: `/bookings/${id}`, method: "DELETE" }),
            invalidatesTags: (_result, _error, id) => [
                { type: "Booking", id },
                { type: "Booking", id: "LIST" },
            ],
        }),

    }),
});

// Auto-generated hooks — one per endpoint
export const {
    useGetBookingsQuery,
    useGetBookingByIdQuery,
    useCreateBookingMutation,
    useUpdateBookingMutation,
    useDeleteBookingMutation,
} = bookingApiSlice;

// ============================================================
// Store — add RTK Query reducer + middleware
// ============================================================

export const store = configureStore({
    reducer: {
        bookings:                          bookingReducer,
        [bookingApiSlice.reducerPath]:     bookingApiSlice.reducer,
        // RTK Query needs its own key (reducerPath) and its middleware for
        // cache lifetime, polling, and invalidation to work
    },
    middleware: (getDefault) =>
        getDefault().concat(bookingApiSlice.middleware),
});

// ============================================================
// Component — BookingList
// One hook replaces: useEffect + dispatch + loading/error state
// ============================================================

function BookingList() {
    const [filters, setFilters] = useState<GetBookingsParams>({ status: "all", page: 1 });

    // isLoading  → true only on first fetch (no cache yet)
    // isFetching → true on any fetch including background refetch after invalidation
    const { data, isLoading, isFetching, isError } =
        useGetBookingsQuery(filters, {
            pollingInterval: 30_000,  // auto-refetch every 30s
        });

    const [deleteBooking, { isLoading: isDeleting }] = useDeleteBookingMutation();

    const handleDelete = async (id: number) => {
        try {
            await deleteBooking(id).unwrap();  // .unwrap() throws on error
            // no dispatch needed — cache is invalidated automatically
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (isError)   return <div>Something went wrong</div>;

    return (
        <div>
            {isFetching && <p className="text-sm text-gray-400">Refreshing…</p>}

            {data?.data.map((booking) => (
                <div key={booking.id}>
                    <span>{booking.school_name}</span>
                    <button
                        onClick={() => handleDelete(booking.id)}
                        disabled={isDeleting}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// Component — CreateBookingForm
// ============================================================

function CreateBookingForm() {
    const [createBooking, { isLoading, isError, isSuccess }] =
        useCreateBookingMutation();

    const [form, setForm] = useState<CreateBookingData>({
        school_id:     "",
        trip_type:     "domestic",
        student_count: 1,
        date_from:     "",
        date_to:       "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createBooking(form).unwrap();
            // BookingList auto-refetches — invalidatesTags triggers it
        } catch (err) {
            console.error("Create failed:", err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
                <label className="block text-sm font-medium mb-1">School ID</label>
                <input
                    type="text"
                    value={form.school_id}
                    onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Trip Type</label>
                <select
                    value={form.trip_type}
                    onChange={(e) => setForm((f) => ({ ...f, trip_type: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                >
                    <option value="domestic">Domestic</option>
                    <option value="international">International</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Student Count</label>
                <input
                    type="number"
                    value={form.student_count}
                    onChange={(e) => setForm((f) => ({ ...f, student_count: Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">From</label>
                    <input
                        type="date"
                        value={form.date_from}
                        onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">To</label>
                    <input
                        type="date"
                        value={form.date_to}
                        onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
            </div>
            {isError   && <p className="text-red-600 text-sm">Something went wrong.</p>}
            {isSuccess && <p className="text-green-600 text-sm">Booking created!</p>}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? "Creating…" : "Create Booking"}
            </button>
        </form>
    );
}

// ============================================================
// Component — EditBookingForm
// ============================================================

function EditBookingForm({ id }: { id: number }) {
    const { data: booking, isLoading: isFetching } = useGetBookingByIdQuery(id);
    const [updateBooking, { isLoading, isError, isSuccess }] =
        useUpdateBookingMutation();

    const [form, setForm] = useState<Partial<CreateBookingData>>({});

    // Populate form when booking loads
    if (isFetching) return <div>Loading…</div>;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateBooking({ id, data: form }).unwrap();
            // both the item and the list auto-refetch via invalidatesTags
        } catch (err) {
            console.error("Update failed:", err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
                <label className="block text-sm font-medium mb-1">Student Count</label>
                <input
                    type="number"
                    defaultValue={booking?.student_count}
                    onChange={(e) => setForm((f) => ({ ...f, student_count: Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">From</label>
                    <input
                        type="date"
                        defaultValue={booking?.date_from}
                        onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">To</label>
                    <input
                        type="date"
                        defaultValue={booking?.date_to}
                        onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
            </div>
            {isError   && <p className="text-red-600 text-sm">Something went wrong.</p>}
            {isSuccess && <p className="text-green-600 text-sm">Booking updated!</p>}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? "Saving…" : "Save Changes"}
            </button>
        </form>
    );
}

// ============================================================
// Prefetch on hover — warm up cache before user clicks
// ============================================================

function BookingRow({ booking }: { booking: Booking }) {
    const dispatch = useDispatch<AppDispatch>();

    const handleMouseEnter = () => {
        dispatch(
            bookingApiSlice.util.prefetch("getBookingById", booking.id, {
                ifOlderThan: 60,  // only prefetch if cache is older than 60s
            }),
        );
    };

    return (
        <div onMouseEnter={handleMouseEnter}>
            {booking.school_name}
        </div>
    );
}

/*
================================================================
TIPS
================================================================

CREATEAPI — STRUCTURE
-----------------------
• reducerPath  = key in the Redux store ("bookingApi")
• baseQuery    = base fetch config — all endpoints inherit it
• tagTypes     = declare cache tag names used across endpoints
• endpoints    = all your API calls in one place

BUILDER.QUERY VS BUILDER.MUTATION
-----------------------------------
• builder.query    → GET requests — use useGetBookingsQuery()
• builder.mutation → POST/PATCH/DELETE — use useCreateBookingMutation()

PROVIDESTAGS VS INVALIDATESTAGS
----------------------------------
• providesTags    — queries declare what they "own"
• invalidatesTags — mutations declare what they invalidate
• when a mutation invalidates a tag → all queries with that tag auto-refetch
• { type: "Booking", id: "LIST" } — sentinel tag for the whole list

QUERY VS MUTATION — PARAMS
----------------------------
• createBooking(body)        → one object, whole thing is the body
• updateBooking({ id, data }) → need id for URL + data for body → destructure
• deleteBooking(id)          → just the id, no body needed

ISLOADING VS ISFETCHING
-------------------------
• isLoading  → true only on FIRST fetch (no cached data yet) → show full skeleton
• isFetching → true on any fetch including background → show subtle "Refreshing…"

.UNWRAP()
----------
• deleteBooking(id) returns a promise that always resolves
• .unwrap() makes it reject on error — lets you catch failures with try/catch

POLLING
--------
• pollingInterval: 30_000 → auto-refetch every 30s
• no setInterval + cleanup needed — RTK Query handles it

PREFETCH ON HOVER
------------------
• bookingApiSlice.util.prefetch(endpointName, arg, options)
• ifOlderThan: 60 → skip if cached data is less than 60s old
• warms up cache so detail page loads instantly on click

MIDDLEWARE — REQUIRED
-----------------------
• bookingApiSlice.middleware must be added to the store
• handles cache expiry, polling, and invalidation under the hood
• without it — tags and polling won't work

QUERY HOOK RETURNS OBJECT — MUTATION HOOK RETURNS ARRAY
---------------------------------------------------------
• useGetBookingsQuery()    → object { data, isLoading, isFetching, isError }
  pick any properties in any order — object destructuring
• useDeleteBookingMutation() → array [triggerFn, { isLoading, isError, isSuccess }]
  always [0] = trigger function, [1] = status — same pattern as useState
• rename on destructure to avoid clashes:
  const [deleteBooking, { isLoading: isDeleting }] = useDeleteBookingMutation()
  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation()

AUTO-GENERATED HOOKS
----------------------
• RTK Query generates hooks automatically from endpoint names
• getBookings    → useGetBookingsQuery
• getBookingById → useGetBookingByIdQuery
• createBooking  → useCreateBookingMutation
• updateBooking  → useUpdateBookingMutation
• deleteBooking  → useDeleteBookingMutation

================================================================
*/
