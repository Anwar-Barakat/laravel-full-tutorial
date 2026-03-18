// ============================================================
// Problem 01 — Infinite Booking List
// ============================================================



// ============================================================
// types/pagination.ts
//
// interface PaginatedResponse<T>:
//   data: T[]
//   meta: { current_page, last_page, per_page, total }
//
// type FetchPage<T> = (page: number) => Promise<PaginatedResponse<T>>
//
// interface UseInfiniteScrollReturn<T>:
//   items, isLoading, isFetchingMore, hasMore, error,
//   sentinelRef: React.RefCallback<HTMLDivElement>,
//   retry, reset
// ============================================================



// ============================================================
// hooks/useInfiniteScroll.ts
//
// State: items=[], page=1, hasMore=true, isLoading=true,
//        isFetchingMore=false, error=null
// Ref:   isFetchingRef = useRef(false)   ← prevents concurrent fetches without re-render
//
// loadMore = useCallback(async () => {
//   if isFetchingRef.current || !hasMore: return   ← debounce guard
//   isFetchingRef.current = true
//   page === 1 ? setIsLoading(true) : setIsFetchingMore(true)
//   setError(null)
//   try:
//     response = await fetchFn(page)
//     setItems(prev => page === 1 ? response.data : [...prev, ...response.data])
//     setHasMore(response.meta.current_page < response.meta.last_page)
//     setPage(prev => prev + 1)
//   catch:
//     setError(err.message)
//   finally:
//     setIsLoading(false); setIsFetchingMore(false)
//     isFetchingRef.current = false
// }, [fetchFn, page, hasMore])
//
// Initial load useEffect([], [loadMore]):
//   loadMore()
//
// sentinelRef = useCallback((node: HTMLDivElement | null) => {
//   if !node: return
//   observer = new IntersectionObserver(
//     (entries) => entries[0].isIntersecting && hasMore && !isFetchingRef.current && loadMore(),
//     { threshold: 0.1 }
//   )
//   observer.observe(node)
//   return () => observer.disconnect()
// }, [hasMore, loadMore])
//
// retry / reset:
//   setError(null); setPage(1); setItems([]); setHasMore(true)
//   ← page reset to 1 triggers re-fetch via loadMore dependency
// ============================================================



// ============================================================
// components/BookingCard.tsx
//
// Props: { booking: Booking }
//   Booking: id, school_name, destination, trip_date, student_count, status, amount
//
// Left: school_name (bold) + destination · trip_date + student_count
// Right: <StatusBadge status> + amount (£X,XXX)
// Outer: hover:shadow-md transition-shadow
// ============================================================



// ============================================================
// components/InfiniteBookingList.tsx
//
// const { items, isLoading, isFetchingMore, hasMore, error, sentinelRef, retry }
//   = useInfiniteScroll<Booking>((page) =>
//       fetch(`/api/bookings?page=${page}&per_page=20`).then(r => r.json())
//     )
//
// if isLoading: 5 animate-pulse skeleton cards
//
// else:
//   items.map(<BookingCard />)
//
//   error:
//     "Failed to load: {error}" + "Try again" button → retry()
//
//   isFetchingMore:
//     centered spinner (border-t-transparent animate-spin)
//
//   !hasMore && items.length > 0:
//     "All N bookings loaded" (text-center text-gray-400)
//
//   !hasMore && items.length === 0:
//     "No bookings found" empty state
//
//   hasMore && !error:
//     <div ref={sentinelRef} className="h-1" />
//     ← must have non-zero height or IntersectionObserver never fires
// ============================================================



// ============================================================
// Why isFetchingRef (ref) not isLoading (state) as guard:
//   State change triggers re-render → observer re-fires → loadMore called again
//   before first fetch resolves → duplicate page fetch
//   Ref change is synchronous and does NOT re-render
//
// Why useCallback as sentinelRef (not useRef + useEffect):
//   Ref callback fires when element mounts (with node) and unmounts (with null)
//   → clean place to observe(node) + disconnect()
//   useRef misses elements that mount after initial render
//
// Sentinel must be INSIDE hasMore && !error guard:
//   When hasMore=false, sentinel unmounts → observer disconnects automatically
// ============================================================
