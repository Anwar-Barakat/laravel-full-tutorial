// ============================================================
// Problem 02 — Lazy Routes & Navigation UX
// ============================================================

import {
    useNavigation,
    useOutlet,
    useLocation,
    useNavigate,
    useRouteError,
    isRouteErrorResponse,
    NavLink,
    lazy,
    Suspense,
} from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";

// ============================================================
// useNavigationProgress — tracks loading state for progress bar
// ============================================================

export function useNavigationProgress() {
    const navigation = useNavigation();
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (navigation.state === "loading") {
            setProgress(10);
            // Increment to 90% while waiting — stalls there until navigation completes
            intervalRef.current = window.setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 10 : prev));
            }, 200);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setProgress(100);
            // Brief 100% flash, then hide
            const timeout = setTimeout(() => setProgress(0), 300);
            return () => clearTimeout(timeout);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [navigation.state]);

    return { progress, isNavigating: navigation.state === "loading" };
}

// ============================================================
// NavigationProgressBar — thin blue bar at top of page
// ============================================================

export function NavigationProgressBar() {
    const { progress } = useNavigationProgress();

    return (
        <div
            style={{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0 }}
            className="fixed top-0 left-0 h-1 bg-blue-500 transition-all duration-200 z-50"
        />
    );
}

// ============================================================
// AnimatedOutlet — fade transition between route changes
// ============================================================

export function AnimatedOutlet() {
    const location = useLocation();
    const outlet = useOutlet();
    const [displayLocation, setDisplayLocation] = useState(location);
    const [displayOutlet, setDisplayOutlet] = useState(outlet);
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => {
        if (location !== displayLocation) {
            setTransitioning(true); // fade out current page
            const timeout = setTimeout(() => {
                setDisplayLocation(location); // swap to new page
                setDisplayOutlet(outlet);
                setTransitioning(false); // fade in new page
            }, 150);
            return () => clearTimeout(timeout);
        }
    }, [location, outlet, displayLocation]);

    return (
        <div
            className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}
        >
            {displayOutlet}
        </div>
    );
}

// ============================================================
// NavLinkWithPrefetch — prefetches page chunk on hover/focus
// ============================================================

interface NavLinkWithPrefetchProps {
    to: string;
    children: ReactNode;
    pageName: string; // e.g. "BookingsPage" — used to trigger the import
    [key: string]: unknown;
}

export function NavLinkWithPrefetch({
    to,
    children,
    pageName,
    ...rest
}: NavLinkWithPrefetchProps) {
    function prefetch() {
        // Triggers the dynamic import — React's lazy() caches the result
        // so by the time user clicks, the chunk is already loaded
        import(`../pages/${pageName}`).catch(() => {
            /* ignore prefetch errors */
        });
    }

    return (
        <NavLink
            to={to}
            onMouseEnter={prefetch} // hover intent
            onFocus={prefetch} // keyboard navigation intent
            {...rest}
        >
            {children}
        </NavLink>
    );
}

// ============================================================
// RouteErrorBoundary — catches loader/action errors + chunk errors
// ============================================================

export function RouteErrorBoundary() {
    const error = useRouteError();
    const navigate = useNavigate();

    // Thrown from loader/action via Response or json() helper
    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            return (
                <div className="min-h-screen flex items-center justify-center text-center">
                    <div>
                        <p className="text-6xl mb-4">404</p>
                        <h1 className="text-2xl font-bold mb-2">
                            Page Not Found
                        </h1>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 border rounded-lg text-sm"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center text-center">
                <div>
                    <p className="text-4xl mb-4">{error.status}</p>
                    <h1 className="text-xl font-bold mb-2">
                        Something Went Wrong
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {error.data?.message ?? error.statusText}
                    </p>
                </div>
            </div>
        );
    }

    // Stale deployment — chunk URL no longer exists after a new deploy
    if (
        error instanceof Error &&
        error.message.includes("Failed to fetch dynamically imported module")
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center">
                <div>
                    <p className="text-5xl mb-4">🔄</p>
                    <h2 className="text-xl font-bold mb-2">App Updated</h2>
                    <p className="text-gray-500 text-sm mb-4">
                        A new version is available.
                    </p>
                    <button
                        onClick={() => navigate(0)} // navigate(0) = full page reload
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                    >
                        Reload to update
                    </button>
                </div>
            </div>
        );
    }

    // Unknown JS error
    return (
        <div className="min-h-screen flex items-center justify-center text-center">
            <div>
                <p className="text-5xl mb-4">⚠️</p>
                <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-500 text-sm">
                    {error instanceof Error ? error.message : "Unknown error"}
                </p>
            </div>
        </div>
    );
}

// ============================================================
// Lazy route config example
// ============================================================

// const DashboardPage = lazy(() => import("../pages/DashboardPage"))
// const BookingsPage  = lazy(() => import("../pages/BookingsPage"))
// const AdminPage     = lazy(() => import("../pages/AdminPage"))
//
// In route config:
// {
//   path: "dashboard",
//   element: (
//     <Suspense fallback={<PageSkeleton />}>
//       <DashboardPage />
//     </Suspense>
//   ),
//   errorElement: <RouteErrorBoundary />,
// }
//
// errorElement vs ErrorBoundary component:
//   errorElement — catches loader/action throws AND render errors in that subtree
//   ErrorBoundary — only catches render errors

/*
================================================================
TIPS
================================================================

useNavigation() — global navigation state
------------------------------------------
• navigation.state: "idle" | "loading" | "submitting"
• "loading"    — a loader is running (between click and page render)
• "submitting" — a form action is running
• Use for progress bars, disabling buttons, skeleton screens

Progress bar — stall at 90% trick
-----------------------------------
• Real load time is unknown → can't go to 100% until done
• Increment to 90%, hold there → jumps to 100% when navigation completes
• Prevents the bar from finishing before the page is ready

AnimatedOutlet — why keep displayOutlet
-----------------------------------------
• During fade-out: new outlet is already available but we show the OLD one
• After 150ms: swap to new outlet and fade in
• Without keeping displayOutlet: page disappears instantly, no fade-out

isRouteErrorResponse(error)
-----------------------------
• Returns true when error was thrown from a loader/action as a Response
• Gives you: error.status (404, 500), error.data, error.statusText
• For regular JS errors: error instanceof Error

ChunkLoadError — navigate(0)
------------------------------
• Happens when user has old app open and a new deployment removes old chunk URLs
• navigate(0) = full page reload → browser fetches fresh HTML + new chunk URLs
• Cannot use navigate("/") — that's still SPA navigation with old chunks

lazy() + Suspense
------------------
• lazy(() => import("../pages/Page")) — loads JS chunk only when route is first visited
• Suspense fallback shows while chunk loads — use a skeleton, not a spinner
• errorElement catches the ChunkLoadError if the chunk fails to load

================================================================
*/
