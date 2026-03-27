// ============================================================
// Problem 01 — BookingCard Component
// ============================================================

// ============================================================
// types/booking.ts
// ============================================================

export type BookingStatus =
    | "pending"
    | "confirmed"
    | "paid"
    | "completed"
    | "cancelled";

export type BookingAction = "view" | "edit" | "cancel";

export interface Booking {
    id: number;
    reference: string;
    schoolName: string;
    destination: string;
    amount: number;
    status: BookingStatus;
    tripDate: string; // ISO date string e.g. "2026-06-15"
    studentCount: number;
}

export interface BookingCardProps {
    booking: Booking;
    onAction: (action: BookingAction, bookingId: number) => void;
    isLoading?: boolean;
}

// ============================================================
// components/BookingCard.tsx
// ============================================================

import React from "react";

type BookingStatusValue = {
    label: string;
    classes: string;
};

// outside component — doesn't depend on props/state, created once
const statusConfig: Record<BookingStatus, BookingStatusValue> = {
    pending: { label: "Pending", classes: "bg-yellow-100 text-yellow-800" },
    confirmed: { label: "Confirmed", classes: "bg-blue-100 text-blue-800" },
    paid: { label: "Paid", classes: "bg-green-100 text-green-800" },
    completed: { label: "Completed", classes: "bg-gray-100 text-gray-800" },
    cancelled: { label: "Cancelled", classes: "bg-red-100 text-red-800" },
};

function formatAmount(amount: number): string {
    return `AED ${new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2 }).format(amount)}`;
}

const BookingCard: React.FC<BookingCardProps> = ({
    booking,
    onAction,
    isLoading = false,
}) => {
    if (isLoading)
        return <div className="animate-pulse bg-gray-100 rounded-lg h-40" />;

    const { label, classes } = statusConfig[booking.status];
    const canEdit = !["completed", "cancelled"].includes(booking.status);
    const canCancel = ["pending", "confirmed"].includes(booking.status);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">
                        {booking.schoolName}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {booking.destination}
                    </p>
                </div>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${classes}`}
                >
                    {label}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium">
                        {formatAmount(booking.amount)}
                    </p>
                </div>
                <div>
                    <p className="text-gray-500">Students</p>
                    <p className="font-medium">{booking.studentCount}</p>
                </div>
                <div>
                    <p className="text-gray-500">Trip Date</p>
                    <p className="font-medium">
                        {new Date(booking.tripDate).toLocaleDateString("en-AE")}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <button onClick={() => onAction("view", booking.id)}>
                    View
                </button>
                {canEdit && (
                    <button onClick={() => onAction("edit", booking.id)}>
                        Edit
                    </button>
                )}
                {canCancel && (
                    <button onClick={() => onAction("cancel", booking.id)}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default BookingCard;

/*
================================================================
TIPS
================================================================

UNION TYPES
-----------
• type BookingStatus = "pending" | "confirmed" | "paid" | ...
• only those exact strings are valid — TypeScript errors on anything else
• use for: status fields, action names, fixed string sets

RECORD<KEY, VALUE>
------------------
• Record<BookingStatus, { label: string; classes: string }>
• creates an object where every key in BookingStatus must be present
• TypeScript errors if you forget a case — exhaustive by design
• use for: config maps, lookup tables keyed by a union type
• alternative: write the type inline or extract it (BookingStatusValue)

OPTIONAL PROPS
--------------
• isLoading?: boolean  → the ? makes it optional
• default value in destructuring: isLoading = false
• always provide defaults for optional props to avoid undefined checks

REACT.FC<PROPS>
---------------
• React.FC<BookingCardProps> → typed functional component
• alternative: const BookingCard = (props: BookingCardProps): JSX.Element => {}
• both are valid — React.FC is more concise

WHERE TO DEFINE HELPERS
------------------------
• statusConfig and formatAmount are outside the component
• they don't use props, state, or hooks — no need to recreate on every render
• rule: if it doesn't use props/state/hooks → put it outside the component

INTL.NUMBERFORMAT
-----------------
• built-in JavaScript API — no import needed
• Intl is a global object for internationalization (numbers, dates, currencies)
• new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2 }).format(5000)
• → "5,000.00"  (locale-aware: commas for thousands, 2 decimal places)
• new Intl.NumberFormat("ar-AE", { minimumFractionDigits: 2 }).format(5000)
• → "٥٬٠٠٠٫٠٠"  (Arabic numerals for ar-AE locale)
• prepend "AED " manually for the currency label
• pattern: create formatter → call .format(number)
• why new? Intl.NumberFormat is a class — you create an instance, then call methods on it

NEW DATE()
----------
• built-in JavaScript class — no import needed
• new Date("2026-06-15")  → parses ISO string into a Date object
• new Date("2026-06-15").toLocaleDateString("en-AE")  → "15/06/2026"
• new Date("2026-06-15").toLocaleDateString("ar-AE")  → "١٥/٠٦/٢٠٢٦"
• pattern: new Date(isoString) → instance → call .toLocaleDateString(locale)
• why new? Date is a class — same as Intl.NumberFormat, you need an instance first
• rule: both Intl.NumberFormat and Date use new because they are classes not functions

CONDITIONAL RENDERING
----------------------
• {canEdit && <button>Edit</button>}
• if canEdit is false → nothing renders
• {canCancel && <button>Cancel</button>} → same pattern
• canEdit   = status NOT in ["completed", "cancelled"]
• canCancel = status IN ["pending", "confirmed"]
• use .includes() for multi-value checks — cleaner than === "a" || === "b"

================================================================
*/
