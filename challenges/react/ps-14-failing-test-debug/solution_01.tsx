// SOLUTION 01 — Diagnosing All 4 Bugs
// Focus: map each failing test to the exact line that causes it

// ─── BUG 1: Test "renders all status options" fails ────────────────────────────

// The test looks for an option with accessible name 'All'
// The component has <option value="">All Statuses</option>
// 'All Statuses' does not match 'All' — the test is very literal about the label
// Fix: change the text to exactly 'All'
//   <option value="">All</option>

// The test also expects an option named 'Paid'
// The component only has: All Statuses, Pending, Confirmed
// 'Paid' is completely absent
// Fix: add <option value="paid">Paid</option>

// getByRole('option', { name: 'Paid' }) will throw 'Unable to find an accessible element'
// if the option doesn't exist — the error message names the missing element clearly

// ─── BUG 2: Test "calls onFilterChange with status" fails ─────────────────────

// The test expects: onFilterChange({ status: 'pending' })
// The component calls:  onFilterChange(e.target.value)
// e.target.value is a plain string, not an object with a status key
// Fix: wrap the value in an object
//   onChange={e => onFilterChange({ status: e.target.value })}

// This is a shape mismatch — the callback contract (object vs string) was not followed
// The test was written to match the shape the rest of the app expects
// e.g. the parent component probably does: if (filters.status === 'pending')

// ─── BUG 3: Test "calls onFilterChange with search after 300ms debounce" fails ─

// There are two separate failures here:

// Failure A — onFilterChange is called immediately on every keystroke (no debounce)
//   The test types 'Green', then asserts onFilterChange was NOT called yet
//   The current component has no debounce — onChange fires on every character
//   Fix: use useEffect watching the search state value with a setTimeout of 300ms
//   Clear the timeout in the cleanup function to reset on each keystroke

// Failure B — onFilterChange is never called with the search value at all
//   The current input only sets local state (setSearch) but never calls onFilterChange
//   Fix: inside the debounced useEffect, call onFilterChange({ search: value })

// Debounce pattern using useEffect:
//   useEffect watching [search]:
//     const timer = setTimeout(() => onFilterChange({ search }), 300)
//     return () => clearTimeout(timer)

// ─── BUG 4: Test "clears search when clear button clicked" fails ───────────────

// Two failures here as well:

// Failure A — the input type is 'text', but getByRole('searchbox') only matches type="search"
//   The test uses screen.getByRole('searchbox') — this ARIA role maps to <input type="search">
//   Fix: change the input type attribute from 'text' to 'search'

// Failure B — there is no clear button in the component at all
//   The test does: screen.getByRole('button', { name: /clear/i })
//   If no button exists, getByRole throws immediately
//   Fix: add a button element that sets search back to empty string on click
//   Use an accessible name that matches /clear/i (case-insensitive regex)
//   Options: text 'Clear', aria-label="Clear search", or aria-label="Clear"

// ─── SUMMARY OF ALL 4 FIXES ────────────────────────────────────────────────────

// Fix 1: Change 'All Statuses' to 'All' and add <option value="paid">Paid</option>
// Fix 2: Change onFilterChange(e.target.value) to onFilterChange({ status: e.target.value })
// Fix 3: Add useEffect debounce (300ms) that calls onFilterChange({ search })
// Fix 4: Change input type to 'search', add a Clear button that resets search state
