// SOLUTION 02 — Re-render Profiler Debug
// Approach: React.memo deep-dive, when NOT to optimise, concurrent mode alternatives

// ─────────────────────────────────────────────────────────────────────────────
// HOW React.memo WORKS UNDER THE HOOD
// ─────────────────────────────────────────────────────────────────────────────

// React.memo(Component) wraps the component in a special fibre type
// Before React renders the component it checks: are any props different?
// Comparison is shallow (Object.is for each prop value)
//   — primitives (string, number, boolean): compared by value — always works
//   — objects and arrays: compared by reference — ONLY works if the reference is stable
//   — functions: compared by reference — ONLY works with useCallback

// If ALL props pass the Object.is check → React reuses the previous rendered output
// If ANY prop fails → React re-renders the component

// Custom comparison: React.memo(Component, (prevProps, nextProps) => isEqual(prevProps, nextProps))
//   — second argument is an areEqual function (return true = skip re-render, false = re-render)
//   — rarely needed; useCallback + useMemo usually make the default shallow check sufficient
//   — deep equality (e.g. lodash isEqual) adds its own cost — measure before using

// ─────────────────────────────────────────────────────────────────────────────
// React.memo ON BookingRow — WHAT NEEDS TO BE STABLE
// ─────────────────────────────────────────────────────────────────────────────

// BookingRow receives two props: booking (object) and onConfirm (function)

// booking stability:
//   — useState with functional update (prev => prev.map(...)) returns the SAME object
//     reference for items that were not changed
//   — so booking for unchanged rows is stable by reference
//   — if you used setBookings([...bookings]) (non-functional) you would get a new array
//     but the items inside would still be the same references (unless you spread them)

// onConfirm stability:
//   — must be wrapped in useCallback
//   — the dependency array should be [] because the function body uses
//     the functional form of setBookings (no direct bookings read)
//   — if you added bookings to the deps, useCallback would return a new function
//     every time bookings changes, defeating the purpose for rows that did not change

// ─────────────────────────────────────────────────────────────────────────────
// WHEN NOT TO OPTIMISE (PREMATURE OPTIMISATION)
// ─────────────────────────────────────────────────────────────────────────────

// React.memo, useMemo, and useCallback all have a cost:
//   — memory: the memoised value or function must be stored between renders
//   — time: the shallow comparison itself takes time (small but non-zero)
//   — complexity: the code is harder to read and reason about

// Do NOT add these optimisations speculatively. Add them only when:
//   a) you have measured a real performance problem with the Profiler, AND
//   b) the component is expensive to render (large DOM, heavy computation), OR
//      the component re-renders very frequently with the same props

// Bad candidates for React.memo:
//   — components that almost always receive different props
//   — very cheap components (a single <span> or <li>)
//   — components that receive plain primitive props (React already diffs primitives cheaply)

// Good candidates:
//   — large list rows (like BookingRow) rendered hundreds of times
//   — components that do heavy computation or render deeply nested trees
//   — components that receive stable props but whose parent re-renders often

// ─────────────────────────────────────────────────────────────────────────────
// useTransition — DEFER NON-URGENT STATE UPDATES
// ─────────────────────────────────────────────────────────────────────────────

// The filter dropdown (pending / all) changes which rows are shown
// Recomputing the filtered list may be slow with thousands of bookings
// The UI should remain responsive (search input must not freeze) while filtering happens

// useTransition marks the filter state update as non-urgent:
//   const [isPending, startTransition] = useTransition()
//   startTransition(() => setFilter(e.target.value))
// React renders the old filter result first (keeps UI interactive),
// then applies the new filter in a lower-priority pass
// isPending is true while the transition is in progress — show a spinner

// ─────────────────────────────────────────────────────────────────────────────
// useDeferredValue — DEFER A PROP / STATE VALUE
// ─────────────────────────────────────────────────────────────────────────────

// The search input updates searchText on every keystroke
// A downstream component that filters bookings by searchText re-renders on every keystroke
// useDeferredValue gives that component a "lagged" version of searchText:
//   const deferredSearch = useDeferredValue(searchText)
// The input itself stays responsive (searchText updates immediately)
// The expensive filtered list re-renders only when React has idle time
// No callback or transition needed — useDeferredValue works at the consumption site

// Difference from useTransition:
//   useTransition — you control the state setter (you own the update)
//   useDeferredValue — you receive a value from props or state you do not own

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE MENTAL MODEL FOR THIS COMPONENT TREE
// ─────────────────────────────────────────────────────────────────────────────

// User types in search box
//   → setSearchText fires (urgent — keep input responsive)
//   → BookingsDashboard re-renders
//   → handleConfirm: same reference (useCallback, deps=[])
//   → tableConfig: same reference (moved outside component or useMemo([]))
//   → BookingsTable: React.memo checks props → all stable → SKIPPED
//   → All BookingRow: SKIPPED (no re-render cascade)
//   → Only the <input> DOM node updates (its value prop changed)

// User clicks Confirm on booking id=5
//   → handleConfirm(5) fires
//   → setBookings(prev => ...) — functional update
//   → bookings state: new array, but only item id=5 is a new object
//   → BookingsDashboard re-renders
//   → BookingsTable: React.memo checks bookings — NEW array reference → re-renders
//   → BookingRow id=1..4, 6..: booking prop same reference → SKIPPED
//   → BookingRow id=5: booking prop is new object { ...b, status: 'confirmed' } → re-renders
