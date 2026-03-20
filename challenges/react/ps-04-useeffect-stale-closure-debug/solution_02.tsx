// SOLUTION 02 — Bug 4: object reference in deps + general rules for stable dependencies
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// BUG 4 — Object reference in dependency array causes infinite re-render loop
// ─────────────────────────────────────────────

// Root cause — object identity vs. object equality:
//   function BookingList({ filters }: { filters: { status: string } }) {
//     useEffect(() => {
//       fetch(`/api/bookings?status=${filters.status}`)
//         .then(res => res.json())
//         .then(setBookings)
//     }, [filters])   // ← 'filters' is an object reference
//   }
//
//   — React compares dependency values using Object.is() (same as ===)
//   — primitives (strings, numbers, booleans): === compares by value → 'pending' === 'pending' ✓
//   — objects: === compares by reference (memory address) → {} === {} is false, always
//   — every time the parent re-renders, it creates a new { status: 'pending' } object literal
//   — even though the content is identical, the reference is new → Object.is returns false
//   — React sees a changed dependency → runs the effect → fetch completes → setBookings
//   — setBookings updates state → component re-renders → parent re-renders
//   — parent creates a new filters object → React sees changed dep → effect runs again
//   — this is a synchronous infinite loop that hammers the server

// Proof — in two consecutive renders:
//   Render 1: filters = { status: 'pending' }   // object at memory address 0x001
//   Render 2: filters = { status: 'pending' }   // new object at memory address 0x002
//   Object.is(0x001, 0x002) → false
//   → React thinks filters changed → effect fires → loop

// ─────────────────────────────────────────────
// FIX OPTION A — use the primitive value in deps (recommended)
// ─────────────────────────────────────────────

//   useEffect(() => {
//     fetch(`/api/bookings?status=${filters.status}`)
//       .then(res => res.json())
//       .then(setBookings)
//   }, [filters.status])   // ← destructure to the primitive string
//
//   — filters.status is a string: 'pending' === 'pending' is always true (same value)
//   — effect only re-runs when the status string actually changes
//   — this is the minimal, zero-dependency fix — no extra hooks needed

// ─────────────────────────────────────────────
// FIX OPTION B — stabilise the object with useMemo (when the full object is needed)
// ─────────────────────────────────────────────

//   // In the parent component, wrap filters in useMemo:
//   const filters = useMemo(() => ({ status: selectedStatus }), [selectedStatus])
//   //   — now filters is the same reference as long as selectedStatus is unchanged
//   //   — Object.is(filters, filters) → true across renders (same object in memory)
//   //   — pass this stable reference to BookingList

//   // Alternatively, inside BookingList itself:
//   const stableFilters = useMemo(() => filters, [filters.status])
//   useEffect(() => { fetch(...) }, [stableFilters])
//   — this recreates the stable object inside the child; less clean but works

// ─────────────────────────────────────────────
// FIX OPTION C — useDeepCompareEffect (library solution)
// ─────────────────────────────────────────────

//   // npm install use-deep-compare-effect
//   useDeepCompareEffect(() => {
//     fetch(...)
//   }, [filters])
//   — performs a deep equality check (JSON.stringify or recursive equality) instead of ===
//   — { status: 'pending' } deep-equals { status: 'pending' } → effect does NOT re-run
//   — trade-off: adds a dependency, performs more work per render, can be slow for large objects
//   — use only when Option A is impractical (e.g. the object has many fields from an API response)

// ─────────────────────────────────────────────
// FIX OPTION D — pass primitive props directly (best at the component API level)
// ─────────────────────────────────────────────

//   // Change the component signature to accept primitives:
//   function BookingList({ status }: { status: string }) {
//     useEffect(() => { fetch(...) }, [status])
//   }
//   — primitives are always safe in deps; objects require extra stabilisation
//   — when designing component APIs, prefer primitive props over object props
//     if the object is only used to pass through to a hook or URL

// ─────────────────────────────────────────────
// GENERAL RULES — what is safe in dependency arrays
// ─────────────────────────────────────────────

// SAFE (stable by value or reference):
//   — Primitive values: string, number, boolean, null, undefined
//       'pending' === 'pending' always true
//   — State values from useState: React guarantees the same reference when value is unchanged
//   — Refs (useRef): ref.current changes don't trigger re-renders; ref object is stable
//   — Functions from useCallback (with stable deps)
//   — Objects from useMemo (with stable deps)
//   — Context values (if the context provider is memoised)

// UNSAFE (new reference every render):
//   — Object literals:  { key: value }       → new object each render
//   — Array literals:   [item1, item2]        → new array each render
//   — Inline functions: () => doSomething()   → new function each render
//   — New class instances: new Date()         → new instance each render

// The rule of thumb:
//   "If you defined it inline inside the component body without useMemo/useCallback,
//    it is a new reference on every render — do not put it in a deps array."
