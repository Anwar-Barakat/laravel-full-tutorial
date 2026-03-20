// SOLUTION 01 — Re-render Profiler Debug
// Approach: identify each root cause, then apply the minimum fix for each one

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO READ THE REACT DEVTOOLS PROFILER
// ─────────────────────────────────────────────────────────────────────────────

// Open React DevTools → Profiler tab → click Record → interact with the UI → Stop
// The flame graph shows every component that rendered during that recording
// Components shown in colour (orange/red) re-rendered
// Components shown in grey did NOT re-render (they were bailed out)
// Hover over a component to see: why it rendered, how long it took, how many times

// "Highlight updates when components render" (DevTools Settings → General)
// — live mode: flashes a coloured border around each component as it re-renders
// — useful for spotting unexpected re-renders without recording first

// console.log statements in BookingsTable and BookingRow act as cheap profiling:
// open the browser console, type in the search box — if you see N log lines
// for N unchanged rows, you have an unnecessary re-render problem

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1 — handleConfirm is a new function reference on every render
// ─────────────────────────────────────────────────────────────────────────────

// When BookingsDashboard re-renders (e.g. because searchText state changed),
// the handleConfirm arrow function is recreated as a brand-new object in memory
// JavaScript: {} !== {} and () => {} !== () => {} — different reference each time
// React.memo on BookingsTable compares old props vs new props by reference
// onConfirm (old ref) !== onConfirm (new ref) → memo bailout fails → re-render

// Fix: wrap handleConfirm in useCallback
//   useCallback(fn, deps) returns the same function reference across renders
//   as long as none of the listed dependencies have changed
//
//   const handleConfirm = useCallback((id: number) => {
//     setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
//   }, [])
//   — dependency array is empty [] because the updater uses the functional form
//     of setBookings (prev => ...), so it does not close over the current bookings value
//     and does not need bookings in the deps array

// ─────────────────────────────────────────────────────────────────────────────
// BUG 2 — tableConfig is a new object reference on every render
// ─────────────────────────────────────────────────────────────────────────────

// The object literal `{ pageSize: 15, sortable: true, selectable: false }` creates
// a new object in memory on every render, even though the values never change
// React.memo on BookingsTable receives config (old ref) !== config (new ref) → re-renders

// Fix option A — move the constant outside the component (simplest, best for true constants)
//   const TABLE_CONFIG = { pageSize: 15, sortable: true, selectable: false }
//   — defined once at module level, same reference forever
//   — correct when the config does not depend on props or state

// Fix option B — useMemo inside the component (use when the values depend on props/state)
//   const tableConfig = useMemo(() => ({ pageSize: 15, sortable: true, selectable: false }), [])
//   — deps = [] because values are truly constant; recalculates only on mount

// ─────────────────────────────────────────────────────────────────────────────
// BUG 3 — BookingsTable and BookingRow are not wrapped in React.memo
// ─────────────────────────────────────────────────────────────────────────────

// Even with stable prop references, without React.memo the children always re-render
// when the parent re-renders — React does not skip children by default
// React.memo(Component) is the opt-in shallow-equality bailout

// Fix: wrap both child components
//   const BookingsTable = React.memo(function BookingsTable({ bookings, onConfirm, config }) { ... })
//   const BookingRow    = React.memo(function BookingRow({ booking, onConfirm }) { ... })
//
//   React.memo does a shallow comparison of each prop:
//     bookings: same array reference (state update with functional form preserves unchanged items)
//     onConfirm: same function reference (useCallback)
//     config: same object reference (moved outside or useMemo)
//   → all props equal → re-render is skipped

// ─────────────────────────────────────────────────────────────────────────────
// WHY THE THREE FIXES MUST ALL BE APPLIED TOGETHER
// ─────────────────────────────────────────────────────────────────────────────

// React.memo alone does nothing if the props passed in are new references every render
// useCallback/useMemo alone do nothing if the child is not wrapped in React.memo
// The chain is:
//   stable prop reference (useCallback / useMemo / constant)
//     + memo bailout on child (React.memo)
//       = no unnecessary re-render

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT IDENTITY AND FUNCTIONAL STATE UPDATES
// ─────────────────────────────────────────────────────────────────────────────

// When confirming booking id=5:
//   setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
// The map returns a NEW array, but for every booking where id !== 5
// it returns the SAME object reference (b — not spread, not recreated)
// So BookingRow for id=1, 2, 3, 4, 6 … receive the same booking object reference
// React.memo sees booking (old) === booking (new) → skips those rows
// Only BookingRow for id=5 receives a new object ({ ...b, status: 'confirmed' }) → re-renders
