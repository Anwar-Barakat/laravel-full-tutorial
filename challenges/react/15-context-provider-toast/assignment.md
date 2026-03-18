# React Context & Provider Pattern

Build a toast notification system and theme provider using React Context — the foundation for app-wide state without prop drilling.

| Topic          | Details                                                         |
|----------------|-----------------------------------------------------------------|
| Toast System   | Notification provider + hook                                    |
| Theme Provider | Dark/light with context                                         |
| Composition    | Nested providers pattern                                        |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Toast Notification System (Medium)

### Scenario

Build a complete toast notification system using Context: a `ToastProvider`, `useToast` hook, and `Toast` component with enter/exit animations, auto-dismiss, and multiple types.

### Requirements

1. `ToastProvider` wrapping the app, managing toast state
2. `useToast()` hook returning: `success()`, `error()`, `info()`, `warning()`, `dismiss()`
3. `ToastContainer` rendering toasts in top-right corner
4. Auto-dismiss after configurable duration
5. Enter/exit animations (slide in from right)
6. Stack multiple toasts with proper spacing
7. Type the toast interface: `id`, `message`, `variant`, `duration`

### Expected Code

```tsx
// types/toast.ts
export type ToastVariant = "success" | "error" | "info" | "warning"

export interface Toast {
  id:        string
  message:   string
  variant:   ToastVariant
  duration:  number       // ms before auto-dismiss; 0 = persistent
  isLeaving: boolean      // true while exit animation plays
}

export interface ToastContextValue {
  toasts:  Toast[]
  // Convenience methods — return the toast id so caller can dismiss programmatically
  success: (message: string, duration?: number) => string
  error:   (message: string, duration?: number) => string
  info:    (message: string, duration?: number) => string
  warning: (message: string, duration?: number) => string
  dismiss: (id: string) => void
  // Dismiss all active toasts
  dismissAll: () => void
}
```

```tsx
// context/ToastContext.tsx
import { createContext, useContext, useState, useCallback, useRef } from "react"
import type { Toast, ToastVariant, ToastContextValue } from "@/types/toast"

const ToastContext = createContext<ToastContextValue | null>(null)

// Default durations per variant
const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  error:   6000,   // errors stay longer — user needs time to read them
  info:    4000,
  warning: 5000,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Track timeouts so we can cancel them on manual dismiss
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ── Start exit animation, then remove from state ──────────
  const startDismiss = useCallback((id: string) => {
    // Cancel auto-dismiss timer if one exists
    if (timers.current.has(id)) {
      clearTimeout(timers.current.get(id)!)
      timers.current.delete(id)
    }

    // Mark as leaving — CSS transition plays
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isLeaving: true } : t))
    )

    // Remove from DOM after animation completes (300ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  // ── Add a new toast ───────────────────────────────────────
  const addToast = useCallback(
    (message: string, variant: ToastVariant, duration?: number): string => {
      const id        = crypto.randomUUID()
      const ms        = duration ?? DEFAULT_DURATIONS[variant]
      const newToast: Toast = { id, message, variant, duration: ms, isLeaving: false }

      setToasts((prev) => [...prev, newToast])

      // Schedule auto-dismiss
      if (ms > 0) {
        const timer = setTimeout(() => startDismiss(id), ms)
        timers.current.set(id, timer)
      }

      return id
    },
    [startDismiss]
  )

  const success = useCallback((m: string, d?: number) => addToast(m, "success", d), [addToast])
  const error   = useCallback((m: string, d?: number) => addToast(m, "error",   d), [addToast])
  const info    = useCallback((m: string, d?: number) => addToast(m, "info",    d), [addToast])
  const warning = useCallback((m: string, d?: number) => addToast(m, "warning", d), [addToast])

  const dismiss    = useCallback((id: string) => startDismiss(id), [startDismiss])
  const dismissAll = useCallback(() => {
    toasts.forEach((t) => startDismiss(t.id))
  }, [toasts, startDismiss])

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, warning, dismiss, dismissAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// ── Custom hook ────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}
```

