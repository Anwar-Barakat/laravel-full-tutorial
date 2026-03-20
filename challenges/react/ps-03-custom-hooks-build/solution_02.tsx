// SOLUTION 02 — useDebounce and combining both hooks in BookingSearch
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// useDebounce<T> — full architecture
// ─────────────────────────────────────────────

// function useDebounce<T>(value: T, delay: number = 300): T
//   — T is generic: works with string, number, boolean, or even objects
//   — delay defaults to 300ms if the caller does not provide a second argument

// ─────────────────────────────────────────────
// STEP 1: State
// ─────────────────────────────────────────────

// const [debouncedValue, setDebouncedValue] = useState<T>(value)
// — initialise with the live value so the first render returns something sensible
// — important: this is a state variable, not a ref — returning a ref would cause
//   consumers to see a mutable object rather than triggering re-renders

// ─────────────────────────────────────────────
// STEP 2: useEffect watching the live value
// ─────────────────────────────────────────────

// useEffect(() => {
//   — schedule the update: after `delay` ms, copy live value into state
//     const timer = setTimeout(() => {
//       setDebouncedValue(value)
//     }, delay)

//   — cleanup: cancel the timer if value changes before delay elapses
//     return () => clearTimeout(timer)
// }, [value, delay])
// — this cleanup is the key mechanism:
//     - user types 'a' → timer set for 300ms
//     - user types 'b' (within 300ms) → previous effect cleans up (clears timer)
//     - new effect fires → new timer set for 300ms
//     - user stops typing → 300ms elapses → setDebouncedValue('ab') runs

// ─────────────────────────────────────────────
// STEP 3: Return the debounced value
// ─────────────────────────────────────────────

// return debouncedValue
// — NOT value: callers want the delayed, stable version
// — NOT a ref: callers need re-renders to occur when the debounced value updates
// — the generic T is preserved: useFetch<Booking[]> will accept this value without type errors

// ─────────────────────────────────────────────
// Why return state and not a ref?
// ─────────────────────────────────────────────

// If we returned a ref:
//   const ref = useRef(value)
//   // ... update ref.current after delay
//   return ref.current
//   — the caller's component would NOT re-render when the debounced value changes
//   — a URL built from ref.current would not update, so useFetch would not refetch
// Using state guarantees a re-render when the debounced value settles,
// which propagates the new URL to useFetch

// ─────────────────────────────────────────────
// BookingSearch — wiring both hooks together
// ─────────────────────────────────────────────

// function BookingSearch()
//   — const [search, setSearch] = useState('')
//       live value: updates on every keystroke, drives the input's value prop

//   — const debouncedSearch = useDebounce(search, 300)
//       delayed value: only changes 300ms after the user stops typing
//       this is what gets embedded in the API URL

//   — const { data, isLoading, error } = useFetch<Booking[]>(
//       `/api/bookings?search=${debouncedSearch}`
//     )
//       useFetch deps include the url; when debouncedSearch changes, the URL string changes,
//       which triggers the effect inside useFetch → new API request fires
//       result: fetch fires at most once per 300ms pause, never on every keystroke

// ─────────────────────────────────────────────
// BookingSearch — render structure
// ─────────────────────────────────────────────

// return (
//   <div>
//     <input
//       type="search"
//       value={search}
//       onChange={e => setSearch(e.target.value)}
//       placeholder="Search by school name…"
//     />

//     {isLoading && (
//       — render skeleton rows (e.g. 5 × pulsing grey bars)
//       — do NOT clear the previous results while loading: keep data visible
//         so the user sees the last results during the refetch (avoids empty flash)
//     )}

//     {error && (
//       — render error message with retry option
//     )}

//     {!isLoading && !error && data && (
//       — map over data to render booking rows
//       — if data.length === 0, show "No bookings found for '{debouncedSearch}'"
//         (use debouncedSearch in the message, not search, so it matches what was searched)
//     )}
//   </div>
// )

// ─────────────────────────────────────────────
// The composition pattern — why this design is reusable
// ─────────────────────────────────────────────

// Each hook has one responsibility:
//   useFetch   → manages async data lifecycle (loading, error, abort, refetch)
//   useDebounce → manages timing (delays propagation of a rapidly-changing value)

// Composing them at the call site is simple:
//   const debouncedSearch  = useDebounce(search, 300)
//   const { data }         = useFetch(`/api/bookings?search=${debouncedSearch}`)

// Any other component can compose them differently:
//   const debouncedFilter  = useDebounce(statusFilter, 200)
//   const { data }         = useFetch(`/api/bookings?status=${debouncedFilter}`)
// — no changes to either hook required
