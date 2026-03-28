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

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type BookingStatus =
    | "pending"
    | "confirmed"
    | "paid"
    | "completed"
    | "cancelled";

interface Booking {
    id: number;
    reference: string;
    schoolName: string;
    destination: string;
    amount: number;
    status: BookingStatus;
    tripDate: string;
    studentCount: number;
}

interface BookingFilters {
    status: BookingStatus | "all";
    search: string;
    dateFrom: string;
    dateTo: string;
}

interface PaginationState {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage: number;
}

interface CreateBookingData {
    schoolName: string;
    destination: string;
    amount: number;
    tripDate: string;
    studentCount: number;
}

interface BookingState {
    bookings: Booking[];
    isLoading: boolean;
    error: string | null;
    filters: BookingFilters;
    pagination: PaginationState;

    setFilter: (key: keyof BookingFilters, value: string) => void;
    setPage: (page: number) => void;
    fetchBookings: () => Promise<void>;
    createBooking: (data: CreateBookingData) => Promise<void>;
    updateBooking: (id: number, data: Partial<Booking>) => Promise<void>;
    deleteBooking: (id: number) => Promise<void>;
    reset: () => void;
}

const initialState = {
    bookings: [],
    filters: { status: "all" as const, search: "", dateFrom: "", dateTo: "" },
    pagination: { currentPage: 1, lastPage: 1, total: 0, perPage: 15 },
    isLoading: false,
    error: null,
};

