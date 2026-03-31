// ============================================================
// Problem 01 — React Suspense & Concurrent Features
// ============================================================



// ============================================================
// lib/createResource.ts
//
// type ResourceStatus = "pending" | "success" | "error"
// interface Resource<T> { read(): T }
//
// function createResource<T>(promise: Promise<T>): Resource<T>
//
// status = "pending", result, error
//
// suspender = promise.then(
//   data => { status="success"; result=data },
//   err  => { status="error";   error=err  }
// )
//
// return { read() {
//   if status==="pending" → throw suspender   ← Suspense catches this Promise
//   if status==="error"   → throw error        ← ErrorBoundary catches this
//   return result!                             ← resolved: returns value
// }}
//
// Create resource OUTSIDE components — not in useEffect, not in render
// ← creating inside render re-fetches on every render cycle
// ============================================================



// ============================================================
// hooks/useBookingResource.ts
//
// Module-level: resourceCache = new Map<string, Resource<Booking[]>>()
//
// function useBookingResource(filters): Resource<Booking[]>
//   key = JSON.stringify(filters)
//   if !resourceCache.has(key):
//     params = new URLSearchParams(filters)
//     promise = fetch(`/api/bookings?${params}`)
//       .then(r => { if !r.ok throw Error(`HTTP ${r.status}`); return r.json() })
//     resourceCache.set(key, createResource(promise))
//   return resourceCache.get(key)!
//
// clearResourceCache = () => resourceCache.clear()
//   ← call after mutations to force re-fetch
// ============================================================



// ============================================================
// components/BookingSearch.tsx — useTransition
//
// State: query="", filters: BookingFilters = { search:"", status:"" }
// const [isPending, startTransition] = useTransition()
//
// handleSearch(e):
//   value = e.target.value
//   setQuery(value)               ← URGENT: updates input immediately, no transition
//   startTransition(() => {
//     setFilters(prev => ({ ...prev, search: value }))
//     ← NON-URGENT: deferred, React can interrupt if more keystrokes arrive
//   })
//
// Render:
//   input: value={query} (immediate)
//   spinner: {isPending && <animate-spin />} inside input right side
//
//   <div className={isPending ? "opacity-60" : "opacity-100"}>
//     <Suspense fallback={<BookingsSkeleton />}>
//       <BookingResultsWithResource filters={filters} />
//     </Suspense>
//   </div>
//   ← opacity-60 shows stale results while new ones load in background
// ============================================================



// ============================================================
// components/DestinationFilter.tsx — useDeferredValue
//
// State: query=""
// const deferredQuery = useDeferredValue(query)
//   ← deferredQuery lags behind query; low-priority render
//
// filtered = useMemo(() =>
//   destinations.filter(d =>
//     d.name.toLowerCase().includes(deferredQuery.toLowerCase()) ||
//     d.city.toLowerCase().includes(deferredQuery.toLowerCase())
//   )
// , [destinations, deferredQuery])   ← deferredQuery NOT query
//
// isStale = query !== deferredQuery
//   ← true while deferred render is pending
//
// <div className={isStale ? "opacity-50" : "opacity-100"}>
//   filtered list
// </div>
//
// useTransition vs useDeferredValue:
//   useTransition: you own the state setter → wrap in startTransition
//   useDeferredValue: you receive a value as prop or can't wrap setter
// ============================================================



// ============================================================
// SuspenseList for coordinated loading
//
// import { SuspenseList } from "react"
//
// <SuspenseList revealOrder="forwards" tail="collapsed">
//   <Suspense fallback={<SummarySkeleton />}>
//     <SummaryCards resource={summaryResource} />
//   </Suspense>
//   <Suspense fallback={<BookingsSkeleton />}>
//     <RecentBookings resource={bookingsResource} />
//   </Suspense>
//   <Suspense fallback={<ChartSkeleton />}>
//     <RevenueChart resource={chartResource} />
//   </Suspense>
// </SuspenseList>
//
// revealOrder="forwards": reveal in DOM order even if later items load first
// tail="collapsed": only show ONE loading indicator at a time (not all 3)
// ============================================================



// ============================================================
// components/skeletons/BookingsSkeleton.tsx
//
// Props: { rows? = 5 }
//
// <div aria-busy="true" aria-label="Loading bookings">
//   {Array.from({ length: rows }).map((_, i) =>
//     animate-pulse card: title placeholder + subtitle + badge placeholder
//   )}
// </div>
//
// aria-busy="true": tells screen readers content is loading
// ← complement to visual skeleton for accessibility
// ============================================================
