// ============================================================
// Problem 01 — Protected Routes & Nested Layouts
// ============================================================

import {
    Navigate,
    Outlet,
    Link,
    useLocation,
    useNavigate,
    useMatches,
} from "react-router-dom";
import { useState } from "react";
import type React from "react";

// ============================================================
// Types
// ============================================================

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
}

interface RouteHandle {
    breadcrumb: (data?: unknown) => string;
}

function useAuth() {
    return { user: null as User | null, isLoading: false };
}

// ============================================================
// ProtectedRoute
// Props: { requiredRoles?: string[] }
//
// 1. isLoading → show spinner
// 2. !user     → <Navigate to="/login" state={{ from: location }} replace />
// 3. requiredRoles → check user.roles, redirect to /unauthorized if no match
// 4. authorized → <Outlet />
// ============================================================

interface ProtectedRouteProps {
    requiredRoles?: string[];
}

export function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="text-gray-500 text-sm">Loading…</span>{" "}
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((role) => user.roles.includes(role));
        if (!hasRole) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <Outlet />;
}

// ============================================================
// AppLayout — Navbar + Breadcrumbs + <Outlet />
// ============================================================

export function AppLayout() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
                <Link
                    to="/dashboard"
                    className="text-lg font-bold text-blue-600"
                >
                    Tripz
                </Link>
                {user && (
                    <span className="text-sm text-gray-600">{user.name}</span>
                )}{" "}
            </header>

            <Breadcrumbs />

            <main className="p-6">
                {" "}
                <Outlet />
            </main>
        </div>
    );
}

// ============================================================
// Breadcrumbs
// useMatches() → filter by handle.breadcrumb → map to { label, path }
// Last crumb = aria-current="page", not a link
// ============================================================

export function Breadcrumbs() {
    const matches = useMatches();

    const crumbs = matches
        .filter((match) => Boolean((match.handle as RouteHandle)?.breadcrumb))
        .map((match) => ({
            label: (match.handle as RouteHandle).breadcrumb(match.data),
            path: match.pathname,
        }));

    if (crumbs.length === 0) return null;

    return (
        <nav className="px-6 py-2 text-sm text-gray-500 flex items-center gap-2">
            {crumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-2">
                    {i < crumbs.length - 1 ? (
                        <>
                            <Link
                                to={crumb.path}
                                className="hover:text-blue-600"
                            >
                                {crumb.label}
                            </Link>
                            <span>/</span>
                        </>
                    ) : (
                        <span
                            aria-current="page"
                            className="text-gray-900 font-medium"
                        >
                            {crumb.label}
                        </span>
                    )}
                </span>
            ))}
        </nav>
    );
}

// ============================================================
// LoginPage
// Read location.state?.from?.pathname for redirect-after-login
// After login: navigate(from, { replace: true })
// ============================================================

export function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const from =
        (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // await login({ email, password })
        navigate(from, { replace: true });
    }
    return (
        <div className="min-h-screen flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-xl shadow w-full max-w-sm space-y-4"
            >
                <h1 className="text-xl font-bold">Sign in</h1>{" "}
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full border rounded-lg px-3 py-2
text-sm"
                />{" "}
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full border rounded-lg   px-3 py-2 text-sm"
                />{" "}
                <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                    Sign in
                </button>
            </form>{" "}
        </div>
    );
}

// ============================================================
// NotFoundPage
// navigate(-1) for Go Back, <Link to="/dashboard"> for Go Home
// ============================================================

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center text-center">
            <div>
                {" "}
                <p className="text-6xl mb-4">404</p>
                <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
                <div className="flex gap-3 justify-center mt-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border rounded-lg text-sm"
                    >
                        Go Back
                    </button>
                    <Link
                        to="/dashboard"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                    >
                        Go Home
                    </Link>
                </div>{" "}
            </div>
        </div>
    );
}

// ============================================================
// Router Config — router/index.tsx
// ============================================================

// import { createBrowserRouter, RouterProvider } from "react-router-dom";
//
// export const router = createBrowserRouter([
//   {
//     path: "/",
//     element: <AppLayout />,
//     children: [
//       { index: true, element: <Navigate to="/dashboard" replace /> },
//
//       // Public routes
//       { path: "login",        element: <LoginPage /> },
//       { path: "unauthorized", element: <UnauthorizedPage /> },
//
//       // Any authenticated user
//       {
//         element: <ProtectedRoute />,
//         children: [
//           { path: "dashboard", element: <DashboardPage />,
//             handle: { breadcrumb: () => "Dashboard" } },
//           {
//             path: "bookings",
//             handle: { breadcrumb: () => "Bookings" },
//             children: [
//               { index: true, element: <BookingsPage /> },
//               { path: ":id", element: <BookingDetailPage />,
//                 handle: { breadcrumb: (data) => `Booking #${data.booking.id}` },
//                 loader: bookingLoader },
//             ],
//           },
//         ],
//       },
//
//       // Admin only
//       {
//         element: <ProtectedRoute requiredRoles={["admin"]} />,
//         children: [
//           { path: "admin", element: <AdminPage />,
//             handle: { breadcrumb: () => "Admin" } },
//         ],
//       },
//
//       // 404 catch-all — must be last
//       { path: "*", element: <NotFoundPage /> },
//     ],
//   },
// ]);
//
// // main.tsx
// ReactDOM.createRoot(document.getElementById("root")).render(
//   <RouterProvider router={router} />
// );

/*
================================================================
TIPS
================================================================

ProtectedRoute — how it works
-------------------------------
• Renders <Outlet /> when authorized — all child routes render inside it
• Renders <Navigate /> when not authorized — redirects without rendering children
• It's a layout route — no path of its own, just wraps children

state={{ from: location }} on Navigate
----------------------------------------
• Passes current location to the login page
• LoginPage reads: location.state?.from?.pathname
• After login: navigate(from, { replace: true }) → back to intended page
• replace: true — replaces login in history so Back button doesn't return to login

isLoading guard
----------------
• Without it: auth check happens async → user is null for a split second → flashes to /login
• With it: show spinner while auth resolves → no flash

Outlet
-------
• Placeholder — renders whichever child route matches the current URL
• AppLayout has <Outlet /> → child pages render there
• ProtectedRoute has <Outlet /> → protected child routes render there
• No Outlet = child routes render nowhere

handle.breadcrumb
------------------
• Each route can have a handle object with a breadcrumb function
• useMatches() returns all matched routes from root to current
• Filter by handle.breadcrumb → build the crumb trail automatically
• Last crumb = current page (aria-current="page", not a link)
• breadcrumb(data) receives the route's loader data → dynamic labels like "Booking #42"

role-based guard — OR logic
-----------------------------
• requiredRoles.some(role => user.roles.includes(role))
• some() = OR — user needs at least ONE of the required roles
• Use every() if you need ALL roles (rare)

navigate(-1) vs navigate(from)
--------------------------------
• navigate(-1) — go back one step in history (like browser Back button)
• navigate(from, { replace: true }) — go to specific saved path after login
• replace: true — don't add to history stack, replace current entry

<Navigate> vs <NavLink> vs <Link>
-----------------------------------
• <Navigate to="/login"> — code redirects automatically on render, no click needed
  → user has no choice, they get sent somewhere (used in guards, auth checks)
• <Link to="/bookings"> — clickable link, user decides to click
  → renders a plain <a> tag, no active state
• <NavLink to="/bookings"> — same as Link but knows if it's the current page
  → className={({ isActive }) => isActive ? "text-blue-600" : ""}
  → use NavLink in sidebars/navbars to highlight the current page
  → use Link everywhere else

================================================================
*/
