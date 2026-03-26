// ============================================================
// Problem 02 — BookingList with Filters, Sort & Pagination
// ============================================================


// ============================================================
// types/booking.ts  (additions)
// ============================================================

import React, { useEffect, useMemo, useState } from "react";

export type BookingStatus =
    | "pending"
    | "confirmed"
    | "paid"
    | "completed"
    | "cancelled";

export type BookingAction = "view" | "edit" | "cancel";

export interface Booking {
    id:           number;
    reference:    string;
    schoolName:   string;
    destination:  string;
    amount:       number;
    status:       BookingStatus;
    tripDate:     string;
    studentCount: number;
}

export interface FilterState {
    status:   BookingStatus | "all";
    search:   string;
    dateFrom: string;
    dateTo:   string;
}

export type SortField = "tripDate" | "amount" | "schoolName";
export type SortOrder = "asc" | "desc";

export interface SortState {
    field: SortField;
    order: SortOrder;
}

export interface BookingListProps {
    bookings:        Booking[];
    isLoading?:      boolean;
    onBookingAction: (action: BookingAction, bookingId: number) => void;
}


// ============================================================
// components/BookingList.tsx
// ============================================================

const BookingList: React.FC<BookingListProps> = ({
    bookings,
    isLoading = false,
    onBookingAction,
}) => {
    const [filters, setFilters] = useState<FilterState>({
        status: "all", search: "", dateFrom: "", dateTo: "",
    });
    const [sort, setSort]               = useState<SortState>({ field: "tripDate", order: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize]       = useState<number>(10);

    // ① filter + sort — recalculates only when bookings, filters, or sort changes
    const filtered = useMemo(() => {
        let result = [...bookings]

        // step 1 — filter by status
        if (filters.status !== "all") {
            result = result.filter((b) => b.status === filters.status)
        }

        // step 2 — filter by search (school name or destination)
        if (filters.search) {
            const term = filters.search.toLowerCase()
            result = result.filter(
                (b) =>
                    b.schoolName.toLowerCase().includes(term) ||
                    b.destination.toLowerCase().includes(term)
            )
        }

        // step 3 — filter by date from
        if (filters.dateFrom) {
            result = result.filter((b) => b.tripDate >= filters.dateFrom)
        }

        // step 4 — filter by date to
        if (filters.dateTo) {
            result = result.filter((b) => b.tripDate <= filters.dateTo)
        }

        // step 5 — sort
        result.sort((a, b) => {
            const aVal = a[sort.field]
            const bVal = b[sort.field]
            const dir  = sort.order === "asc" ? 1 : -1
            if (typeof aVal === "string" && typeof bVal === "string") {
                return aVal.localeCompare(bVal) * dir
            }
            return ((aVal as number) - (bVal as number)) * dir
        })

        return result
    }, [bookings, filters, sort])

    const totalPages = Math.ceil(filtered.length / pageSize)

    // ② paginate — recalculates only when filtered, page, or size changes
    const paginated = useMemo(
        () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [filtered, currentPage, pageSize]
    )

    // ③ reset to page 1 when filters or pageSize change
    useEffect(() => { setCurrentPage(1) }, [filters, pageSize])

    function toggleSort(field: SortField): void {
        setSort((s) => ({
            field,
            order: s.field === field && s.order === "asc" ? "desc" : "asc",
        }))
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-40" />
                ))}
            </div>
        )
    }

    return (
        <div>
            {/* Filter bar */}
            <div className="flex flex-wrap gap-3 mb-4">
                <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as FilterState["status"] }))}
                    className="border rounded-md px-3 py-2 text-sm"
                >
                    <option value="all">All Statuses</option>
                    {(["pending", "confirmed", "paid", "completed", "cancelled"] as BookingStatus[]).map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Search school or destination…"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[200px]"
                />

                <input type="date" value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className="border rounded-md px-3 py-2 text-sm" />

                <input type="date" value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className="border rounded-md px-3 py-2 text-sm" />
            </div>

            {/* Sort bar */}
            <div className="flex gap-2 mb-4 text-sm">
                {(["tripDate", "amount", "schoolName"] as SortField[]).map((field) => (
                    <button
                        key={field}
                        onClick={() => toggleSort(field)}
                        className={`px-3 py-1 rounded-md transition-colors ${
                            sort.field === field ? "bg-blue-100 text-blue-700" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                    >
                        {{ tripDate: "Date", amount: "Amount", schoolName: "School" }[field]}
                        {sort.field === field && (sort.order === "asc" ? " ↑" : " ↓")}
                    </button>
                ))}
            </div>

            {/* Results */}
            {paginated.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No bookings found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginated.map((booking) => (
                        <div key={booking.id} className="p-4 border rounded-lg">
                            {booking.schoolName} — {booking.status}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="border rounded px-2 py-1"
                        >
                            {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>per page · {filtered.length} total</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
                        >←</button>
                        <span className="px-3">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
                        >→</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BookingList


/*
================================================================
TIPS
================================================================

USEMEMO
-------
• useMemo(() => computation, [deps]) → caches result, only recomputes when deps change
• use for expensive computations: filtering, sorting, transforming large arrays
• two-level memo pattern:
  - filtered = filter + sort (deps: bookings, filters, sort)
  - paginated = slice of filtered (deps: filtered, currentPage, pageSize)
• changing page → filtered doesn't recompute (currentPage not in its deps) ✅
• changing filters → both recompute (filtered changes → paginated also changes) ✅

USEEFFECT RESET PAGE
---------------------
• useEffect(() => { setCurrentPage(1) }, [filters, pageSize])
• without this: user on page 3, applies a filter → only 5 results → page 3 shows nothing
• with this: any filter/size change resets to page 1 automatically

FUNCTIONAL STATE UPDATE
------------------------
• setFilters((f) => ({ ...f, search: e.target.value }))
• (f) => ... uses the current state as f — avoids stale closure bug
• ...f spreads existing fields, then override only what changed
• never do: setFilters({ ...filters, search: ... }) inside event handlers — can be stale

SORT LOGIC
----------
• dir = sort.order === "asc" ? 1 : -1
• multiply comparison result by dir to flip order
• strings: localeCompare() — handles names correctly across locales
• numbers: (aVal - bVal) * dir

FILTER LOGIC — STEP BY STEP (cleaner approach)
------------------------------------------------
• start with let result = [...bookings]  — copy the array
• apply each filter one at a time with if blocks
• if (filters.status !== "all") → result = result.filter(b => b.status === filters.status)
• if (filters.search)           → result = result.filter(b => name or destination includes term)
• if (filters.dateFrom)         → result = result.filter(b => b.tripDate >= filters.dateFrom)
• if (filters.dateTo)           → result = result.filter(b => b.tripDate <= filters.dateTo)
• sort result last, then return result
• ISO date strings compare correctly with >= and <= operators ("2026-06-01" >= "2026-01-01" ✅)
• search: use || (OR) — booking matches if school name OR destination contains the term

PAGINATION SLICE
----------------
• page 1, size 10 → slice(0, 10)
• page 2, size 10 → slice(10, 20)
• formula: slice((currentPage - 1) * pageSize, currentPage * pageSize)
• totalPages = Math.ceil(filtered.length / pageSize)

================================================================
*/
