# REACT_TEST_27 — Charts • Recharts • Analytics

**Time:** 25 minutes | **Stack:** React + TypeScript + Recharts

---

## Problem 01 — Booking Analytics Dashboard (Medium)

Build an analytics dashboard with monthly revenue bar chart, booking trend line chart, and status distribution pie chart — all with custom tooltips, responsive containers, loading skeletons, and empty states.

---

### Part A — Types

**File:** `types/analytics.ts`

```ts
interface MonthlyRevenue {
  month: string          // "Jan", "Feb", …
  revenue: number        // £ amount
  bookings: number       // count
  target: number         // target revenue
}

interface BookingTrend {
  date: string           // "2024-01-01"
  confirmed: number
  pending: number
  cancelled: number
}

interface StatusDistribution {
  name: string           // "Confirmed", "Pending", "Cancelled"
  value: number          // count
  color: string          // hex colour
}

interface AnalyticsSummary {
  totalRevenue: number
  totalBookings: number
  averageValue: number
  conversionRate: number  // 0–100
}
```

---

### Part B — `useAnalyticsData` hook

**File:** `hooks/useAnalyticsData.ts`

```ts
function useAnalyticsData(dateRange: { from: string; to: string }): {
  monthlyRevenue: MonthlyRevenue[]
  bookingTrends: BookingTrend[]
  statusDistribution: StatusDistribution[]
  summary: AnalyticsSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}
```

