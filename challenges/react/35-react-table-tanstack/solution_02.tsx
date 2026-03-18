// ============================================================
// Problem 02 — Advanced TanStack Table
// ============================================================



// ============================================================
// Column resizing
//
// enableColumnResizing: true
// columnResizeMode: "onChange"   ← live resize during drag
//   vs "onEnd"                   ← resize only on drag release (better perf)
//
// State: const [columnSizing, setColumnSizing] = useState({})
//   state: { columnSizing }, onColumnSizingChange: setColumnSizing
//
// In <th>:
//   style={{ width: header.getSize(), position:"relative" }}
//
//   {header.column.getCanResize() && (
//     <div
//       onMouseDown={header.getResizeHandler()}
//       onTouchStart={header.getResizeHandler()}
//       className={`resize-handle ${header.column.getIsResizing() ? "active" : ""}`}
//       style={{ position:"absolute", right:0, top:0, height:"100%",
//                width:"4px", cursor:"col-resize", userSelect:"none", touchAction:"none" }}
//     />
//   )}
//
// Persist to localStorage:
//   useEffect(() => localStorage.setItem("columnSizing", JSON.stringify(columnSizing)), [columnSizing])
//   initialState: { columnSizing: JSON.parse(localStorage.getItem("columnSizing") ?? "{}") }
// ============================================================



// ============================================================
// Column pinning
//
// const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
//   left:  ["select", "school_name"],
//   right: ["actions"],
// })
//
// getPinStyles(column): React.CSSProperties
//   isPinnedLeft  = column.getIsPinned() === "left"
//   isPinnedRight = column.getIsPinned() === "right"
//   return {
//     position: isPinnedLeft || isPinnedRight ? "sticky" : "relative",
//     left:  isPinnedLeft  ? `${column.getStart("left")}px`  : undefined,
//     right: isPinnedRight ? `${column.getAfter("right")}px` : undefined,
//     zIndex: isPinnedLeft || isPinnedRight ? 1 : 0,
//     backgroundColor: "white",   ← covers scrolling content behind sticky cell
//   }
//
// Apply to both <th> and <td>: style={getPinStyles(header.column)}
// ============================================================



// ============================================================
// Server-side mode — manualPagination + manualSorting
//
// useReactTable({
//   data:    serverData?.items ?? [],
//   columns,
//   getCoreRowModel: getCoreRowModel(),
//   ← NO getSortedRowModel / getFilteredRowModel — server handles these
//
//   manualPagination: true,
//   manualSorting:    true,
//   manualFiltering:  true,
//   pageCount:  serverData?.pageCount ?? -1,   ← -1 = unknown total pages
//   rowCount:   serverData?.total,             ← for pagination display
// })
//
// State in URL (shareable + bookmarkable):
//   const [searchParams, setSearchParams] = useSearchParams()
//   page, pageSize, sortBy, sortDir → read from URL
//
// onPaginationChange: updater =>
//   const next = typeof updater === "function" ? updater(current) : updater
//   setSearchParams(p => { p.set("page", next.pageIndex); return p })
//   ← updater can be value OR function — always handle both
//
// onSortingChange: updater =>
//   const next = typeof updater === "function" ? updater(sorting) : updater
//   setSearchParams(p => { if (next[0]) p.set("sortBy", next[0].id); return p })
// ============================================================



// ============================================================
// Expanded rows — detail panel
//
// getExpandedRowModel: getExpandedRowModel()
// getSubRows: row => row.subRows   (if nested data structure)
//
// Expand toggle in row:
//   {row.getCanExpand() && (
//     <button onClick={row.getToggleExpandedHandler()}
//             aria-expanded={row.getIsExpanded()}
//             aria-controls={`expanded-${row.id}`}>
//       {row.getIsExpanded() ? "▼" : "▶"}
//     </button>
//   )}
//
// Expanded detail row (after regular row):
//   {row.getIsExpanded() && (
//     <tr id={`expanded-${row.id}`}>
//       <td colSpan={row.getVisibleCells().length}>
//         <BookingDetailPanel booking={row.original} />
//       </td>
//     </tr>
//   )}
//
// Note: React fragment <> needed to yield multiple <tr> per row
// ============================================================



