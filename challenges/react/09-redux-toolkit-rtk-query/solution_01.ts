// ============================================================
// Problem 01 — Booking Slice & Async Thunks
// ============================================================

import {
    createSlice,
    createAsyncThunk,
    createSelector,
    configureStore,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { PayloadAction } from "@reduxjs/toolkit";

// ============================================================
// Types
// ============================================================

interface Booking {
    id: number;
    school_name: string;
    status: "pending" | "confirmed" | "paid" | "cancelled";
    student_count: number;
    amount: number;
}

interface CreateBookingData {
    school_id: string;
    trip_type: string;
    student_count: number;
    date_from: string;
    date_to: string;
}

interface BookingFilters {
    status: string;
    search: string;
    page: number;
}

// ============================================================
// State shape + initial state
// ============================================================

interface BookingState {
    bookings: Booking[];
    status:   "idle" | "loading" | "succeeded" | "failed";
    error:    string | null;
    filters:  BookingFilters;
    totalPages:  number;
    currentPage: number;
}

const initialState: BookingState = {
    bookings:    [],
    status:      "idle",
    error:       null,
    filters:     { status: "all", search: "", page: 1 },
    totalPages:  1,
    currentPage: 1,
};

// ============================================================
// Async thunks
// ============================================================

export const fetchBookings = createAsyncThunk(
    "bookings/fetchAll",
    async (params: Partial<BookingFilters>, { rejectWithValue }) => {
        try {
            const response = await bookingApi.getAll(params);
            return response;
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

export const createBooking = createAsyncThunk(
    "bookings/create",
    async (data: CreateBookingData, { rejectWithValue }) => {
        try {
            return await bookingApi.create(data);
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

export const deleteBooking = createAsyncThunk(
    "bookings/delete",
    async (id: number, { rejectWithValue }) => {
        try {
            await bookingApi.delete(id);
            return id;
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

// ============================================================
// Slice — sync reducers + async lifecycle handlers
// ============================================================

const bookingSlice = createSlice({
    name: "bookings",
    initialState,

    // Sync reducers — instant state changes, no API calls
    reducers: {
        setFilters(state, action: PayloadAction<Partial<BookingFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
            state.filters.page = 1; // reset pagination on filter change
        },
        clearError(state) {
            state.error = null;
        },
        optimisticDelete(state, action: PayloadAction<number>) {
            state.bookings = state.bookings.filter((b) => b.id !== action.payload);
        },
    },

    // Async reducers — react to thunk pending/fulfilled/rejected
    extraReducers: (builder) => {
        // fetchBookings — all 3 states needed (loading spinner + error message)
        builder
            .addCase(fetchBookings.pending, (state) => {
                state.status = "loading";
                state.error  = null;
            })
            .addCase(fetchBookings.fulfilled, (state, action) => {
                state.status      = "succeeded";
                state.bookings    = action.payload.data;
                state.totalPages  = action.payload.meta.last_page;
                state.currentPage = action.payload.meta.current_page;
            })
            .addCase(fetchBookings.rejected, (state, action) => {
                state.status = "failed";
                state.error  = action.payload as string;
            });

        // createBooking — only fulfilled needed (form handles loading/error)
        builder
            .addCase(createBooking.fulfilled, (state, action) => {
                state.bookings.push(action.payload);
            });

        // deleteBooking — fulfilled + rejected (optimistic delete needs rollback on error)
        builder
            .addCase(deleteBooking.fulfilled, (state, action) => {
                state.bookings = state.bookings.filter((b) => b.id !== action.payload);
            })
            .addCase(deleteBooking.rejected, (state, action) => {
                state.status = "failed";
                state.error  = action.payload as string;
            });
    },
});

export const { setFilters, clearError, optimisticDelete } = bookingSlice.actions;
export default bookingSlice.reducer;

// ============================================================
// Store
// ============================================================

export const store = configureStore({
    reducer: {
        bookings: bookingSlice.reducer,
    },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ============================================================
// Typed hooks — use these instead of plain useDispatch/useSelector
// ============================================================

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
    useSelector(selector);

// ============================================================
// Selectors
// ============================================================

// Direct reads — no memoization needed (primitives + direct array reference)
export const selectAllBookings    = (state: RootState) => state.bookings.bookings;
export const selectBookingsStatus = (state: RootState) => state.bookings.status;
export const selectBookingsError  = (state: RootState) => state.bookings.error;
export const selectBookingFilters = (state: RootState) => state.bookings.filters;
export const selectTotalPages     = (state: RootState) => state.bookings.totalPages;

// Curried selector — call with id first, returns a selector fn
export const selectBookingById = (id: number) => (state: RootState) =>
    state.bookings.bookings.find((b) => b.id === id);

// Memoized derived selectors — createSelector caches result until input changes
export const selectPaidBookings = createSelector(
    selectAllBookings,
    (bookings) => bookings.filter((b) => b.status === "paid"),
);

export const selectTotalRevenue = createSelector(
    selectAllBookings,
    (bookings) => bookings.reduce((acc, b) => acc + b.amount, 0),
);

/*
================================================================
TIPS
================================================================

CREATESLIE — SYNC VS ASYNC
----------------------------
• reducers      = sync, instant state changes (setFilters, clearError)
• extraReducers = async thunk lifecycle (pending → fulfilled → rejected)
• Immer is active in both — mutate state directly OR spread, both work

CREATEASYNCTHUNK
-----------------
• first arg  = action name shown in DevTools ("bookings/fetchAll")
• second arg = async function with (params, { rejectWithValue })
• auto-generates 3 action types: pending / fulfilled / rejected
• rejectWithValue(msg) → error lands in action.payload (not action.error)
• return id from deleteBooking → reducer knows which item to remove

EXTRAREDUCERS — WHICH CASES TO HANDLE
----------------------------------------
• fetchBookings  → all 3 (need spinner + error for the main list)
• createBooking  → fulfilled only (form button handles loading/error)
• deleteBooking  → fulfilled + rejected (optimistic delete needs rollback)
• only add cases you actually need — unused cases = dead code

ROOTSTATE + APPDISPATCH
-------------------------
• RootState   = ReturnType<typeof store.getState> — inferred, never written manually
• AppDispatch = typeof store.dispatch — includes thunk support
• always use useAppDispatch/useAppSelector — avoid repeating generics in every component

SELECTORS + CREATESELECTOR
----------------------------
• direct read (number/string/array ref) → plain selector, no memoization needed
• .filter() / .map() / .reduce()        → createSelector (avoids new array on every render)
• createSelector(inputSelector, resultFn) — resultFn receives output of inputSelector
• cache size = 1 — remembers only the last call
• same concept as useMemo but for Redux selectors

CURRIED SELECTOR
-----------------
• selectBookingById(id) returns a selector fn — call: useAppSelector(selectBookingById(42))
• outer fn takes the param, inner fn takes state
• regular function equivalent: function selectBookingById(id) { return (state) => ... }

================================================================
*/
