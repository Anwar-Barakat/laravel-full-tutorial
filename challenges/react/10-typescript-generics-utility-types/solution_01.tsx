// ============================================================
// Problem 01 — Generic Table & Type-Safe Events
// ============================================================

import React, { useState, useCallback } from "react";

// ============================================================
// types/table.ts
// ============================================================

interface Booking {
    id:             number;
    school_name:    string;
    status:         "pending" | "confirmed" | "paid" | "cancelled";
    amount:         number;
    internal_notes: string;
}

// ── Column<T> ─────────────────────────────────────────────────
// key is constrained to keyof T — only real field names allowed
// render receives the VALUE at that key (T[keyof T]) plus the full item

interface Column<T> {
    key:       keyof T;
    header:    string;
    render?:   (value: T[keyof T], item: T) => React.ReactNode;
    sortable?: boolean;
    width?:    string;
}

// ── TableAction<T> (discriminated union) ──────────────────────
// "type" field is the discriminant — TypeScript narrows in switch
// edit/view/duplicate carry the full item; delete only needs id

type TableAction<T> =
    | { type: "edit";      item: T }
    | { type: "delete";    id: number }
    | { type: "view";      item: T }
    | { type: "duplicate"; item: T }

// ── SortState<T> ─────────────────────────────────────────────
// key is constrained to keyof T — can only sort by real fields

interface SortState<T> {
    key: keyof T;
    dir: "asc" | "desc";
}

// ── Utility type examples ─────────────────────────────────────
// Pick  — keep only specific fields
type BookingListItem   = Pick<Booking, "id" | "school_name" | "status">;
// { id: number; school_name: string; status: "pending"|"confirmed"|... }

// Omit  — remove specific fields
type PublicBooking     = Omit<Booking, "internal_notes">;
// { id: number; school_name: string; status: ...; amount: number }

// Partial + Omit — all fields optional except id (for update forms)
type UpdateBookingData = Partial<Omit<Booking, "id">>;
// { school_name?: string; status?: ...; amount?: number; internal_notes?: string }

// Record — same value type for every key
type BookingStatus     = "pending" | "confirmed" | "paid" | "cancelled";
type StatusConfig      = Record<BookingStatus, { label: string; className: string }>;

const STATUS_CONFIG: StatusConfig = {
    pending:   { label: "Pending",   className: "text-yellow-600" },
    confirmed: { label: "Confirmed", className: "text-blue-600"   },
    paid:      { label: "Paid",      className: "text-green-600"  },
    cancelled: { label: "Cancelled", className: "text-red-600"    },
};

// ReturnType — derive type FROM a function's return value
function computeBookingStats(bookings: Booking[]) {
    return {
        total:   bookings.length,
        revenue: bookings.reduce((sum, b) => sum + b.amount, 0),
        paid:    bookings.filter(b => b.status === "paid").length,
    };
}
type BookingStats = ReturnType<typeof computeBookingStats>;
// { total: number; revenue: number; paid: number }

// ============================================================
// useSort<T> — generic sort hook
// ============================================================

interface UseSortReturn<T> {
    sort:   SortState<T> | null;
    toggle: (key: keyof T) => void;
    sortFn: (a: T, b: T) => number;
}

function useSort<T>(initialKey?: keyof T): UseSortReturn<T> {
    const [sort, setSort] = useState<SortState<T> | null>(
        initialKey ? { key: initialKey, dir: "asc" } : null
    );

    // toggle: same key → flip direction; new key → asc
    const toggle = useCallback((key: keyof T) => {
        setSort(prev => {
            if (prev?.key === key) {
                return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
            }
            return { key, dir: "asc" };
        });
    }, []);

    // sortFn: compare two items by the current sort key
    const sortFn = useCallback((a: T, b: T): number => {
        if (!sort) return 0;
        const aVal = a[sort.key];
        const bVal = b[sort.key];

        let result = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
            result = aVal.localeCompare(bVal);         // string: locale-aware
        } else if (typeof aVal === "number" && typeof bVal === "number") {
            result = aVal - bVal;                       // number: subtraction
        }
        return sort.dir === "desc" ? -result : result; // flip sign for desc
    }, [sort]);

    return { sort, toggle, sortFn };
}

// ============================================================
// DataTable<T> — generic table component
// ============================================================

// T must have id: number — used as React key for rows
interface DataTableProps<T extends { id: number }> {
    data:       T[];
    columns:    Column<T>[];
    onSort?:    (key: keyof T, dir: "asc" | "desc") => void;
    onAction?:  (action: TableAction<T>) => void;
    onSelect?:  (item: T) => void;
    isLoading?: boolean;
}

