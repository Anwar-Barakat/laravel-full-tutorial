// SOLUTION 01 — BookingsTable: useReducer + useMemo architecture
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// STEP 1: Define the action union type for the reducer
// ─────────────────────────────────────────────

// type TableAction =
//   | { type: 'SET_SORT';   payload: keyof Booking }
//   | { type: 'SET_FILTER'; payload: string }
//   | { type: 'SET_SEARCH'; payload: string }
//   | { type: 'SET_PAGE';   payload: number }
//   | { type: 'RESET_FILTERS' }

// ─────────────────────────────────────────────
// STEP 2: Write the reducer function
// ─────────────────────────────────────────────

// function tableReducer(state: TableState, action: TableAction): TableState
//   case 'SET_SORT':
//     - if action.payload === state.sortBy → toggle sortDir ('asc' <-> 'desc')
//     - otherwise → set sortBy to payload, reset sortDir to 'asc', reset page to 1
//   case 'SET_FILTER':
//     - set filter to payload, reset page to 1
//   case 'SET_SEARCH':
//     - set search to payload, reset page to 1
//   case 'SET_PAGE':
//     - set page to payload
//   case 'RESET_FILTERS':
//     - return the initial state (sortBy: 'createdAt', sortDir: 'desc', filter: '', search: '', page: 1)
//   default:
//     - return state unchanged

// ─────────────────────────────────────────────
// STEP 3: useDebounce hook (inline or imported)
// ─────────────────────────────────────────────

// function useDebounce<T>(value: T, delay: number): T
//   - useState to hold the debounced value
//   - useEffect watching value — set a setTimeout to update after delay ms
//   - clearTimeout in the cleanup return so rapid changes cancel the previous timer
//   - return the debounced value (not the live value)

// ─────────────────────────────────────────────
// STEP 4: BookingsTable component — state and data
// ─────────────────────────────────────────────

// export function BookingsTable()
//   - useReducer(tableReducer, initialState) → [state, dispatch]
//   - useFetch<Booking[]>('/api/bookings') → { data: rawData, isLoading }
//   - const debouncedSearch = useDebounce(state.search, 300)

// ─────────────────────────────────────────────
// STEP 5: Derive filtered + sorted data with useMemo
// ─────────────────────────────────────────────

// const filteredData = useMemo(() => {
//   - start with rawData ?? []
//   - if state.filter is not '' → keep only rows where booking.status === state.filter
//   - if debouncedSearch is not '' → keep only rows where booking.schoolName
//       .toLowerCase().includes(debouncedSearch.toLowerCase())
//   - sort: [...filtered].sort((a, b) => {
//       - get valA = a[state.sortBy], valB = b[state.sortBy]
//       - compare: if strings → localeCompare; if numbers/dates → subtract
//       - multiply result by (state.sortDir === 'asc' ? 1 : -1) to flip direction
//     })
//   - return sorted array
// }, [rawData, state.filter, debouncedSearch, state.sortBy, state.sortDir])
// — deps list is exact: only recomputes when one of these changes

// ─────────────────────────────────────────────
// STEP 6: Pagination slice
// ─────────────────────────────────────────────

// const totalPages = Math.ceil(filteredData.length / state.perPage)
// const startIndex = (state.page - 1) * state.perPage
// const pageData   = filteredData.slice(startIndex, startIndex + state.perPage)
// — pageData is what gets rendered in the tbody

// ─────────────────────────────────────────────
// STEP 7: Column header with sort indicator
// ─────────────────────────────────────────────

// function SortableHeader({ column, label, state, dispatch })
//   - render a <th> with a button inside
//   - onClick → dispatch({ type: 'SET_SORT', payload: column })
//   - if state.sortBy === column → show ▲ (asc) or ▼ (desc)
//   - if state.sortBy !== column → show a neutral ↕ or nothing
//   - aria-sort attribute: 'ascending' | 'descending' | 'none' for accessibility

// ─────────────────────────────────────────────
// STEP 8: StatusBadge component
// ─────────────────────────────────────────────

// function StatusBadge({ status }: { status: Booking['status'] })
//   - define a map: statusStyles = { pending: 'bg-yellow-100 text-yellow-800', ... }
//   - render <span className={statusStyles[status]}>{status}</span>
//   - capitalise the label for display

// ─────────────────────────────────────────────
// STEP 9: Pagination component
// ─────────────────────────────────────────────

// function Pagination({ page, totalPages, onPageChange })
//   - render Prev button: disabled when page === 1
//   - render page number buttons: Array.from({ length: totalPages }, (_, i) => i + 1)
//       highlight the current page with a different style
//   - render Next button: disabled when page === totalPages
//   - each button calls onPageChange(n) which dispatches SET_PAGE

// ─────────────────────────────────────────────
// STEP 10: Render structure
// ─────────────────────────────────────────────

// return (
//   <div>
//     {/* Toolbar: search input + status filter dropdown */}
//     <input value={state.search} onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })} />
//     <select value={state.filter} onChange={e => dispatch({ type: 'SET_FILTER', payload: e.target.value })}>
//       {/* options: '', 'pending', 'confirmed', 'paid', 'cancelled' */}
//     </select>

//     {isLoading && <SkeletonTable />}

//     {!isLoading && pageData.length === 0 && (
//       <EmptyState isDirty={state.filter !== '' || debouncedSearch !== ''} onClear={() => dispatch({ type: 'RESET_FILTERS' })} />
//     )}

//     {!isLoading && pageData.length > 0 && (
//       <table>
//         <thead>
//           {/* SortableHeader for each column */}
//         </thead>
//         <tbody>
//           {pageData.map(booking => (
//             <tr key={booking.id} onClick={() => navigate(`/bookings/${booking.id}`)}>
//               {/* cells */}
//               <td>{/* action buttons with e.stopPropagation() */}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     )}

//     <Pagination page={state.page} totalPages={totalPages} onPageChange={...} />
//   </div>
// )
