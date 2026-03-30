// ============================================================
// Problem 02 — Dynamic Import & Code Splitting Strategy
// ============================================================

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// ============================================================
// React.lazy — route-level splitting
// Each page is its own JS chunk — only loaded when route is visited
// ============================================================

const BookingsPage  = lazy(() => import("./pages/BookingsPage"));
const ReportsPage   = lazy(() => import("./pages/ReportsPage"));
const SettingsPage  = lazy(() => import("./pages/SettingsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));

// ============================================================
// Prefetch helper — starts the download early without rendering
// ============================================================

function prefetch(importFn: () => Promise<unknown>) {
    importFn(); // fire and forget — browser caches the result
}

// ============================================================
// AppRouter — lazy routes + prefetch on hover
// ============================================================

export function AppRouter() {
    return (
        <BrowserRouter>
            <nav>
                <a href="/bookings">Bookings</a>

                {/* Prefetch ReportsPage chunk on hover — ready before click */}
                <a
                    href="/reports"
                    onMouseEnter={() => prefetch(() => import("./pages/ReportsPage"))}
                >
                    Reports
                </a>

                <a href="/settings">Settings</a>
            </nav>

            <Suspense fallback={<PageSkeleton />}>
                <Routes>
                    <Route path="/"         element={<DashboardPage />} />
                    <Route path="/bookings" element={<BookingsPage />} />
                    <Route path="/reports"  element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

/*
================================================================
TIPS
================================================================

REACT.LAZY + SUSPENSE — ROUTE SPLITTING
-----------------------------------------
• React.lazy(() => import("...")) — each page becomes its own JS chunk
• chunk only downloads when the user visits that route for the first time
• Suspense boundary required above every lazy component — shows fallback during load
• without Suspense: React throws an error ("No Suspense boundary")
• one Suspense can wrap many lazy components — all share the same fallback
• after first visit the chunk is cached — instant on next visit

PREFETCH ON HOVER
-------------------
• without prefetch: user clicks → chunk starts downloading → small delay → page shows
• with prefetch:    user hovers → chunk starts downloading in background
•                  user clicks → chunk already ready → page shows instantly
• calling import() twice doesn't download twice — browser caches it automatically
• prefetch() helper is just for readability — same as writing import() directly inline
• rule: prefetch the next most likely page the user will visit

BUNDLE SPLITTING MENTAL MODEL
--------------------------------
• Initial load:          app.[hash].js  (React + router + shared code)
• Route-level splitting: bookings.[hash].js  ← loaded on /bookings visit
•                        reports.[hash].js   ← loaded on /reports visit
• Prefetch:              reports chunk starts downloading on nav hover

================================================================
*/
