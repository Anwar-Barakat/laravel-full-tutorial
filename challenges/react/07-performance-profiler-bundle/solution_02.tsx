// ============================================================
// Problem 02 — Dynamic Import & Code Splitting Strategy
// ============================================================



// ============================================================
// router/AppRouter.tsx  — route-level splitting
//
// const BookingsPage  = lazy(() => import("./pages/BookingsPage"))
// const ReportsPage   = lazy(() => import("./pages/ReportsPage"))
// const SettingsPage  = lazy(() => import("./pages/SettingsPage"))
// const DashboardPage = lazy(() => import("./pages/DashboardPage"))
//
// prefetch(importFn): just call importFn() — webpack caches result
//
// <nav>:
//   Reports link → onMouseEnter: prefetch(() => import("./pages/ReportsPage"))
//
// <Suspense fallback={<PageSkeleton />}>
//   <Routes> ... </Routes>
// </Suspense>
// ============================================================



// ============================================================
// hooks/useIntersectionObserver.ts
//
// options: IntersectionObserverInit & { freezeOnceVisible?: boolean }
// returns: [ref: RefObject<HTMLDivElement>, isVisible: boolean]
//
// useEffect:
//   new IntersectionObserver(([entry]) => {
//     if (entry.isIntersecting):
//       setIsVisible(true)
//       if freezeOnceVisible: observer.unobserve(el)
//   }, observerOptions)
//   observer.observe(ref.current)
//   return () => observer.disconnect()
// ============================================================



// ============================================================
// components/LazyOnVisible.tsx
//
// Props: { fallback, children, rootMargin?: string }
//
// const [containerRef, isVisible] = useIntersectionObserver({
//   rootMargin, freezeOnceVisible: true
// })
//
// <div ref={containerRef}>
//   {isVisible
//     ? <Suspense fallback={fallback}>{children}</Suspense>
//     : fallback}
// </div>
//
// Usage:
//   const BookingChart = lazy(() => import("./BookingChart"))
//   <LazyOnVisible fallback={<ChartSkeleton />} rootMargin="100px">
//     <BookingChart data={chartData} />
//   </LazyOnVisible>
// ============================================================



// ============================================================
// components/ChunkErrorBoundary.tsx  (class component — required for error boundaries)
//
// State: { hasError: boolean; isChunkError: boolean }
//
// getDerivedStateFromError(error):
//   isChunkError = error.name === "ChunkLoadError"
//               || error.message.includes("Loading chunk")
//               || error.message.includes("Failed to fetch dynamically imported module")
//   return { hasError: true, isChunkError }
//
// handleRetry():
//   if isChunkError → window.location.reload()  (fetch updated chunk after deploy)
//   else → setState({ hasError: false })
//
// render: error state shows message + retry button, else children
// ============================================================



// ============================================================
// components/TimedSuspense.tsx
//
// Props: { fallback, children, onLoadTime?: (ms: number) => void }
//
// LoadTimer inner component:
//   startRef = useRef(performance.now())
//   useEffect: onLoadTime?.(performance.now() - startRef.current)
//   return null  ← no UI, only timing side-effect
//
// return:
//   <Suspense fallback={fallback}>
//     <LoadTimer onLoadTime={onLoadTime} />
//     {children}
//   </Suspense>
// ============================================================



// ============================================================
// Webpack magic comments
//
// Named chunk:  import(/* webpackChunkName: "reports" */ "./pages/ReportsPage")
// Prefetch:     import(/* webpackPrefetch: true */ "./pages/SettingsPage")
//               → browser downloads during idle time
// Preload:      import(/* webpackPreload: true */ "./pages/DashboardPage")
//               → downloads in parallel with initial bundle (high priority)
// ============================================================
