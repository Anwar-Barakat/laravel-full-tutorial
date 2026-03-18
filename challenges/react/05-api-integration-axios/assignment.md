# API Integration & Data Fetching Patterns

Build a production Axios layer with interceptors, typed service functions, offline-aware mutations, and an auto-retrying request queue that syncs when the connection is restored.

| Topic           | Details                                                         |
|-----------------|-----------------------------------------------------------------|
| Axios Layer     | Instance, request/response interceptors, typed service          |
| Error Handling  | 401 redirect, 422 pass-through, 500+ toast, network error       |
| Offline Queue   | localStorage queue, auto-retry on reconnect, pending count UI   |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Axios API Layer (Medium)

### Scenario

Build a complete Axios-based API layer: a configured instance, request interceptor that injects the Bearer token, response interceptor that handles errors globally, and a typed `bookingApi` service. Forms can catch 422 errors directly; everything else is handled by the interceptor.

### Requirements

1. `api` — `axios.create()` with `baseURL`, `timeout: 15_000`, JSON headers
2. Request interceptor — reads `localStorage.getItem("auth_token")`, sets `Authorization: Bearer {token}`
3. Response interceptor — 401: clear token + redirect to `/login`; 422: re-throw without toast (forms handle inline); 500+: `toast.error("Server error")`; no response: `toast.error("Network error")`
4. `ApiResponse<T>` — `{ data: T; message?: string }`
5. `PaginatedResponse<T>` — `{ data: T[]; meta: { current_page, last_page, per_page, total }; links: {...} }`
6. `bookingApi` service — `getAll(params?)`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `search(query, signal?)`
7. `search()` accepts `AbortSignal` for request cancellation (deduplication in search inputs)
8. `isValidationError()` + `extractValidationErrors()` utils to use 422 errors in forms

### Expected Code

```tsx
// lib/axios.ts
import axios, {
  AxiosInstance, AxiosError, InternalAxiosRequestConfig
} from "axios"
import toast from "react-hot-toast"

export const api: AxiosInstance = axios.create({
  baseURL:  import.meta.env.VITE_API_URL ?? "/api",
  timeout:  15_000,
  headers:  { "Content-Type": "application/json", Accept: "application/json" },
})

// ── Request interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("auth_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    switch (error.response?.status) {
      case 401:
        localStorage.removeItem("auth_token")
        window.location.href = "/login"
        break
      case 422:
        break // pass through — forms handle validation errors inline
      default:
        if (error.response && error.response.status >= 500) {
          toast.error("Server error. Please try again.")
        } else if (!error.response) {
          toast.error("Network error. Check your connection.")
        }
    }
    return Promise.reject(error)
  }
)
```

```tsx
// types/api.ts
export interface ApiResponse<T> {
  data:     T
  message?: string
}

export interface PaginatedResponse<T> {
  data:  T[]
  meta:  {
    current_page: number
    last_page:    number
    per_page:     number
    total:        number
    from:         number
    to:           number
  }
  links: {
    first: string
    last:  string
    prev:  string | null
    next:  string | null
  }
}

interface ValidationErrorResponse {
  message: string
  errors:  Record<string, string[]>
}
```

```tsx
// services/bookingApi.ts
import { api } from "@/lib/axios"
import type { ApiResponse, PaginatedResponse } from "@/types/api"

interface GetBookingsParams {
  status?:    BookingStatus | "all"
  search?:    string
  page?:      number
  per_page?:  number
  date_from?: string
  date_to?:   string
}

export const bookingApi = {
  getAll: async (params?: GetBookingsParams): Promise<PaginatedResponse<Booking>> => {
    const { data } = await api.get<PaginatedResponse<Booking>>("/bookings", { params })
    return data
  },

  getById: async (id: number): Promise<Booking> => {
    const { data } = await api.get<ApiResponse<Booking>>(`/bookings/${id}`)
    return data.data
  },

  create: async (payload: CreateBookingData): Promise<Booking> => {
    const { data } = await api.post<ApiResponse<Booking>>("/bookings", payload)
    return data.data
  },

  update: async (id: number, payload: Partial<CreateBookingData>): Promise<Booking> => {
    const { data } = await api.patch<ApiResponse<Booking>>(`/bookings/${id}`, payload)
    return data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/bookings/${id}`)
  },

  // AbortSignal allows the caller to cancel in-flight requests (e.g. debounced search)
  search: async (query: string, signal?: AbortSignal): Promise<Booking[]> => {
    const { data } = await api.get<ApiResponse<Booking[]>>("/bookings/search", {
      params: { q: query },
      signal,
    })
    return data.data
  },
}
```

```tsx
// utils/apiError.ts
import { AxiosError } from "axios"