export const useBookingStore = create<BookingState>()(
    immer((set, get) => ({
        ...initialState,

        setFilter: (key, value) =>
            set((s) => {
                (s.filters as Record<string, string>)[key] = value;
                s.pagination.currentPage = 1;
            }),

        setPage: (page) =>
            set((s) => {
                s.pagination.currentPage = page;
            }),

        fetchBookings: async () => {
            set((s) => {
                s.isLoading = true;
                s.error = null;
            });

            try {
                const { filters, pagination } = get();
                const params = new URLSearchParams({
                    page: String(pagination.currentPage),
                    per_page: String(pagination.perPage),
                    ...(filters.status !== "all" && { status: filters.status }),
                    ...(filters.search && { search: filters.search }),
                    ...(filters.dateFrom && { date_from: filters.dateFrom }),
                    ...(filters.dateTo && { date_to: filters.dateTo }),
                });

                const res = await fetch(`/api/bookings?${params}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();

                set((s) => {
                    s.bookings = json.data;
                    s.pagination.lastPage = json.meta.last_page;
                    s.pagination.total = json.meta.total;
                    s.isLoading = false;
                });
            } catch (err) {
                set((s) => {
                    s.isLoading = false;
                    s.error =
                        err instanceof Error ? err.message : "Unknown error";
                });
            }
        },

        createBooking: async (data) => {
            try {
                const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await get().fetchBookings();
            } catch (err) {
                throw err;
            }
        },

        updateBooking: async (id, data) => {
            const original = get().bookings.find((b) => b.id === id);

            set((s) => {
                const idx = s.bookings.findIndex((b) => b.id === id);
                if (idx !== -1) Object.assign(s.bookings[idx], data);
            });

            try {
                const res = await fetch(`/api/bookings/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error("Update failed");
            } catch (err) {
                if (original) {
                    set((s) => {
                        const idx = s.bookings.findIndex((b) => b.id === id);
                        if (idx !== -1) s.bookings[idx] = original;
                    });
                }
                throw err;
            }
        },

        deleteBooking: async (id) => {
            const original = get().bookings;

            set((s) => {
                s.bookings = s.bookings.filter((b) => b.id !== id);
            });

            try {
                const res = await fetch(`/api/bookings/${id}`, {
                    method: "DELETE",
                });
                if (!res.ok) throw new Error("Delete failed");
            } catch (err) {
                set((s) => {
                    s.bookings = original;
                });
                throw err;
            }
        },

        reset: () => set(initialState),
    })),
);

// ============================================================
// Selector hooks — outside the store
// components subscribe only to what they need
// ============================================================

export function usePaidBookings(): Booking[] {
    return useBookingStore((s) =>
        s.bookings.filter((b) => b.status === "paid"),
    );
}

export function useTotalRevenue(): number {
    return useBookingStore((s) =>
        s.bookings
            .filter((b) => b.status === "paid")
            .reduce((sum, b) => sum + b.amount, 0),
    );
}

/*
================================================================
TIPS
================================================================

ZUSTAND VS USESTATE
--------------------
• useState — state lives inside one component, lost on unmount
• Zustand  — state lives globally outside React, survives unmount
• any component can read/write the same store without prop drilling
• rule: use useState for local UI state, Zustand for shared app state

CREATE() DOUBLE CALL ()()
--------------------------
• create<BookingState>()( immer(...) )
• first ()  — sets the TypeScript type
• second () — passes the implementation with middleware
• required whenever you use middleware (immer, persist, devtools)
• without it: TypeScript cannot infer the store type correctly

SET() VS USESTATE SETTER
--------------------------
• useState: setFilters(f => ({ ...f, search: value }))  — must spread
• Zustand immer: set(s => { s.filters.search = value }) — mutate directly
• immer intercepts the mutation and creates a new state object for you
• rule: inside set() with immer — write as if mutating, immer handles immutability

GET() — READ CURRENT STATE IN ASYNC ACTIONS
---------------------------------------------
• get() reads the store state at the exact moment it is called
• use get() inside async actions to avoid stale closures
• const { filters, pagination } = get()  ← always fresh, never stale
• never read state variables from the outer closure in async functions

SET() IS SYNCHRONOUS — NEVER USE AWAIT INSIDE IT
--------------------------------------------------
• set(s => { s.isLoading = true })  ← sync only
• fetch, await, async operations go OUTSIDE set()
• pattern: set() to update loading → await fetch() → set() to update results
• mixing async inside set() causes silent bugs

IMMER MUTATION — OBJECT.ASSIGN VS SPREAD
------------------------------------------
• to update a nested object with immer: Object.assign(s.bookings[idx], data)
• NOT: s.bookings[idx] = { ...s.bookings[idx], ...data }  ← replaces, immer loses track
• Object.assign mutates the existing object — immer sees the change correctly
• findIndex() gives you the position → s.bookings[idx] gives you the actual object

OPTIMISTIC UPDATE PATTERN
--------------------------
• save original → mutate store immediately → call API → rollback on failure
• UI feels instant — no waiting spinner for simple updates/deletes
• updateBooking: save original booking → Object.assign → rollback if PATCH fails
• deleteBooking: save original array   → filter out  → restore array if DELETE fails
• if API succeeds → original is never used

RESET() WITH INITIALSTATE
--------------------------
• const initialState = { bookings: [], isLoading: false, ... }
• reset: () => set(initialState)
• defined outside the store so it can be reused by other stores on logout
• auth store calls useBookingStore.getState().reset() on logout → clears cached data

SELECTOR HOOKS — SUBSCRIBE TO A SLICE
---------------------------------------
• useBookingStore()          → subscribes to entire store → re-renders on any change
• useBookingStore(s => s.x)  → subscribes to slice x only → re-renders only when x changes
• wrap selectors in custom hooks for reuse:
  export function usePaidBookings() { return useBookingStore(s => s.bookings.filter(...)) }
• components call usePaidBookings() — no idea how the store is structured

REDUCE — SUM PATTERN
---------------------
• array.reduce((accumulator, currentItem) => ..., initialValue)
• accumulator  → carries the running total forward each step (sum, total, result)
• currentItem  → one item from the array per iteration (b, item, booking)
• initialValue → what accumulator starts as (0 for sum, [] for array, {} for object)
• .filter().reduce() → filter first, then sum only matching items

================================================================
*/
