# React Router & Protected Routes

Build routing: protected routes with role guards, nested layouts, dynamic breadcrumbs, and programmatic navigation.

| Topic          | Details                                                         |
|----------------|-----------------------------------------------------------------|
| Nested Routes  | Layout routes, Outlet                                           |
| Auth Guards    | ProtectedRoute HOC                                              |
| Breadcrumbs    | Dynamic from route config                                       |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Protected Route System (Medium)

### Scenario

Build a complete routing system: `ProtectedRoute` that checks auth and roles, nested layouts with `Outlet`, and automatic breadcrumbs from route configuration.

### Requirements

1. `ProtectedRoute` — redirects to `/login` if not authenticated
2. Role-based guard: `requiredRoles={["admin", "school_admin"]}`
3. Nested routes with `Outlet` for layout persistence
4. `useAuth()` hook integration
5. Redirect back to intended page after login
6. Dynamic breadcrumbs from route `handle` metadata
7. 404 catch-all route

### Expected Code

```tsx
// router/index.tsx
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"

// Pages
import LoginPage       from "@/pages/LoginPage"
import NotFoundPage    from "@/pages/NotFoundPage"
const DashboardPage  = lazy(() => import("@/pages/DashboardPage"))
const BookingsPage   = lazy(() => import("@/pages/BookingsPage"))
const BookingDetail  = lazy(() => import("@/pages/BookingDetail"))
const SchoolsPage    = lazy(() => import("@/pages/SchoolsPage"))
const ReportsPage    = lazy(() => import("@/pages/ReportsPage"))
const AdminPanel     = lazy(() => import("@/pages/AdminPanel"))

// Layouts
import { AppLayout }       from "@/layouts/AppLayout"
import { AdminLayout }     from "@/layouts/AdminLayout"
import { ProtectedRoute }  from "@/components/ProtectedRoute"
import { PageSkeleton }    from "@/components/PageSkeleton"

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────
  {
    path:    "/login",
    element: <LoginPage />,
    handle:  { breadcrumb: "Login" },
  },

  // ── Protected routes — any authenticated user ────────────
  {
    element: <ProtectedRoute />,          // ← guard wrapper (no path)
    children: [
      {
        element: (                         // ← layout wrapper (no path)
          <Suspense fallback={<PageSkeleton />}>
            <AppLayout />
          </Suspense>
        ),
        children: [
          {
            index:   true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path:    "/dashboard",
            element: <DashboardPage />,
            handle:  { breadcrumb: "Dashboard" },
          },
          {
            path:    "/bookings",
            handle:  { breadcrumb: "Bookings" },
            children: [
              {
                index:   true,
                element: <BookingsPage />,
              },
              {
                path:    ":id",
                element: <BookingDetail />,
                handle:  { breadcrumb: "Booking Details" },
              },
            ],
          },
          {
            path:    "/schools",
            element: <SchoolsPage />,
            handle:  { breadcrumb: "Schools" },
          },
          {
            path:    "/reports",
            element: <ReportsPage />,
            handle:  { breadcrumb: "Reports" },
          },
        ],
      },
    ],
  },

  // ── Admin-only routes ────────────────────────────────────
  {
    element: <ProtectedRoute requiredRoles={["admin"]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path:    "/admin",
            element: <AdminPanel />,
            handle:  { breadcrumb: "Admin Panel" },
          },
        ],
      },
    ],
  },

  // ── 404 catch-all ────────────────────────────────────────
  {
    path:    "*",
    element: <NotFoundPage />,
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
```

```tsx
// components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

interface ProtectedRouteProps {
  requiredRoles?: string[]    // if provided, user must have at least ONE of these roles
}

export function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Wait for auth check to complete — avoid flash-redirect to /login
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⟳</div>
      </div>
    )
  }

  // Not authenticated — save intended URL, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        // state carries the attempted URL — LoginPage reads this and redirects back
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  // Authenticated but wrong role — redirect to 403 / dashboard
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <Navigate
        to="/dashboard"
        state={{ error: `Requires role: ${requiredRoles.join(" or ")}` }}
        replace
      />
    )
  }

  // Passes all checks — render nested routes
  return <Outlet />
}
```

```tsx
// pages/LoginPage.tsx — redirect to intended page after login
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  // Read the "from" state set by ProtectedRoute's Navigate redirect
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard"

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    await login(
      data.get("email") as string,
      data.get("password") as string
    )

    // After successful login, go to the originally requested page
    navigate(from, { replace: true })
    //              ↑ replace: true — login page not in browser history after redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 w-full max-w-sm shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        {from !== "/dashboard" && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded p-2 text-center">
            Please sign in to continue
          </p>
        )}
        <input name="email"    type="email"    placeholder="Email"    required className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Password" required className="w-full border rounded-lg px-3 py-2 text-sm" />
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
          Sign In
        </button>
      </form>
    </div>
  )
}
```

```tsx
// layouts/AppLayout.tsx — persistent layout with sidebar + breadcrumbs
import { Outlet } from "react-router-dom"
import { Sidebar }    from "@/components/Sidebar"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <Breadcrumbs />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {/* Outlet renders the matched child route */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

```tsx
// components/Breadcrumbs.tsx — built from route handle metadata
import { Link, useMatches } from "react-router-dom"

