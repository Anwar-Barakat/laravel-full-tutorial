# State Management with Zustand

Build type-safe Zustand stores for global state — booking store with immer, auth store with persist middleware, optimistic updates, derived selectors, and cross-store composition.

| Topic           | Details                                                    |
|-----------------|------------------------------------------------------------|
| Zustand Core    | create(), immer middleware, state + actions in one object  |
| Async Actions   | fetch + loading/error state, optimistic update + rollback  |
| Auth + Persist  | persist middleware, token storage, store composition       |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Store with Zustand + Immer (Medium)

### Scenario

Build a Zustand store for all booking state. Components subscribe to slices they need (no over-rendering), async actions manage their own loading/error states, and optimistic updates keep the UI instant while rolling back on failure.

### Requirements

1. `BookingState` interface — `bookings`, `filters`, `pagination`, `isLoading`, `error`, plus all action signatures
2. `useBookingStore` created with `immer` middleware — enables mutable-style writes (`state.isLoading = true`)
3. `fetchBookings()` — reads `get()` for current filters/pagination, builds `URLSearchParams`, sets `isLoading` before and after
4. `updateBooking(id, data)` — save `original` before mutating; optimistic patch via `Object.assign`; rollback to `original` if fetch throws
5. `deleteBooking(id)` — save `original` array; filter out immediately; restore array on failure
6. `setFilter(key, value)` — resets `currentPage` to 1 on every filter change
7. `reset()` — restores `initialState` (used by auth store on logout)
8. `usePaidBookings()` and `useTotalRevenue()` — standalone selector hooks outside the store definition

### Expected Code

