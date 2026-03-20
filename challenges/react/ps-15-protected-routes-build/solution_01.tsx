// SOLUTION 01 — Route Guard Components
// Focus: ProtectedRoute, AdminRoute, GuestRoute component logic

// ─── ZUSTAND AUTH STORE ────────────────────────────────────────────────────────

// Create useAuthStore with zustand's create()
// State shape: { user, isAuthenticated, login, logout }
// isAuthenticated derived from whether user is non-null
// login action: POST /api/login, set user in store, persist token to localStorage
// logout action: clear user from store and localStorage

// ─── PROTECTED ROUTE ──────────────────────────────────────────────────────────

// ProtectedRoute reads isAuthenticated from useAuthStore()
// Also reads the current location with useLocation() from react-router-dom

// If NOT isAuthenticated:
//   Build the redirect URL: /login?redirect=<current pathname>
//   Use <Navigate to={`/login?redirect=${location.pathname}`} replace />
//   The 'replace' prop prevents the login page from being pushed onto history
//   so the back button doesn't loop back to the protected page

// If isAuthenticated:
//   Return <Outlet /> — renders the matched child route

// ProtectedRoute does not accept children prop — it uses Outlet pattern
// This allows wrapping multiple routes under a single guard in <Routes>

// ─── ADMIN ROUTE ──────────────────────────────────────────────────────────────

// AdminRoute builds on ProtectedRoute logic but adds a role check
// Read both isAuthenticated and user from useAuthStore()

// Check order matters:
//   1. If NOT isAuthenticated → redirect to /login?redirect=... (same as ProtectedRoute)
//   2. If isAuthenticated but user.role !== 'admin' → render <ForbiddenPage />
//   3. If isAuthenticated and user.role === 'admin' → render <Outlet />

// Do NOT redirect on wrong role — show a 403 page inline
// Redirecting on wrong role would be confusing (user is logged in but gets bounced to login)
// Showing a 403 is honest: "you are logged in but not allowed here"

// ─── GUEST ROUTE (INVERSE GUARD) ─────────────────────────────────────────────

// GuestRoute is the inverse of ProtectedRoute — it protects pages that
// should NOT be accessible when already logged in (login, register pages)

// If isAuthenticated:
//   <Navigate to="/dashboard" replace />
//   redirect away from the login form — the user is already in

// If NOT isAuthenticated:
//   Return <Outlet /> — let the guest see the page

// ─── APP ROUTE STRUCTURE ──────────────────────────────────────────────────────

// In App.tsx, nest routes under guard components using React Router v6 layout routes:

// <Routes>
//   Public routes — no wrapper:
//     <Route path="/trips" element={<TripsPage />} />

//   Guest-only routes — wrap in GuestRoute:
//     <Route element={<GuestRoute />}>
//       <Route path="/login"    element={<LoginPage />} />
//       <Route path="/register" element={<RegisterPage />} />
//     </Route>

//   Protected routes — wrap in ProtectedRoute:
//     <Route element={<ProtectedRoute />}>
//       <Route path="/dashboard"   element={<DashboardPage />} />
//       <Route path="/bookings/*"  element={<BookingsRouter />} />
//       <Route path="/profile"     element={<ProfilePage />} />
//     </Route>

//   Admin routes — wrap in AdminRoute:
//     <Route element={<AdminRoute />}>
//       <Route path="/admin/*" element={<AdminRouter />} />
//     </Route>

//   Fallback:
//     <Route path="*" element={<NotFoundPage />} />
// </Routes>

// ─── FORBIDDEN PAGE ───────────────────────────────────────────────────────────

// ForbiddenPage is a simple static component
// Display: "403 — You do not have permission to view this page"
// Optionally provide a link back to /dashboard
// No special logic required — AdminRoute renders it directly when role check fails
