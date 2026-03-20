// SOLUTION 02 — Fixed Component Structure & TDD Lessons
// Focus: the complete corrected implementation layout and what TDD revealed

// ─── FIXED COMPONENT STRUCTURE ────────────────────────────────────────────────

// Define the props interface with TypeScript
//   interface BookingFiltersProps {
//     onFilterChange: (filters: { status?: string } | { search?: string }) => void
//   }

// State:
//   const [status, setStatus] = useState('')
//   const [search, setSearch]   = useState('')

// Debounce effect — runs after search state updates:
//   useEffect(() => {
//     Create a timer with setTimeout 300ms
//     Inside the timeout: call onFilterChange({ search })
//     Return a cleanup function that clears the timer
//     Dependency array: [search, onFilterChange]
//   }, [search, onFilterChange])
//   Note: onFilterChange should be in deps — wrap caller with useCallback if needed
//   to avoid infinite re-renders caused by unstable function references

// Select element:
//   Use getByRole('combobox') — this is the default ARIA role for <select>
//   onChange handler: call onFilterChange({ status: e.target.value })
//   Options (values must match test's selectOptions target 'pending'):
//     <option value="">All</option>         ← exact text match
//     <option value="pending">Pending</option>
//     <option value="confirmed">Confirmed</option>
//     <option value="paid">Paid</option>    ← was missing

// Search input:
//   type="search" is required for getByRole('searchbox') to resolve it
//   value={search} and onChange={e => setSearch(e.target.value)}
//   The useEffect handles calling onFilterChange — do not call it directly in onChange

// Clear button:
//   Render only when search.length > 0 to avoid clutter when input is empty
//   onClick: setSearch('')
//   Accessible name must match /clear/i — use text 'Clear' or aria-label="Clear search"
//   Calling setSearch('') will trigger the debounce effect which will call
//   onFilterChange({ search: '' }) after 300ms — this is acceptable behaviour

// ─── FAKE TIMERS GOTCHA ────────────────────────────────────────────────────────

// Test 3 uses vi.useFakeTimers() before rendering
// This replaces the global setTimeout with a controlled version
// vi.advanceTimersByTime(300) manually triggers any timers scheduled within 300ms
// If the component uses setTimeout correctly in useEffect, this will work
// If you use a third-party debounce library (e.g. lodash.debounce), ensure it
// uses the same global setTimeout — most do, but check if vi.useFakeTimers causes issues

// ─── WHAT TDD REVEALED ABOUT THE ORIGINAL COMPONENT ──────────────────────────

// The broken component was missing 4 features that a developer might have overlooked:
//   1. The label text 'All Statuses' vs 'All' — a UX consistency detail
//   2. The missing 'Paid' status option — incomplete option list
//   3. The onFilterChange callback contract (object shape, not raw string)
//   4. The debounce requirement — without it, every keystroke triggers an API call
//   5. The clear button — an accessibility and usability requirement
//
// Writing the tests first forced these requirements to be explicit before any code ran
// The component developer would have had to read the tests to understand the contract
// This is the core value of TDD: the tests are the specification

// ─── ACCESSIBLE NAME RESOLUTION ────────────────────────────────────────────────

// getByRole('option', { name: 'All' }) resolves accessible name by:
//   1. aria-label attribute
//   2. aria-labelledby attribute
//   3. The element's text content (innerText)
// For <option> elements, the visible text IS the accessible name
// 'All Statuses' and 'All' are different strings — the match is case-sensitive by default
// Use { name: /all/i } regex if you want case-insensitive matching in your own tests