```tsx
// components/ToastContainer.tsx
import { useToast } from "@/context/ToastContext"

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-green-600 dark:bg-green-700",
  error:   "bg-red-600   dark:bg-red-700",
  info:    "bg-blue-600  dark:bg-blue-700",
  warning: "bg-amber-500 dark:bg-amber-600",
}

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: "✓", error: "✕", info: "ℹ", warning: "⚠",
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    // Fixed container — toasts stack from top-right
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg
            text-white text-sm font-medium
            pointer-events-auto
            transform transition-all duration-300 ease-out

            ${toast.isLeaving
              // Exit: slide right + fade out
              ? "translate-x-full opacity-0"
              // Enter: slide in from right
              : "translate-x-0 opacity-100"
            }
            ${VARIANT_CLASSES[toast.variant]}
          `}
        >
          {/* Icon */}
          <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
            {VARIANT_ICONS[toast.variant]}
          </span>

          {/* Message */}
          <span className="flex-1 leading-5">{toast.message}</span>

          {/* Dismiss button */}
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
```

```tsx
// Usage in any component — no prop drilling!
function BookingForm() {
  const toast = useToast()

  const handleSubmit = async (data: CreateBookingData) => {
    try {
      await bookingApi.create(data)
      toast.success("Booking created successfully!")
    } catch (err) {
      if (isValidationError(err)) {
        toast.warning("Please fix the form errors")
      } else {
        toast.error("Failed to create booking. Please try again.")
      }
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}

// In App root:
function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>...</Routes>
      </Router>
    </ToastProvider>
    // ToastContainer is rendered INSIDE ToastProvider automatically
  )
}
```

### Toast State Machine

```
addToast(message, variant, duration)
  → push { id, message, variant, isLeaving: false }
  → setTimeout(startDismiss, duration)

startDismiss(id)
  → clearTimeout (cancel auto-dismiss)
  → setToasts: mark isLeaving: true   ← triggers CSS exit animation
  → setTimeout(300ms): remove from array

CSS classes:
  isLeaving: false → translate-x-0 opacity-100   (visible)
  isLeaving: true  → translate-x-full opacity-0  (animating out)
```

### What We're Evaluating

- `createContext<T | null>(null)` — null initial value + runtime guard in `useToast()`
- `useRef<Map<...>>` for timers — persists across renders without triggering re-renders
- `isLeaving` flag — two-phase dismiss: animate out first, remove from DOM 300ms later
- `startDismiss` clears the timer before animating — prevents double-dismiss
- `ToastContainer` rendered inside the Provider — accesses context automatically
- `aria-live="polite"` on container — screen reader announces new toasts
- `pointer-events-none` on container + `pointer-events-auto` on individual toasts — container doesn't block clicks behind it

---

## Problem 02 — Composable Provider Stack (Hard)

### Scenario

Build a composable provider stack: Theme + Auth + Toast + QueryClient — and create a `composeProviders` utility to avoid provider hell.

### Requirements

1. `ThemeProvider` with system preference detection
2. `AuthProvider` with login/logout/user state
3. `composeProviders()` utility to flatten nested providers
4. Provider ordering matters: Auth depends on Toast (login errors)
5. Type the composed provider properly
6. Add `useAppProviders()` hook that returns all contexts

### Expected Code

```tsx
// context/ThemeContext.tsx
export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme:         Theme           // user's explicit choice
  resolvedTheme: ResolvedTheme   // actual applied theme (resolves "system")
  setTheme:      (t: Theme) => void
  toggle:        () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Persist theme choice in localStorage
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) ?? "system"
  })

  // Resolve "system" → actual OS preference
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  )

  // Listen for OS preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme

  // Apply class to <html> whenever resolvedTheme changes
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
    localStorage.setItem("theme", theme)
  }, [resolvedTheme, theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])

  const toggle = useCallback(() => {
    setThemeState((prev) =>
      prev === "dark" || (prev === "system" && resolvedTheme === "dark")
        ? "light"
        : "dark"
    )
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be inside <ThemeProvider>")
  return ctx
}
```

```tsx
// context/AuthContext.tsx
interface User {
  id:          number
  name:        string
  email:       string
  role:        "admin" | "school_admin" | "staff"
  permissions: string[]
}

interface AuthContextValue {
  user:            User | null
  isAuthenticated: boolean
  isLoading:       boolean
  login:           (email: string, password: string) => Promise<void>
  logout:          () => Promise<void>
  hasPermission:   (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)   // true until session checked

  // useToast is available because AuthProvider is placed BELOW ToastProvider
  const toast = useToast()

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      api.get<{ data: User }>("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem("auth_token"))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ data: User; token: string }>("/auth/login", { email, password })
    localStorage.setItem("auth_token", res.token)
    setUser(res.data)
    toast.success(`Welcome back, ${res.data.name}!`)
  }, [toast])

  const logout = useCallback(async () => {
    await api.post("/auth/logout", {})
    localStorage.removeItem("auth_token")
    setUser(null)
    toast.info("You have been logged out.")
  }, [toast])

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user]
  )

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>")
  return ctx
}
```

```tsx
// lib/composeProviders.ts
// Composes an array of Provider components into a single wrapper.
// Avoids deeply nested JSX "provider hell".

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>