export function isValidationError(
  error: unknown
): error is AxiosError<{ errors: Record<string, string[]> }> {
  return (
    error instanceof AxiosError &&
    error.response?.status === 422 &&
    typeof error.response.data?.errors === "object"
  )
}

// Flatten Laravel's { field: ["msg1", "msg2"] } to { field: "msg1" }
export function extractValidationErrors(
  error: AxiosError<{ errors: Record<string, string[]> }>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [field, messages] of Object.entries(error.response!.data.errors)) {
    result[field] = messages[0]
  }
  return result
}

// Usage in a form submit handler
// try {
//   await bookingApi.create(formData)
// } catch (err) {
//   if (isValidationError(err)) {
//     setErrors(extractValidationErrors(err))  // map to form state
//   }
// }
```

### Interceptor Decision Matrix

| Status | Interceptor action | Form action |
|--------|--------------------|-------------|
| 200-299 | Pass through | — |
| 401 | Clear token + redirect | — |
| 422 | Re-throw only | `setErrors(extractValidationErrors(err))` |
| 500+ | `toast.error(...)` | — |
| No response | `toast.error("Network...")` | — |

### What We're Evaluating

- `axios.create()` — instance shares config, interceptors, and defaults
- `InternalAxiosRequestConfig` type — required for Axios v1+ request interceptor typing
- `switch(status)` in response interceptor — explicit cases, 422 falls through with `break`
- `signal` param on `search()` — caller creates `AbortController`, passes `controller.signal`
- `isValidationError()` type guard — narrows `unknown` catch to typed AxiosError
- `extractValidationErrors()` — flattens Laravel's `string[]` per field to `string`

---

## Problem 02 — Request Queue & Offline Support (Hard)

### Scenario

Build offline-aware mutations: when the user is offline, write the request to a `localStorage` queue instead of failing. When the connection is restored, automatically drain the queue in FIFO order and notify the UI via a pending count.

### Requirements

1. `useOnlineStatus()` — `useState(navigator.onLine)` + `window.addEventListener("online"/"offline")` with cleanup
2. `RequestQueue` class — `add()`, `remove(id)`, `getAll()`, `clear()`, `length`; persists to `localStorage`; uses `crypto.randomUUID()` for IDs
3. `useOfflineMutation<TData, TVariables>` hook — if `isOnline`, calls `mutationFn` directly; if offline, serialises and queues the request, returns `null`
4. `useEffect` in the hook watches `isOnline` — when it flips to `true`, drains the queue in order, calls `onOnlineSuccess` per item
5. `pendingCount` in hook return — live count from `requestQueue.length`
6. `OfflineBanner` component — fixed top banner with amber background; shows "X changes pending sync"
7. Queue processes FIFO — break on first failure (don't skip errors silently)

### Expected Code

```tsx
// hooks/useOnlineStatus.ts
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)

    window.addEventListener("online",  up)
    window.addEventListener("offline", down)

    return () => {
      window.removeEventListener("online",  up)
      window.removeEventListener("offline", down)
    }
  }, [])

  return isOnline
}
```

```tsx
// lib/requestQueue.ts
interface QueuedRequest {
  id:        string
  method:    "POST" | "PUT" | "PATCH" | "DELETE"
  url:       string
  data?:     unknown
  timestamp: number
}

class RequestQueue {
  private static readonly KEY = "offline_request_queue"

  getAll(): QueuedRequest[] {
    try {
      const raw = localStorage.getItem(RequestQueue.KEY)
      return raw ? (JSON.parse(raw) as QueuedRequest[]) : []
    } catch {
      return []
    }
  }

  add(req: Omit<QueuedRequest, "id" | "timestamp">): QueuedRequest {
    const item: QueuedRequest = { ...req, id: crypto.randomUUID(), timestamp: Date.now() }
    const queue = this.getAll()
    queue.push(item)
    localStorage.setItem(RequestQueue.KEY, JSON.stringify(queue))
    return item
  }

  remove(id: string): void {
    const updated = this.getAll().filter((r) => r.id !== id)
    localStorage.setItem(RequestQueue.KEY, JSON.stringify(updated))
  }

  clear(): void { localStorage.removeItem(RequestQueue.KEY) }

  get length(): number { return this.getAll().length }
}

