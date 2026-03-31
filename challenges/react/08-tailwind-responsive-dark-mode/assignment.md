# Tailwind CSS Mastery

Build responsive, dark-mode-ready components with Tailwind: mobile-first design, custom variants, and reusable UI patterns.

| Topic              | Details                                                         |
|--------------------|-----------------------------------------------------------------|
| Component Patterns | Card, modal, dropdown with Tailwind                             |
| Responsive         | Mobile-first breakpoints                                        |
| Dark Mode          | class strategy, system pref                                     |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Dashboard UI (Medium)

### Scenario

Build a complete responsive booking dashboard with Tailwind: stat cards, data table, filter bar, and modal — all with dark mode support and mobile-first responsive design.

### Requirements

1. `StatCard` — responsive grid, dark mode colors
2. `FilterBar` — collapses to vertical on mobile
3. `DataTable` — horizontal scroll on mobile, alternating rows
4. `Modal` — overlay, centered, close on backdrop click, escape key
5. `Badge` — reusable status badge with variants
6. Dark mode: use `dark:` prefix, toggle with class on `html`
7. All components mobile-first: base → sm → md → lg

### Expected Code

```css
/* src/index.css — Tailwind v4 (no tailwind.config.ts needed) */
@import "tailwindcss";

/* Class-based dark mode — toggle .dark on <html> */
@custom-variant dark (&:where(.dark, .dark *));

/* Custom design tokens — generates utility classes automatically */
@theme {
  --color-brand-50:  #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

```tsx
// components/StatCard.tsx
interface StatCardProps {
  title: string
  value: string
  trend?: number       // positive = up, negative = down
  icon:  string
}

export function StatCard({ title, value, trend, icon }: StatCardProps) {
  const trendPositive = (trend ?? 0) >= 0

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
  )
}

// Usage — responsive 1 → 2 → 4 column grid
function StatsRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Revenue"  value="AED 125K" trend={12}  icon="💰" />
      <StatCard title="Bookings"       value="348"      trend={8}   icon="📋" />
      <StatCard title="Students"       value="4,210"    trend={-3}  icon="🎓" />
      <StatCard title="Schools"        value="62"       trend={5}   icon="🏫" />
    </div>
  )
}
```

```tsx
// components/Badge.tsx
type BadgeVariant = "pending" | "confirmed" | "paid" | "cancelled"

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400",
  paid:      "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400",
  cancelled: "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400",
}

interface BadgeProps {
  status: BadgeVariant
}

export function Badge({ status }: BadgeProps) {
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
  )
}
```

```tsx
// components/FilterBar.tsx
"use client"
import { useState } from "react"

interface FilterBarProps {
  onFilterChange: (filters: Record<string, string>) => void
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Mobile: toggle button to expand filters */}
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
          mobile → vertical stack (hidden unless expanded)
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
  )
}
```

```tsx
// components/DataTable.tsx
interface DataTableProps {
  bookings: Booking[]
  onEdit:   (id: number) => void
  onDelete: (id: number) => void
}

