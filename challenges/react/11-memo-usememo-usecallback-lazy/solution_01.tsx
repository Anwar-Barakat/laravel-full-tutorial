// ============================================================
// Problem 01 — Optimized Booking Dashboard
// ============================================================



// ============================================================
// hooks/useRenderCount.ts
//
// const count = useRef(0)
// count.current += 1           ← useRef doesn't cause re-renders
// if (dev): console.log(...)
// return count.current
// ============================================================



// ============================================================
// components/BookingStatsCard.tsx
//
// const BookingStatsCard = React.memo(function BookingStatsCard({ totalRevenue, counts, onFilter })):
//   bails out if totalRevenue, counts, and onFilter are shallowly equal
//   render: revenue display + status buttons (calls onFilter(status))
//   debug: render count from useRenderCount
// ============================================================



// ============================================================
// components/BookingDashboard.tsx
//
// const BookingChart = lazy(() => import("./BookingChart"))
// const ReportsPanel = lazy(() => import("./ReportsPanel"))
//
// state: search, activeFilter, showReports
//
// stats = useMemo(() => ({
//   totalRevenue: bookings.reduce(sum of amount),
//   counts: bookings.reduce(acc per status)
// }), [bookings])
//   ← only recomputes when bookings[] changes, NOT when search changes
//
// filteredBookings = useMemo(() => {
//   filter by activeFilter, filter by search, sort by created_at desc
// }, [bookings, activeFilter, search])
//
// handleFilter = useCallback((status) => setActiveFilter(status), [])
//   ← stable ref: BookingStatsCard won't re-render when parent re-renders
//
// handleDelete = useCallback(async (id) => await bookingApi.delete(id), [])
//   ← stable ref: memo'd BookingTable rows won't re-render
//
// handleSearch: plain function (no useCallback — local to parent only)
//
// render:
//   <BookingStatsCard totalRevenue counts onFilter={handleFilter} />
//   <input onChange={handleSearch} />
//   <BookingTable onDelete={handleDelete} />
//   <Suspense fallback={<ChartSkeleton />}><BookingChart /></Suspense>
//   {showReports && <Suspense fallback={...}><ReportsPanel /></Suspense>}
// ============================================================



// ============================================================
// When to apply (decision rules):
//
// React.memo:  expensive render + parent re-renders often + props are stable primitives
// useMemo:     expensive derivation (sort/filter large array, multi-field reduce)
// useCallback: passed to memo'd child component as a prop
//
// SKIP useMemo: trivial lookup — const label = STATUS_MAP[status]
// SKIP useCallback: function not passed to children — const handleSearch = e => setValue(...)
// SKIP React.memo: cheap component — wrapping adds overhead without benefit
// ============================================================
