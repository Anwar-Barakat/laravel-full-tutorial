// SOLUTION 01 — Memo / useCallback / useMemo Refactor
// Approach: apply each optimisation in isolation and explain the dependency arrays

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — useMemo for the stats object
// ─────────────────────────────────────────────────────────────────────────────

// The stats object contains four derived values all computed from bookings
// Without useMemo, every render (even from unrelated parent state) recalculates:
//   — a filter + reduce over bookings (revenue)
//   — a filter + length (pending count)
//   — a nested O(n²) reduce (topSchool — see Step 2)

// Fix:
//   const stats = useMemo(() => ({ total, revenue, pending, topSchool }), [bookings])
//   — dependency array: [bookings]
//   — when bookings changes → recalculate → correct new stats
//   — when only currencyCode or onStatusChange changes → skip → return cached stats
//   — the return value of useMemo must be a new object literal each time deps change

// Choosing the right deps:
//   Only include values that the calculation reads
//   stats reads bookings, so [bookings] is correct
//   Do NOT include onStatusChange or currencyCode (they are not read inside stats)
//   Adding unused deps causes unnecessary recalculations — defeating the purpose

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Fix the O(n²) topSchool algorithm BEFORE memoising
// ─────────────────────────────────────────────────────────────────────────────

// The current code: a reduce whose callback runs another complete reduce on every iteration
//   bookings.reduce((top, b) => {
//     const counts = bookings.reduce(...)   ← this runs n times inside an n-iteration loop
//     ...
//   }, '')
// Total iterations: n × n = O(n²)
// With 1 000 bookings that is 1 000 000 iterations

// Correct algorithm (O(n), single pass):
//   1. reduce bookings into a counts map: { schoolName: count }
//   2. find the max entry in that map with Object.entries + sort or a second reduce
//   Total: n + n = 2n = O(n)

// Rule: fix the algorithm FIRST, then memoise
//   Memoising an O(n²) algorithm just means you pay O(n²) less often
//   Fixing it to O(n) AND memoising it means you almost never pay anything

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — useMemo for the Intl.NumberFormat instance
// ─────────────────────────────────────────────────────────────────────────────

// new Intl.NumberFormat(...) is not a cheap constructor call
// It involves locale resolution and option parsing — not something you want on every render
// The formatter only needs to change when currencyCode changes

// Fix:
//   const formatter = useMemo(
//     () => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }),
//     [currencyCode]
//   )
//   — dependency array: [currencyCode]
//   — when currencyCode changes (e.g. GBP → EUR) → new formatter created
//   — when bookings or onStatusChange changes → same formatter returned from cache

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — useCallback for handleConfirm and handleCancel
// ─────────────────────────────────────────────────────────────────────────────

// handleConfirm and handleCancel are passed as props to BookingRow
// Without useCallback they are new function references on every BookingAnalytics render
// React.memo on BookingRow would then see changed props → re-render every row every time

// Fix:
//   const handleConfirm = useCallback((id: number) => onStatusChange(id, 'confirmed'), [onStatusChange])
//   const handleCancel  = useCallback((id: number) => onStatusChange(id, 'cancelled'),  [onStatusChange])
//   — dependency array: [onStatusChange]
//   — the function body calls onStatusChange, so it must be in deps
//   — if onStatusChange itself is wrapped in useCallback by the parent, it will be stable
//   — if not, useCallback here still reduces re-renders to only when onStatusChange changes
//     (not on every keystroke in the search box)

// Why [onStatusChange] and not []:
//   — the function closes over onStatusChange
//   — if onStatusChange is replaced (e.g. parent re-creates it), we must use the new version
//   — using [] would give stale closure: the old onStatusChange is called forever

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — React.memo on BookingAnalytics and BookingRow
// ─────────────────────────────────────────────────────────────────────────────

// BookingAnalytics:
//   Wrap with React.memo so the parent's re-renders (e.g. search input) skip this component
//   when bookings, onStatusChange, and currencyCode are all unchanged
//   const BookingAnalytics = React.memo(function BookingAnalytics({ ... }: Props) { ... })

// BookingRow:
//   Wrap with React.memo so each row only re-renders when its own booking changes
//   const BookingRow = React.memo(function BookingRow({ booking, onConfirm, onCancel }) { ... })
//   This is effective because:
//     — booking reference is stable for unchanged items (functional state updates)
//     — onConfirm is stable (useCallback)
//     — onCancel is stable (useCallback)

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY: which hook goes on which value
// ─────────────────────────────────────────────────────────────────────────────

// useMemo   — for VALUES derived from other values (objects, arrays, class instances)
//             deps = the values it reads
// useCallback — for FUNCTIONS passed as props or used as event handlers in children
//               deps = the values the function closes over
// React.memo  — for COMPONENTS that should skip re-render when props are unchanged
//               makes the other two hooks meaningful at the child boundary
