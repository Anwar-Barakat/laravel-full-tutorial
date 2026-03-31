# REACT_TEST_35 — React Table • TanStack Table

**Time:** 25 minutes | **Stack:** React + TypeScript + TanStack Table v8

---

## Problem 01 — Booking Data Table (Medium)

Build a full-featured booking table with sorting, filtering, pagination, and row selection.

---

### Setup

```bash
npm install @tanstack/react-table
```

TanStack Table is **headless** — it provides logic and state, you provide all the HTML/CSS.
No pre-built components. Full control over markup, styling, and accessibility.

---

### Types

```ts
interface Booking {
  id: number
  school_name: string
  contact_email: string
  trip_date: string
  student_count: number
  status: "pending" | "confirmed" | "paid" | "completed" | "cancelled"
  amount: number
  created_at: string
}
```

---

### Column definitions

```ts
import {
  createColumnHelper,
  ColumnDef,
} from "@tanstack/react-table"

const columnHelper = createColumnHelper<Booking>()
// createColumnHelper provides type-safe column builder

const columns: ColumnDef<Booking>[] = [
  // Select column — checkbox for row selection
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        // getIsAllPageRowsSelected: only current page (vs getIsAllRowsSelected: all pages)
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        aria-label={`Select booking ${row.original.id}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },

  // Accessor column — simple field display
  columnHelper.accessor("school_name", {
    header: "School",
    cell: info => (
      <span className="font-medium">{info.getValue()}</span>
    ),
    enableSorting: true,
    filterFn: "includesString",  // built-in: case-insensitive substring match
  }),

  columnHelper.accessor("trip_date", {
    header: ({ column }) => (
      <button
        onClick={column.getToggleSortingHandler()}
        className="flex items-center gap-1"
        aria-label={`Sort by trip date, currently ${column.getIsSorted() || "unsorted"}`}
      >
        Trip Date
        {{ asc: " ↑", desc: " ↓" }[column.getIsSorted() as string] ?? " ↕"}
      </button>
    ),
    cell: info => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(info.getValue())),
    sortingFn: "datetime",  // built-in: correct date comparison
  }),

  columnHelper.accessor("student_count", {
    header: "Students",
    cell: info => info.getValue().toLocaleString(),
    meta: { align: "right" },  // custom meta — access in header/cell via column.columnDef.meta
  }),

  columnHelper.accessor("status", {
    header: "Status",
    cell: info => <StatusBadge status={info.getValue()} />,
    filterFn: (row, columnId, filterValue: string[]) =>
      filterValue.length === 0 || filterValue.includes(row.getValue(columnId)),
    // Custom filterFn: multi-select (array of selected statuses)
  }),

  columnHelper.accessor("amount", {
    header: "Amount",
    cell: info => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(info.getValue()),
    sortingFn: "basic",  // numeric sort
    meta: { align: "right" },
  }),

  // Display column — no data accessor, just UI
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <button onClick={() => onEdit(row.original)}>Edit</button>
        <button onClick={() => onDelete(row.original.id)}>Delete</button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }),
]
```

---

### useReactTable — core setup

```ts
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
} from "@tanstack/react-table"

