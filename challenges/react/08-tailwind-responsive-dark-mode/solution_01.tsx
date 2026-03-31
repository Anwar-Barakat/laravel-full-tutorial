// ============================================================
// Problem 01 — Booking Dashboard UI
// ============================================================

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ============================================================
// Tailwind v4 — CSS config (replaces tailwind.config.ts)
//
// In your main CSS file (e.g. src/index.css):
//
// @import "tailwindcss";
//
// /* Class-based dark mode — toggle .dark on <html> */
// @custom-variant dark (&:where(.dark, .dark *));
//
// /* Custom design tokens */
// @theme {
//   --color-brand-50:  #eff6ff;
//   --color-brand-500: #3b82f6;
//   --color-brand-600: #2563eb;
//   --color-brand-700: #1d4ed8;
//   --font-sans: "Inter", system-ui, sans-serif;
// }
//
// No tailwind.config.ts needed in v4.
// No content: [...] needed — v4 auto-detects files.
// ============================================================

// ============================================================
// Shared types
// ============================================================

interface Booking {
    id:           number;
    school_name:  string;
    trip_type:    "domestic" | "international";
    student_count: number;
    status:       "pending" | "confirmed" | "paid" | "cancelled";
    amount:       number;
}

type BadgeVariant = "pending" | "confirmed" | "paid" | "cancelled";

// ============================================================
// components/StatCard.tsx
// ============================================================

interface StatCardProps {
    title: string;
    value: string;
    trend?: number; // positive = up, negative = down
    icon:  string;
}

export function StatCard({ title, value, trend, icon }: StatCardProps) {
    const trendPositive = (trend ?? 0) >= 0;

    return (
        <div className="
            bg-white dark:bg-gray-800
            rounded-xl shadow-sm border border-gray-100 dark:border-gray-700
            p-4 sm:p-6
            flex items-start justify-between
            transition-colors duration-200
        ">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {title}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                    {value}
                </p>
                {trend !== undefined && (
                    <p className={`mt-1 text-sm font-medium ${
                        trendPositive
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                    }`}>
                        {trendPositive ? "↑" : "↓"} {Math.abs(trend)}% vs last month
                    </p>
                )}
            </div>
            <span className="text-2xl" role="img" aria-hidden="true">{icon}</span>
        </div>
    );
}

// Responsive 1 → 2 → 4 column grid
function StatsRow() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value="AED 125K" trend={12}  icon="💰" />
            <StatCard title="Bookings"      value="348"      trend={8}   icon="📋" />
            <StatCard title="Students"      value="4,210"    trend={-3}  icon="🎓" />
            <StatCard title="Schools"       value="62"       trend={5}   icon="🏫" />
        </div>
    );
}

// ============================================================
// components/Badge.tsx
// ============================================================

const BADGE_CLASSES: Record<BadgeVariant, string> = {
    pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    confirmed: "bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400",
    paid:      "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400",
    cancelled: "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400",
};

export function Badge({ status }: { status: BadgeVariant }) {
    return (
        <span
            role="status"
            aria-label={`Booking status: ${status}`}
            className={`
                inline-flex items-center px-2.5 py-0.5
                rounded-full text-xs font-medium capitalize
                ${BADGE_CLASSES[status]}
            `}
        >
            {status}
        </span>
    );
}

// ============================================================
// components/FilterBar.tsx
// ============================================================

interface FilterBarProps {
    onFilterChange: (filters: Record<string, string>) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            {/* Mobile: toggle button — hidden on sm+ */}
            <button
                className="flex items-center justify-between w-full sm:hidden"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                aria-controls="filter-panel"
            >
                <span className="font-medium text-gray-700 dark:text-gray-300">Filters</span>
                <svg
                    className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Filter controls:
                mobile → vertical stack, hidden unless expanded
                sm+    → always visible horizontal row */}
            <div
                id="filter-panel"
                className={`
                    flex-col sm:flex sm:flex-row sm:items-center gap-3
                    ${isExpanded ? "flex mt-3" : "hidden sm:flex"}
                `}
            >
                <select className="
                    w-full sm:w-auto
                    border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-700
                    text-gray-900 dark:text-white
                    rounded-lg px-3 py-2 text-sm
                    focus:ring-2 focus:ring-brand-500 focus:outline-none
                ">
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                </select>

                <input
                    type="search"
                    placeholder="Search bookings…"
                    className="
                        w-full sm:w-64
                        border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        rounded-lg px-3 py-2 text-sm
                        focus:ring-2 focus:ring-brand-500 focus:outline-none
                    "
                />

                <button className="
                    w-full sm:w-auto sm:ml-auto
                    px-4 py-2 rounded-lg text-sm font-medium
                    bg-brand-600 hover:bg-brand-700
                    text-white
                    transition-colors duration-150
                    focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                ">
                    New Booking
                </button>
            </div>
        </div>
    );
}

// ============================================================
// components/DataTable.tsx
// ============================================================

interface DataTableProps {
    bookings: Booking[];
    onEdit:   (id: number) => void;
    onDelete: (id: number) => void;
}

