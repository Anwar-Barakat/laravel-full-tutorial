// ============================================================
// Problem 01 — Generic Table & Type-Safe Events
// ============================================================



// ============================================================
// types/table.ts
//
// Column<T>:
//   key:      keyof T            ← constrained to T's field names
//   header:   string
//   render?:  (value: T[keyof T], item: T) => React.ReactNode
//   sortable?: boolean
//   width?:   string
//
// TableAction<T> (discriminated union):
//   | { type: "edit";      item: T }
//   | { type: "delete";    id: number }
//   | { type: "view";      item: T }
//   | { type: "duplicate"; item: T }
//   discriminant = "type" field → TypeScript narrows in switch/if
//
// SortState<T>: { key: keyof T; dir: "asc" | "desc" }
//
// TableFilters<T> = Partial<Pick<T, keyof T>>
//   → all T fields become optional (for filter forms)
// ============================================================



// ============================================================
// components/DataTable.tsx
//
// DataTableProps<T extends { id: number }> (T must have id for row keys):
//   data, columns: Column<T>[], onSort?, onAction?, onSelect?, keyField?, isLoading?
//
// const [sort, setSort] = useState<SortState<T> | null>(null)
//
// handleSort(key: keyof T):
//   dir = sort?.key === key && sort.dir === "asc" ? "desc" : "asc"
//   setSort({ key, dir })
//   onSort?.(key, dir)
//
// <th> onClick only if col.sortable
// <td> renders: col.render(item[col.key], item) OR String(item[col.key])
//
// Action cell buttons call onAction with discriminated union objects:
//   { type: "view",   item }
//   { type: "edit",   item }
//   { type: "delete", id: item.id }
//
// TypeScript prevents: Column<Booking> with key: "nonexistent" → compile error
// ============================================================



// ============================================================
// useSort<T> generic hook
//
// useState<SortState<T> | null>(initialKey ? { key, dir: "asc" } : null)
//
// toggle(key: keyof T):
//   if prev.key === key → flip dir
//   else → { key, dir: "asc" }
//
// sortFn(a: T, b: T) → number:
//   compare a[sort.key] vs b[sort.key]
//   string: localeCompare; number: subtraction
//   flip sign if dir === "desc"
// ============================================================



// ============================================================
// Utility types (demonstrate in code):
//
// Pick<Booking, "id" | "school_name" | "status">  → BookingListItem
// Omit<Booking, "internal_notes">                 → PublicBooking
// Partial<Omit<Booking, "id">>                    → UpdateBookingData
// Record<BookingStatus, { label, className }>     → STATUS_CONFIG
// Required<Booking>                               → all fields mandatory
// ReturnType<typeof computeBookingStats>          → BookingStats type
// Parameters<typeof bookingApi.getAll>[0]         → GetBookingsParams
// ============================================================



// ============================================================
// Discriminated union exhaustiveness check:
//
// function handleAction(action: TableAction<Booking>):
//   switch (action.type):
//     case "edit":   action.item is Booking   ← TS narrows
//     case "delete": action.id  is number     ← TS narrows
//     case "view":   action.item is Booking
//     case "duplicate": ...
//     default:
//       const _exhaustive: never = action   ← TS error if new case added
//       throw new Error(...)
// ============================================================
