# React Context & Provider Pattern

Build a Theme and Auth provider using React Context — the foundation for app-wide state without prop drilling.

| Topic          | Details                                    |
|----------------|--------------------------------------------|
| Theme Provider | Dark/light/system with localStorage + OS detection |
| Auth Provider  | Login/logout/session restore with context  |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns

---

## Problem 01 — Theme Provider (Medium)

### Scenario

Build a `ThemeProvider` that supports `"light"`, `"dark"`, and `"system"` modes — persisting to localStorage and detecting the OS preference.

### Requirements

1. `Theme` = `"light" | "dark" | "system"` — user's explicit choice
2. `resolvedTheme` = `"light" | "dark"` — actual applied value (`"system"` resolved via OS)
3. Persist theme to `localStorage`
4. Detect OS preference via `window.matchMedia("(prefers-color-scheme: dark)")`
5. Listen for OS preference changes at runtime (`MediaQueryList "change"` event)
6. Apply `"dark"` class to `document.documentElement` (Tailwind dark mode)
7. `toggle()` — flips between light and dark

### Expected Code

```tsx
type Theme         = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme:         Theme
  resolvedTheme: ResolvedTheme
  setTheme:      (t: Theme) => void
  toggle:        () => void
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem("theme") as Theme) ?? "system"
  )

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  )

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    localStorage.setItem("theme", theme)
  }, [resolvedTheme, theme])

  const toggle = useCallback(() => {
    setThemeState(prev =>
      prev === "dark" || (prev === "system" && resolvedTheme === "dark")
        ? "light" : "dark"
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

### What We're Evaluating

- `theme` vs `resolvedTheme` — user choice vs actual applied value
- `localStorage` read in `useState` initialiser — avoids flash on reload
- `window.matchMedia` — reads OS preference + listens for runtime changes
- `document.documentElement.classList.toggle("dark", ...)` — Tailwind dark mode
- Cleanup: `removeEventListener` in `useEffect` return

---

## Problem 02 — Auth Provider (Medium)

### Scenario

Build an `AuthProvider` that restores session on mount, exposes `login`/`logout`, and uses `useToast()` to show feedback — demonstrating provider ordering (Auth must be below Toast).

### Requirements

1. `user`, `isAuthenticated`, `isLoading` state
2. Restore session on mount — check `localStorage` token → `GET /api/auth/me`
3. `login(email, password)` — POST → save token → `toast.success`
4. `logout()` — POST → remove token → `toast.info`
5. `hasPermission(permission)` — check `user.permissions` array
6. `useAuth()` hook with null guard

### Expected Code

```tsx
interface AuthContextValue {
  user:            User | null
  isAuthenticated: boolean
  isLoading:       boolean
  login:           (email: string, password: string) => Promise<void>
  logout:          () => Promise<void>
  hasPermission:   (permission: string) => boolean
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()   // ← works because AuthProvider is BELOW ToastProvider

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      api.get("/auth/me")
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem("auth_token"))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password })
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
}
```

### What We're Evaluating

- `isLoading: true` on init — prevents flash of unauthenticated UI
- Session restore in `useEffect` — runs once on mount
- `toast` used inside Auth — requires ToastProvider to be above AuthProvider
- `hasPermission` — `user?.permissions.includes(p) ?? false`
- `useAuth()` null guard — clear error message
