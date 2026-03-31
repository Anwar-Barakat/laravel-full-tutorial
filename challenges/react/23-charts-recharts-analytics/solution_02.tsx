// ============================================================
// Problem 02 — Advanced Data Visualization
// ============================================================



// ============================================================
// Brush for time range selection (BookingTrendChart extension)
//
// Import Brush from "recharts"
//
// <Brush
//   dataKey="displayDate"
//   height={24}
//   stroke="#94a3b8"
//   fill="#f8fafc"
//   travellerWidth={8}
//   startIndex={Math.max(0, formatted.length - 30)}  ← default: last 30 points
//   endIndex={formatted.length - 1}
// />
//
// Brush is client-side only — zooms into a subset of the already-fetched data
// No API call; just changes which slice of the data array is rendered
// ============================================================



// ============================================================
// Drill-down bar chart (RevenueBarChart extension)
//
// State: drillDown: { month: string; data: DailyRevenue[] } | null = null
// State: isDrillLoading = false
//
// handleBarClick = async (barData) => {
//   setIsDrillLoading(true)
//   daily = await fetch(`/api/analytics/daily?month=${barData.month}`).then(r => r.json())
//   setDrillDown({ month: barData.month, data: daily })
//   setIsDrillLoading(false)
// }
//
// Bar: onClick={handleBarClick} cursor="pointer"
//
// When drillDown is set:
//   show ← Back breadcrumb → setDrillDown(null)
//   render daily BarChart instead of monthly
//   title changes to "Daily Revenue — {drillDown.month}"
// ============================================================



// ============================================================
// Synchronized charts
//
// <AreaChart syncId="booking-sync" data={confirmedData}>...</AreaChart>
// <AreaChart syncId="booking-sync" data={revenueData}>...</AreaChart>
//
// Same syncId string = hover tooltip appears at same x position in both
// No extra state needed — Recharts handles sync internally
// ============================================================



// ============================================================
// components/charts/LegendWithToggles.tsx
//
// Props: { keys: [{dataKey, name, color}], hiddenKeys: Set<string>, onToggle }
//
// flex flex-wrap gap-3 mt-4
// Per key:
//   <button
//     onClick={() => onToggle(dataKey)}
//     aria-pressed={!hiddenKeys.has(dataKey)}   ← accessibility: pressed state
//     className={isHidden ? "border-gray-200 text-gray-400" : "..."}
//     style={{ backgroundColor: isHidden ? undefined : `${color}20` }}
//   >
//     colour dot + name
//   </button>
//
// Usage in BookingTrendChart:
//   State: hiddenKeys = new Set<string>()
//   toggleKey = (key) => setHiddenKeys(prev => {
//     next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
//   })
//   <Area dataKey="confirmed" hide={hiddenKeys.has("confirmed")} />
//   <LegendWithToggles keys={TREND_KEYS} hiddenKeys={hiddenKeys} onToggle={toggleKey} />
// ============================================================



// ============================================================
// Screen reader accessibility
//
// Wrap each chart in <figure> + <figcaption>:
//   <figure aria-labelledby="revenue-chart-title" role="img">
//     <figcaption id="revenue-chart-title" className="sr-only">
//       Monthly revenue bar chart. Shows revenue and target per month.
//     </figcaption>
//     <ResponsiveContainer>...</ResponsiveContainer>
//     <AccessibleChartTable data={data} columns={[...]} caption="..." />
//   </figure>
//
// AccessibleChartTable:
//   <table className="sr-only">   ← visually hidden but read by screen readers
//     <caption>{caption}</caption>
//     <thead><tr>{columns.map(col => <th scope="col">{col.label}</th>)}</tr></thead>
//     <tbody>{data.map(row => <tr>{columns.map(col => <td>{row[col.key]}</td>)}</tr>)}</tbody>
//   </table>
//
// Also: each summary card should have role="status" or aria-live="polite"
//   so screen readers announce value changes on date range change
// ============================================================



// ============================================================
// Performance: useMemo for chart data transforms
//
// formatted = useMemo(() =>
//   data.map(d => ({
//     ...d,
//     displayDate: new Date(d.date).toLocaleDateString("en-GB", { day:"2-digit", month:"short" }),
//     total: d.confirmed + d.pending + d.cancelled,
//   }))
// , [data])
//
// totals = useMemo(() => ({
//   revenue:  data.reduce((s, d) => s + d.revenue, 0),
//   maxValue: Math.max(...data.map(d => d.revenue)),
// }), [data])
//
// Why: Date parsing is expensive; running it on every re-render (resize, hover, etc.)
// causes visible jank. useMemo only re-runs when data reference changes (new fetch).
// ============================================================
