# React Hooks Deep Dive

Master `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, and build custom hooks — the core of modern React.

| Topic          | Details                                            |
|----------------|----------------------------------------------------|
| Custom Hooks   | useBookings — data fetching, CRUD, debounce        |
| Utility Hooks  | useDebounce<T>, useLocalStorage<T> with generics   |
| Patterns       | AbortController cleanup, optimistic updates, SSR   |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — `useBookings` Custom Hook (Medium)

### Scenario

Extract all booking data logic into a `useBookings` hook: fetches from the API, debounces search with `useRef`, cleans up in-flight requests with `AbortController`, and exposes typed CRUD methods with optimistic updates.

### Requirements

1. `UseBookingsOptions` — `initialStatus?: BookingStatus | "all"`, `perPage?: number`
2. `UseBookingsReturn` interface — all returned values typed explicitly (no inferred `any`)
3. `useEffect` fetches bookings — rebuilds `URLSearchParams` from `filters` + `pagination.currentPage`; cleans up with `controller.abort()` on unmount / re-run
4. Debounced search — `useRef<ReturnType<typeof setTimeout>>` timer; 300 ms delay; resets `currentPage` to 1 on trigger
5. `setFilter<K extends keyof BookingFilters>(key, value)` — generic key setter; search path goes through debounce timer, all others apply immediately
6. `updateBooking(id, data)` — optimistic: update state immediately, rollback via `refresh()` if fetch throws
7. `deleteBooking(id)` — optimistic: filter out immediately, rollback on failure
8. `refresh()` — increments a `refreshToken` state counter that sits in `useEffect` deps

### Expected Code

```tsx
// hooks/useBookings.ts

interface BookingFilters {
  status:   BookingStatus | "all"
  search:   string
  dateFrom: string
  dateTo:   string
}

interface PaginationState {
  currentPage: number
  lastPage:    number
  total:       number
  perPage:     number
}

