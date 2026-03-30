# Typed API Client & Data Fetching

Build a production-grade typed API client with interceptors, error handling, and a useFetch hook that handles loading/error/data states.

| Topic           | Details                                                         |
|-----------------|-----------------------------------------------------------------|
| Typed API Client | Fetch wrapper with generics                                   |
| useFetch Hook   | Loading, error, data, refetch                                   |
| Error Handling  | Network, 4xx, 5xx, timeout                                      |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — API Client with Interceptors (Medium)

### Scenario

Build a typed API client class that wraps `fetch` with: automatic auth headers, request/response interceptors, error transformation, and typed responses. Then build a `useFetch` hook on top of it.

### Requirements

1. `ApiClient` class with typed `get`, `post`, `put`, `delete` methods
2. Automatic Bearer token from auth store
3. Request interceptor: add headers, log requests
4. Response interceptor: transform errors, handle 401 (redirect to login)
5. Custom `ApiError` class with `status`, `code`, `message`, validation errors
6. `useFetch(url, options?)` hook returning `{ data, isLoading, error, refetch, mutate }`
7. `AbortController` cleanup on unmount
8. Support for dependent fetching: skip fetch until condition is met

### Expected Code

```tsx
// lib/ApiError.ts
export class ApiError extends Error {
  constructor(
    public readonly status:   number,
    public readonly code:     string,         // machine-readable: "VALIDATION_ERROR"
    message:                  string,          // human-readable
    public readonly errors?:  Record<string, string[]>  // 422 field errors
  ) {
    super(message)
    this.name = "ApiError"
    // Required for custom error classes in TypeScript when targeting ES5
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  get isValidation()  { return this.status === 422 }
  get isUnauthorized(){ return this.status === 401 }
  get isNotFound()    { return this.status === 404 }
  get isServerError() { return this.status >= 500 }
}
```

```tsx
// lib/ApiClient.ts
type RequestInterceptor  = (config: RequestInit & { url: string }) => RequestInit & { url: string }
type ResponseInterceptor = (response: Response) => Promise<Response>

interface ApiClientConfig {
  baseUrl:      string
  timeout?:     number
  getToken?:    () => string | null
}

export class ApiClient {
  private requestInterceptors:  RequestInterceptor[]  = []
  private responseInterceptors: ResponseInterceptor[] = []

  constructor(private config: ApiClientConfig) {
    // Register default interceptors
    this.addRequestInterceptor(this.authInterceptor.bind(this))
    this.addResponseInterceptor(this.errorInterceptor.bind(this))
  }

  addRequestInterceptor(fn: RequestInterceptor)   { this.requestInterceptors.push(fn) }
  addResponseInterceptor(fn: ResponseInterceptor) { this.responseInterceptors.push(fn) }

  // ── Auth interceptor ─────────────────────────────────────
  private authInterceptor(config: RequestInit & { url: string }) {
    const token = this.config.getToken?.() ?? localStorage.getItem("auth_token")
    if (token) {
      return {
        ...config,
        headers: {
          ...config.headers as Record<string, string>,
          Authorization: `Bearer ${token}`,
        },
      }
    }
    return config
  }

  // ── Error interceptor ────────────────────────────────────
  private async errorInterceptor(response: Response): Promise<Response> {
    if (response.ok) return response

    let body: Record<string, unknown> = {}
    try { body = await response.clone().json() } catch { /* ignore parse error */ }

    if (response.status === 401) {
      localStorage.removeItem("auth_token")
      window.location.href = "/login"
    }

    throw new ApiError(
      response.status,
      (body.code as string)      ?? `HTTP_${response.status}`,
      (body.message as string)   ?? response.statusText,
      (body.errors as Record<string, string[]>) ?? undefined,
    )
  }

  // ── Core request method ──────────────────────────────────
  private async request<T>(
    url:     string,
    options: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const fullUrl = url.startsWith("http") ? url : `${this.config.baseUrl}${url}`

    let config: RequestInit & { url: string } = {
      ...options,
      url: fullUrl,
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept:         "application/json",
        ...(options.headers as Record<string, string> ?? {}),
      },
    }

    // Run request interceptors in order
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config)
    }

    // Timeout via AbortController if no external signal provided
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let internalController: AbortController | undefined
    if (this.config.timeout && !signal) {
      internalController = new AbortController()
      config.signal = internalController.signal
      timeoutId = setTimeout(
        () => internalController!.abort(),
        this.config.timeout
      )
    }

    try {
      let response = await fetch(config.url, config)

      // Run response interceptors — may throw ApiError
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response)
      }

      // 204 No Content — return null cast to T
      if (response.status === 204) return null as T

      return response.json() as Promise<T>
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new ApiError(0, "REQUEST_ABORTED", "Request was aborted")
      }
      throw error   // re-throw ApiError or network errors
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  // ── Public typed methods ─────────────────────────────────
  get<T>(url: string, signal?: AbortSignal)                         { return this.request<T>(url, { method: "GET" }, signal) }
  post<T>(url: string, body: unknown, signal?: AbortSignal)          { return this.request<T>(url, { method: "POST",   body: JSON.stringify(body) }, signal) }
  put<T>(url: string, body: unknown, signal?: AbortSignal)           { return this.request<T>(url, { method: "PUT",    body: JSON.stringify(body) }, signal) }
  patch<T>(url: string, body: unknown, signal?: AbortSignal)         { return this.request<T>(url, { method: "PATCH",  body: JSON.stringify(body) }, signal) }
  delete<T = void>(url: string, signal?: AbortSignal)                { return this.request<T>(url, { method: "DELETE" }, signal) }
}

// Singleton — shared across the app
export const api = new ApiClient({
  baseUrl:  import.meta.env.VITE_API_URL ?? "/api",
  timeout:  15_000,
  getToken: () => localStorage.getItem("auth_token"),
})
```

