# Challenge 01: Build a Sortable, Filterable, Paginated Data Table

**Format:** BUILD
**App:** Tripz — Laravel + React school booking platform
**Topic:** Build a production-quality data table component from scratch

---

## Context

You are building the admin dashboard for Tripz. The operations team needs a bookings table that lets them quickly scan, filter, and act on hundreds of booking records per day. Performance, accessibility, and a clean UX are all expected.

---

## Task

Build a `BookingsTable` component that displays booking records with full sorting, filtering, search, and pagination support.

---

## TypeScript Types

```typescript
interface Booking {
  id: number
  schoolName: string
  destination: string
  studentCount: number
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  createdAt: string
}

interface TableState {
  sortBy:  keyof Booking
  sortDir: 'asc' | 'desc'
  filter:  string
  search:  string
  page:    number
  perPage: number
}
```

---

## Requirements

### Columns

| Column | Notes |
|---|---|
| School Name | Sortable |
| Destination | Sortable |
| Students | Sortable, right-aligned |
| Amount | Sortable, formatted as GBP currency |
| Status | Sortable, render as a coloured badge |
| Date | Sortable, formatted as human-readable date |
| Actions | Not sortable |

### Feature Requirements

1. **Sorting** — Click any column header (except Actions) to sort ascending. Click again to toggle descending. Show a directional indicator (e.g. ▲ / ▼) on the active column.

2. **Status filter** — Dropdown with options: All / Pending / Confirmed / Paid / Cancelled. Resets page to 1 on change.

3. **Search** — Text input for school name search. Debounced 300ms (do not fire on every keystroke). Resets page to 1 on change.

4. **Pagination** — 15 rows per page. Show page number buttons (1, 2, 3…), Prev and Next buttons. Disable Prev on first page, Next on last page.

5. **Row click** — Clicking a row navigates to `/bookings/:id` (use React Router `useNavigate`).

6. **Action buttons** — Each row in the Actions column shows:
   - "Confirm" button: visible only for `pending` bookings
   - "Cancel" button: visible for `pending` and `confirmed` bookings
   - Both buttons should show a per-row loading state while the API call is in flight
   - Buttons must not propagate the click to the row's navigation handler

7. **Loading skeleton** — While data is being fetched, show a skeleton that matches the table structure exactly (same column count, same layout) to prevent layout shift.

8. **Empty state** — When no results match the current filters, show a clear message. If any filter or search is active, show a "Clear filters" button that resets all filters.

---

## Starter Code

```tsx
// BookingsTable.tsx — incomplete
export function BookingsTable() {
  // TODO: implement all features
  return <div>BookingsTable</div>
}
```

---

## Expected Output

- A fully interactive table rendered inside a page with search input and status dropdown above it
- Correct sort indicators updating on header click
- Filtered results updating 300ms after typing stops
- Pagination controls that correctly slice the data
- Skeleton rows (not a spinner) while `isLoading` is true
- "No bookings found. Clear filters." when results are empty and filters are applied
- Action buttons that fire API calls and show per-row loading without navigating the row

---

## Hints

- Use `useReducer` or multiple `useState` calls to manage `TableState`
- Derive filtered and sorted data with `useMemo` so it only recomputes when inputs change
- Build a `useDebounce` hook or inline the debounce logic with `useEffect` + `clearTimeout`
- Slice the sorted array for pagination: `data.slice(startIndex, endIndex)`
- The `statusColors` map can drive both badge background and text colours
- `e.stopPropagation()` is needed on action button clicks to prevent row navigation