```tsx
// stores/bookingStore.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface BookingState {
  bookings:   Booking[]
  filters:    BookingFilters
  pagination: PaginationState
  isLoading:  boolean
  error:      string | null

  fetchBookings:  () => Promise<void>
  createBooking:  (data: CreateBookingData) => Promise<void>
  updateBooking:  (id: number, data: Partial<Booking>) => Promise<void>
  deleteBooking:  (id: number) => Promise<void>
  setFilter:      (key: keyof BookingFilters, value: string) => void
  setPage:        (page: number) => void
  reset:          () => void
}

const initialState = {
  bookings:   [],
  filters:    { status: "all" as const, search: "", dateFrom: "", dateTo: "" },
  pagination: { currentPage: 1, lastPage: 1, total: 0, perPage: 15 },
  isLoading:  false,
  error:      null,
}

export const useBookingStore = create<BookingState>()(
  immer((set, get) => ({
    ...initialState,

    fetchBookings: async () => {
      set((s) => { s.isLoading = true; s.error = null })

      try {
        const { filters, pagination } = get()
        const params = new URLSearchParams({
          page:     String(pagination.currentPage),
          per_page: String(pagination.perPage),
          ...(filters.status !== "all" && { status: filters.status }),
          ...(filters.search   && { search:    filters.search }),
          ...(filters.dateFrom && { date_from: filters.dateFrom }),
          ...(filters.dateTo   && { date_to:   filters.dateTo }),
        })

        const res = await fetch(`/api/bookings?${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()

        set((s) => {
          s.bookings              = json.data
          s.pagination.lastPage   = json.meta.last_page
          s.pagination.total      = json.meta.total
          s.isLoading             = false
        })
      } catch (err) {
        set((s) => {
          s.isLoading = false
          s.error     = err instanceof Error ? err.message : "Unknown error"
        })
      }
    },

    updateBooking: async (id, data) => {
      const original = get().bookings.find((b) => b.id === id) // save for rollback

      set((s) => {
        const idx = s.bookings.findIndex((b) => b.id === id)
        if (idx !== -1) Object.assign(s.bookings[idx], data) // immer: mutate directly
      })

      try {
        const res = await fetch(`/api/bookings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Update failed")
      } catch (err) {
        if (original) {
          set((s) => {
            const idx = s.bookings.findIndex((b) => b.id === id)
            if (idx !== -1) s.bookings[idx] = original // rollback
          })
        }
        throw err
      }
    },

    deleteBooking: async (id) => {
      const original = get().bookings // save for rollback

      set((s) => { s.bookings = s.bookings.filter((b) => b.id !== id) })

      try {
        const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Delete failed")
      } catch (err) {
        set((s) => { s.bookings = original }) // rollback
        throw err
      }
    },

    createBooking: async (data) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Create failed")
      await get().fetchBookings() // re-fetch to get server-assigned ID
    },

    setFilter: (key, value) => {
      set((s) => {
        ;(s.filters as Record<string, string>)[key] = value
        s.pagination.currentPage = 1 // always reset page on filter change
      })
    },

    setPage: (page) => set((s) => { s.pagination.currentPage = page }),

    reset: () => set(initialState),
  }))
)

// Derived selector hooks — defined outside the store so they only re-render
// when the specific slice they depend on changes
export function usePaidBookings(): Booking[] {
  return useBookingStore((s) => s.bookings.filter((b) => b.status === "paid"))
}

export function useTotalRevenue(): number {
  return useBookingStore((s) =>
    s.bookings
      .filter((b) => b.status === "paid")
      .reduce((sum, b) => sum + b.amount, 0)
  )
}
```

```tsx
// In component — subscribe to only what you need
const bookings      = useBookingStore((s) => s.bookings)
const fetchBookings = useBookingStore((s) => s.fetchBookings)
const isLoading     = useBookingStore((s) => s.isLoading)

// Multiple values — use shallow to avoid re-render when unrelated state changes
import { shallow } from 'zustand/shallow'
const { bookings, isLoading, error } = useBookingStore(
  (s) => ({ bookings: s.bookings, isLoading: s.isLoading, error: s.error }),
  shallow
)

// Derived selectors
const paidBookings = usePaidBookings()  // re-renders only when bookings change
const totalRevenue = useTotalRevenue()
```

### Immer vs Plain Zustand

| Without immer | With immer |
|---|---|
| `set((s) => ({ ...s, bookings: [...s.bookings, b] }))` | `set((s) => { s.bookings.push(b) })` |
| `set((s) => ({ ...s, isLoading: true }))` | `set((s) => { s.isLoading = true })` |
| Manual spread for nested updates | Direct property mutation |

### What We're Evaluating

- `immer` middleware — mutable writes inside `set()` without manual spreading
- `get()` inside async actions — reads current state at call time (not stale closure)
- Optimistic update: save `original` → mutate → rollback on throw
- `reset()` using `initialState` const — reusable by other stores on logout
- Selector hooks outside the store — components subscribe to derived slices

---

## Problem 02 — Auth Store with Persist & Store Composition (Hard)

### Scenario

Build an auth store with `persist` middleware so the session survives a page refresh. On logout, compose the stores — `useAuthStore.logout()` also calls `useBookingStore.getState().reset()` to wipe cached booking data.

### Requirements

1. `User` interface — `id`, `name`, `email`, `role: "admin" | "school_admin" | "teacher" | "student"`, `permissions: string[]`
2. `useAuthStore` with `persist` middleware — `partialize` to only persist `token` + `user` (not `isLoading`, `error`)
3. `login({ email, password })` — POST to `/api/auth/login`, store `token` + `user`, set `isAuthenticated: true`
4. `logout()` — calls `useBookingStore.getState().reset()` first, then clears own state (store composition)
5. `refreshToken()` — POST to `/api/auth/refresh` with current token; on failure call `logout()`
6. Role helpers as store actions: `isAdmin()`, `canCreateBooking()`, `hasPermission(permission: string)` — all read via `get()`
7. `storage: createJSONStorage(() => localStorage)` — explicit storage with SSR safety

### Expected Code

```tsx
// stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useBookingStore } from './bookingStore'

interface User {
  id:          number
  name:        string
  email:       string
  role:        "admin" | "school_admin" | "teacher" | "student"
  permissions: string[]
}

interface AuthState {
  user:            User | null
  token:           string | null
  isAuthenticated: boolean
  isLoading:       boolean
  error:           string | null

  login:        (credentials: LoginCredentials) => Promise<void>
  logout:       () => void
  refreshToken: () => Promise<void>

  // Role helpers — methods in store so they always read latest state
  isAdmin:          () => boolean
  canCreateBooking: () => boolean
  hasPermission:    (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      login: async ({ email, password }) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) throw new Error("Invalid credentials")

          const { token, user } = await res.json()
          set({ token, user, isAuthenticated: true, isLoading: false })
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : "Login failed",
          })
          throw err
        }
      },

      logout: () => {
        // Store composition — wipe cached booking data on logout
        useBookingStore.getState().reset()

        set({ user: null, token: null, isAuthenticated: false, error: null })
        // persist middleware automatically removes from localStorage
      },

      refreshToken: async () => {
        const { token, logout } = get()
        if (!token) return

        try {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) { logout(); return }

          const { token: newToken } = await res.json()
          set({ token: newToken })
        } catch {
          logout() // network failure — force re-login
        }
      },

      isAdmin:          () => get().user?.role === "admin",
      canCreateBooking: () => ["admin", "school_admin"].includes(get().user?.role ?? ""),
      hasPermission:    (permission) => get().user?.permissions.includes(permission) ?? false,
    }),
    {
      name:       "auth-storage",
      storage:    createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      // ↑ Only token + user are persisted — isLoading/error are transient
    }
  )
)
```

```tsx
// Usage in components
const { user, login, logout, isAdmin, canCreateBooking } = useAuthStore()

// Login form
async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  try {
    await login({ email, password })
    router.push("/dashboard")
  } catch {
    // error already in store
  }
}

// Route guard
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  if (!isAdmin) return <Navigate to="/unauthorized" />
  return <>{children}</>
}

// Auto-refresh token every 14 minutes
useEffect(() => {
  const interval = setInterval(() => {
    useAuthStore.getState().refreshToken()
  }, 14 * 60 * 1000)
  return () => clearInterval(interval)
}, [])
```

### `partialize` — What Gets Persisted

```
Full AuthState:
  user            ✅ persisted  (restored from localStorage on page load)
  token           ✅ persisted
  isAuthenticated ❌ NOT persisted  (rehydrated from user !== null check)
  isLoading       ❌ NOT persisted  (transient — always starts false)
  error           ❌ NOT persisted  (transient)
  login / logout  ❌ NOT persisted  (functions are never serialisable)
```

### Store Composition Pattern

```tsx
// logout() in authStore calls into bookingStore
logout: () => {
  useBookingStore.getState().reset() // ← direct store access outside React
  set({ user: null, token: null, isAuthenticated: false })
}
// This pattern avoids circular imports because bookingStore does NOT import authStore
```

### What We're Evaluating

- `persist` middleware with `partialize` — only safe/serialisable state persisted
- `createJSONStorage(() => localStorage)` — lazy accessor, SSR-safe
- `logout()` calling `useBookingStore.getState().reset()` — cross-store coordination
- `isAdmin()` / `hasPermission()` as store actions reading `get()` — always fresh, no stale closure
- `refreshToken()` calling `logout()` on failure — graceful session expiry