```tsx
// hooks/useFetch.ts
interface UseFetchOptions<T> {
  enabled?:    boolean      // default true — set false to skip fetch
  onSuccess?:  (data: T)       => void
  onError?:    (error: ApiError) => void
  initialData?: T
}

interface UseFetchReturn<T> {
  data:      T | undefined
  isLoading: boolean
  error:     ApiError | null
  refetch:   () => void
  mutate:    (data: T | undefined) => void   // local state override
}

export function useFetch<T>(
  url:     string | null,   // null = skip (dependent fetch)
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { enabled = true, onSuccess, onError, initialData } = options

  const [data,      setData]      = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<ApiError | null>(null)
  const [trigger,   setTrigger]   = useState(0)   // increment to manually refetch

  useEffect(() => {
    // Skip: no url, or disabled (dependent fetch)
    if (!url || !enabled) return

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    api.get<T>(url, controller.signal)
      .then((result) => {
        setData(result)
        onSuccess?.(result)
      })
      .catch((err: unknown) => {
        // Ignore aborts — component unmounted or new request started
        if ((err as ApiError).code === "REQUEST_ABORTED") return

        const apiError = err instanceof ApiError
          ? err
          : new ApiError(0, "UNKNOWN", (err as Error).message)

        setError(apiError)
        onError?.(apiError)
      })
      .finally(() => setIsLoading(false))

    // Cleanup: cancel in-flight request on unmount or re-run
    return () => controller.abort()
  }, [url, enabled, trigger])   // trigger changes force refetch

  return {
    data,
    isLoading,
    error,
    refetch: () => setTrigger((t) => t + 1),
    mutate:  (d) => setData(d),              // local mutation without refetch
  }
}
```

```tsx
// Usage examples
// ── Basic fetch ──────────────────────────────────────────────
function BookingList() {
  const { data, isLoading, error, refetch } =
    useFetch<PaginatedResponse<Booking>>("/bookings")

  if (isLoading) return <Skeleton />
  if (error?.isValidation) return <p>Validation error</p>
  if (error)     return <ErrorBanner message={error.message} onRetry={refetch} />

  return <DataTable bookings={data?.data ?? []} />
}

// ── Dependent fetch ──────────────────────────────────────────
function BookingDetail({ bookingId }: { bookingId: number | null }) {
  const { data: booking, isLoading } = useFetch<Booking>(
    bookingId !== null ? `/bookings/${bookingId}` : null
    //                  ↑ null skips the fetch until we have an ID
  )

  if (!bookingId) return <p>Select a booking</p>
  if (isLoading)  return <Skeleton />
  return <BookingCard booking={booking!} />
}

// ── Optimistic mutate ─────────────────────────────────────────
function useUpdateBookingStatus(bookingId: number) {
  const { data, mutate, refetch } = useFetch<Booking>(`/bookings/${bookingId}`)

  const updateStatus = async (status: string) => {
    const original = data
    mutate({ ...data!, status })   // optimistic update

    try {
      await api.patch(`/bookings/${bookingId}`, { status })
    } catch {
      mutate(original)             // revert on failure
      refetch()
    }
  }

  return { booking: data, updateStatus }
}
```

### Error Class Hierarchy

```
Error
└── ApiError
      ├── status: 401  → isUnauthorized — interceptor redirects to /login
      ├── status: 404  → isNotFound
      ├── status: 422  → isValidation — errors: Record<string, string[]>
      └── status: 500+ → isServerError
```

### What We're Evaluating