export function DataTable({ bookings, onEdit, onDelete }: DataTableProps) {
  return (
    // overflow-x-auto: table scrolls horizontally on small screens instead of overflowing
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
                  uppercase tracking-wider
                  whitespace-nowrap
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
              // Alternating row color — even/odd via array index
              className={`
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                transition-colors duration-100
                ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-700/20"}
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
  )
}
```

```tsx
// components/Modal.tsx
"use client"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface ModalProps {
  isOpen:    boolean
  onClose:   () => void
  title:     string
  children:  React.ReactNode
  size?:     "sm" | "md" | "lg" | "xl"
}

const SIZE_CLASSES = {
  sm:  "max-w-sm",
  md:  "max-w-md",
  lg:  "max-w-lg",
  xl:  "max-w-2xl",
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else        document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  // Focus trap — focus the dialog when opened
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    // Backdrop — click outside to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}         // ← close on backdrop click
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />

      {/* Dialog panel — stop propagation so click inside doesn't close */}
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
          rounded-2xl shadow-2xl
          focus:outline-none
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
    document.body
  )
}
```

```tsx
// hooks/useDarkMode.ts — toggle + persist + system preference
import { useState, useEffect } from "react"

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // 1. Check localStorage first
    const stored = localStorage.getItem("theme")
    if (stored) return stored === "dark"
    // 2. Fall back to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  return { isDark, toggle: () => setIsDark((d) => !d) }
}

// Usage in layout header:
// const { isDark, toggle } = useDarkMode()
// <button onClick={toggle}>{isDark ? "☀️ Light" : "🌙 Dark"}</button>
```

### Tailwind Dark Mode Cheatsheet

| Pattern | Class |
|---------|-------|
| Background | `bg-white dark:bg-gray-800` |
| Text primary | `text-gray-900 dark:text-white` |
| Text muted | `text-gray-500 dark:text-gray-400` |
| Border | `border-gray-200 dark:border-gray-700` |
| Input | `bg-white dark:bg-gray-700 text-gray-900 dark:text-white` |
| Badge (low contrast) | `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400` |
| Hover row | `hover:bg-gray-50 dark:hover:bg-gray-700/50` |

### What We're Evaluating

- `darkMode: "class"` in `tailwind.config.ts` — toggle via `document.documentElement.classList`
- Mobile-first: base styles for mobile, `sm:` / `md:` / `lg:` override upward
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — responsive grid without media query JS
- `overflow-x-auto` on table wrapper — horizontal scroll on mobile, no overflow
- `createPortal(modal, document.body)` — modal rendered outside parent stacking context
- `aria-modal="true"` + `role="dialog"` + `aria-labelledby` — screen reader modal semantics
- `e.stopPropagation()` on dialog panel — prevents backdrop close from firing on inner clicks
- `dark:bg-green-900/30` — opacity modifier (bg-opacity shorthand in v3)

---

## Problem 02 — Animated Components & Transitions (Hard)

### Scenario

Add micro-interactions and animations: toast notifications with enter/exit, dropdown with smooth open/close, and skeleton loading transitions.

### Requirements

1. Toast component with slide-in/slide-out animation
2. Dropdown with scale + opacity transition
3. Skeleton that fades out when content loads
4. Use CSS transitions via Tailwind (`transition-all duration-200`)
5. AnimatePresence pattern for exit animations
6. Staggered animation for list items

### Expected Code

```tsx
// components/Toast.tsx
// Slide in from right, auto-dismiss after duration
type ToastVariant = "success" | "error" | "warning" | "info"

const TOAST_CLASSES: Record<ToastVariant, string> = {
  success: "bg-green-600 dark:bg-green-700",
  error:   "bg-red-600   dark:bg-red-700",
  warning: "bg-amber-500 dark:bg-amber-600",
  info:    "bg-blue-600  dark:bg-blue-700",
}

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: "✓", error: "✕", warning: "⚠", info: "ℹ",
}

interface ToastProps {
  message:    string
  variant:    ToastVariant
  isVisible:  boolean      // controlled externally
  onDismiss:  () => void
  duration?:  number       // ms before auto-dismiss
}

export function Toast({ message, variant, isVisible, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [isVisible, duration, onDismiss])

  return (
    // translate-x-full = off-screen right; translate-x-0 = in view
    // pointer-events-none when hidden so it doesn't block clicks
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-4 right-4 z-50
        flex items-center gap-3
        px-4 py-3 rounded-xl shadow-lg
        text-white text-sm font-medium
        max-w-sm w-full

        transform transition-all duration-300 ease-out
        ${isVisible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
        }
        ${TOAST_CLASSES[variant]}
      `}
    >
      <span className="text-lg flex-shrink-0" aria-hidden="true">
        {TOAST_ICONS[variant]}
      </span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 opacity-75 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  )
}
```

```tsx
// hooks/useToast.ts — manages toast queue
interface ToastItem {
  id:      string
  message: string
  variant: ToastVariant
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

// Toast container — renders all active toasts stacked
export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-label="Notifications">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          variant={t.variant}
          isVisible={true}
          onDismiss={() => dismiss(t.id)}
        />
      ))}
    </div>
  )
}
```

```tsx
// components/Dropdown.tsx
// Scale + opacity transition, closes on outside click
interface DropdownProps {
  trigger:  React.ReactNode
  children: React.ReactNode
  align?:   "left" | "right"
}