interface RouteMatch {
  id:     string
  pathname: string
  params:   Record<string, string | undefined>
  data:     unknown
  handle:   { breadcrumb?: string } | undefined
}

export function Breadcrumbs() {
  // useMatches returns ALL matched routes in the current hierarchy
  const matches = useMatches() as RouteMatch[]

  // Filter to only routes with a breadcrumb in their handle
  const crumbs = matches.filter((m) => m.handle?.breadcrumb)

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm text-gray-500">
        <li>
          <Link to="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
            Home
          </Link>
        </li>
        {crumbs.map((match, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={match.id} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span
                  aria-current="page"
                  className="text-gray-900 dark:text-white font-medium"
                >
                  {match.handle!.breadcrumb}
                </span>
              ) : (
                <Link
                  to={match.pathname}
                  className="hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {match.handle!.breadcrumb}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Example — visiting /bookings/42 renders:
// Home / Bookings / Booking Details
// because both the /bookings route and the :id route have handle.breadcrumb set
```

```tsx
// pages/NotFoundPage.tsx
import { Link, useNavigate } from "react-router-dom"

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <p className="text-7xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            Go back
          </button>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
```

### Route Hierarchy

```
<RouterProvider>
  /login               → LoginPage (public)

  <ProtectedRoute>     (no path — guard only)
    <AppLayout>        (no path — layout only, renders <Outlet>)
      /dashboard       → DashboardPage
      /bookings        → (breadcrumb: Bookings)
        index          → BookingsPage
        :id            → BookingDetail  (breadcrumb: Booking Details)
      /schools         → SchoolsPage
      /reports         → ReportsPage

  <ProtectedRoute requiredRoles={["admin"]}>
    <AdminLayout>
      /admin           → AdminPanel

  *                    → NotFoundPage
```

### What We're Evaluating

- `<ProtectedRoute />` as a layout route (no `path`) — uses `<Outlet />` to render children
- `location.state = { from: location.pathname }` — carries intended URL through the redirect
- `navigate(from, { replace: true })` — after login, navigates to intended URL; no login in history
- `isLoading` guard in `ProtectedRoute` — prevents flash redirect before session is confirmed
- `requiredRoles.includes(user.role)` — ANY matching role grants access (OR logic)
- `useMatches()` — returns all matched routes in hierarchy; filter by `m.handle?.breadcrumb`
- `<Outlet />` in `AppLayout` — renders the matching child route at that point in the tree
- `handle: { breadcrumb: "..." }` — arbitrary metadata attached to a route definition
- `aria-current="page"` on last breadcrumb — screen reader announces current page
- `path: "*"` catch-all — must be last; matches anything not matched above

---

## Problem 02 — Lazy Routes & Route Transitions (Hard)

### Scenario

Add code splitting per route, loading indicators during navigation, and animated route transitions.

### Requirements

1. Lazy-load each page with `React.lazy`
2. Show loading bar during navigation
3. Animate page transitions (fade in/slide)
4. Prefetch route on link hover
5. Route-level error boundary

### Expected Code

```tsx
// hooks/useNavigationProgress.ts
// Tracks Inertia-style navigation progress bar
import { useNavigation } from "react-router-dom"
import { useEffect, useState } from "react"

export function useNavigationProgress() {
  const navigation = useNavigation()
  const isLoading  = navigation.state !== "idle"

  // Simulate incremental progress — stops at 90% until navigation completes
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setProgress(100)
      const timer = setTimeout(() => setProgress(0), 300)
      return () => clearTimeout(timer)
    }

    setProgress(10)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev    // stall at 90% — wait for real completion
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(interval)
  }, [isLoading])

  return { progress, isLoading }
}
```

```tsx
// components/NavigationProgressBar.tsx
import { useNavigationProgress } from "@/hooks/useNavigationProgress"

export function NavigationProgressBar() {
  const { progress, isLoading } = useNavigationProgress()

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-1 pointer-events-none"
    >
      <div
        className={`
          h-full bg-blue-500
          transition-all ease-out
          ${progress === 0   ? "opacity-0 duration-300" : "opacity-100 duration-200"}
        `}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
```

```tsx
// components/AnimatedOutlet.tsx
// Wraps Outlet with a fade-in animation on route change
import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"

export function AnimatedOutlet() {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // Fade out
      setIsVisible(false)

      const timer = setTimeout(() => {
        setDisplayLocation(location)   // swap content after fade out
        setIsVisible(true)             // fade in new content
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [location, displayLocation])

  return (
    <div
      className={`
        transition-all duration-150 ease-in-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
      `}
    >
      <Outlet context={{ displayLocation }} />
    </div>
  )
}
```

```tsx
// components/NavLinkWithPrefetch.tsx
// Starts loading the target page chunk on hover
import { NavLink, type NavLinkProps } from "react-router-dom"
import { type ComponentType, useCallback } from "react"

interface NavLinkWithPrefetchProps extends NavLinkProps {
  prefetch?: () => Promise<{ default: ComponentType }>
}

export function NavLinkWithPrefetch({
  prefetch,
  onMouseEnter,
  onFocus,
  children,
  ...props
}: NavLinkWithPrefetchProps) {
  const handlePrefetch = useCallback(() => {
    if (prefetch) prefetch()   // fire and forget — webpack caches the module
  }, [prefetch])

  return (
    <NavLink
      {...props}
      onMouseEnter={(e) => { handlePrefetch(); onMouseEnter?.(e) }}
      onFocus={(e)      => { handlePrefetch(); onFocus?.(e) }}
    >
      {children}
    </NavLink>
  )
}
```

```tsx
// components/RouteErrorBoundary.tsx
// Error boundary for route-level lazy loading failures
"use client"
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom"

export function RouteErrorBoundary() {
  const error    = useRouteError()
  const navigate = useNavigate()

  // React Router v6 passes route errors here (including lazy load failures)
  const isChunkError =
    error instanceof Error &&
    (error.message.includes("Loading chunk") ||
     error.message.includes("Failed to fetch dynamically imported module"))

  if (isRouteErrorResponse(error)) {
    // HTTP errors (e.g. loader threw a Response)
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-5xl font-bold text-gray-300 mb-4">{error.status}</p>
          <h1 className="text-xl font-semibold mb-2">{error.statusText}</h1>
          <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4" aria-hidden="true">💥</p>
        <h1 className="text-xl font-semibold mb-2">
          {isChunkError ? "Update available" : "Something went wrong"}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {isChunkError
            ? "A new version of the app is available. Please refresh."
            : (error as Error).message}
        </p>
        <button
          onClick={() => isChunkError ? window.location.reload() : navigate(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          {isChunkError ? "Refresh page" : "Try again"}
        </button>
      </div>
    </div>
  )
}
```

```tsx
// router/index.tsx — full setup with lazy, progress, error boundaries
import { lazy, Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary"

// Named chunk imports — useful for bundle analysis
const DashboardPage = lazy(() => import(/* webpackChunkName: "dashboard" */ "@/pages/DashboardPage"))
const BookingsPage  = lazy(() => import(/* webpackChunkName: "bookings"  */ "@/pages/BookingsPage"))
const ReportsPage   = lazy(() => import(/* webpackChunkName: "reports"   */ "@/pages/ReportsPage"))
const AdminPanel    = lazy(() => import(/* webpackChunkName: "admin"     */ "@/pages/AdminPanel"))

const PageSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-48" />
    <div className="h-4 bg-gray-200 rounded w-64" />
    <div className="h-64 bg-gray-200 rounded" />
  </div>
)

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,    // ← catches lazy load failures
    children: [
      {
        element: (
          <>
            <NavigationProgressBar />
            <AppLayout>
              {/* AnimatedOutlet replaces plain <Outlet> */}
              <AnimatedOutlet />
            </AppLayout>
          </>
        ),
        children: [
          {
            path: "/dashboard",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "/bookings",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <BookingsPage />
              </Suspense>
            ),
          },
          {
            path: "/reports",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <ReportsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
])

// Sidebar with prefetch
function Sidebar() {
  return (
    <nav>
      <NavLinkWithPrefetch
        to="/bookings"
        prefetch={() => import("@/pages/BookingsPage")}
      >
        Bookings
      </NavLinkWithPrefetch>
      <NavLinkWithPrefetch
        to="/reports"
        prefetch={() => import("@/pages/ReportsPage")}
      >
        Reports
      </NavLinkWithPrefetch>
    </nav>
  )
}
```

### Navigation Progress Flow

```
User clicks link:
  navigation.state → "loading"
  useNavigationProgress: isLoading = true
  setProgress(10) → interval increments to ~90%
  NavigationProgressBar renders blue bar at 10–90%

Lazy chunk loads + route matches:
  navigation.state → "idle"
  isLoading = false
  setProgress(100) → bar completes
  setTimeout(300ms): setProgress(0) → bar fades out

Route chunk fails to load:
  errorElement = <RouteErrorBoundary />
  isChunkError? → "Refresh page" button
  else → "Try again" → navigate(0) (reload current route)
```

### What We're Evaluating

- `useNavigation()` from React Router — `state: "idle" | "loading" | "submitting"` for navigation progress
- `setProgress(100)` then `setTimeout → 0` — bar completes then fades rather than snapping to 0
- `AnimatedOutlet` — fade out on location change, swap content, fade in new; `displayLocation` tracks what's rendered vs what's requested
- `NavLinkWithPrefetch` — `onMouseEnter` AND `onFocus` for both mouse and keyboard users
- `errorElement` on the route config — React Router v6 catches errors in route segment; replaces `<RouteErrorBoundary>` class component
- `useRouteError()` — React Router's version of `componentDidCatch`; gets the thrown value
- `isRouteErrorResponse(error)` — distinguishes HTTP error responses from runtime errors
- `navigate(0)` — reload current route without full page refresh
- `webpackChunkName` magic comment — names the chunk for bundle analysis
