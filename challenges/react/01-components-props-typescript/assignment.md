# React Components & TypeScript Props

Build typed React components with proper interfaces, props, children, and event handlers — the foundation of every React app.

| Topic               | Details                                          |
|---------------------|--------------------------------------------------|
| TypeScript Interfaces | Booking, BookingStatus, BookingAction unions   |
| Functional Components | Props typing, optional fields, callbacks       |
| Derived Data        | useMemo for filtered/sorted results              |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — BookingCard Component (Medium)

### Scenario

Build a typed `BookingCard` component that displays booking details with status badges, formatted amounts, and conditional action buttons. Every prop, callback, and handler must be TypeScript-typed.

### Requirements

1. `Booking` interface — `id`, `reference`, `schoolName`, `destination`, `amount`, `status`, `tripDate`, `studentCount`
2. `BookingStatus` union type — `"pending" | "confirmed" | "paid" | "completed" | "cancelled"`
3. `BookingAction` union type — `"view" | "edit" | "cancel"`
4. `BookingCardProps` interface — `booking: Booking`, `onAction: (action: BookingAction, bookingId: number) => void`, `isLoading?: boolean`
5. Status badge with `Record<BookingStatus, { label: string; classes: string }>` config map
6. Format amount as `"AED 5,000.00"` using `Intl.NumberFormat`
7. Conditional buttons: `Edit` hidden when `completed | cancelled`; `Cancel` hidden when not `pending | confirmed`
8. Skeleton loading state when `isLoading = true`

### Expected Code

```tsx
// types/booking.ts
export type BookingStatus = "pending" | "confirmed" | "paid" | "completed" | "cancelled"
export type BookingAction  = "view" | "edit" | "cancel"

export interface Booking {
  id:           number
  reference:    string
  schoolName:   string
  destination:  string
  amount:       number
  status:       BookingStatus
  tripDate:     string     // ISO date string
  studentCount: number
}

export interface BookingCardProps {
  booking:   Booking
  onAction:  (action: BookingAction, bookingId: number) => void
  isLoading?: boolean
}
```