function BookingTable({ data }: { data: Booking[] }) {
  // Controlled state — you own the state, table reads it
  const [sorting,         setSorting]         = useState<SortingState>([])
  const [columnFilters,   setColumnFilters]   = useState<ColumnFiltersState>([])
  const [columnVisibility,setColumnVisibility]= useState<VisibilityState>({})
  const [rowSelection,    setRowSelection]    = useState<RowSelectionState>({})
  const [pagination,      setPagination]      = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [globalFilter,    setGlobalFilter]    = useState("")

  const table = useReactTable({
    data,
    columns,

    // Row models — each adds a feature, ORDER MATTERS:
    getCoreRowModel:       getCoreRowModel(),       // required — base row model
    getSortedRowModel:     getSortedRowModel(),     // enables sorting
    getFilteredRowModel:   getFilteredRowModel(),   // enables filtering (after sort)
    getPaginationRowModel: getPaginationRowModel(), // enables pagination (after filter)

    // State — table reads these
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination, globalFilter },

    // Updaters — table calls these when state changes
    onSortingChange:         setSorting,
    onColumnFiltersChange:   setColumnFilters,
    onColumnVisibilityChange:setColumnVisibility,
    onRowSelectionChange:    setRowSelection,
    onPaginationChange:      setPagination,
    onGlobalFilterChange:    setGlobalFilter,

    // Options
    enableMultiSort: true,         // shift+click for multi-column sort
    manualPagination: false,       // false = client-side; true = server-side (provide pageCount)
    manualSorting: false,          // false = client-side
    manualFiltering: false,        // false = client-side

    getRowId: row => String(row.id),
    // Custom row ID — important for row selection to survive data re-fetches
    // Without this: row IDs are array indices — selection breaks on sort/filter
  })
