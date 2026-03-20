// SOLUTION 02 — Bug 4 and the URL-as-State-of-Truth Principle
// Focus: replacing local state with useSearchParams for pagination, general rule

// ─── BUG 4: local state for page not reflected in URL ────────────────────────

// Root cause:
//   const [page, setPage] = useState(1) creates state that lives in React memory only
//   Changing page with setPage(3) updates the component but does NOT update the URL
//   Problems this causes:
//     1. Refresh on page 3 shows page 1 (state reset, URL still has no ?page=)
//     2. Sharing the URL with a colleague gives them page 1, not page 3
//     3. Browser back button does not step through previous pages
//     4. The URL does not reflect what the user is looking at

// Fix — use useSearchParams as the source of truth:

//   Read page from URL:
//     const [searchParams, setSearchParams] = useSearchParams()
//     const page = Number(searchParams.get('page')) ?? 1
//     Use Number() to convert the string from URL to a number
//     Fall back to 1 if the param is absent (first visit, clean URL)

//   Update page in URL (not local state):
//     function handlePageChange(newPage: number) {
//       setSearchParams(prev => {
//         prev.set('page', String(newPage))
//         return prev
//       })
//     }
//     The functional form of setSearchParams receives the current params object
//     Mutate only the 'page' key — all other params (status, search, etc.) are preserved
//     Return the mutated object — React Router serialises it back to the URL

//   Pass the URL-derived page to Pagination:
//     <Pagination page={page} onChange={handlePageChange} />

// ─── GENERAL RULE: WHAT BELONGS IN URL STATE ─────────────────────────────────

// Any state that meets these criteria should live in the URL (useSearchParams),
// not in local React state (useState):

//   Shareable — the user should be able to copy the URL and send it to someone
//   Refreshable — refreshing the page should show the same view
//   Bookmarkable — the user might bookmark a specific filtered/sorted view
//   Back-navigable — pressing back should undo the state change

// Examples that belong in URL state:
//   Current page number
//   Active filter values (status, date range, category)
//   Sort column and direction
//   Search query string
//   Selected tab (if the content differs meaningfully between tabs)

// Examples that belong in local state (NOT URL):
//   Whether a modal is open
//   Input field value before it is submitted
//   Hover / focus state
//   Transient UI state that has no meaning outside the current session

// ─── COMBINING URL STATE WITH API CALLS ───────────────────────────────────────

// When page and filters live in the URL, the data-fetching useEffect's deps are simple:
//   useEffect(() => {
//     fetch('/api/bookings?page=' + page + '&status=' + status)
//       .then(res => res.json())
//       .then(setBookings)
//   }, [page, status])
//   Both page and status are derived from useSearchParams — not from separate useState hooks
//   The URL is the single driver for what data is fetched

// This pattern eliminates the common bug where local state and URL state go out of sync:
//   e.g. user navigates back, URL shows page=1 but local state still says page=3
//   With URL-only state this is impossible — the URL IS the state

// ─── SETSE ARCHPARAMS FUNCTIONAL FORM — WHY IT MATTERS ───────────────────────

// setSearchParams({ page: '3' }) creates a brand new URLSearchParams object
// This wipes ALL existing params — same problem as navigate('/bookings') in Bug 2

// setSearchParams(prev => { prev.set('page', '3'); return prev }) mutates in place
// Existing params like ?status=pending&search=Green are preserved
// Always use the functional form when you only want to update one param
