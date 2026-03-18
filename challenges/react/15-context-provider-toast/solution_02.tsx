// ============================================================
// Problem 02 — Composable Provider Stack
// ============================================================



// ============================================================
// context/ThemeContext.tsx
//
// Theme = "light" | "dark" | "system"
// ResolvedTheme = "light" | "dark"
//
// ThemeContextValue: { theme, resolvedTheme, setTheme, toggle }
//
// ThemeProvider:
//   const [theme, setThemeState] = useState<Theme>(() =>
//     (localStorage.getItem("theme") as Theme) ?? "system")
//
//   const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
//     window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
//
//   useEffect: MediaQueryList.addEventListener("change", handler)
//     handler: setSystemTheme(e.matches ? "dark" : "light")
//     cleanup: removeEventListener
//
//   resolvedTheme = theme === "system" ? systemTheme : theme
//
//   useEffect [resolvedTheme, theme]:
//     document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
//     localStorage.setItem("theme", theme)
//
//   toggle(): "dark" or "system+dark" → "light"; else → "dark"
//
// useTheme(): throw if no context
// ============================================================



// ============================================================
// context/AuthContext.tsx
//
// AuthContextValue: { user, isAuthenticated, isLoading, login, logout, hasPermission }
//
// AuthProvider:
//   const toast = useToast()  ← available because AuthProvider is BELOW ToastProvider
//
//   useEffect (mount): check localStorage token → api.get("/auth/me") → setUser
//     catch: remove invalid token; finally: setIsLoading(false)
//
//   login(email, password):
//     api.post("/auth/login") → localStorage.setItem token → setUser
//     toast.success(`Welcome back, ${name}!`)
//
//   logout():
//     api.post("/auth/logout") → removeItem token → setUser(null)
//     toast.info("You have been logged out.")
//
//   hasPermission(p): user?.permissions.includes(p) ?? false
//
// useAuth(): throw if no context
// ============================================================



// ============================================================
// lib/composeProviders.ts
//
// type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>
//
// composeProviders(...providers: ProviderComponent[]):
//   return function ComposedProviders({ children }) {
//     return providers.reduceRight(
//       (acc, Provider) => <Provider>{acc}</Provider>,
//       children as React.ReactElement
//     )
//   }
//
// Usage:
//   const AppProviders = composeProviders(
//     ThemeProvider,   // outermost — no deps
//     ToastProvider,   // AuthProvider can call useToast()
//     AuthProvider,    // can use useToast() ✓
//     QueryProvider,   // innermost
//   )
//
// Order rule: if B depends on A's context, A must come BEFORE B in the array
//   [A, B, C] → <A><B><C>{children}</C></B></A>
//   C is innermost; B can useContext(A); C can useContext(A) and useContext(B)
// ============================================================



// ============================================================
// hooks/useAppProviders.ts
//
// interface AppContexts { theme, auth, toast }
//
// useAppProviders():
//   return { theme: useTheme(), auth: useAuth(), toast: useToast() }
//
// Usage in AppHeader:
//   const { theme, auth, toast } = useAppProviders()
//   theme.toggle() → dark/light
//   auth.logout()  → calls useToast internally (shows toast)
// ============================================================



// ============================================================
// Context splitting — performance note:
//
// WRONG: one fat context
//   <AppContext> with theme + user + toasts
//   → every consumer re-renders when toasts change (every notification!)
//
// RIGHT: separate contexts by update frequency
//   ThemeContext  — rare changes (user toggle)
//   AuthContext   — rare changes (login/logout)
//   ToastContext  — frequent changes (every add/dismiss)
//
//   BookingList subscribes to AuthContext only → immune to toast re-renders
//   ToastContainer subscribes to ToastContext only → immune to theme/auth changes
// ============================================================
