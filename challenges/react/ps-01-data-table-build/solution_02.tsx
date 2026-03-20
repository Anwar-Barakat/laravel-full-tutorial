// SOLUTION 02 — BookingsTable: implementation details and edge cases
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// SORTING LOGIC — [...data].sort() with direction multiplier
// ─────────────────────────────────────────────

// Always spread the array before sorting: [...rawData].sort(...)
// — Array.prototype.sort mutates in place; spreading preserves the original

// Comparator pattern:
//   const direction = state.sortDir === 'asc' ? 1 : -1
//   .sort((a, b) => {
//     const valA = a[state.sortBy]
//     const valB = b[state.sortBy]
//     if (typeof valA === 'string') return valA.localeCompare(valB as string) * direction
//     if (typeof valA === 'number') return (valA - (valB as number)) * direction
//     // for 'createdAt' (ISO date string) localeCompare works; or convert to Date for accuracy
//     return 0
//   })

// ─────────────────────────────────────────────
// COMBINED FILTER: status dropdown + debounced search
// ─────────────────────────────────────────────

// Apply filters in sequence (chained .filter() calls):
//   Step 1 — status filter: if filter !== '' → booking.status === filter
//   Step 2 — search filter: if debouncedSearch !== '' →
//               booking.schoolName.toLowerCase().includes(debouncedSearch.toLowerCase())
// — Both filters reduce the array before sorting; order does not matter for correctness
//   but filtering first before sorting reduces the number of sort comparisons

// ─────────────────────────────────────────────
// PAGINATION — slice from derived data
// ─────────────────────────────────────────────

// After filtering + sorting, pagination is a simple array slice:
//   const totalPages  = Math.ceil(filteredSorted.length / perPage)   // e.g. ceil(47 / 15) = 4
//   const startIndex  = (page - 1) * perPage                         // page 1 → 0, page 2 → 15
//   const endIndex    = startIndex + perPage                          // page 1 → 15, page 2 → 30
//   const pageData    = filteredSorted.slice(startIndex, endIndex)
// — slice handles the last page automatically (no out-of-bounds error)

// Guard: if page > totalPages after filtering, reset page to 1
//   useEffect(() => {
//     if (page > totalPages && totalPages > 0) setPage(1)
//   }, [totalPages])

// ─────────────────────────────────────────────
// LOADING SKELETON — same column structure, no layout shift
// ─────────────────────────────────────────────

// SkeletonTable renders the same <table> + <thead> structure as the real table
// — keeps column widths stable: the real table does not "jump in" from a different width
// — each skeleton row renders SKELETON_ROW_COUNT (e.g. 15) <tr> elements
// — each <td> contains a <div className="animate-pulse bg-gray-200 h-4 rounded" />
// — the pulse animation width should vary per column to look natural
//     (e.g. school name cell: w-48, amount cell: w-20, status cell: w-16)
// — do NOT use a centered spinner: spinners shift the layout and lose column context

// ─────────────────────────────────────────────
// EMPTY STATE — isDirty check
// ─────────────────────────────────────────────

// Show the empty state only when isLoading is false AND pageData.length === 0
// The "Clear filters" button should appear only when filters are actually applied:
//   const isDirty = state.filter !== '' || debouncedSearch !== ''
//   — isDirty true  → show message + "Clear filters" button
//   — isDirty false → show plain "No bookings yet" message (no clear button)
// Clicking "Clear filters" dispatches RESET_FILTERS which zeroes filter, search, and page

// ─────────────────────────────────────────────
// ACTION BUTTONS — disabled logic and per-row loading state
// ─────────────────────────────────────────────

// Track which rows have in-flight API calls:
//   const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({})
//   — key is booking.id, value is true while the request is running

// Helper:
//   async function handleAction(bookingId: number, action: 'confirm' | 'cancel') {
//     setLoadingRows(prev => ({ ...prev, [bookingId]: true }))
//     try {
//       await fetch(`/api/bookings/${bookingId}/${action}`, { method: 'POST' })
//       // refetch or optimistically update local state
//     } finally {
//       setLoadingRows(prev => ({ ...prev, [bookingId]: false }))
//     }
//   }

// Render logic per row:
//   - Confirm button: only if booking.status === 'pending'
//   - Cancel button:  only if booking.status === 'pending' || booking.status === 'confirmed'
//   - Both buttons:   disabled={loadingRows[booking.id]}
//   - Both buttons:   onClick={(e) => { e.stopPropagation(); handleAction(booking.id, 'confirm') }}
//     stopPropagation prevents the row's onClick (navigate) from firing

// ─────────────────────────────────────────────
// CURRENCY AND DATE FORMATTING
// ─────────────────────────────────────────────

// Define formatters once at module level (outside the component) to avoid
// recreating Intl objects on every render:
//   const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
//   const dateFormatter     = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })
//   — usage: currencyFormatter.format(booking.amount)
//   — usage: dateFormatter.format(new Date(booking.createdAt))

// ─────────────────────────────────────────────
// STATUS BADGE — Tailwind class map
// ─────────────────────────────────────────────

// const statusClasses: Record<Booking['status'], string> = {
//   pending:   'bg-yellow-100 text-yellow-800 border border-yellow-300',
//   confirmed: 'bg-blue-100 text-blue-800 border border-blue-300',
//   paid:      'bg-green-100 text-green-800 border border-green-300',
//   cancelled: 'bg-red-100 text-red-800 border border-red-300',
// }
// — use className lookup, not inline style, so Tailwind can purge correctly
// — render as <span className={`${statusClasses[status]} px-2 py-1 rounded-full text-xs font-medium`}>
