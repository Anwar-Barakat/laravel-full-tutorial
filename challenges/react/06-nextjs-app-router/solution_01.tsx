// ============================================================
// Problem 01 — Booking Pages with App Router
// ============================================================

// ============================================================
// app/bookings/layout.tsx  (Server Component)
//
// flex h-screen layout: <aside> sidebar + <main> content
// sidebar links: All Bookings, ?status=pending, ?status=paid
// children rendered inside <main>
// ============================================================

export default function BookingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen">
            <aside className="w-64 bg-gray-50 border-r p-4">
                <nav>
                    <h2 className="font-semibold mb-4">Bookings</h2>
                    <ul className="space-y-2">
                        <li><a href="/bookings">All Bookings</a></li>
                        <li><a href="/bookings?status=pending">Pending</a></li>
                        <li><a href="/bookings?status=paid">Paid</a></li>
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
    );
}

// ============================================================
// app/bookings/page.tsx  (Server Component — NO "use client")
//
// PageProps: { searchParams: { status?, page?, search? } }
//
// generateMetadata({ searchParams }):
//   title: `Bookings — ${status}` (capitalise first letter)
//
// default export async function BookingsPage({ searchParams }):
//   const status = searchParams.status ?? "all"
//   const page   = Number(searchParams.page ?? "1")
//   const search = searchParams.search ?? ""
//   const bookings = await getBookings({ status, page, search })
//   render: <BookingFilters> (client) + <Suspense> <BookingTable> (server)
// ============================================================

interface BookingsPageProps {
    searchParams: { status?: string; page?: string; search?: string };
}

export async function generateMetadata({ searchParams }: BookingsPageProps) {
    const status = searchParams.status ?? "all";
    return {
        title: `Bookings — ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: `View ${status} bookings`,
    };
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
    const status  = searchParams.status ?? "all";
    const page    = Number(searchParams.page ?? "1");
    const search  = searchParams.search ?? "";

    const bookings = await getBookings({ status, page, search });

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Bookings</h1>
            <BookingFilters currentStatus={status} currentSearch={search} />
            <Suspense fallback={<BookingTableSkeleton />}>
                <BookingTable bookings={bookings} />
            </Suspense>
        </div>
    );
}

// ============================================================
// app/bookings/loading.tsx  (automatic Suspense for whole segment)
//
// animate-pulse skeleton: title div + filter bar div + 5 row divs
// ============================================================

export default function BookingsLoading() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
        </div>
    );
}

// ============================================================
// app/bookings/error.tsx  ("use client" — error boundaries need it)
//
// Props: { error: Error & { digest?: string }; reset: () => void }
// render: error.message + <button onClick={reset}>Try again</button>
// ============================================================

"use client";

export default function BookingsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
                Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Try again
            </button>
        </div>
    );
}

// ============================================================
// app/bookings/[id]/page.tsx  (dynamic route — Server Component)
//
// PageProps: { params: { id: string }; searchParams: { tab?: string } }
//
// generateMetadata({ params }):
//   booking = await getBookingById(Number(params.id))
//   title: `Booking #${booking.id} — ${booking.school_name}`
//
// default export async:
//   booking = await getBookingById(Number(params.id))
//   tab = searchParams.tab ?? "details"
//   render: <BookingDetailTabs booking={booking} activeTab={tab} />
// ============================================================

interface BookingDetailPageProps {
    params: { id: string };
    searchParams: { tab?: string };
}

export async function generateMetadata({ params }: BookingDetailPageProps) {
    const booking = await getBookingById(Number(params.id));
    return {
        title: `Booking #${booking.id} — ${booking.school_name}`,
    };
}

export default async function BookingDetailPage({
    params,
    searchParams,
}: BookingDetailPageProps) {
    const booking = await getBookingById(Number(params.id));
    const tab     = searchParams.tab ?? "details";

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Booking #{booking.id}</h1>
            <p className="text-gray-600 mb-6">{booking.school_name}</p>
            <BookingDetailTabs booking={booking} activeTab={tab} />
        </div>
    );
}

// ============================================================
// components/BookingFilters.tsx  ("use client")
//
// Props: { currentStatus: string; currentSearch: string }
//
// const router       = useRouter()
// const pathname     = usePathname()
// const searchParams = useSearchParams()
//
// updateFilter(key, value):
//   params = new URLSearchParams(searchParams.toString())
//   set/delete key; delete "page" (reset pagination)
//   router.push(`${pathname}?${params.toString()}`)
//
// render: <select> for status + <input type="search"> for search
// ============================================================

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface BookingFiltersProps {
    currentStatus: string;
    currentSearch: string;
}

export function BookingFilters({
    currentStatus,
    currentSearch,
}: BookingFiltersProps) {
    const router       = useRouter();
    const pathname     = usePathname();
    const searchParams = useSearchParams();

    const updateFilter = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) params.set(key, value);
            else params.delete(key);
            params.delete("page");
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    return (
        <div className="flex gap-4 mb-6">
            <select
                value={currentStatus}
                onChange={(e) => updateFilter("status", e.target.value)}
                className="border rounded px-3 py-2"
            >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
            </select>
            <input
                type="search"
                defaultValue={currentSearch}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search bookings..."
                className="border rounded px-3 py-2 flex-1"
            />
        </div>
    );
}

