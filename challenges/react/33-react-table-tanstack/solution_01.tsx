// ============================================================
// Problem 01 — TanStack Table: Sorting, Filtering, Pagination
// ============================================================



// ============================================================
// Core concept: headless table
//
// TanStack Table provides: logic, state, computed values
// You provide: all HTML markup, CSS, accessibility
// No pre-built components — full control over rendering
//
// Key imports from @tanstack/react-table:
//   useReactTable, createColumnHelper, flexRender
//   getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel
//   SortingState, ColumnFiltersState, VisibilityState, RowSelectionState, PaginationState
// ============================================================



// ============================================================
// Column definitions — createColumnHelper
//
// const columnHelper = createColumnHelper<Booking>()
// ← type-safe builder, preferred over raw ColumnDef[]
//
// Three column types:
//   columnHelper.accessor("field", { ... })  ← data field column
//   columnHelper.display({ id, ... })        ← no accessor, pure UI (actions)
//   { id: "select", header:..., cell:... }   ← custom column object
//
// Select column header:
//   checked={table.getIsAllPageRowsSelected()}
//   ← current PAGE only (not all filtered rows)
//   indeterminate={table.getIsSomePageRowsSelected()}
//   onChange={table.getToggleAllPageRowsSelectedHandler()}
//
// Select column cell:
//   row.getIsSelected(), row.getCanSelect(), row.getToggleSelectedHandler()
//
// enableSorting: false   ← on select/actions columns (no logical sort)
// enableHiding: false    ← prevent select/actions from being hidden
// ============================================================



// ============================================================
// Sortable header — getToggleSortingHandler
//
// <button onClick={column.getToggleSortingHandler()}>
//   Trip Date
//   {{ asc:" ↑", desc:" ↓" }[column.getIsSorted()] ?? " ↕"}
// </button>
//
// sortingFn options (per column):
//   "basic"    → numeric / string comparison
//   "datetime" → Date string comparison (correct for ISO strings)
//   "alphanumeric" → mixed string/number
//   custom: (rowA, rowB, columnId) => number
//
// enableMultiSort: true (on table) → Shift+click adds secondary sort
// ============================================================



// ============================================================
// useReactTable — core setup
//
// const table = useReactTable({
//   data,
//   columns,
//   getCoreRowModel:       getCoreRowModel(),       ← required
//   getSortedRowModel:     getSortedRowModel(),     ← enables sorting
//   getFilteredRowModel:   getFilteredRowModel(),   ← enables column + global filter
//   getPaginationRowModel: getPaginationRowModel(), ← enables pagination
//   ← ORDER MATTERS: sort → filter → paginate
//
//   state: { sorting, columnFilters, columnVisibility, rowSelection, pagination, globalFilter }
//   onSortingChange, onColumnFiltersChange, onColumnVisibilityChange,
//   onRowSelectionChange, onPaginationChange, onGlobalFilterChange,
//
//   getRowId: row => String(row.id),
//   ← stable IDs survive sort/filter — critical for row selection correctness
//   ← without this: IDs are array indices, selection breaks on reorder
// })
// ============================================================



// ============================================================
// Rendering — flexRender + getHeaderGroups + getRowModel
//
// table.getHeaderGroups().map(headerGroup =>
//   headerGroup.headers.map(header =>
//     <th key={header.id} style={{ width: header.getSize() }}
//         aria-sort={header.column.getIsSorted() === "asc" ? "ascending" :
//                    header.column.getIsSorted() === "desc" ? "descending" : "none"}>
//       {header.isPlaceholder ? null :
//         flexRender(header.column.columnDef.header, header.getContext())}
//     </th>
//   )
// )
//
// table.getRowModel().rows.map(row =>
//   row.getVisibleCells().map(cell =>
//     <td key={cell.id}
//         style={{ textAlign: cell.column.columnDef.meta?.align }}>
//       {flexRender(cell.column.columnDef.cell, cell.getContext())}
//     </td>
//   )
// )
//
// flexRender: handles both JSX return and string values from column defs
// getVisibleCells: respects columnVisibility state (hidden columns excluded)
// ============================================================



// ============================================================
// Column filter — setFilterValue
//
// column.getFilterValue()       ← read current filter
// column.setFilterValue(val)    ← set filter
// column.setFilterValue(undefined) ← CLEAR filter (not empty string)
//
// filterFn options:
//   "includesString"        → case-insensitive substring (text columns)
//   "equalsString"          → exact match
//   "includesStringSensitive" → case-sensitive
//   custom: (row, columnId, filterValue) => boolean
//
// Multi-select filter (status column):
//   filterFn: (row, columnId, filterValue: string[]) =>
//     filterValue.length === 0 || filterValue.includes(row.getValue(columnId))
//   ← empty array = no filter (show all)
// ============================================================



// ============================================================
// Pagination
//
// table.firstPage(), table.previousPage(), table.nextPage(), table.lastPage()
// table.getCanPreviousPage(), table.getCanNextPage()
// table.getPageCount()
// table.getState().pagination → { pageIndex, pageSize }
// table.setPageSize(n)
//
// Display:
//   Page {pageIndex + 1} of {getPageCount()}
//   ({table.getFilteredRowModel().rows.length} total rows)
//   ← getFilteredRowModel().rows.length = total AFTER filters applied
// ============================================================



// ============================================================
// Column visibility
//
// table.getAllLeafColumns()
//   ← all columns including hidden (use for visibility menu)
//   column.getCanHide()           → false for select/actions (enableHiding:false)
//   column.getIsVisible()         → current visibility
//   column.getToggleVisibilityHandler() → onChange handler
//
// table.getVisibleLeafColumns()
//   ← only currently visible columns
//
// Default hidden columns via initialState:
//   useReactTable({ initialState: { columnVisibility: { contact_email: false } } })
// ============================================================



// ============================================================
// Row selection
//
// RowSelectionState = Record<string, boolean>
//   { "42": true, "87": true }  ← row IDs as keys
//
// Summary UI:
//   Object.keys(rowSelection).length → count of selected rows
//   table.getSelectedRowModel().rows → Row<Booking>[] of selected rows
//   .map(r => r.original)            → Booking[] for bulk actions
//
// table.resetRowSelection()  ← clear all selections
// ============================================================



// ============================================================
// columnDef.meta — custom per-column data
//
// meta: { align: "right" }   ← in column definition
//
// Access in cell:
//   (cell.column.columnDef.meta as { align?: string })?.align
//
// Extend TypeScript declaration:
//   declare module "@tanstack/react-table" {
//     interface ColumnMeta<TData, TValue> {
//       align?: "left" | "center" | "right"
//     }
//   }
//   ← then meta is typed, no cast needed
// ============================================================