// ============================================================
// Virtual scrolling — @tanstack/react-virtual
//
// import { useVirtualizer } from "@tanstack/react-virtual"
//
// const parentRef = useRef<HTMLDivElement>(null)
// const { rows } = table.getRowModel()
//
// const virtualizer = useVirtualizer({
//   count:           rows.length,
//   getScrollElement: () => parentRef.current,
//   estimateSize:    () => 48,    ← estimated row height in px
//   overscan:        10,          ← extra rows above/below viewport
// })
//
// Container: <div ref={parentRef} style={{ height:"600px", overflow:"auto" }}>
// Body:      <tbody style={{ height:`${virtualizer.getTotalSize()}px`, position:"relative" }}>
//
// Rows:
//   virtualizer.getVirtualItems().map(virtualRow => {
//     const row = rows[virtualRow.index]
//     return <tr style={{
//       position:"absolute", top:0,
//       transform:`translateY(${virtualRow.start}px)`,
//       height:`${virtualRow.size}px`
//     }}>
//
// When to use: 100+ rows that can't be paginated (e.g. financial feed)
// ============================================================



// ============================================================
// Accessibility
//
// <table role="grid" aria-label="Booking list" aria-rowcount={totalRows}>
// <th aria-sort="ascending" | "descending" | "none">
// <tr aria-selected={row.getIsSelected()}>
//
// Loading state:
//   <tbody aria-busy={isLoading} aria-live="polite">
//   {isLoading ? <tr><td colSpan={cols}><Skeleton /></td></tr> : rows}
//
// Empty state:
//   {rows.length === 0 && (
//     <tr><td colSpan={columns.length} role="cell">
//       No bookings found. {hasFilters && <button onClick={clearFilters}>Clear filters</button>}
//     </td></tr>
//   )}
//
// Keyboard navigation:
//   table cells naturally focusable via tab
//   Sort buttons: Enter/Space triggers sort
//   Expand buttons: Enter/Space, aria-expanded, aria-controls
// ============================================================



// ============================================================
// Performance optimization
//
// 1. Stable column definitions (avoid recreating on every render):
//   const columns = useMemo(() => [...], [])
//   ← without useMemo: new array reference each render → table recalculates
//
// 2. Stable data reference:
//   const data = useMemo(() => serverData?.items ?? [], [serverData])
//   ← prevents unnecessary row recalculation
//
// 3. columnResizeMode: "onEnd" for heavy cell renders
//   ← avoids firing width calculations on every mouse move during resize
//
// 4. Memoize expensive cell renderers:
//   cell: memo(({ getValue }) => <ExpensiveChart value={getValue()} />)
//
// 5. Virtual scrolling for 100+ rows (see above)
//
// 6. Avoid storing derived state:
//   Don't store filtered/sorted rows in useState — table computes these
//   Access via table.getFilteredRowModel().rows when needed
// ============================================================



// ============================================================
// Key concepts
//
// Row model pipeline order (matters for correctness):
//   Core → Sorted → Filtered → Paginated → Expanded
//   getFilteredRowModel runs AFTER sort → filter counts reflect sorted data
//
// initialState vs state:
//   initialState: uncontrolled initial value (table owns state after init)
//   state: fully controlled — you own it, must provide onChange
//   Can mix: initialState.columnVisibility + controlled sorting
//
// table.options.data mutation detection:
//   Table detects data reference changes via Object.is
//   Same reference = no recalculation, new reference = full recalculation
//   Hence: useMemo for data
//
// getFilteredRowModel().rows.length vs getRowModel().rows.length:
//   getFilteredRowModel: total matching rows (all pages)
//   getRowModel: current PAGE rows only
//   Use getFilteredRowModel for showing total count in pagination
//
// flexRender(def, ctx):
//   handles: JSX element, string, number, render function
//   always use — never call column.columnDef.header directly
// ============================================================
