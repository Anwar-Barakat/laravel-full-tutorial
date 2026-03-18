// ============================================================
// Problem 02 — Lazy Routes & Navigation UX
// ============================================================



// ============================================================
// hooks/useNavigationProgress.ts
//
// const navigation = useNavigation()
// const [progress, setProgress] = useState(0)
// const intervalRef = useRef<number | null>(null)
//
// useEffect([navigation.state]):
//   if navigation.state === "loading":
//     setProgress(10)
//     intervalRef.current = setInterval(() => {
//       setProgress(prev => prev < 90 ? prev + 10 : prev)  ← stall at 90%, wait for real completion
//     }, 200)
//   else:
//     clearInterval(intervalRef.current)
//     setProgress(100)
//     timeout = setTimeout(() => setProgress(0), 300)  ← brief 100% flash then hide
//     return () => clearTimeout(timeout)
//   return () => clearInterval(intervalRef.current)
//
// return { progress, isNavigating: navigation.state === "loading" }
// ============================================================



// ============================================================
// components/NavigationProgressBar.tsx
//
// const { progress, isNavigating } = useNavigationProgress()
//
// render:
//   <div
//     style={{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0 }}
//     className="fixed top-0 left-0 h-1 bg-blue-500 transition-all duration-200 z-50"
//   />
//
// opacity transition hides bar when progress returns to 0
// ============================================================



// ============================================================
// components/AnimatedOutlet.tsx
//
// const outlet = useOutlet()
// const [displayLocation, setDisplayLocation] = useState(location)
// const [displayOutlet, setDisplayOutlet] = useState(outlet)
// const [transitioning, setTransitioning] = useState(false)
//
// useEffect([location]):
//   if location !== displayLocation:
//     setTransitioning(true)  ← fade out current
//     timeout = setTimeout(() => {
//       setDisplayLocation(location)  ← swap content
//       setDisplayOutlet(outlet)
//       setTransitioning(false)       ← fade in new
//     }, 150)
//     return () => clearTimeout(timeout)
//
// render:
//   <div
//     className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}
//   >
//     {displayOutlet}
//   </div>
// ============================================================



// ============================================================
// components/NavLinkWithPrefetch.tsx
//
// Props: { to: string; children: ReactNode; [rest] }
//
// const navigate = useNavigate()
//
// prefetch = () => {
//   // Trigger dynamic import without navigating
//   // Works because React Router lazy() caches the result
//   import(/* webpackPrefetch: true */ `../pages/${to}`)
// }
//
// render:
//   <NavLink
//     to={to}
//     onMouseEnter={prefetch}   ← hover intent
//     onFocus={prefetch}        ← keyboard navigation intent
//     {...rest}
//   >
//     {children}
//   </NavLink>
//
// Both events trigger prefetch so keyboard users also benefit
// ============================================================



// ============================================================
// components/RouteErrorBoundary.tsx
//
// const error = useRouteError()
// const navigate = useNavigate()
//
// if isRouteErrorResponse(error):
//   // Thrown from loader/action via Response object or json()
//   title = error.status === 404 ? "Page Not Found" : "Something Went Wrong"
//   message = error.data?.message ?? error.statusText
//   render 404 UI or generic error UI based on error.status
//
// else if error instanceof Error && error.message.includes("Failed to fetch dynamically imported module"):
//   // ChunkLoadError — stale deployment, chunk URL no longer exists
//   render:
//     <div>
//       <h2>App Updated</h2>
//       <p>A new version is available.</p>
//       <button onClick={() => navigate(0)}>  ← navigate(0) = full page reload
//         Reload to update
//       </button>
//     </div>
//
// else:
//   // Unknown JS error
//   render generic error UI with error.message
// ============================================================



// ============================================================
// router/index.tsx — lazy loading with errorElement
//
// const DashboardPage = lazy(() => import("../pages/DashboardPage"))
// const BookingsPage  = lazy(() =>
//   import("../pages/BookingsPage")
//     /* webpackChunkName: "bookings" */
//     /* webpackPrefetch: true */
// )
// const AdminDashboard = lazy(() =>
//   import("../pages/AdminDashboard")
//     /* webpackChunkName: "admin" */
// )
//
// Route config additions:
//   {
//     path: "dashboard",
//     element: (
//       <Suspense fallback={<PageSkeleton />}>
//         <DashboardPage />
//       </Suspense>
//     ),
//     errorElement: <RouteErrorBoundary />,
//     loader: dashboardLoader,
//   }
//
// errorElement vs component ErrorBoundary:
//   errorElement catches loader/action throws AND render errors within that route subtree
//   component ErrorBoundary only catches render errors
// ============================================================