export const requestQueue = new RequestQueue()
```

```tsx
// hooks/useOfflineMutation.ts
interface UseOfflineMutationOptions<T> {
  queuedMethod?: "POST" | "PUT" | "PATCH" | "DELETE"
  queuedUrl?:    string
  onOnlineSuccess?: (result: T) => void
  onError?:        (error: unknown) => void
}

interface UseOfflineMutationReturn<TData, TVariables> {
  mutate:       (variables: TVariables) => Promise<TData | null>
  isLoading:    boolean
  pendingCount: number
}

export function useOfflineMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseOfflineMutationOptions<TData> = {}
): UseOfflineMutationReturn<TData, TVariables> {
  const isOnline                    = useOnlineStatus()
  const [isLoading, setIsLoading]   = useState(false)
  const [pendingCount, setPendingCount] = useState(requestQueue.length)

  // Drain queue whenever we come back online
  useEffect(() => {
    if (!isOnline) return

    async function drainQueue() {
      const items = requestQueue.getAll()
      if (items.length === 0) return

      setIsLoading(true)
      for (const item of items) {            // FIFO
        try {
          const result = await api.request<TData>({
            method: item.method,
            url:    item.url,
            data:   item.data,
          })
          requestQueue.remove(item.id)
          setPendingCount(requestQueue.length)
          options.onOnlineSuccess?.(result.data)
        } catch (err) {
          console.error("Queue processing stopped — request failed:", err)
          break // stop on first failure, don't silently skip
        }
      }
      setIsLoading(false)
    }

    drainQueue()
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  async function mutate(variables: TVariables): Promise<TData | null> {
    if (!isOnline) {
      // Queue the raw HTTP request for later
      if (options.queuedMethod && options.queuedUrl) {
        requestQueue.add({
          method: options.queuedMethod,
          url:    options.queuedUrl,
          data:   variables,
        })
        setPendingCount(requestQueue.length)
      }
      toast("Saved offline — will sync when connected.", { icon: "📶" })
      return null
    }

    setIsLoading(true)
    try {
      return await mutationFn(variables)
    } catch (err) {
      options.onError?.(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { mutate, isLoading, pendingCount }
}
```

```tsx
// components/OfflineBanner.tsx
interface OfflineBannerProps { pendingCount: number }

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ pendingCount }) => (
  <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-medium shadow-md">
    <span>⚠️ You are offline.</span>
    {pendingCount > 0 && (
      <span className="ml-2">
        {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending sync.
      </span>
    )}
  </div>
)

// Usage in layout
function AppLayout({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus()
  const { pendingCount } = useOfflineMutation(/* ... */)

  return (
    <>
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
      <main className={!isOnline ? "mt-10" : ""}>{children}</main>
    </>
  )
}
```

```tsx
// Usage — booking creation that works offline
function useCreateBooking() {
  const queryClient = useQueryClient() // or your refetch fn

  return useOfflineMutation(
    (data: CreateBookingData) => bookingApi.create(data),
    {
      queuedMethod:    "POST",
      queuedUrl:       "/bookings",
      onOnlineSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      onError:         (err) => isValidationError(err) && handleValidationError(err),
    }
  )
}

// In a component
const { mutate: createBooking, isLoading, pendingCount } = useCreateBooking()

await createBooking(formData)
// Online  → calls bookingApi.create() immediately
// Offline → queues to localStorage, returns null, shows toast
// Back online → queue auto-drains, onOnlineSuccess refetches list
```

### Queue Processing Flow

```
User offline → createBooking(data)
  → isOnline === false
  → requestQueue.add({ method: "POST", url: "/bookings", data })
  → localStorage["offline_request_queue"] = [{ id, method, url, data, timestamp }]
  → pendingCount: 1
  → toast "Saved offline"

User back online → window "online" event
  → useEffect([isOnline]) fires
  → drainQueue() reads localStorage
  → api.request(item) for each item in order
  → on success: requestQueue.remove(id) → pendingCount: 0
  → onOnlineSuccess() → refetch list
```

### What We're Evaluating

- `navigator.onLine` as initial state + event listeners for changes
- `RequestQueue` singleton — serialisable to JSON, survives page refresh
- `crypto.randomUUID()` — no external dep for unique IDs
- `drainQueue()` breaks on first failure — prevents partial state corruption
- `pendingCount` synced from `requestQueue.length` after every add/remove
- `OfflineBanner` with `mt-10` layout compensation — prevents content obscured by fixed banner