// Returns a single component that wraps children in all providers (right to left)
// Order matters: [A, B, C] → <A><B><C>{children}</C></B></A>
// So C is innermost — it can use contexts from A and B
export function composeProviders(
  ...providers: ProviderComponent[]
): React.FC<{ children: React.ReactNode }> {
  return function ComposedProviders({ children }) {
    return providers.reduceRight<React.ReactElement>(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children as React.ReactElement
    )
  }
}

// Usage:
const AppProviders = composeProviders(
  ThemeProvider,    // outermost — no dependencies
  ToastProvider,    // next — AuthProvider can call useToast()
  AuthProvider,     // inner — uses useToast() ✓
  QueryProvider,    // innermost — query client available everywhere
)

// In main.tsx:
ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>
)

// Equivalent to (but without the nesting hell):
// <ThemeProvider>
//   <ToastProvider>
//     <AuthProvider>
//       <QueryProvider>
//         <App />
//       </QueryProvider>
//     </AuthProvider>
//   </ToastProvider>
// </ThemeProvider>
```

```tsx
// QueryProvider wrapper (thin wrapper around TanStack Query)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

```tsx
// hooks/useAppProviders.ts — single hook to access all contexts
// Useful for shared components that need multiple contexts at once

interface AppContexts {
  theme: ThemeContextValue
  auth:  AuthContextValue
  toast: ToastContextValue
}

export function useAppProviders(): AppContexts {
  return {
    theme: useTheme(),
    auth:  useAuth(),
    toast: useToast(),
  }
}

// Usage in a header component
function AppHeader() {
  const { theme, auth, toast } = useAppProviders()

  return (
    <header className="flex items-center justify-between px-4 py-3">
      <span>Welcome, {auth.user?.name ?? "Guest"}</span>

      <div className="flex items-center gap-3">
        <button
          onClick={theme.toggle}
          aria-label={`Switch to ${theme.resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {theme.resolvedTheme === "dark" ? "☀️" : "🌙"}
        </button>

        {auth.isAuthenticated ? (
          <button onClick={async () => { await auth.logout() }}>
            Sign Out
          </button>
        ) : (
          <a href="/login">Sign In</a>
        )}
      </div>
    </header>
  )
}
```

```tsx
// Context performance: split high-frequency from low-frequency state
// Splitting prevents ALL consumers from re-rendering on every toast

// ── Anti-pattern: one big context ──────────────────────────
const AppContext = createContext<{
  theme:    Theme
  user:     User | null
  toasts:   Toast[]           // ← changes on every toast add/dismiss
  setTheme: (t: Theme) => void
  logout:   () => void
} | null>(null)
// Problem: every component using useAppContext re-renders when toasts change

// ── Correct: split by update frequency ─────────────────────
// ThemeContext     — changes: user clicks toggle (rare)
// AuthContext      — changes: login/logout (rare)
// ToastContext     — changes: every toast add/dismiss (frequent)
// Each context has its own Provider; components subscribe to only what they need

// BookingList only needs auth — not affected by toasts
// ToastContainer only needs toasts — not affected by theme
```

### Provider Ordering Rules

```
[ThemeProvider, ToastProvider, AuthProvider, QueryProvider]

Means:
  ThemeProvider wraps all — available everywhere, no deps
  ToastProvider wraps Auth + Query — AuthProvider can call useToast()
  AuthProvider wraps Query — query client available inside login/logout
  QueryProvider is innermost

Rule: if Provider B needs context from Provider A,
      A must appear BEFORE B in the composeProviders() array.
```

### What We're Evaluating

- `createContext<T | null>(null)` — null default + throw in hook = clear error message vs silent undefined
- `useRef<Map<string, ReturnType<typeof setTimeout>>>` — timer registry survives re-renders
- `isLeaving` flag — two-phase dismiss: CSS out-animation → DOM removal
- `theme` vs `resolvedTheme` — user choice ("system") vs actual value ("dark"/"light")
- `MediaQueryList.addEventListener("change", handler)` — OS theme change listener + cleanup
- `composeProviders` with `reduceRight` — right-to-left wrap; first in array = outermost
- Provider ordering — `AuthProvider` below `ToastProvider` means `useToast()` is available inside Auth
- `useAppProviders()` — convenience wrapper reduces import count in shared components
- Context splitting — separate providers by update frequency; prevents unnecessary re-renders