```

---

### Rendering the table

```tsx
  return (
    <div>
      {/* Global search */}
      <input
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder="Search all columns..."
        aria-label="Search bookings"
      />

      {/* Column visibility toggle */}
      <ColumnVisibilityMenu table={table} />

      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{ width: header.getSize() }}
                  aria-sort={
                    header.column.getIsSorted() === "asc"  ? "ascending"  :
                    header.column.getIsSorted() === "desc" ? "descending" : "none"
                  }
                >
                  {header.isPlaceholder ? null :
                    flexRender(header.column.columnDef.header, header.getContext())
                  }
                  {/* Column filter input */}
                  {header.column.getCanFilter() && (
                    <ColumnFilter column={header.column} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              data-selected={row.getIsSelected()}
              className={row.getIsSelected() ? "bg-blue-50" : ""}
            >
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  style={{
                    width: cell.column.getSize(),
                    textAlign: (cell.column.columnDef.meta as any)?.align ?? "left",
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination table={table} />

      {/* Selection summary */}
      {Object.keys(rowSelection).length > 0 && (
        <div>
          {Object.keys(rowSelection).length} rows selected
          <button onClick={() => bulkAction(table.getSelectedRowModel().rows.map(r => r.original))}>
            Bulk Action
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### Pagination component

```tsx
function Pagination({ table }: { table: Table<Booking> }) {
  return (
    <div className="flex items-center gap-4" role="navigation" aria-label="Table pagination">
      <button
        onClick={() => table.firstPage()}
        disabled={!table.getCanPreviousPage()}
        aria-label="First page"
      >«</button>
      <button
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        aria-label="Previous page"
      >‹</button>

      <span>
        Page{" "}
        <strong>
          {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </strong>
        {" "}({table.getFilteredRowModel().rows.length} total rows)
      </span>

      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">›</button>
      <button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} aria-label="Last page">»</button>

      <select
        value={table.getState().pagination.pageSize}
        onChange={e => table.setPageSize(Number(e.target.value))}
        aria-label="Rows per page"
      >
        {[10, 20, 50, 100].map(size => (
          <option key={size} value={size}>Show {size}</option>
        ))}
      </select>
    </div>
  )
}
```

---

### Column visibility menu

```tsx
function ColumnVisibilityMenu({ table }: { table: Table<Booking> }) {
  return (
    <div>
      {table.getAllLeafColumns().map(column => {
        if (!column.getCanHide()) return null
        return (
          <label key={column.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={column.getIsVisible()}
              onChange={column.getToggleVisibilityHandler()}
            />
            {String(column.columnDef.header ?? column.id)}
          </label>
        )
      })}
    </div>
  )
}
```

---

### Column filter component

```tsx
function ColumnFilter({ column }: { column: Column<Booking, unknown> }) {
  const filterValue = column.getFilterValue()

  if (column.id === "status") {
    // Multi-select for enum column
    const statuses = ["pending", "confirmed", "paid", "completed", "cancelled"]
    return (
      <div>
        {statuses.map(s => (
          <label key={s}>
            <input
              type="checkbox"
              checked={Array.isArray(filterValue) && filterValue.includes(s)}
              onChange={e => {
                const current = (filterValue as string[]) ?? []
                column.setFilterValue(
                  e.target.checked
                    ? [...current, s]
                    : current.filter(v => v !== s)
                )
              }}
            />
            {s}
          </label>
        ))}
      </div>
    )
  }

  // Text filter for string columns
  return (
    <input
      value={(filterValue ?? "") as string}
      onChange={e => column.setFilterValue(e.target.value || undefined)}
      // undefined clears filter (vs empty string which still filters)
      placeholder={`Filter ${column.id}...`}
    />
  )
}
```

---

## Problem 02 — Advanced TanStack Table (Hard)

Column resizing, column pinning, server-side mode, virtual scrolling, and expanded rows.

---

### Column resizing

```tsx
const table = useReactTable({
  // ...
  enableColumnResizing: true,
  columnResizeMode: "onChange",
  // "onChange": resize live as user drags
  // "onEnd":    resize only after drag ends (better performance for complex tables)
})

// In <th>:
<th style={{ width: header.getSize(), position: "relative" }}>
  {flexRender(header.column.columnDef.header, header.getContext())}

  {/* Resize handle */}
  {header.column.getCanResize() && (
    <div
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      className={`
        absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none
        bg-blue-400 opacity-0 hover:opacity-100
        ${header.column.getIsResizing() ? "opacity-100 bg-blue-600" : ""}
      `}
    />
  )}
</th>

// Column sizes persist in state:
const [columnSizing, setColumnSizing] = useState({})
// state: { columnSizing }, onColumnSizingChange: setColumnSizing
// Save to localStorage for persistence across sessions
```

---

### Column pinning

```tsx
const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
  left:  ["select", "school_name"],  // pinned left columns
  right: ["actions"],                 // pinned right columns
})

// In <th> / <td>: apply sticky positioning
function getPinStyles(column: Column<Booking>): React.CSSProperties {
  const isPinnedLeft  = column.getIsPinned() === "left"
  const isPinnedRight = column.getIsPinned() === "right"

  return {
    position: isPinnedLeft || isPinnedRight ? "sticky" : "relative",
    left:  isPinnedLeft  ? `${column.getStart("left")}px`  : undefined,
    right: isPinnedRight ? `${column.getAfter("right")}px` : undefined,
    zIndex: isPinnedLeft || isPinnedRight ? 1 : 0,
    backgroundColor: isPinnedLeft || isPinnedRight ? "white" : undefined,
    // Background needed to cover scrolling content behind sticky cell
  }
}
```

---

### Server-side mode (manualPagination + manualSorting)

```tsx
// State lives in URL (shareable, bookmarkable):
const [searchParams, setSearchParams] = useSearchParams()
const page     = Number(searchParams.get("page") ?? "0")
const pageSize = Number(searchParams.get("pageSize") ?? "20")
const sortBy   = searchParams.get("sortBy") ?? ""
const sortDir  = searchParams.get("sortDir") ?? ""

const { data, isLoading } = useQuery({
  queryKey: ["bookings", { page, pageSize, sortBy, sortDir }],
  queryFn:  () => fetch(`/api/bookings?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortDir=${sortDir}`)
    .then(r => r.json()),
})

const table = useReactTable({
  data:          data?.items ?? [],
  columns,
  getCoreRowModel: getCoreRowModel(),
  // NO getSortedRowModel / getFilteredRowModel — server handles these
  manualPagination: true,
  manualSorting:    true,
  manualFiltering:  true,
  pageCount: data?.pageCount ?? -1,
  // -1 = unknown page count (use when total count not available)
  rowCount: data?.total,  // total rows for pagination display

  state: {
    pagination: { pageIndex: page, pageSize },
    sorting: sortBy ? [{ id: sortBy, desc: sortDir === "desc" }] : [],
  },

  onPaginationChange: updater => {
    const next = typeof updater === "function"
      ? updater({ pageIndex: page, pageSize })
      : updater
    setSearchParams(p => {
      p.set("page", String(next.pageIndex))
      p.set("pageSize", String(next.pageSize))
      return p
    })
  },
  onSortingChange: updater => {
    const next = typeof updater === "function"
      ? updater(sorting)
      : updater
    setSearchParams(p => {
      if (next[0]) { p.set("sortBy", next[0].id); p.set("sortDir", next[0].desc ? "desc" : "asc") }
      else { p.delete("sortBy"); p.delete("sortDir") }
      return p
    })
  },
})
```

---

### Expanded rows (sub-rows / detail panel)

```tsx
const table = useReactTable({
  // ...
  getExpandedRowModel: getExpandedRowModel(),
  getSubRows: row => row.subRows,  // if data has nested structure
})

// In row rendering:
{table.getRowModel().rows.map(row => (
  <>
    <tr key={row.id}>
      {/* Expand toggle cell */}
      <td>
        {row.getCanExpand() ? (
          <button
            onClick={row.getToggleExpandedHandler()}
            aria-expanded={row.getIsExpanded()}
            aria-controls={`expanded-${row.id}`}
          >
            {row.getIsExpanded() ? "▼" : "▶"}
          </button>
        ) : null}
      </td>
      {row.getVisibleCells().map(cell => (
        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
      ))}
    </tr>

    {/* Expanded detail panel */}
    {row.getIsExpanded() && (
      <tr id={`expanded-${row.id}`}>
        <td colSpan={row.getVisibleCells().length + 1}>
          <BookingDetailPanel booking={row.original} />
        </td>
      </tr>
    )}
  </>
))}
```

---

### Virtual scrolling for large datasets

```tsx
import { useVirtualizer } from "@tanstack/react-virtual"

function VirtualBookingTable({ data }: { data: Booking[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
  const { rows } = table.getRowModel()

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,        // estimated row height in px
    overscan: 10,                  // render 10 extra rows above/below viewport
  })

  return (
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      <table>
        <thead>...</thead>
        {/* Spacer for total height */}
        <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index]
            return (
              <tr
                key={row.id}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                  width: "100%",
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
// @tanstack/react-virtual: renders only visible rows → handles 100k+ rows
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `createColumnHelper` | Type-safe column builder — preferred over raw `ColumnDef[]` |
| `getCoreRowModel` | Always required — base row model |
| `flexRender` | Renders header/cell — handles both JSX and string values |
| `getRowId` | Custom stable IDs — prevents selection bugs on sort/filter |
| `manualPagination` | `true` = server-side; `false` = client-side |
| `columnDef.meta` | Escape hatch for custom per-column data (alignment, type, etc.) |
| `column.getFilterValue()` | Read current filter; `setFilterValue(undefined)` to clear |
| `filterFn: "includesString"` | Built-in: case-insensitive substring (for text columns) |
| `sortingFn: "datetime"` | Built-in: correct date string comparison |
| `enableSorting: false` | Disable per-column |
| `enableHiding: false` | Prevent column from being hidden (e.g. select, actions) |
| `getIsAllPageRowsSelected` | Current page only — vs `getIsAllRowsSelected` (all pages) |
| `columnResizeMode: "onChange"` | Live resize; `"onEnd"` for performance on complex tables |
| `column.getIsPinned()` | `"left"` \| `"right"` \| `false` — use for sticky CSS |
| `getExpandedRowModel` | Sub-rows + detail panels |
| `useVirtualizer` | From `@tanstack/react-virtual` — virtual scrolling for large data |