**Implementation:**
```ts
function useAnalyticsData({ from, to }) {
  const [data, setData] = useState<{
    monthly: MonthlyRevenue[]
    trends: BookingTrend[]
    distribution: StatusDistribution[]
    summary: AnalyticsSummary | null
  }>({ monthly: [], trends: [], distribution: [], summary: null })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [trigger, setTrigger]     = useState(0)

  useEffect(() => {
    setIsLoading(true); setError(null)
    const params = new URLSearchParams({ from, to })
    fetch(`/api/analytics?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [from, to, trigger])

  return {
    monthlyRevenue:      data.monthly,
    bookingTrends:       data.trends,
    statusDistribution:  data.distribution,
    summary:             data.summary,
    isLoading,
    error,
    refetch: () => setTrigger(prev => prev + 1),
  }
}
```

---

### Part C — Custom tooltip components

**File:** `components/charts/ChartTooltip.tsx`

Recharts passes `active`, `payload`, and `label` to custom tooltips:

```tsx
interface RevenueTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                    rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-medium">
            {entry.name === "Revenue" || entry.name === "Target"
              ? `£${entry.value.toLocaleString()}`
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

### Part D — `RevenueBarChart` component

**File:** `components/charts/RevenueBarChart.tsx`

```tsx
interface RevenueBarChartProps {
  data: MonthlyRevenue[]
  isLoading: boolean
}
```

**Recharts implementation:**
```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts"

function RevenueBarChart({ data, isLoading }: RevenueBarChartProps) {
  if (isLoading) return <ChartSkeleton height={300} />
  if (!data.length) return <EmptyChart message="No revenue data for this period" />

  const maxRevenue = Math.max(...data.map(d => Math.max(d.revenue, d.target)))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
        Monthly Revenue vs Target
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<RevenueTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
          {/* Target line overlay */}
          <Bar dataKey="target"    name="Target"  fill="#e5e7eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="revenue"   name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Part E — `BookingTrendChart` component

**File:** `components/charts/BookingTrendChart.tsx`

```tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts"

function BookingTrendChart({ data, isLoading }: { data: BookingTrend[]; isLoading: boolean }) {
  if (isLoading) return <ChartSkeleton height={250} />
  if (!data.length) return <EmptyChart message="No trend data for this period" />

  // Format date labels to be shorter
  const formatted = data.map(d => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
  }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
        Booking Trends
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            {/* Gradient fills */}
            <linearGradient id="confirmed-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="pending-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="displayDate" tick={{ fill: "#6b7280", fontSize: 11 }}
                 axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<TrendTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
          <Area type="monotone" dataKey="confirmed" name="Confirmed"
                stroke="#3b82f6" fill="url(#confirmed-gradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="pending"   name="Pending"
                stroke="#f59e0b" fill="url(#pending-gradient)"   strokeWidth={2} />
          <Area type="monotone" dataKey="cancelled" name="Cancelled"
                stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Part F — `StatusPieChart` component

**File:** `components/charts/StatusPieChart.tsx`

```tsx
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts"

const STATUS_COLORS: Record<string, string> = {
  Confirmed:  "#3b82f6",
  Pending:    "#f59e0b",
  Cancelled:  "#ef4444",
  Completed:  "#10b981",
}

function StatusPieChart({ data, isLoading }: { data: StatusDistribution[]; isLoading: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (isLoading) return <ChartSkeleton height={280} />
  if (!data.length) return <EmptyChart message="No booking data available" />

  const total = data.reduce((sum, d) => sum + d.value, 0)

  // Custom label — only show if segment is > 5%
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
            fontSize={12} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        Booking Status
      </h3>
      <p className="text-sm text-gray-400 mb-4">{total.toLocaleString()} total bookings</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={100}
            innerRadius={50}            // donut chart
            dataKey="value"
            labelLine={false}
            label={renderLabel}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={STATUS_COLORS[entry.name] ?? entry.color}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                stroke={activeIndex === index ? "#fff" : "none"}
                strokeWidth={activeIndex === index ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
              name
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            formatter={(value, entry: any) => (
              <span className="text-gray-600 dark:text-gray-300">
                {value}: {entry.payload.value.toLocaleString()}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Part G — `SummaryCards` and `ChartSkeleton`

**`SummaryCards`:**
```tsx
function SummaryCards({ summary, isLoading }: { summary: AnalyticsSummary | null; isLoading: boolean }) {
  const cards = [
    { label: "Total Revenue",  value: summary ? `£${summary.totalRevenue.toLocaleString()}` : "-", icon: "💰" },
    { label: "Total Bookings", value: summary?.totalBookings.toLocaleString() ?? "-",              icon: "📋" },
    { label: "Avg. Value",     value: summary ? `£${summary.averageValue.toFixed(0)}` : "-",       icon: "📈" },
    { label: "Conversion",     value: summary ? `${summary.conversionRate.toFixed(1)}%` : "-",     icon: "🎯" },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map(card => (
        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          {isLoading
            ? <div className="animate-pulse space-y-2"><div className="h-3 bg-gray-200 rounded w-2/3" /><div className="h-6 bg-gray-200 rounded w-1/2" /></div>
            : <>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
              </>
          }
        </div>
      ))}
    </div>
  )
}
```

**`ChartSkeleton`:**
```tsx
function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="bg-gray-100 rounded-lg" style={{ height }} />
    </div>
  )
}
```

**`EmptyChart`:**
```tsx
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm flex items-center
                    justify-center h-48 text-gray-400 text-sm">
      {message}
    </div>
  )
}
```

---

### Part H — `AnalyticsDashboard` page

**File:** `pages/AnalyticsDashboard.tsx`

```tsx
function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split("T")[0],
    to:   new Date().toISOString().split("T")[0],
  })

  const { monthlyRevenue, bookingTrends, statusDistribution, summary, isLoading, error, refetch }
    = useAnalyticsData(dateRange)

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={refetch} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header + date range picker */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <SummaryCards summary={summary} isLoading={isLoading} />

      {/* Chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueBarChart data={monthlyRevenue} isLoading={isLoading} />
        </div>
        <div>
          <StatusPieChart data={statusDistribution} isLoading={isLoading} />
        </div>
      </div>

      <BookingTrendChart data={bookingTrends} isLoading={isLoading} />
    </div>
  )
}
```

---

## Problem 02 — Advanced Data Visualization (Hard)

Add drill-down, brush time range selection, synchronized charts, custom legend with toggles, and screen reader accessibility.

---

### Part A — Brush for time range selection

**File:** `components/charts/BookingTrendChart.tsx` (extended)

```tsx
import { Brush } from "recharts"

// Add Brush inside AreaChart:
<Brush
  dataKey="displayDate"
  height={24}
  stroke="#94a3b8"
  fill="#f8fafc"
  travellerWidth={8}
  startIndex={Math.max(0, formatted.length - 30)}  // default: last 30 data points
  endIndex={formatted.length - 1}
/>
```

**Brush behaviour:**
- Drag the handles to zoom into a sub-range without re-fetching
- `startIndex`/`endIndex` are indices into the `data` array — not dates
- Works client-side only (no API call on brush)

---

### Part B — Drill-down bar chart

**File:** `components/charts/RevenueBarChart.tsx` (extended)

Clicking a bar navigates from monthly view → daily view for that month:

```tsx
const [drillDown, setDrillDown] = useState<{ month: string; data: DailyRevenue[] } | null>(null)

const handleBarClick = async (data: { month: string }) => {
  setIsDrillLoading(true)
  const daily = await fetch(`/api/analytics/daily?month=${data.month}`).then(r => r.json())
  setDrillDown({ month: data.month, data: daily })
  setIsDrillLoading(false)
}

// In BarChart:
<Bar dataKey="revenue" onClick={handleBarClick}
     cursor="pointer"
     className="hover:opacity-80 transition-opacity" />

// Breadcrumb above chart:
{drillDown && (
  <button onClick={() => setDrillDown(null)} className="text-sm text-blue-600 mb-4">
    ← Back to monthly view
  </button>
)}
```

---

### Part C — Synchronized charts

Recharts supports synchronization via the `syncId` prop on multiple chart wrappers:

```tsx
// Both charts respond to hover simultaneously
<AreaChart syncId="booking-sync" data={confirmedData}>...</AreaChart>
<AreaChart syncId="booking-sync" data={cancelledData}>...</AreaChart>
```

When the user hovers over a data point in one chart, the tooltip appears at the same x position in all charts sharing the same `syncId`.

---

### Part D — Custom interactive legend with toggles

**File:** `components/charts/LegendWithToggles.tsx`

```tsx
interface LegendWithTogglesProps {
  keys: Array<{ dataKey: string; name: string; color: string }>
  hiddenKeys: Set<string>
  onToggle: (dataKey: string) => void
}

function LegendWithToggles({ keys, hiddenKeys, onToggle }: LegendWithTogglesProps) {
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {keys.map(({ dataKey, name, color }) => {
        const isHidden = hiddenKeys.has(dataKey)
        return (
          <button
            key={dataKey}
            onClick={() => onToggle(dataKey)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                        border transition-all ${isHidden
                          ? "border-gray-200 text-gray-400 bg-gray-50"
                          : "border-transparent text-gray-700"}`}
            style={{ backgroundColor: isHidden ? undefined : `${color}20` }}
            aria-pressed={!isHidden}
          >
            <span className={`w-3 h-3 rounded-full transition-opacity ${isHidden ? "opacity-30" : ""}`}
                  style={{ backgroundColor: color }} />
            {name}
          </button>
        )
      })}
    </div>
  )
}
```

**Usage in `BookingTrendChart`:**
```ts
const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())

const toggleKey = (key: string) => setHiddenKeys(prev => {
  const next = new Set(prev)
  next.has(key) ? next.delete(key) : next.add(key)
  return next
})

// In Area components:
<Area dataKey="confirmed" hide={hiddenKeys.has("confirmed")} ... />
```

---

### Part E — Screen reader accessibility

```tsx
// 1. Visually hidden data table alongside every chart
function AccessibleChartTable({ data, columns, caption }: { ... }) {
  return (
    <table className="sr-only">   {/* sr-only = visually hidden but accessible */}
      <caption>{caption}</caption>
      <thead>
        <tr>{columns.map(col => <th key={col.key} scope="col">{col.label}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {columns.map(col => <td key={col.key}>{row[col.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 2. aria-label on the chart container
<figure aria-labelledby="revenue-chart-title" role="img">
  <figcaption id="revenue-chart-title" className="sr-only">
    Monthly revenue bar chart. Data shows revenue and target for each month.
  </figcaption>
  <ResponsiveContainer>
    <BarChart ...>...</BarChart>
  </ResponsiveContainer>
  <AccessibleChartTable
    data={data}
    columns={[
      { key: "month",   label: "Month" },
      { key: "revenue", label: "Revenue" },
      { key: "target",  label: "Target" },
    ]}
    caption="Monthly revenue data"
  />
</figure>
```

---

### Part F — Performance: `useMemo` for expensive chart data transforms

```ts
// WITHOUT useMemo — runs on every render:
const formatted = data.map(d => ({
  ...d,
  displayDate: new Date(d.date).toLocaleDateString(...),   // expensive Date parse × N items
  total: d.confirmed + d.pending + d.cancelled,
}))

// WITH useMemo — only recalculates when data changes:
const formatted = useMemo(() =>
  data.map(d => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    total: d.confirmed + d.pending + d.cancelled,
  })),
  [data]   // ← only recompute when data array reference changes
)

// Also memoize expensive aggregations:
const totals = useMemo(() => ({
  revenue:  data.reduce((s, d) => s + d.revenue, 0),
  bookings: data.reduce((s, d) => s + d.bookings, 0),
  maxValue: Math.max(...data.map(d => d.revenue)),
}), [data])
```

---

### Key Recharts API reference

```ts
// ResponsiveContainer — always required for responsive charts:
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>

// Axis formatting:
<YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
<XAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />

// Custom tooltip — receives active + payload + label:
<Tooltip content={<MyTooltip />} />
// Always guard: if (!active || !payload?.length) return null

// SVG gradient defs:
<defs>
  <linearGradient id="my-gradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
  </linearGradient>
</defs>
<Area fill="url(#my-gradient)" />

// Donut chart = Pie with innerRadius:
<Pie outerRadius={100} innerRadius={50} dataKey="value">

// Cell for per-segment colouring in Pie:
{data.map((entry, i) => <Cell key={i} fill={entry.color} />)}

// Synchronised charts:
<AreaChart syncId="shared-id">  // same syncId = hover sync across charts

// Brush for zoom/pan:
<Brush dataKey="date" height={24} startIndex={0} endIndex={data.length - 1} />
```