- `ApiClient` with interceptor arrays — request and response pipelines
- `authInterceptor` reads token lazily (`getToken()`) — not captured at construction time
- `errorInterceptor` clones response before reading JSON — `response.json()` can only be called once
- `AbortController` in `useFetch` — cancelled on effect cleanup (unmount or URL change)
- `url: null` pattern for dependent fetch — `if (!url) return` skips the effect
- `trigger` state counter — `setTrigger(t => t + 1)` forces `useEffect` to re-run
- `Object.setPrototypeOf(this, ApiError.prototype)` — required for `instanceof` to work in TS/ES5
- `mutate()` in return — local state override for optimistic updates without refetch

---

## Problem 02 — Retry, Caching & Polling (Hard)

### Scenario

Extend the API client and `useFetch` with retry logic, client-side response caching, and polling for real-time data.

### Requirements

1. Add retry with exponential backoff to `ApiClient`
2. `useFetch` with `cacheTime` option — serve stale while revalidating
3. Add `pollingInterval` option for periodic refetching
4. Cache responses in a simple `Map` with TTL
5. `staleWhileRevalidate`: show cached data immediately, fetch fresh in background
6. Deduplicate concurrent requests for the same URL

### Expected Code

```tsx
// lib/requestCache.ts — module-level singleton cache
interface CacheEntry<T> {
  data:        T
  timestamp:   number       // Date.now() when cached
  expiresAt:   number       // timestamp + cacheTime
}

class RequestCache {
  private store = new Map<string, CacheEntry<unknown>>()

  // Active in-flight promises — deduplication
  private inflight = new Map<string, Promise<unknown>>()

  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    return {
      data:    entry.data,
      isStale: Date.now() > entry.expiresAt,
    }
  }

  has(key: string): boolean { return this.store.has(key) }

  delete(key: string): void { this.store.delete(key) }

  clear(): void { this.store.clear() }

  // Deduplication: if a request is already in flight, return the same promise
  getInflight<T>(key: string): Promise<T> | undefined {
    return this.inflight.get(key) as Promise<T> | undefined
  }

  setInflight<T>(key: string, promise: Promise<T>): void {
    this.inflight.set(key, promise as Promise<unknown>)
    // Auto-remove when settled
    promise.finally(() => this.inflight.delete(key))
  }
}

export const requestCache = new RequestCache()
```

```tsx
// lib/ApiClient.ts — add retry with exponential backoff
interface ApiClientConfig {
  baseUrl:  string
  timeout?: number
  retries?: number       // max retry attempts (default 0)
  getToken?: () => string | null
}

// ── Retry logic ────────────────────────────────────────────
async function withRetry<T>(
  fn:       () => Promise<T>,
  retries:  number,
  attempt:  number = 0
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const apiError = error as ApiError

    // Don't retry: client errors (4xx), aborts, or last attempt
    const shouldRetry =
      attempt < retries &&
      apiError.code !== "REQUEST_ABORTED" &&
      (apiError.status === 0 || apiError.status >= 500)

    if (!shouldRetry) throw error

    // Exponential backoff: 200ms → 400ms → 800ms → ...
    const delay = Math.min(200 * Math.pow(2, attempt), 10_000)
    await new Promise((resolve) => setTimeout(resolve, delay))

    return withRetry(fn, retries, attempt + 1)
  }
}

// In ApiClient.request():
// return withRetry(() => fetch(...), this.config.retries ?? 0)
```

