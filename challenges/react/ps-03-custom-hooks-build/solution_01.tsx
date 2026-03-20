// SOLUTION 01 — useFetch: architecture and AbortController pattern
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// useFetch<T> — full architecture
// ─────────────────────────────────────────────

// function useFetch<T>(url: string, options?: { immediate?: boolean })
//   — T is the expected shape of the response body (e.g. Booking[], Booking, { total: number })
//   — options.immediate defaults to true; pass false to skip the first auto-fetch

// ─────────────────────────────────────────────
// STEP 1: State
// ─────────────────────────────────────────────

// const [data,      setData]      = useState<T | null>(null)
// const [isLoading, setIsLoading] = useState<boolean>(options?.immediate !== false)
//   — start true only if we intend to fetch immediately; false if immediate === false
// const [error,     setError]     = useState<string | null>(null)
// const [triggerCount, setTriggerCount] = useState(0)
//   — incrementing this is how refetch() forces a re-run of the effect

// ─────────────────────────────────────────────
// STEP 2: refetch — stable reference with useCallback
// ─────────────────────────────────────────────

// const refetch = useCallback(() => {
//   setTriggerCount(prev => prev + 1)
// }, [])
// — no deps: the function body only calls a state setter (stable reference from React)
// — useCallback with [] means the same function reference is returned on every render
// — this is safe to include in dependency arrays in calling components without causing loops

// ─────────────────────────────────────────────
// STEP 3: useEffect — the fetch logic
// ─────────────────────────────────────────────

// useEffect(() => {
//   — skip the first run if immediate === false AND this is the initial mount
//     (use a useRef flag: const hasMounted = useRef(false))
//     if (!hasMounted.current && options?.immediate === false) {
//       hasMounted.current = true
//       return
//     }
//     hasMounted.current = true

//   — create AbortController for this request
//     const controller = new AbortController()

//   — reset state before each fetch
//     setIsLoading(true)
//     setError(null)

//   — perform the fetch with the abort signal
//     fetch(url, { signal: controller.signal })
//       .then(res => {
//         — check HTTP status; a 4xx/5xx does not throw by default
//         if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
//         return res.json()
//       })
//       .then((json: T) => {
//         setData(json)
//       })
//       .catch(err => {
//         — AbortError is not a real error (request was cancelled intentionally)
//         if (err.name === 'AbortError') return
//         setError(err.message ?? 'Unknown error')
//       })
//       .finally(() => {
//         — only update isLoading if the request was not aborted
//         — .finally still runs after an AbortError catch, but the component may be unmounted
//         — safe approach: check controller.signal.aborted before calling setState
//         if (!controller.signal.aborted) setIsLoading(false)
//       })

//   — cleanup: abort the in-flight request if the effect re-runs or the component unmounts
//     return () => controller.abort()

// }, [url, triggerCount])
// — deps: url (re-fetch when URL changes) + triggerCount (re-fetch when refetch() is called)
// — do NOT add options to deps unless it is memoised by the caller (object equality trap)

// ─────────────────────────────────────────────
// STEP 4: Return value
// ─────────────────────────────────────────────

// return { data, isLoading, error, refetch }
// — always return all four fields so callers can destructure what they need
// — the TypeScript return type is inferred from the generic T: data is T | null

// ─────────────────────────────────────────────
// AbortController — why it prevents memory leaks
// ─────────────────────────────────────────────

// Without AbortController:
//   1. Component mounts → useEffect fires → fetch begins
//   2. User navigates away → component unmounts
//   3. fetch completes → .then(data => setBooking(data)) runs
//   4. React: "Cannot update state on an unmounted component" (memory leak warning)
//   5. In some cases this also causes stale data to appear if the component remounts

// With AbortController:
//   1. Component mounts → useEffect fires → fetch begins with { signal }
//   2. User navigates away → cleanup runs → controller.abort() → fetch is cancelled
//   3. .catch catches AbortError → we explicitly return early (no setState)
//   4. No leak, no stale update, no React warning

// ─────────────────────────────────────────────
// immediate: false — use case
// ─────────────────────────────────────────────

// Used when the fetch should only happen after user interaction, e.g.:
//   const { data, refetch } = useFetch<Report>('/api/reports/generate', { immediate: false })
//   — the report generation endpoint is expensive; don't call it on mount
//   — call refetch() only when the user clicks "Generate Report"
// Implementation: useRef flag (hasMounted) gates the first effect execution
