// SOLUTION 02 — Alternative: request ID counter + why AbortController is superior
// Also covers: TanStack Query as the long-term solution, general async rules

// ─── ALTERNATIVE FIX: REQUEST ID COUNTER ─────────────────────────────────────

// Instead of AbortController, maintain a monotonically increasing counter.
// Each request "claims" a number; only the request with the latest number is allowed
// to update state.

// Outside the component (module scope, or in a useRef):
//   let latestRequestId = 0

// Inside the effect:
//   const thisRequestId = ++latestRequestId

//   fetch(url)
//     .then(res => res.json())
//     .then(data => {
//       if (thisRequestId !== latestRequestId) return  // a newer request is now in flight
//       setResults(data.results)
//       setIsLoading(false)
//     })

// When a second request starts, latestRequestId becomes 2. The first request's
// .then() checks if 1 === 2 → false → it silently discards its result.

// This does eliminate the race condition (stale results never appear), but...

// ─── WHY AbortController IS STRICTLY BETTER ───────────────────────────────────

// The request ID counter is a UI-level guard only. It does NOT cancel the actual
// HTTP request — all those extra requests still fly to the server and consume:
//   - Client bandwidth
//   - Server CPU and database queries
//   - Laravel's request queue / rate limit budget

// AbortController + fetch signal actually terminates the TCP connection (in most
// browsers) or at minimum prevents the response from being processed. The server
// may still receive the request, but the client drops it cleanly.

// Summary:
//   Request ID counter → correct results, but wasteful (all requests complete)
//   AbortController    → correct results, and efficient (stale requests cancelled)

// Use AbortController for production code.
// The counter approach is sometimes used as a teaching example because it is
// simpler to understand, but it should not be the final implementation.

// ─── THE REAL LONG-TERM SOLUTION: TANSTACK QUERY ─────────────────────────────

// TanStack Query handles both problems automatically:

// useQuery({
//   queryKey: ['bookings', 'search', debouncedQuery],
//   queryFn:  ({ signal }) => fetchSearchResults(debouncedQuery, signal),
//   enabled:  debouncedQuery.trim().length > 0,
// })

// TanStack Query passes an AbortSignal via the queryFn context argument.
// It cancels the previous query automatically when the query key changes.
// It also deduplicates identical concurrent requests.

// You still need debounce for the debouncedQuery value to avoid firing too many
// cache entries — use a useDebounce hook that delays the value update:
//   const debouncedQuery = useDebounce(query, 300)
//   // only changes 300 ms after the last keystroke

// ─── UNIVERSAL RULES FOR ASYNC IN useEffect ──────────────────────────────────

// Rule 1: Every useEffect that fires a fetch MUST return a cleanup function
//   that either aborts the request (AbortController) or prevents state updates
//   (request ID counter or isMounted flag).

// Rule 2: Every search/filter/autocomplete input MUST debounce before fetching.
//   300 ms is the standard threshold for perceived responsiveness.

// Rule 3: Always check `err.name === 'AbortError'` in catch blocks before
//   setting error state. Abort is expected; do not treat it as a failure.

// Rule 4: If your component does a lot of async work, consider extracting it
//   into a custom hook (e.g. useBookingSearch) to keep the component clean and
//   to make the async logic independently testable.

// Rule 5: For components that unmount (modals, conditional panels), the cleanup
//   function also prevents the "setState on unmounted component" warning that
//   can cause subtle bugs in React 18 concurrent mode.

// ─── useDebounce HOOK (for reference) ────────────────────────────────────────

// function useDebounce<T>(value: T, delay: number): T {
//   const [debouncedValue, setDebouncedValue] = useState(value)
//   useEffect(() => {
//     const timer = setTimeout(() => setDebouncedValue(value), delay)
//     return () => clearTimeout(timer)
//   }, [value, delay])
//   return debouncedValue
// }

// This hook is a clean extraction of the debounce pattern from Solution 01.
// It returns a delayed copy of `value` that only updates after `delay` ms of
// stability. The component queries on debouncedValue, not the raw input value.