```tsx
// hooks/useFetch.ts — extended with cache + polling
interface UseFetchOptions<T> {
  enabled?:             boolean
  cacheTime?:           number    // ms to keep response in cache (0 = no cache)
  staleWhileRevalidate?: boolean  // show stale cache while fetching fresh
  pollingInterval?:     number    // ms between automatic refetches (0 = no polling)
  onSuccess?:           (data: T) => void
  onError?:             (error: ApiError) => void
  initialData?:         T
}

export function useFetch<T>(
  url:     string | null,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> & { isStale: boolean; isFetching: boolean } {
  const {
    enabled            = true,
    cacheTime          = 0,
    staleWhileRevalidate = false,
    pollingInterval    = 0,
    onSuccess,
    onError,
    initialData,
  } = options

  const [data,       setData]       = useState<T | undefined>(initialData)
  const [isLoading,  setIsLoading]  = useState(false)
  const [isFetching, setIsFetching] = useState(false)   // background refetch
  const [isStale,    setIsStale]    = useState(false)
  const [error,      setError]      = useState<ApiError | null>(null)
  const [trigger,    setTrigger]    = useState(0)

  useEffect(() => {
    if (!url || !enabled) return

    // ── Cache check ────────────────────────────────────────
    const cached = cacheTime > 0 ? requestCache.get<T>(url) : null

    if (cached) {
      setData(cached.data)
      setIsStale(cached.isStale)

      // If fresh: no need to fetch
      if (!cached.isStale) return

      // Stale: serve immediately and refetch in background
      if (staleWhileRevalidate) {
        setIsFetching(true)   // background indicator, not blocking spinner
      } else {
        setIsLoading(true)    // blocking spinner — replace stale data
      }
    } else {
      setIsLoading(true)
    }

    // ── Deduplication ──────────────────────────────────────
    const existing = requestCache.getInflight<T>(url)
    const controller = new AbortController()

    const fetchPromise: Promise<T> = existing ?? api.get<T>(url, controller.signal)

    if (!existing && cacheTime > 0) {
      requestCache.setInflight(url, fetchPromise)
    }

    fetchPromise
      .then((result) => {
        if (cacheTime > 0) requestCache.set(url, result, cacheTime)
        setData(result)
        setIsStale(false)
        setError(null)
        onSuccess?.(result)
      })
      .catch((err: unknown) => {
        if ((err as ApiError).code === "REQUEST_ABORTED") return
        const apiError = err instanceof ApiError
          ? err
          : new ApiError(0, "UNKNOWN", (err as Error).message)
        setError(apiError)
        onError?.(apiError)
      })
      .finally(() => {
        setIsLoading(false)
        setIsFetching(false)
      })

    return () => {
      if (!existing) controller.abort()   // only abort our own request
    }
  }, [url, enabled, trigger])

  // ── Polling ────────────────────────────────────────────────
  useEffect(() => {
    if (!pollingInterval || !url || !enabled) return

    const id = setInterval(() => setTrigger((t) => t + 1), pollingInterval)
    return () => clearInterval(id)
  }, [pollingInterval, url, enabled])

  return {
    data,
    isLoading,
    isFetching,
    isStale,
    error,
    refetch: () => setTrigger((t) => t + 1),
    mutate:  (d) => setData(d),
  }
}
```

```tsx
// Usage examples
// ── Stale-while-revalidate ───────────────────────────────────
function BookingList() {
  const { data, isLoading, isFetching, isStale } = useFetch<Booking[]>("/bookings", {
    cacheTime:           60_000,
    staleWhileRevalidate: true,
  })
  // isLoading: true only on very first load (no cache yet)
  // isFetching: true when refreshing stale cache in background
  // isStale: true when serving data past its TTL

  return (
    <div>
      {isLoading  && <Skeleton />}
      {isFetching && <div className="text-xs text-gray-400">Refreshing…</div>}
      {isStale    && <div className="text-xs text-amber-500">Data may be outdated</div>}
      {data?.map((b) => <BookingCard key={b.id} booking={b} />)}
    </div>
  )
}

// ── Polling for live data ────────────────────────────────────
function LivePendingBookings() {
  const { data } = useFetch<Booking[]>("/bookings?status=pending", {
    pollingInterval: 5_000,   // refetch every 5 seconds
    cacheTime:       4_000,   // serve cache until the next poll arrives
  })
  return <div>{data?.length ?? 0} pending bookings</div>
}

// ── Retry ────────────────────────────────────────────────────
const resilientApi = new ApiClient({
  baseUrl: "/api",
  retries: 3,      // retry network errors and 5xx up to 3 times
  timeout: 10_000,
})
// attempt 0 fails → wait 200ms → attempt 1 fails → wait 400ms → attempt 2 → ...
```

### Stale-While-Revalidate Flow

```
First request:
  cache miss → isLoading=true → fetch → set cache(url, data, ttl) → render

Within TTL (fresh):
  cache hit, isStale=false → return cached data immediately → no fetch

After TTL (stale) + staleWhileRevalidate:
  cache hit, isStale=true → setData(cached) → isFetching=true (background)
  → fetch silently → update cache → setData(fresh) → isFetching=false

Deduplication:
  Two components mount at the same time, both fetch /bookings
  → first registers inflight promise
  → second finds inflight promise → reuses the same Promise
  → one network request, both components update
```

### What We're Evaluating

- `withRetry` — recursive with `attempt` counter; `Math.min(200 * 2^attempt, 10000)` caps at 10s
- Only retry `status === 0` (network) or `>= 500` (server) — never retry 4xx client errors
- `requestCache` as a module singleton — shared across all `useFetch` calls
- `inflight` Map — stores the Promise itself (not the result) for deduplication
- `promise.finally(() => inflight.delete(key))` — auto-cleanup after settle
- `isLoading` vs `isFetching` — `isLoading` blocks the full view; `isFetching` is a background hint
- Polling via `setInterval` in a separate `useEffect` — triggered independently from data fetch
- Cache key is the URL string — works for GET requests; mutations should call `requestCache.delete(url)`
