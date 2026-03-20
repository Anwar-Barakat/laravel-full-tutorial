// SOLUTION 02 — Memo / useCallback / useMemo Refactor
// Approach: when NOT to optimise, custom hook extraction, and alternative patterns

// ─────────────────────────────────────────────────────────────────────────────
// WHEN NOT TO ADD THESE OPTIMISATIONS
// ─────────────────────────────────────────────────────────────────────────────

// React.memo has a cost:
//   — Every render of the parent must still run the shallow-equality check
//   — For a component with many props that always change, the check adds time
//     without ever actually skipping a render
//   — For cheap components (a single line of JSX), the render itself is faster
//     than the memo comparison

// useMemo has a cost:
//   — The previous value must be stored in memory between renders
//   — The dependency comparison runs on every render regardless
//   — For a simple calculation (e.g. bookings.length) the comparison costs more than
//     just recalculating

// useCallback has a cost:
//   — Same memory + comparison overhead as useMemo
//   — Only worth it if the function is passed to a memoised child
//     (a stable function reference in a non-memoised child does nothing useful)

// Rule of thumb:
//   Measure first (Profiler) → identify the actual slow components/calculations
//   → add memoisation only where there is a measurable benefit
//   Avoid "defensive memoisation" (adding memo/useMemo everywhere just in case)

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE: SPLIT stats INTO MULTIPLE useMemo CALLS
// ─────────────────────────────────────────────────────────────────────────────

// One large useMemo([bookings]) recalculates ALL stats when any booking changes
// If only the revenue field changes (a payment comes in), pending and topSchool
// are also recalculated even though the underlying data for them did not change

// Splitting into separate useMemo calls allows finer-grained invalidation:
//   const revenue   = useMemo(() => ..., [bookings])   // invalidated when any booking changes
//   const pending   = useMemo(() => ..., [bookings])   // same, but independent calculation
//   const topSchool = useMemo(() => ..., [bookings])   // same

// In practice the gain from splitting is minimal because all three depend on the same
// [bookings] array — they would all invalidate at the same time anyway
// Splitting is more useful when different parts depend on different state slices

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE: EXTRACT TO A CUSTOM HOOK
// ─────────────────────────────────────────────────────────────────────────────

// Putting the stats logic inside the component mixes concerns: rendering + computation
// A custom hook separates the calculation and makes it reusable and testable

// useBookingStats(bookings):
//   — accepts bookings array as argument
//   — internally uses useMemo to derive total, revenue, pending, topSchool
//   — returns the stats object
//   — can be unit-tested without rendering a component

// Benefits of the custom hook approach:
//   — The component body stays clean (reads stats from one hook call)
//   — The memoisation logic is co-located with the calculation
//   — The hook can be reused in other components (e.g. a summary widget)
//   — Jest tests can import and call the hook directly with mock data

// ─────────────────────────────────────────────────────────────────────────────
// FIX THE O(n²) ALGORITHM — DETAILED EXPLANATION
// ─────────────────────────────────────────────────────────────────────────────

// The broken version:
//   bookings.reduce((top, b) => {
//     const counts = bookings.reduce(...)   ← runs n times (once per outer iteration)
//     return Object.entries(counts).sort(...)[0]?.[0] ?? ''
//   }, '')
// Every iteration of the outer reduce re-builds the entire counts map from scratch
// This is also wrong logically: the return value of the outer reduce (top) is never used

// Correct single-pass approach:
//   Step 1: build the counts map with one reduce over bookings
//     { 'City School': 3, 'North Academy': 5, ... }
//   Step 2: find the entry with the highest count
//     Object.entries(counts).reduce((best, entry) => entry[1] > best[1] ? entry : best)
//     or sort descending and take [0][0]
//   Total: O(n) + O(k log k) where k = number of unique schools (k << n)
//   In practice: effectively O(n)

// Memoising a fixed algorithm with useMemo([bookings]):
//   — The O(n) algorithm runs only when bookings changes
//   — Between renders (same bookings) it is free (returns cached result)
//   — This is the maximum benefit: correct algorithm + memoisation

// ─────────────────────────────────────────────────────────────────────────────
// useCallback DEPENDENCY ARRAY — AVOIDING STALE CLOSURES
// ─────────────────────────────────────────────────────────────────────────────

// handleConfirm = useCallback((id) => onStatusChange(id, 'confirmed'), [onStatusChange])
// The function body closes over onStatusChange
// onStatusChange MUST be in the deps array

// Why it must be there:
//   If the parent replaces onStatusChange with a new function (e.g. after it changes component state)
//   and we use [] as deps, handleConfirm still holds a reference to the OLD onStatusChange
//   Calling handleConfirm would call the stale version — a stale closure bug

// If onStatusChange is stable (parent wraps it in useCallback):
//   — onStatusChange reference never changes
//   — our useCallback([onStatusChange]) never re-creates handleConfirm
//   — best outcome: stable function, no stale closure

// Functional update pattern avoids this for state setters:
//   setBookings(prev => ...) — the setter from useState is always stable (React guarantees this)
//   so setBookings does NOT need to be in the deps array
//   This is why handleConfirm in the parent component can use useCallback([])

// ─────────────────────────────────────────────────────────────────────────────
// React.memo WITH A CUSTOM COMPARATOR (ADVANCED)
// ─────────────────────────────────────────────────────────────────────────────

// Default React.memo uses Object.is (shallow equality) for each prop
// For bookings (array of objects), shallow equality checks the array reference
// If the parent passes a new array with the same contents, memo would not skip
// (new array reference, even if items are the same)

// A custom comparator can do a deeper check:
//   React.memo(BookingAnalytics, (prev, next) => {
//     // return true = skip re-render (props are "equal")
//     // check array length and each item by id + status + amount (fields relevant to rendering)
//     if (prev.bookings.length !== next.bookings.length) return false
//     if (prev.currencyCode !== next.currencyCode) return false
//     if (prev.onStatusChange !== next.onStatusChange) return false
//     return prev.bookings.every((b, i) => b.id === next.bookings[i].id && b.status === next.bookings[i].status)
//   })
// Use with care: a wrong comparator can cause the component to display stale data
// Most of the time stable references (useCallback/useMemo) make custom comparators unnecessary
