// ============================================================
// Problem 01 — Inertia Page Architecture
// ============================================================

import { Link, usePage, router, Head } from "@inertiajs/react";
import { useEffect, useState } from "react";
import type { PageProps as BasePageProps } from "@inertiajs/core";
import type React from "react";

// ============================================================
// Types — SharedProps
// ============================================================

export interface SharedProps extends BasePageProps {
    auth: {
        user: {
            id:    number;
            name:  string;
            email: string;
            role:  "admin" | "school_admin" | "staff";
        } | null;
        permissions: string[];
    };
    flash: {
        success?: string;
        error?:   string;
        info?:    string;
    };
    ziggy: {
        location: string;
        url:      string;
        port:     number | null;
        routes:   Record<string, unknown>;
    };
}

// Merges SharedProps into every page's TypeScript type automatically
declare module "@inertiajs/core" {
    interface PageProps extends SharedProps {}
}

// ============================================================
// FlashMessages — auto-dismiss after 4s, re-triggers on navigation
// ============================================================

export function FlashMessages() {
    const { flash } = usePage<SharedProps>().props;
    const [visible, setVisible] = useState(true);

    // Re-runs every time Inertia delivers new page props (each navigation)
    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(timer);
    }, [flash]);

    if (!visible) return null;

    return (
        <div className="px-6 pt-4 space-y-2">
            {flash.success && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    <span aria-hidden="true">✓</span>
                    {flash.success}
                </div>
            )}
            {flash.error && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    <span aria-hidden="true">✕</span>
                    {flash.error}
                </div>
            )}
            {flash.info && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                    <span aria-hidden="true">ℹ</span>
                    {flash.info}
                </div>
            )}
        </div>
    );
}

// ============================================================
// MainLayout — persistent sidebar that doesn't remount on navigation
// ============================================================

interface MainLayoutProps {
    children: React.ReactNode;
    title?:   string;
}

export function MainLayout({ children }: MainLayoutProps) {
    const { auth, ziggy } = usePage<SharedProps>().props;
    const currentPath = ziggy.location;

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/bookings",  label: "Bookings",  icon: "📋" },
        { href: "/schools",   label: "Schools",   icon: "🏫" },
        { href: "/reports",   label: "Reports",   icon: "📈" },
    ];

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-xl font-bold text-blue-600">Tripz</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = currentPath.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-600 hover:bg-gray-50"
                                }`}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <span aria-hidden="true">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {auth.user && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium">{auth.user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{auth.user.role}</p>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="mt-2 text-xs text-gray-500 hover:text-red-600"
                        >
                            Sign out
                        </Link>
                    </div>
                )}
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <FlashMessages />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

// ============================================================
// BookingsPage — receives props directly from Laravel controller
// ============================================================

interface Booking {
    id:            number;
    school_name:   string;
    status:        "pending" | "confirmed" | "paid" | "cancelled";
    student_count: number;
    amount:        number;
}

interface BookingsPageProps extends SharedProps {
    bookings: {
        data:  Booking[];
        links: { first: string; last: string; prev: string | null; next: string | null };
        meta:  { current_page: number; last_page: number; per_page: number; total: number };
    };
    filters: {
        status?: string;
        search?: string;
    };
}

export default function BookingsPage({ bookings, filters }: BookingsPageProps) {
    const { auth } = usePage<SharedProps>().props;

    function handleStatusChange(status: string) {
        router.get(
            "/bookings",
            { ...filters, status, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    }

    function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
        router.get(
            "/bookings",
            { ...filters, search: e.target.value, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="Bookings" />

            <div>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">
                        Bookings
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({bookings.meta.total} total)
                        </span>
                    </h1>
                    {auth.permissions.includes("bookings.create") && (
                        <Link
                            href="/bookings/create"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                        >
                            New Booking
                        </Link>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <select
                        value={filters.status ?? "all"}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                        type="search"
                        defaultValue={filters.search ?? ""}
                        onChange={handleSearch}
                        placeholder="Search bookings…"
                        className="border rounded-lg px-3 py-2 text-sm flex-1"
                    />
                </div>

                {/* Table */}
                <table className="min-w-full">
                    <thead>
                        <tr>
                            {["School", "Status", "Students", "Amount", ""].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.data.map((booking) => (
                            <tr key={booking.id}>
                                <td className="px-4 py-3 text-sm">{booking.school_name}</td>
                                <td className="px-4 py-3 text-sm capitalize">{booking.status}</td>
                                <td className="px-4 py-3 text-sm">{booking.student_count}</td>
                                <td className="px-4 py-3 text-sm">
                                    {new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
                                        .format(booking.amount)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link href={`/bookings/${booking.id}`} className="text-blue-600 text-sm">
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-between mt-4 text-sm">
                    {bookings.links.prev
                        ? <Link href={bookings.links.prev} className="text-blue-600">← Previous</Link>
                        : <span />
                    }
                    <span>Page {bookings.meta.current_page} of {bookings.meta.last_page}</span>
                    {bookings.links.next
                        ? <Link href={bookings.links.next} className="text-blue-600">Next →</Link>
                        : <span />
                    }
                </div>
            </div>
        </>
    );
}

// Inertia checks BookingsPage.layout before each navigation.
// Same layout = NOT remounted → sidebar stays alive.
BookingsPage.layout = (page: React.ReactNode) => (
    <MainLayout>{page}</MainLayout>
);

/*
================================================================
TIPS
================================================================

HOW INERTIA WORKS
------------------
• No fetch(), no API routes, no JSON parsing
• Laravel controller returns Inertia::render("Page", [...props...])
• React receives those props directly as component props
• Feels like a normal React app but data comes from the server

SHARED PROPS — HandleInertiaRequests::share()
----------------------------------------------
• Runs on EVERY request (middleware)
• auth, flash, ziggy available on every page without passing manually
• usePage<SharedProps>().props — access shared props from any component
• declare module "@inertiajs/core" — merges SharedProps into TypeScript's PageProps type

PERSISTENT LAYOUT
------------------
• Without .layout: <MainLayout> inside render() → remounts on every navigation → sidebar resets
• With .layout static property: Inertia compares layout functions → same = NOT remounted
• Pattern: ComponentName.layout = (page) => <MainLayout>{page}</MainLayout>
• () not {} — must implicitly return JSX
• Every page needs .layout attached — but same function reference = sidebar never remounts
• To avoid repetition: export const withMainLayout = (page) => <MainLayout>{page}</MainLayout>
  then each page: BookingsPage.layout = withMainLayout

Link vs router.get
--------------------
• <Link href="/bookings"> — declarative SPA navigation
• router.get(url, params, options) — programmatic with extra control
• preserveState: true — React state of other components not reset
• preserveScroll: true — page does not jump to top

flash + useEffect([flash])
---------------------------
• flash comes from Laravel session: ->with("success", "...")
• Each Inertia navigation delivers new page props → flash changes → useEffect re-runs
• Resets the 4s timer on every new flash message

<Link method="post" as="button">
----------------------------------
• Sends a POST request via Inertia (not GET)
• as="button" renders a <button> element — semantically correct
• Used for logout, delete — any action that must be POST

================================================================
*/