export function DataTable({ bookings, onEdit, onDelete }: DataTableProps) {
    return (
        // overflow-x-auto: table scrolls horizontally on mobile instead of overflowing
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        {["School", "Type", "Students", "Status", "Amount", ""].map((h) => (
                            <th
                                key={h}
                                scope="col"
                                className="
                                    px-4 py-3 text-left text-xs font-semibold
                                    text-gray-500 dark:text-gray-400
                                    uppercase tracking-wider whitespace-nowrap
                                "
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {bookings.map((booking, i) => (
                        <tr
                            key={booking.id}
                            className={`
                                hover:bg-gray-50 dark:hover:bg-gray-700/50
                                transition-colors duration-100
                                ${i % 2 !== 0 ? "bg-gray-50/50 dark:bg-gray-700/20" : ""}
                            `}
                        >
                            <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                    {booking.school_name}
                                </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {booking.trip_type}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {booking.student_count}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <Badge status={booking.status as BadgeVariant} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
                                    .format(booking.amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(booking.id)}
                                        aria-label={`Edit booking for ${booking.school_name}`}
                                        className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(booking.id)}
                                        aria-label={`Delete booking for ${booking.school_name}`}
                                        className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============================================================
// components/Modal.tsx
// ============================================================

interface ModalProps {
    isOpen:   boolean;
    onClose:  () => void;
    title:    string;
    children: React.ReactNode;
    size?:    "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
};

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    // Lock body scroll while open
    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        else        document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Focus the dialog when opened
    useEffect(() => {
        if (isOpen) dialogRef.current?.focus();
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        // Backdrop — click outside to close
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="presentation"
            onClick={onClose}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />

            {/* Dialog panel — stopPropagation prevents backdrop close on inner click */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={`
                    relative z-10 w-full ${SIZE_CLASSES[size]}
                    bg-white dark:bg-gray-800
                    rounded-2xl shadow-2xl focus:outline-none
                    max-h-[90vh] overflow-y-auto
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="
                            p-1 rounded-lg text-gray-400 hover:text-gray-600
                            dark:text-gray-500 dark:hover:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700
                            transition-colors duration-150
                        "
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">{children}</div>
            </div>
        </div>,
        document.body,
    );
}

// ============================================================
// hooks/useDarkMode.ts
// ============================================================

export function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        // 1. Check localStorage first
        const stored = localStorage.getItem("theme");
        if (stored) return stored === "dark";
        // 2. Fall back to system preference
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDark]);

    return { isDark, toggle: () => setIsDark((d) => !d) };
}

// Usage in layout header:
// const { isDark, toggle } = useDarkMode()
// <button onClick={toggle}>{isDark ? "☀️ Light" : "🌙 Dark"}</button>

/*
================================================================
TIPS
================================================================

TAILWIND V4 — NO MORE TAILWIND.CONFIG.TS
------------------------------------------
• @import "tailwindcss" replaces @tailwind base/components/utilities
• @custom-variant dark (&:where(.dark, .dark *)) — class-based dark mode
• @theme { --color-brand-500: #3b82f6 } — generates bg-brand-500, text-brand-500, etc.
• content: [...] no longer needed — v4 auto-detects template files
• darkMode: "class" config key is gone — use @custom-variant instead

DARK MODE — CLASS STRATEGY
-----------------------------
• add .dark to <html> to enable dark mode
• dark: prefix applies styles only when .dark is on an ancestor
• useDarkMode() reads localStorage first, then falls back to system preference
• document.documentElement.classList.add("dark") — toggle programmatically
• localStorage.setItem("theme", "dark") — persists across page refresh

MOBILE-FIRST BREAKPOINTS
---------------------------
• base (no prefix) = mobile styles
• sm: (640px+), md: (768px+), lg: (1024px+), xl: (1280px+)
• grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 — 1 col on mobile, 4 on desktop
• w-full sm:w-auto — full width on mobile, auto on desktop
• hidden sm:flex — hidden on mobile, visible on sm+
• p-4 sm:p-6 — less padding on mobile, more on desktop

BADGE — RECORD LOOKUP PATTERN
--------------------------------
• BADGE_CLASSES: Record<BadgeVariant, string> — map status → class string
• defined outside component — stable reference, not recreated on render
• dark:bg-green-900/30 — /30 is opacity modifier (30% opacity)
• role="status" + aria-label — screen reader announces badge meaning

MODAL — KEY PATTERNS
----------------------
• createPortal(modal, document.body) — renders outside parent stacking context
• role="dialog" aria-modal="true" aria-labelledby="modal-title" — screen reader semantics
• e.stopPropagation() on dialog panel — prevents backdrop onClick from firing
• tabIndex={-1} + focus() on open — keyboard focus jumps into dialog
• document.body.style.overflow = "hidden" — prevents background scroll while open
• Escape key handler cleaned up on unmount — no memory leaks

DATATABLE — MOBILE HORIZONTAL SCROLL
---------------------------------------
• overflow-x-auto on wrapper — table scrolls sideways instead of breaking layout
• whitespace-nowrap on cells — prevents text from wrapping and shrinking columns
• min-w-full on table — ensures table fills the scrollable area
• alternating rows: i % 2 !== 0 → bg-gray-50/50 dark:bg-gray-700/20

FILTERBAR — MOBILE COLLAPSE PATTERN
--------------------------------------
• sm:hidden on toggle button — only visible on mobile
• hidden sm:flex on filter panel — hidden on mobile, visible on sm+
• ${isExpanded ? "flex mt-3" : "hidden sm:flex"} — conditional show on mobile
• aria-expanded + aria-controls — accessible toggle pattern

================================================================
*/