/*
================================================================
TIPS
================================================================

SERVER COMPONENTS BY DEFAULT
------------------------------
• In Next.js App Router, every component is a Server Component by default
• No "use client" = runs on the server, zero JS sent to browser
• Can be async — await data directly in the component body
• Cannot use useState, useEffect, onClick, or any browser APIs
• Add "use client" only when you need interactivity or browser APIs

LAYOUT.TSX — SHARED SHELL
---------------------------
• wraps ALL routes under /bookings/* automatically
• children = the current page being rendered
• no "use client" needed — just a static shell
• re-renders only when navigating between different layouts
• use for sidebars, headers, navigation that stays across pages

PAGE.TSX — SEARCHPARAMS ON THE SERVER
----------------------------------------
• searchParams prop — read query params server-side, no useSearchParams()
• async page = await data directly, no useEffect or fetch boilerplate
• URL: /bookings?status=paid&page=2 → searchParams = { status: "paid", page: "2" }
• always string — Number(searchParams.page ?? "1") to convert

LOADING.TSX — AUTOMATIC SUSPENSE
-----------------------------------
• Next.js wraps the page segment in Suspense automatically
• shown while the async page.tsx is fetching data
• animate-pulse — Tailwind class for skeleton shimmer effect
• Array.from({ length: 5 }).map((_, i) => ...) — repeat N skeleton rows

ERROR.TSX — MUST BE "USE CLIENT"
-----------------------------------
• error boundaries are class-based under the hood — need client context
• receives error (Error object) and reset (retry function)
• error.digest — Next.js hash for matching browser error to server log
• reset() — re-renders the page segment, triggers data re-fetch

DYNAMIC ROUTES — [ID]/PAGE.TSX
---------------------------------
• folder name [id] = dynamic segment — matches any value
• params.id — the actual value from the URL (/bookings/42 → params.id = "42")
• always a string — Number(params.id) to convert
• generateMetadata can be async — fetch data to build dynamic title

USEUPDATEFILTER — URL-BASED STATE
------------------------------------
• URLSearchParams — browser API to read/write query strings
• params.set(key, value) — add or update a param
• params.delete(key) — remove a param
• params.delete("page") — reset pagination on every filter change
• router.push() — navigate with new URL, triggers server re-render

URL AS STATE — WHY NOT USESTATE FOR FILTERS
---------------------------------------------
• useState filters: lost on refresh, URL never changes, not shareable
• URL filters: survive refresh, shareable link, server reads searchParams directly
• useRouter()       — navigate programmatically (like clicking a link from code)
• usePathname()     — current path without query string ("/bookings")
• useSearchParams() — current query string as readable object
• new URLSearchParams(searchParams.toString()) — mutable COPY to modify safely
• these three hooks are CLIENT ONLY — that's why BookingFilters needs "use client"

  useRouter() common methods:
    router.push("/path")        — navigate, adds to browser history
    router.replace("/path")     — navigate, replaces current history entry
    router.back()               — go back (like browser back button)
    router.forward()            — go forward
    router.refresh()            — re-fetch current page data on server
    router.prefetch("/path")    — preload a page in the background

  usePathname() common uses:
    pathname                    — "/bookings" (no query string)
    pathname.startsWith("/bookings") — check active route for nav highlighting
    `${pathname}?${params}`     — rebuild full URL with updated params

  useSearchParams() common methods:
    searchParams.get("status")       — get single value → "paid" or null
    searchParams.getAll("tag")       — get multiple values → ["a", "b"]
    searchParams.has("status")       — check if param exists → true/false
    searchParams.toString()          — serialize to string → "status=paid&page=2"
    new URLSearchParams(s.toString())— create mutable copy to modify

WHICH FILTER APPROACH TO USE
------------------------------
• URL params (router.push)   — server-rendered lists, search pages, SEO-friendly
• useState + .filter()       — small datasets already loaded in memory
• TanStack Query             — dashboards, real-time data, client fetching
• Inertia router.get()       — Laravel + Inertia projects
• rule: if the server needs to know about the filter → use URL params

SERVER VS CLIENT — DECISION RULE
-----------------------------------
• Server: fetches data, static UI, no interactivity → no "use client"
• Client: useState, useEffect, onClick, useRouter → needs "use client"
• error.tsx always client — reset() is an event handler
• BookingFilters always client — useRouter, onChange handlers

================================================================
*/