```tsx
// components/BookingCard.tsx
const statusConfig: Record<BookingStatus, { label: string; classes: string }> = {
  pending:   { label: "Pending",   classes: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", classes: "bg-blue-100   text-blue-800"   },
  paid:      { label: "Paid",      classes: "bg-green-100  text-green-800"  },
  completed: { label: "Completed", classes: "bg-gray-100   text-gray-800"   },
  cancelled: { label: "Cancelled", classes: "bg-red-100    text-red-800"    },
}

function formatAmount(amount: number): string {
  return "AED " + new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2 }).format(amount)
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onAction, isLoading = false }) => {
  if (isLoading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-40" />
  }

  const { label, classes } = statusConfig[booking.status]

  const canEdit   = !["completed", "cancelled"].includes(booking.status)
  const canCancel = ["pending", "confirmed"].includes(booking.status)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{booking.schoolName}</h3>
          <p className="text-sm text-gray-500">{booking.destination}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes}`}>
          {label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-gray-500">Amount</p>
          <p className="font-medium">{formatAmount(booking.amount)}</p>
        </div>
        <div>
          <p className="text-gray-500">Students</p>
          <p className="font-medium">{booking.studentCount}</p>
        </div>
        <div>
          <p className="text-gray-500">Trip Date</p>
          <p className="font-medium">
            {new Date(booking.tripDate).toLocaleDateString("en-AE")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAction("view", booking.id)}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          View
        </button>
        {canEdit && (
          <button
            onClick={() => onAction("edit", booking.id)}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
          >
            Edit
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => onAction("cancel", booking.id)}
            className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default BookingCard
```

### TypeScript Rules to Know

| Pattern | Code |
|---------|------|
| Union type | `type Status = "a" \| "b" \| "c"` |
| Record map | `Record<BookingStatus, { label: string }>` |
| Optional prop | `isLoading?: boolean` |
| Callback type | `(action: BookingAction, id: number) => void` |
| React component | `React.FC<Props>` or `(props: Props): JSX.Element` |

### What We're Evaluating

- `Record<BookingStatus, ...>` — exhaustive status config map (TypeScript enforces all cases)
- `Intl.NumberFormat` — locale-aware number formatting, not manual string concat
- `includes()` for multi-status checks — cleaner than `=== "a" || === "b"`
- `isLoading` skeleton — renders placeholder, same outer dimensions as real card
- `onAction` callback typed with union — prevents passing invalid action strings

---

## Problem 02 — BookingList with Filters, Sort & Pagination (Hard)

### Scenario

Build a `BookingList` component that wraps `BookingCard` with client-side filtering, sorting, and pagination. All state must be typed. Use `useMemo` for derived filtered/sorted results to avoid recalculating on every render.

### Requirements

1. `FilterState` interface — `status: BookingStatus | "all"`, `search: string`, `dateFrom: string`, `dateTo: string`
2. `SortField` type — `"tripDate" | "amount" | "schoolName"`; `SortOrder` — `"asc" | "desc"`
3. `useMemo` for filtered + sorted list (depends on `[bookings, filters, sort]`)
4. `useMemo` for paginated slice (depends on `[filtered, currentPage, pageSize]`)
5. `useEffect` to reset `currentPage` to 1 whenever `filters` or `pageSize` change
6. Loading state: render 3 skeleton cards when `isLoading = true`
7. Empty state: centred message with "No bookings found" + "Try adjusting your filters"
8. Pagination controls: prev/next buttons (disabled at boundaries), page `x / total`, page size selector `[5, 10, 25, 50]`

### Expected Code

```tsx
// types/booking.ts  (additions)
export interface FilterState {
  status:   BookingStatus | "all"
  search:   string
  dateFrom: string
  dateTo:   string
}

export type SortField = "tripDate" | "amount" | "schoolName"
export type SortOrder = "asc" | "desc"

export interface SortState {
  field: SortField
  order: SortOrder
}

export interface BookingListProps {
  bookings:        Booking[]
  isLoading?:      boolean
  onBookingAction: (action: BookingAction, bookingId: number) => void
}
```

```tsx
// components/BookingList.tsx
const BookingList: React.FC<BookingListProps> = ({
  bookings,
  isLoading = false,
  onBookingAction,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    status: "all", search: "", dateFrom: "", dateTo: "",
  })
  const [sort, setSort]             = useState<SortState>({ field: "tripDate", order: "desc" })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize]     = useState<number>(10)

  // ① Filter + sort — only recalculates when bookings, filters, or sort changes
  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (filters.status !== "all" && b.status !== filters.status) return false
        if (filters.search) {
          const term = filters.search.toLowerCase()
          if (
            !b.schoolName.toLowerCase().includes(term) &&
            !b.destination.toLowerCase().includes(term)
          ) return false
        }
        if (filters.dateFrom && b.tripDate < filters.dateFrom) return false
        if (filters.dateTo   && b.tripDate > filters.dateTo)   return false
        return true
      })
      .sort((a, b) => {
        const aVal = a[sort.field]
        const bVal = b[sort.field]
        const dir  = sort.order === "asc" ? 1 : -1
        if (typeof aVal === "string" && typeof bVal === "string") {
          return aVal.localeCompare(bVal) * dir
        }
        return ((aVal as number) - (bVal as number)) * dir
      })
  }, [bookings, filters, sort])

  const totalPages = Math.ceil(filtered.length / pageSize)

  // ② Paginate — only recalculates when filtered list, page, or size changes
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  )

  // ③ Reset to page 1 on filter/size change
  useEffect(() => { setCurrentPage(1) }, [filters, pageSize])

  function toggleSort(field: SortField): void {
    setSort((s) => ({
      field,
      order: s.field === field && s.order === "asc" ? "desc" : "asc",
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <BookingCard key={i} booking={{} as Booking} onAction={() => {}} isLoading />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value as FilterState["status"] }))
          }
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          {(["pending", "confirmed", "paid", "completed", "cancelled"] as BookingStatus[]).map(
            (s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          )}
        </select>

        <input
          type="text"
          placeholder="Search school or destination…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <input type="date" value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm" />
        <input type="date" value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm" />
      </div>

      {/* ── Sort bar ── */}
      <div className="flex gap-2 mb-4 text-sm">
        {(["tripDate", "amount", "schoolName"] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`px-3 py-1 rounded-md transition-colors ${
              sort.field === field ? "bg-blue-100 text-blue-700" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {{ tripDate: "Date", amount: "Amount", schoolName: "School" }[field]}
            {sort.field === field && (sort.order === "asc" ? " ↑" : " ↓")}
          </button>
        ))}
      </div>

      {/* ── Results ── */}
      {paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No bookings found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onAction={onBookingAction} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>per page · {filtered.length} total</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
            >
              ←
            </button>
            <span className="px-3">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingList
```

### useMemo Dependency Rules

| State change | Re-runs filtered? | Re-runs paginated? |
|---|---|---|
| `bookings` prop changes | ✅ | ✅ (because filtered changes) |
| `filters` changes | ✅ | ✅ + `useEffect` resets page to 1 |
| `sort` changes | ✅ | ✅ |
| `currentPage` changes | ❌ | ✅ |
| `pageSize` changes | ❌ | ✅ + `useEffect` resets page to 1 |

### What We're Evaluating

- Two-level `useMemo` — filter/sort and paginate are separate memos with correct deps
- `useEffect` resets `currentPage` — without this, page 3 persists after filtering to 5 results
- Functional state update `setFilters(f => ({ ...f, search: ... }))` — avoids stale closure
- `localeCompare` for string sort — handles names correctly across locales
- Casting `e.target.value as FilterState["status"]` — type-safe select handler