interface UseBookingsReturn {
  bookings:      Booking[]
  isLoading:     boolean
  error:         string | null
  filters:       BookingFilters
  setFilter:     <K extends keyof BookingFilters>(key: K, value: BookingFilters[K]) => void
  pagination:    PaginationState
  setPage:       (page: number) => void
  createBooking: (data: CreateBookingData) => Promise<void>
  updateBooking: (id: number, data: Partial<Booking>) => Promise<void>
  deleteBooking: (id: number) => Promise<void>
  refresh:       () => void
}
```

```tsx
export function useBookings(options: UseBookingsOptions = {}): UseBookingsReturn {
  const { initialStatus = "all", perPage = 15 } = options

  const [bookings, setBookings]   = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [filters, setFilters]     = useState<BookingFilters>({
    status: initialStatus, search: "", dateFrom: "", dateTo: "",
  })
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1, lastPage: 1, total: 0, perPage,
  })
  const [refreshToken, setRefreshToken] = useState(0)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function setFilter<K extends keyof BookingFilters>(key: K, value: BookingFilters[K]): void {
    if (key === "search") {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        setFilters((f) => ({ ...f, search: value as string }))
        setPagination((p) => ({ ...p, currentPage: 1 }))
      }, 300)
    } else {
      setFilters((f) => ({ ...f, [key]: value }))
      setPagination((p) => ({ ...p, currentPage: 1 }))
    }
  }

  const setPage    = (page: number) => setPagination((p) => ({ ...p, currentPage: page }))
  const refresh    = () => setRefreshToken((t) => t + 1)

  useEffect(() => {
    const controller = new AbortController()

    async function fetch_() {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page:     String(pagination.currentPage),
          per_page: String(perPage),
          ...(filters.status !== "all" && { status: filters.status }),
          ...(filters.search   && { search:    filters.search }),
          ...(filters.dateFrom && { date_from: filters.dateFrom }),
          ...(filters.dateTo   && { date_to:   filters.dateTo }),
        })

        const res = await fetch(`/api/bookings?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        setBookings(json.data)
        setPagination((p) => ({ ...p, lastPage: json.meta.last_page, total: json.meta.total }))
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetch_()
    return () => controller.abort() // cancel in-flight request on cleanup
  }, [filters, pagination.currentPage, refreshToken])

  async function updateBooking(id: number, data: Partial<Booking>): Promise<void> {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, ...data } : b))) // optimistic
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Update failed")
    } catch (err) {
      refresh() // rollback — re-fetch real data
      throw err
    }
  }

  async function deleteBooking(id: number): Promise<void> {
    setBookings((bs) => bs.filter((b) => b.id !== id)) // optimistic
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
    } catch (err) {
      refresh() // rollback
      throw err
    }
  }

  async function createBooking(data: CreateBookingData): Promise<void> {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Create failed")
    refresh() // re-fetch to show new record
  }

  return {
    bookings, isLoading, error,
    filters, setFilter,
    pagination, setPage,
    createBooking, updateBooking, deleteBooking,
    refresh,
  }
}
```

### Key Patterns

| Pattern | Why |
|---------|-----|
| `AbortController` in `useEffect` cleanup | Prevents state update on unmounted component ("Can't update state" warning) |
| `useRef` for debounce timer | Persists across renders without causing a re-render (unlike `useState`) |
| `refreshToken` counter in deps | Forces `useEffect` to re-run on demand without changing filter state |
| Optimistic update + rollback | UI feels instant; correct data restored silently on failure |

### What We're Evaluating

- `UseBookingsReturn` interface — all fields named and typed, no `any`
- `AbortController` + `return () => controller.abort()` — correct `useEffect` cleanup
- `useRef<ReturnType<typeof setTimeout>>` — platform-agnostic timer ref type
- Generic `setFilter<K extends keyof BookingFilters>` — type-safe key/value pair
- Optimistic update pattern — immediate state mutation + rollback via `refresh()`

---

## Problem 02 — `useDebounce` & `useLocalStorage` Generic Hooks (Hard)

### Scenario

Build two reusable utility hooks with TypeScript generics: `useDebounce<T>` debounces any value type, and `useLocalStorage<T>` syncs state to `localStorage` with SSR safety and JSON error recovery.

### Requirements

1. `useDebounce<T>(value: T, delay: number): T` — `useEffect` sets a `setTimeout`; cleanup returns `clearTimeout`; returns `debouncedValue` state
2. `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]` — reads from `localStorage` in lazy `useState` initialiser; saves automatically via `useEffect` on every state change
3. JSON parse errors: catch and return `initialValue` (corrupted storage should not crash the app)
4. JSON stringify errors: catch and log — do not throw (circular refs, quota exceeded)

### Expected Code

```tsx
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer) // cancel pending timer when value changes before delay
  }, [value, delay])

  return debouncedValue
}

// Usage
const [search, setSearch] = useState("")
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  if (debouncedSearch) fetchResults(debouncedSearch)
}, [debouncedSearch])
// → API call fires 300ms after the user stops typing, not on every keystroke
```

```tsx
// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {

  // Step 1 — read from localStorage on mount (once only)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) as T : initialValue
    } catch {
      return initialValue // corrupted data → use default
    }
  })

  // Step 2 — save to localStorage whenever storedValue changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (err) {
      console.error(`useLocalStorage: error writing key "${key}"`, err)
    }
  }, [key, storedValue])

  // Step 3 — return exactly like useState
  return [storedValue, setStoredValue]
}

// Usage
const [theme, setTheme]     = useLocalStorage<"light" | "dark">("theme", "light")
const [filters, setFilters] = useLocalStorage<BookingFilters>("booking-filters", defaultFilters)

setTheme("dark")           // → state updates + useEffect saves to localStorage ✅
setFilters({ ...filters, status: "paid" }) // → same ✅
```

### useDebounce — How the Cleanup Works

```
User types "a"   → timer starts (300ms)
User types "ab"  → cleanup cancels "a" timer, new timer starts
User types "abc" → cleanup cancels "ab" timer, new timer starts
300ms passes     → setDebouncedValue("abc") fires
useEffect([debouncedSearch]) → API call fires once
```

### useLocalStorage — Edge Cases Handled

| Scenario | Behaviour |
|----------|-----------|
| Key not in localStorage | Returns `initialValue` |
| Corrupted JSON | `JSON.parse` throws → returns `initialValue` |
| Quota exceeded on write | Caught, logged, state still updated in memory |

### What We're Evaluating

- `<T>` generic — hook works with `string`, `number`, object, union types
- `clearTimeout` return in `useEffect` — without this, stale timers fire after unmount
- Lazy `useState(() => ...)` initialiser — `localStorage` read happens once, not every render
- `item !== null` check — distinguishes "key not set" from `"null"` stored string
- `useEffect([key, storedValue])` — saves to localStorage automatically on every state change