export function Dropdown({ trigger, children, align = "right" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>

      {/* Dropdown panel — scale + opacity transition */}
      <div
        role="menu"
        className={`
          absolute z-20 mt-1 w-48
          ${align === "right" ? "right-0" : "left-0"}
          bg-white dark:bg-gray-800
          rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10
          py-1 overflow-hidden

          transform transition-all duration-200 ease-out origin-top-right
          ${isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
          }
        `}
      >
        {children}
      </div>
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "danger"
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`
        w-full text-left px-4 py-2 text-sm
        transition-colors duration-100
        ${variant === "danger"
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }
      `}
    >
      {children}
    </button>
  )
}
```

```tsx
// components/Skeleton.tsx + fade transition
interface SkeletonProps {
  className?: string
}

// Base skeleton block — use as building block
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  )
}

// BookingCard skeleton — matches real card layout
export function BookingCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

// Fade transition: skeleton out → content in
interface ContentFadeProps {
  isLoading: boolean
  skeleton:  React.ReactNode
  children:  React.ReactNode
}

export function ContentFade({ isLoading, skeleton, children }: ContentFadeProps) {
  return (
    <div className="relative">
      {/* Skeleton fades out */}
      <div className={`transition-opacity duration-300 ${isLoading ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}>
        {skeleton}
      </div>
      {/* Content fades in */}
      <div className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {children}
      </div>
    </div>
  )
}
```

```tsx
// Staggered list animation — each item animates in with a delay
interface StaggeredListProps<T> {
  items:      T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyFn:      (item: T) => string | number
}

export function StaggeredList<T>({ items, renderItem, keyFn }: StaggeredListProps<T>) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={keyFn(item)}
          // Inline style for stagger delay — Tailwind can't generate arbitrary delay-[Xms]
          style={{ animationDelay: `${i * 50}ms` }}
          className="
            opacity-0 translate-y-2
            animate-[fadeSlideIn_0.3s_ease-out_forwards]
          "
        >
          {renderItem(item, i)}
        </li>
      ))}
    </ul>
  )
}

// Add to src/index.css (Tailwind v4):
// @keyframes fadeSlideIn {
//   0%   { opacity: 0; transform: translateY(8px); }
//   100% { opacity: 1; transform: translateY(0); }
// }
```

```tsx
// Respecting prefers-reduced-motion
// Tailwind's motion-reduce: prefix disables animations for users who prefer it
//
// Instead of:
//   className="transition-all duration-300 animate-pulse"
//
// Use:
//   className="transition-all duration-300 motion-reduce:transition-none animate-pulse motion-reduce:animate-none"
//
// Or globally in tailwind.config via @media (prefers-reduced-motion: reduce):
//   @layer utilities {
//     @media (prefers-reduced-motion: reduce) {
//       .animate-pulse { animation: none; }
//     }
//   }
//
// React hook approach:
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return prefersReduced
}
```

### Animation Cheatsheet

| Pattern | Tailwind classes |
|---------|-----------------|
| Fade in | `opacity-0 → opacity-100 transition-opacity duration-200` |
| Slide in from right | `translate-x-full → translate-x-0 transition-transform duration-300` |
| Scale open | `scale-95 opacity-0 → scale-100 opacity-100 transition-all duration-200` |
| Skeleton pulse | `animate-pulse bg-gray-200 dark:bg-gray-700` |
| Stagger delay | `style={{ animationDelay: \`${i * 50}ms\` }}` |
| Reduce motion | `motion-reduce:transition-none motion-reduce:animate-none` |

### What We're Evaluating

- `translate-x-full` / `translate-x-0` toggle — toast slide-in without JS animation library
- `scale-95 opacity-0` / `scale-100 opacity-100` — dropdown open/close with `origin-top-right`
- `pointer-events-none` when hidden — invisible element doesn't block clicks
- `animate-pulse` — Tailwind built-in for skeletons (uses CSS `animation`)
- `ContentFade` crossfade — both skeleton and content present in DOM, opacity swaps
- Stagger via inline `style.animationDelay` — Tailwind can't generate `delay-[${i*50}ms]` dynamically at runtime
- `motion-reduce:` prefix — respects `prefers-reduced-motion` OS setting
- `aria-live="polite"` on Toast — screen reader announces new notifications
