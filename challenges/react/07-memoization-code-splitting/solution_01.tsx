// ============================================================
// Problem 01 — Render Profiling & Optimization Patterns
// ============================================================

import { useCallback, useMemo, useState, createContext } from "react";

// ============================================================
// Shared types
// ============================================================

interface Booking {
    id:            number;
    school_name:   string;
    status:        "pending" | "confirmed" | "paid" | "cancelled";
    student_count: number;
    amount:        number;
}

// ============================================================
// useMemo — WRONG vs RIGHT
// ============================================================

const STATUS_LABELS: Record<string, string> = {
    pending:   "Pending",
    confirmed: "Confirmed",
    paid:      "Paid",
    cancelled: "Cancelled",
};

// WRONG — trivial lookup, memo overhead > computation
function BookingBadgeWrong({ status }: { status: string }) {
    const label = useMemo(() => STATUS_LABELS[status], [status]);
    return <span>{label}</span>;
}

// RIGHT — expensive derivation (sort + filter + reduce on large array)
function BookingStats({ bookings }: { bookings: Booking[] }) {
    const stats = useMemo(
        () => ({
            total:     bookings.length,
            paid:      bookings.filter((b) => b.status === "paid").length,
            revenue:   bookings.reduce((sum, b) => sum + b.amount, 0),
            topSchool: [...bookings].sort((a, b) => b.amount - a.amount)[0]?.school_name ?? "—",
        }),
        [bookings],
    );
    return (
        <div>
            <p>Total: {stats.total}</p>
            <p>Paid: {stats.paid}</p>
            <p>Revenue: {stats.revenue}</p>
            <p>Top School: {stats.topSchool}</p>
        </div>
    );
}

// ============================================================
// React.memo — WRONG vs RIGHT
// ============================================================

// WRONG — inline object prop creates new ref every render → memo never bails out
const MemoizedCard = React.memo(function BookingCardWrong({
    booking,
    style, // ← new object every render
}: {
    booking: Booking;
    style:   React.CSSProperties;
}) {
    return <div style={style}>{booking.id}</div>;
});
// Usage: <MemoizedCard booking={b} style={{ color: "red" }} />
// → style is a new object every render → memo never skips

// RIGHT — stable reference from module scope
const STATUS_STYLE: Record<string, React.CSSProperties> = {
    paid:      { color: "green" },
    pending:   { color: "orange" },
    cancelled: { color: "red" },
};

const StableCard = React.memo(function BookingCard({
    booking,
    onSelect,
}: {
    booking:  Booking;
    onSelect: (id: number) => void;
}) {
    const style = STATUS_STYLE[booking.status]; // stable — no new ref
    return (
        <div style={style} onClick={() => onSelect(booking.id)}>
            {booking.id}
        </div>
    );
});

// useCallback — keeps function reference stable so StableCard memo works
function BookingList({ bookings }: { bookings: Booking[] }) {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleSelect = useCallback((id: number) => {
        setSelectedId(id);
    }, []); // stable — no deps

    return (
        <div>
            {bookings.map((b) => (
                <StableCard key={b.id} booking={b} onSelect={handleSelect} />
            ))}
        </div>
    );
}

// ============================================================
// Context splitting — WRONG vs RIGHT
// ============================================================

// WRONG — one big context re-renders ALL consumers on any change
const BookingContextWrong = createContext<{
    bookings:    Booking[];
    selectedId:  number | null;
    filter:      string;
    setFilter:   (f: string) => void;
    setSelected: (id: number) => void;
} | null>(null);

// RIGHT — split by update frequency
// 1. Stable data context (changes rarely)
const BookingDataContext = createContext<Booking[] | null>(null);

// 2. UI state context (changes on click)
const BookingUIContext = createContext<{
    selectedId:  number | null;
    setSelected: (id: number) => void;
} | null>(null);

// 3. Filter context (changes on user input)
const BookingFilterContext = createContext<{
    filter:    string;
    setFilter: (f: string) => void;
} | null>(null);

function BookingProvider({ children }: { children: React.ReactNode }) {
    const [bookings]                = useState<Booking[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [filter,     setFilter]   = useState("all");

    // Each value memoized independently — one change doesn't affect the others
    const dataValue   = useMemo(() => bookings,                       [bookings]);
    const uiValue     = useMemo(() => ({ selectedId, setSelectedId }), [selectedId]);
    const filterValue = useMemo(() => ({ filter, setFilter }),         [filter]);

    return (
        <BookingDataContext.Provider value={dataValue}>
            <BookingUIContext.Provider value={uiValue}>
                <BookingFilterContext.Provider value={filterValue}>
                    {children}
                </BookingFilterContext.Provider>
            </BookingUIContext.Provider>
        </BookingDataContext.Provider>
    );
}

/*
================================================================
TIPS
================================================================

USEMEMO — WHEN TO USE AND WHEN TO SKIP
-----------------------------------------
• WRONG: memoizing a hash lookup, string concat, single condition — overhead > savings
• RIGHT: sorting, filtering, or reducing large arrays that would recompute every render
• rule: if the computation is < 1ms without memo, skip it
• deps must include every value the function uses — React lint rule enforces this
• if deps change every render (e.g. inline object), useMemo still runs every render

REACT.MEMO — WHEN IT ACTUALLY HELPS
--------------------------------------
• memo prevents re-render only when ALL props pass shallow equality check
• inline objects { color: "red" } or inline functions () => {} fail every check
• rule: use memo on a component only when its props are stable primitives or memoized values
• combine with useCallback for function props — memo + useCallback work as a pair
• memo adds a cost (comparison) — only worth it when the render it prevents is expensive

CONTEXT SPLITTING — PREVENTING CASCADING RE-RENDERS
------------------------------------------------------
• every context consumer re-renders when the context VALUE changes
• if one context holds bookings + selectedId, a click re-renders BookingTable too
• split by update frequency: data (slow) / UI state (medium) / filter (fast)
• memoize each value independently with useMemo so one change doesn't spread
• consumers subscribe only to what they need — no unnecessary re-renders
• rule: split context when different consumers need different parts of state

USEWHYDIDYOURENDER — WHEN DOES IT FIRE?
-----------------------------------------
• runs after EVERY single render of the component it's placed in
• fires when a prop changed — any prop has a new value
• fires when a prop got a new reference — same value but different object/function in memory
  e.g. style={{ color: "red" }} inline creates a new object every render → fires every time
• fires when parent re-rendered — even if no props changed, child re-renders without React.memo
• logs WHICH prop caused it so you can see exactly what to fix:
  - function prop changed → wrap it in useCallback on the parent
  - object prop changed  → wrap it in useMemo or move it to module scope
  - nothing changed but still re-rendered → wrap the component in React.memo
• dev-only debugging tool — remove before shipping to production, adds overhead every render

OPTIMIZATION DECISION TABLE
------------------------------
• React.memo   — child receives stable props, renders are expensive
• useMemo      — expensive derivation (sort/filter large arrays)
• useCallback  — passing function to memo'd child
• Context split — context mixes fast + slow changing state

================================================================
*/