function DataTable<T extends { id: number }>({
    data,
    columns,
    onSort,
    onAction,
    isLoading = false,
}: DataTableProps<T>) {
    const { sort, toggle } = useSort<T>();

    function handleSort(key: keyof T) {
        const newDir = sort?.key === key && sort.dir === "asc" ? "desc" : "asc";
        toggle(key);
        onSort?.(key, newDir);
    }

    if (isLoading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

    return (
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="border-b bg-gray-50">
                    {columns.map(col => (
                        <th
                            key={String(col.key)}
                            className={`px-4 py-2 text-left font-medium text-gray-600 ${col.sortable ? "cursor-pointer select-none hover:bg-gray-100" : ""}`}
                            style={col.width ? { width: col.width } : undefined}
                            onClick={col.sortable ? () => handleSort(col.key) : undefined}
                        >
                            {col.header}
                            {col.sortable && sort?.key === col.key && (
                                <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>
                            )}
                        </th>
                    ))}
                    {onAction && <th className="px-4 py-2 text-left font-medium text-gray-600">Actions</th>}
                </tr>
            </thead>
            <tbody>
                {data.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                        {columns.map(col => (
                            <td key={String(col.key)} className="px-4 py-3">
                                {col.render
                                    ? col.render(item[col.key], item)  // custom render
                                    : String(item[col.key])             // default: toString
                                }
                            </td>
                        ))}
                        {onAction && (
                            <td className="px-4 py-3">
                                <button
                                    className="mr-2 text-blue-500 hover:underline"
                                    onClick={() => onAction({ type: "view",   item })}
                                >View</button>
                                <button
                                    className="mr-2 text-green-500 hover:underline"
                                    onClick={() => onAction({ type: "edit",   item })}
                                >Edit</button>
                                <button
                                    className="text-red-500 hover:underline"
                                    onClick={() => onAction({ type: "delete", id: item.id })}
                                >Delete</button>
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ============================================================
// Discriminated union — exhaustiveness check
// ============================================================

function handleBookingAction(action: TableAction<Booking>): void {
    switch (action.type) {
        case "view":
            // TypeScript KNOWS action.item: Booking here
            console.log("Viewing booking:", action.item.school_name);
            break;
        case "edit":
            // TypeScript KNOWS action.item: Booking here
            console.log("Editing booking:", action.item.id);
            break;
        case "delete":
            // TypeScript KNOWS action.id: number here — action.item does NOT exist
            console.log("Deleting booking id:", action.id);
            break;
        case "duplicate":
            console.log("Duplicating booking:", action.item.school_name);
            break;
        default:
            // Exhaustiveness check — if a new action type is added to the union
            // and not handled above, TypeScript shows an error here
            const _exhaustive: never = action;
            throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
    }
}

// ============================================================
// Usage — BookingTable
// ============================================================

// Pick — only the fields we need in the list view
const bookingColumns: Column<Booking>[] = [
    {
        key:      "school_name",
        header:   "School",
        sortable: true,
    },
    {
        key:    "status",
        header: "Status",
        // render — custom cell using the discriminant + STATUS_CONFIG
        render: (value) => {
            const cfg = STATUS_CONFIG[value as BookingStatus];
            return <span className={cfg.className}>{cfg.label}</span>;
        },
    },
    {
        key:      "amount",
        header:   "Amount (AED)",
        sortable: true,
        render:   (value) =>
            new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
                .format(value as number),
    },
];

export function BookingTable({ bookings }: { bookings: Booking[] }) {
    return (
        <DataTable
            data={bookings}
            columns={bookingColumns}
            onAction={handleBookingAction}
        />
    );
}

/*
================================================================
TIPS
================================================================

GENERICS <T>
-------------
• <T> is a type placeholder filled in at call site
• TypeScript INFERS T — you rarely need to write it manually
• function getFirst<T>(arr: T[]): T — works for any type

keyof T
--------
• Gets all keys of T as a union: "id" | "school_name" | "status" | ...
• Column<T> with key: keyof T → compile error if you use a non-existent field
• NEVER allows typos in field names at compile time

T[K] — indexed access
-----------------------
• T["status"] → the TYPE of the status field (not the value)
• K extends keyof T → K can only be a real key of T
• Links key + value: setValue<K>(key: K, value: T[K]) — key determines value type

UTILITY TYPES
--------------
• Pick<T, "a"|"b"> → keep only named fields
• Omit<T, "a"|"b"> → remove named fields
• Partial<T>       → all fields become optional (?)
• Required<T>      → all fields become required (removes ?)
• Record<K, V>     → object where every key K has type V
• ReturnType<typeof fn> → extracts the return type of a function

DISCRIMINATED UNIONS
----------------------
• Each variant has a literal "type" field (the discriminant)
• switch(action.type) → TypeScript narrows to the correct variant
• Add `default: const _x: never = action` to catch missing cases at compile time

EXTENDS CONSTRAINT
-------------------
• <T extends { id: number }> — T must have id: number
• <K extends keyof T>       — K must be a real key of T
• The constraint is checked at the CALL SITE

================================================================
*/
