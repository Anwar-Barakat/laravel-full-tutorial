# Challenge 03: Build useFetch and useDebounce Custom Hooks

**Format:** BUILD
**App:** Tripz — Laravel + React school booking platform
**Topic:** Build two production-quality custom hooks from scratch

---

## Context

The Tripz frontend makes API calls in dozens of components. Right now every component has its own copy of fetch logic — no loading states, no error handling, no cleanup. You have been asked to build two reusable hooks that will replace all of that ad-hoc code.

---

## Task

Build both hooks and demonstrate them working together in a `BookingSearch` component.

---

## TypeScript Types

```typescript
interface Booking {
  id: number
  schoolName: string
  destination: string
  studentCount: number
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  createdAt: string
}
```

---

## Hook 1: `useFetch<T>`

```typescript
function useFetch<T>(url: string, options?: { immediate?: boolean }): {
  data:      T | null
  isLoading: boolean
  error:     string | null
  refetch:   () => void
}
```

### Requirements

1. **Generic** — callers specify the response shape: `useFetch<Booking[]>('/api/bookings')`
2. **Returns** `{ data, isLoading, error, refetch }` — all four fields, always present
3. **Automatic fetch** — fires immediately when the component mounts and when `url` changes
4. **Cancels on unmount** — uses `AbortController`; if the component unmounts mid-request, abort the request and ignore the response (do not call `setState` on an unmounted component)
5. **AbortError handling** — catching an AbortError is not a real error; do not surface it in the `error` state
6. **Stable `refetch`** — the `refetch` function must have a stable reference (wrap with `useCallback`) so it can safely be added to dependency arrays in calling components
7. **`immediate: false` option** — when passed, skip the first automatic fetch; the caller must invoke `refetch()` manually to trigger the first load

---

## Hook 2: `useDebounce<T>`

```typescript
function useDebounce<T>(value: T, delay?: number): T
```

### Requirements

1. **Generic** — works with any type T (string, number, object)
2. **Delays update** — the returned value only changes `delay` milliseconds after the input value stops changing
3. **Default delay** — if `delay` is not provided, default to `300`
4. **Cleans up** — cancels the pending timer on unmount (no state updates after unmount)
5. **Returns the debounced value** — not a ref; callers should be able to put the return value directly in JSX or a dependency array

---

## Usage Example to Implement

```tsx
// BookingSearch.tsx — wire up both hooks together
function BookingSearch() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading, error } = useFetch<Booking[]>(
    `/api/bookings?search=${debouncedSearch}`
  )

  // Render:
  // - search input bound to `search`
  // - loading skeleton while isLoading
  // - error message if error is non-null
  // - list of bookings from data
}
```

When `debouncedSearch` drives the URL, `useFetch` will automatically re-run whenever the debounced value changes — so the API is only called after the user stops typing for 300ms, not on every keystroke.

---

## Expected Output

- `useFetch` that: starts with `isLoading: true`, resolves to `data` on success, sets `error` on failure, cleans up on unmount, exposes a stable `refetch`
- `useDebounce` that: returns the original value immediately, updates the returned value after the delay elapses, cancels pending timers on each new value change
- `BookingSearch` that: calls the API only once per 300ms typing pause, shows correct loading/error/data states

---

## Hints

- Inside the `useFetch` effect, use a local `cancelled` flag or an `AbortController` to guard against stale `setState` calls
- The `refetch` function needs to trigger a re-run of the `useEffect` — consider using a `triggerCount` state variable that the effect depends on
- For `useDebounce`, the cleanup `return () => clearTimeout(timer)` runs both on unmount and before the next effect execution (when value changes), which naturally cancels the previous timer
- The key insight of using them together: `useDebounce` controls when the URL changes; `useFetch` reacts to URL changes — combining them creates a debounced API search with minimal code at the call site
