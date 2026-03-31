// ============================================================
// Problem 01 — Protected Routes & Nested Layouts
// ============================================================



// ============================================================
// components/ProtectedRoute.tsx
//
// Props: { requiredRoles?: string[] }
//
// const { user, isLoading } = useAuth()
// const location = useLocation()
//
// if isLoading: return <LoadingSpinner />  ← prevents flash of redirect
//
// if !user:
//   return <Navigate to="/login" state={{ from: location }} replace />
//
// if requiredRoles && requiredRoles.length > 0:
//   hasRole = requiredRoles.some(role => user.roles.includes(role))  ← OR logic
//   if !hasRole: return <Navigate to="/unauthorized" replace />
//
// return <Outlet />  ← renders child routes when authorized
// ============================================================



// ============================================================
// layouts/AppLayout.tsx
//
// const { user } = useAuth()
//
// render:
//   <div className="min-h-screen ...">
//     <Navbar user={user} />
//     <Breadcrumbs />
//     <main>
//       <Outlet />   ← child route renders here
//     </main>
//   </div>
// ============================================================



// ============================================================
// components/Breadcrumbs.tsx
//
// const matches = useMatches()
//
// crumbs = matches
//   .filter(match => Boolean((match.handle as RouteHandle)?.breadcrumb))
//   .map(match => ({
//     label: (match.handle as RouteHandle).breadcrumb(match.data),
//     path: match.pathname,
//   }))
//
// render: crumbs.map((crumb, i) =>
//   i < crumbs.length - 1
//     ? <Link to={crumb.path}>{crumb.label}</Link> + <span>/</span>
//     : <span aria-current="page">{crumb.label}</span>
// )
// ============================================================



// ============================================================
// pages/LoginPage.tsx
//
// const location = useLocation()
// const navigate = useNavigate()
// const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard"
//
// handleLogin(credentials):
//   await login(credentials)
//   navigate(from, { replace: true })  ← redirect back to intended page
//
// render: login form with email + password inputs
// ============================================================



// ============================================================
// pages/NotFoundPage.tsx
//
// const navigate = useNavigate()
//
// render:
//   <div>
//     <h1>404 — Page Not Found</h1>
//     <button onClick={() => navigate(-1)}>Go Back</button>
//     <Link to="/dashboard">Go Home</Link>
//   </div>
// ============================================================



// ============================================================
// router/index.tsx  (route config)
//
// createBrowserRouter([
//   {
//     path: "/",
//     element: <AppLayout />,
//     children: [
//       { index: true, element: <Navigate to="/dashboard" replace /> },
//
//       // Public routes
//       { path: "login", element: <LoginPage /> },
//       { path: "unauthorized", element: <UnauthorizedPage /> },
//
//       // Protected routes — any authenticated user
//       {
//         element: <ProtectedRoute />,
//         children: [
//           {
//             path: "dashboard",
//             element: <DashboardPage />,
//             handle: { breadcrumb: () => "Dashboard" },
//           },
//           {
//             path: "bookings",
//             handle: { breadcrumb: () => "Bookings" },
//             children: [
//               { index: true, element: <BookingsPage /> },
//               {
//                 path: ":id",
//                 element: <BookingDetailPage />,
//                 handle: { breadcrumb: (data) => `Booking #${data.booking.id}` },
//                 loader: bookingLoader,
//               },
//             ],
//           },
//         ],
//       },
//
//       // Admin-only routes
//       {
//         element: <ProtectedRoute requiredRoles={["admin", "superadmin"]} />,
//         children: [
//           {
//             path: "admin",
//             handle: { breadcrumb: () => "Admin" },
//             children: [
//               { index: true, element: <AdminDashboard /> },
//               { path: "users", element: <UsersPage />,
//                 handle: { breadcrumb: () => "Users" } },
//             ],
//           },
//         ],
//       },
//
//       // 404 catch-all — must be last
//       { path: "*", element: <NotFoundPage /> },
//     ],
//   },
// ])
// ============================================================
