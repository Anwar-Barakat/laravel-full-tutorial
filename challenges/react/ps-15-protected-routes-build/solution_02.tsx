// SOLUTION 02 — Login Redirect Flow, Session Restoration, Alternatives
// Focus: redirect after login, reading ?redirect param, persisting auth across refresh

// ─── LOGIN PAGE — REDIRECT AFTER SUCCESSFUL LOGIN ─────────────────────────────

// LoginPage reads the ?redirect query param to know where to send the user
// Use useSearchParams() from react-router-dom to read URL query params
//   const [searchParams] = useSearchParams()
//   const redirectPath = searchParams.get('redirect') ?? '/dashboard'

// After calling login() from the Zustand store successfully:
//   navigate(redirectPath, { replace: true })
//   Use replace: true so the login page is not in the back-stack after redirect

// Security note: validate the redirect path before using it
//   Ensure it starts with '/' to prevent open redirect attacks
//   If it starts with 'http' or '//', it could redirect to an external site
//   Safe check: redirectPath.startsWith('/') ? redirectPath : '/dashboard'

// ─── LOCATION STATE AS ALTERNATIVE TO QUERY PARAMS ────────────────────────────

// Instead of ?redirect= in the URL, ProtectedRoute can pass the intended path
// through React Router's location.state object:
//   <Navigate to="/login" state={{ from: location.pathname }} replace />

// LoginPage reads it back:
//   const location = useLocation()
//   const from = location.state?.from ?? '/dashboard'
//   navigate(from, { replace: true })

// Comparison:
//   Query param (?redirect=): visible in URL, survives full page reload, easy to share
//   location.state: invisible in URL, lost on page reload, slightly more secure
//   For Tripz (SPA without SSR), both approaches work — query param is simpler to debug

// ─── SESSION RESTORATION ON PAGE REFRESH ──────────────────────────────────────

// When the user refreshes the page, the Zustand store resets to its initial state
// The user appears unauthenticated even though they have a valid token in localStorage

// Restoration pattern:
//   In the Zustand store, check localStorage for a saved token during store initialisation
//   If token exists: set isAuthenticated = true and user = saved user object
//   This can be done in the initial state factory or in a hydration effect

// Alternative: use zustand/middleware's persist middleware
//   Wraps the store and automatically serialises/deserialises to localStorage
//   persist(create, { name: 'tripz-auth', partialize: (state) => ({ user: state.user }) })
//   Only persist the user object — not action functions

// useEffect restoration in App.tsx (manual approach):
//   On mount, read token from localStorage
//   If token found: call a restoreSession() action on the store
//   restoreSession() should validate the token against the API (GET /api/me)
//   If the API returns 401, clear the stored token and set isAuthenticated = false
//   Show a loading spinner while this check is in flight to avoid redirect flicker

// ─── REDIRECT FLICKER PREVENTION ──────────────────────────────────────────────

// Without session restoration, authenticated users briefly see the /login redirect
// before the store hydrates — this is a flash of unauthenticated content

// Fix: add an isHydrating boolean to the Zustand store
//   Initially true, set to false once the token check resolves
//   ProtectedRoute checks isHydrating first:
//     If isHydrating → return null (or a loading spinner)
//     If !isHydrating && !isAuthenticated → redirect
//     If !isHydrating && isAuthenticated → <Outlet />
//   This prevents the redirect from firing before auth state is known

// ─── NESTED WILDCARD ROUTES ───────────────────────────────────────────────────

// Routes like /bookings/* and /admin/* use wildcard paths
// The component at that path (BookingsRouter, AdminRouter) must itself contain
// a nested <Routes> with relative paths:
//   In BookingsRouter:
//     <Routes>
//       <Route path="/"   element={<BookingList />} />
//       <Route path=":id" element={<BookingDetail />} />
//     </Routes>
// React Router v6 resolves these relative to the parent route's matched prefix
