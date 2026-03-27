// ============================================================
// Problem 01 — useBookings Custom Hook
// ============================================================

// ============================================================
// types/booking.ts  (additions)
// (BookingFilters, PaginationState, UseBookingsOptions, UseBookingsReturn)
// ============================================================

import { useEffect, useRef, useState } from "react";

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

interface UseBookingsOptions {
    initialStatus?: BookingStatus | "all";
    perPage?: number;
}

interface CreateBookingData {
    schoolName: string;
    destination: string;
    amount: number;
    tripDate: string;
    studentCount: number;
}

interface UseBookingsReturn {
    bookings: Booking[];
    isLoading: boolean;
    error: string | null;
    filters: BookingFilters;
    setFilter: <K extends keyof BookingFilters>(
        key: K,
        value: BookingFilters[K],
    ) => void;
    pagination: PaginationState;
    setPage: (page: number) => void;
    createBooking: (data: CreateBookingData) => Promise<void>;
    updateBooking: (id: number, data: Partial<Booking>) => Promise<void>;
    deleteBooking: (id: number) => Promise<void>;
    refresh: () => void;
}

// ============================================================
// hooks/useBookings.ts
// (useState for bookings/isLoading/error/filters/pagination/refreshToken)
// (useRef for debounce timer)
// (setFilter<K> generic — search debounced, others immediate)
// (useEffect — URLSearchParams, AbortController cleanup)
// (createBooking, updateBooking optimistic, deleteBooking optimistic)
// ============================================================

export function useBookings(
    options: UseBookingsOptions = {},
): UseBookingsReturn {
    const { initialStatus = "all", perPage = 15 } = options;
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<BookingFilters>({
        status: initialStatus,
        search: "",
        dateFrom: "",
        dateTo: "",
    });
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        lastPage: 1,
        total: 0,
        perPage: perPage,
    });

    const [refreshToken, setRefreshToken] = useState<number>(0);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setPage = (page: number) =>
        setPagination((p) => ({ ...p, currentPage: page }));

    const refresh = () => setRefreshToken((prev) => prev + 1);

    function setFilter<K extends keyof BookingFilters>(
        key: K,
        value: BookingFilters[K],
    ): void {
        if (key === "search") {
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => {
                setFilters((f) => ({ ...f, [key]: value }));
                setPagination((p) => ({ ...p, currentPage: 1 }));
            }, 300);
        } else {
            setFilters((f) => ({ ...f, [key]: value }));
            setPagination((p) => ({ ...p, currentPage: 1 }));
        }
    }

    useEffect(() => {
        const controller = new AbortController();

        async function fetch_() {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    page: String(pagination.currentPage),
                    per_page: String(perPage),
                    ...(filters.status !== "all" && { status: filters.status }),
                    ...(filters.search && { search: filters.search }),
                    ...(filters.dateFrom && { date_from: filters.dateFrom }),
                    ...(filters.dateTo && { date_to: filters.dateTo }),
                });

                const res = await fetch(`/api/bookings?${params}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = await res.json();
                setBookings(json.data);
                setPagination((p) => ({
                    ...p,
                    lastPage: json.meta.last_page,
                    total: json.meta.total,
                }));
            } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") {
                    setError(err.message);
                }
            } finally {
                setIsLoading(false);
            }
        }

        fetch_();
        return () => controller.abort();
    }, [filters, pagination.currentPage, refreshToken]);

    async function updateBooking(
        id: number,
        data: Partial<Booking>,
    ): Promise<void> {
        setBookings((bs) =>
            bs.map((b) => (b.id === id ? { ...b, ...data } : b)),
        );

        try {
            const res = await fetch(`/api/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Update failed");
        } catch (err) {
            refresh();
            throw err;
        }
    }

    async function deleteBooking(id: number): Promise<void> {
        setBookings((bs) => bs.filter((b) => b.id !== id));
        try {
            const res = await fetch(`/api/bookings/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Delete failed");
        } catch (err) {
            refresh();
            throw err;
        }
    }

    async function createBooking(data: CreateBookingData): Promise<void> {
        const res = await fetch("/api/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Create failed");
        refresh();
    }

    return {
        bookings,
        isLoading,
        error,
        filters,
        setFilter,
        pagination,
        setPage,
        createBooking,
        updateBooking,
        deleteBooking,
        refresh,
    };
}

/*
================================================================
TIPS
================================================================

SETFILTERS vs SETFILTER — WHAT IS THE DIFFERENCE?
---------------------------------------------------
• filters        → the current state value — read from it: filters.search, filters.status
• setFilters     → raw React state setter — INTERNAL only, never leave the hook
• setFilter      → smart public function — what the component calls

• setFilters is private — only used inside setFilter
• setFilter is public  — exposed in the return object, used by the component

• component never calls setFilters directly
• component always calls setFilter("search", value) — one clean API

WHERE SETFILTER IS USED — NOT IN THE INPUT VALUE
-------------------------------------------------
• input value   → always reads from filters.search  (the state)
• input typing  → calls setFilter("search", e.target.value)
• searchTimer   → invisible to the UI, lives only inside the hook
• the component has no idea debounce is happening

<input
    value={filters.search}                              ← reads state
    onChange={e => setFilter("search", e.target.value)} ← calls setFilter
/>

DEBOUNCE — WHY IT EXISTS
-------------------------
• without debounce: every keystroke → setFilters → useEffect → API call
• "Dubai" = 5 keystrokes = 5 API calls — wasteful
• with debounce: wait 300ms after last keystroke → 1 API call ✅

HOW DEBOUNCE WORKS WITH USEREF
--------------------------------
• searchTimer.current holds the timer ID between renders
• on every keystroke:
  1. clearTimeout(searchTimer.current)  → cancel the previous timer
  2. searchTimer.current = setTimeout(...)  → start a new 300ms timer
• only the last timer completes → setFilters fires once
• useRef not useState — storing the timer must NOT cause a re-render

DEBOUNCE ONLY FOR SEARCH — NOT FOR OTHER FILTERS
--------------------------------------------------
• search → user types character by character → debounce needed
• status → user picks from dropdown → one selection = apply immediately
• dateFrom/dateTo → user picks from date picker → one selection = apply immediately
• rule: debounce only when value changes with every keystroke

REFRESHTOKEN — FORCE RE-FETCH WITHOUT CHANGING FILTERS
--------------------------------------------------------
• refreshToken is a counter: 0, 1, 2, 3...
• it sits in useEffect deps: [filters, pagination.currentPage, refreshToken]
• refresh() increments it → useEffect sees a change → re-fetches
• used in: updateBooking and deleteBooking rollback after API failure
• the component calls refresh() → hook re-fetches real data silently

ABORTCONTROLLER — CANCEL IN-FLIGHT REQUESTS
---------------------------------------------
• filters change while a request is in flight → old request is now stale
• AbortController cancels it before the response arrives
• without it: stale response updates state AFTER the new response → wrong data shown
• return () => controller.abort() → cleanup runs before next effect AND on unmount

OPTIMISTIC UPDATE PATTERN
--------------------------
• updateBooking: update UI first → then call API → if API fails → refresh() rollback
• deleteBooking: remove from UI first → then call API → if API fails → refresh() rollback
• user sees instant feedback — no waiting spinner for simple actions
• if server disagrees → real data is silently restored via refresh()

PARTIAL<BOOKING>
-----------------
• Partial<Booking> makes every field in Booking optional
• updateBooking(id, { status: "cancelled" }) — only send what changed
• without Partial: you would need to send all fields every time

================================================================
*/
