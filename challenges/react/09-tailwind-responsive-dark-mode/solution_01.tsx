// ============================================================
// Problem 01 — Booking Dashboard UI
// ============================================================



// ============================================================
// tailwind.config.ts
//
// darkMode: "class"  ← toggled by adding .dark to <html>
// content: ["./src/**/*.{ts,tsx}"]
// theme.extend.colors.brand: { 50, 500, 600, 700 }
// theme.extend.fontFamily.sans: ["Inter", ...]
// ============================================================



// ============================================================
// components/StatCard.tsx
//
// Props: { title, value, trend?, icon }
//
// Outer div:
//   bg-white dark:bg-gray-800
//   rounded-xl shadow-sm border border-gray-100 dark:border-gray-700
//   p-4 sm:p-6
//   transition-colors duration-200
//
// trend display:
//   trendPositive → text-green-600 dark:text-green-400 + "↑"
//   trendNegative → text-red-600 dark:text-red-400 + "↓"
//
// Grid usage:
//   grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
// ============================================================



// ============================================================
// components/Badge.tsx
//
// BADGE_CLASSES: Record<BadgeVariant, string>
//   pending:   bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400
//   confirmed: bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400
//   paid:      bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400
//   cancelled: bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400
//
// <span role="status" aria-label={`Booking status: ${status}`} className="...capitalize">
//   {status}
// </span>
// ============================================================



// ============================================================
// components/FilterBar.tsx  ("use client")
//
// const [isExpanded, setIsExpanded] = useState(false)
//
// Mobile toggle button (sm:hidden):
//   aria-expanded={isExpanded}
//   chevron rotates 180deg when expanded: rotate-180
//
// Filter panel (id="filter-panel"):
//   mobile: flex-col hidden (show as flex when isExpanded)
//   sm+: always sm:flex sm:flex-row sm:items-center
//
// Inputs:
//   w-full sm:w-auto  ← full width mobile, auto on sm+
//   border dark:border-gray-600  bg-white dark:bg-gray-700
//   focus:ring-2 focus:ring-brand-500 focus:outline-none
// ============================================================



// ============================================================
// components/DataTable.tsx
//
// Wrapper: overflow-x-auto rounded-xl border  ← horizontal scroll on mobile
//
// <thead>: bg-gray-50 dark:bg-gray-900
//   <th>: text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap
//
// <tbody>: bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700
//   alternating rows: i % 2 !== 0 → bg-gray-50/50 dark:bg-gray-700/20
//   hover: hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-100
//
// Amount: Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
// ============================================================



// ============================================================
// components/Modal.tsx
//
// Props: { isOpen, onClose, title, children, size?: "sm"|"md"|"lg"|"xl" }
//
// useEffect [isOpen]: keydown Escape → onClose()
// useEffect [isOpen]: body overflow hidden/restore
// useEffect [isOpen]: dialogRef.current?.focus()
//
// createPortal(modal, document.body)
//
// Outer div (presentation): fixed inset-0 z-50 flex items-center justify-center
//   onClick={onClose}  ← backdrop click closes
//   absolute overlay: bg-black/50 dark:bg-black/70 backdrop-blur-sm
//
// Dialog panel (role="dialog" aria-modal aria-labelledby tabIndex={-1}):
//   relative z-10 w-full max-w-{size}
//   bg-white dark:bg-gray-800 rounded-2xl shadow-2xl
//   onClick e.stopPropagation()  ← prevent backdrop close on inner click
// ============================================================



// ============================================================
// hooks/useDarkMode.ts
//
// useState lazy init:
//   1. localStorage.getItem("theme") === "dark"
//   2. window.matchMedia("(prefers-color-scheme: dark)").matches
//
// useEffect [isDark]:
//   isDark → document.documentElement.classList.add("dark") + localStorage "dark"
//   else   → classList.remove("dark") + localStorage "light"
//
// return { isDark, toggle: () => setIsDark(d => !d) }
// ============================================================
