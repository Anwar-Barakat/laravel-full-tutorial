// SOLUTION 01 — BookingCard: issues 1–7
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// ISSUE 1 — useEffect with no dependency array (infinite fetch loop)
// ─────────────────────────────────────────────

// Problem:
//   useEffect(() => { fetch(...) })
//   — no second argument means the effect runs after every single render
//   — fetching sets state → causes a render → triggers the effect again → infinite loop
//   — this will hammer the server with continuous requests until the browser tab crashes

// Why it happens:
//   React's useEffect without deps fires after every completed render, not just mount

// Fix:
//   useEffect(() => { fetch(...) }, [bookingId])
//   — now the effect only runs when the component mounts or when bookingId changes

// ─────────────────────────────────────────────
// ISSUE 2 — Props not typed (TypeScript missing interface)
// ─────────────────────────────────────────────

// Problem:
//   export function BookingCard({ bookingId })
//   — bookingId has type 'any' because no prop interface is defined
//   — TypeScript cannot catch type errors in callers (e.g. passing a string instead of a number)

// Fix:
//   interface BookingCardProps { bookingId: number }
//   export function BookingCard({ bookingId }: BookingCardProps)
//   — or inline: function BookingCard({ bookingId }: { bookingId: number })

// ─────────────────────────────────────────────
// ISSUE 3 — booking.amount accessed before null check (runtime crash on first render)
// ─────────────────────────────────────────────

// Problem:
//   const formattedAmount = new Intl.NumberFormat(...).format(booking.amount)
//   — booking is initialised as null (useState(null))
//   — on the very first render, before the fetch completes, booking is null
//   — accessing null.amount throws: "Cannot read properties of null (reading 'amount')"
//   — the component crashes immediately and never shows anything

// Fix:
//   Guard with optional chaining or a loading check:
//   Option A — early return while loading:
//     if (!booking) return <div>Loading...</div>
//     (then formattedAmount is safe because booking is guaranteed non-null below)
//   Option B — optional chaining with fallback:
//     const formattedAmount = booking ? formatter.format(booking.amount) : '—'

// ─────────────────────────────────────────────
// ISSUE 4 — Intl.NumberFormat created on every render (performance issue)
// ─────────────────────────────────────────────

// Problem:
//   new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
//   — this line is inside the component body, so a new formatter object is instantiated
//     on every render, including the spurious re-renders caused by Issue 1
//   — Intl object construction is relatively expensive

// Fix (two options):
//   Option A — module-level constant (best: one instance for the entire app lifetime):
//     const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
//     — place this outside the function, at the top of the file
//   Option B — useMemo inside the component:
//     const currencyFormatter = useMemo(() => new Intl.NumberFormat(...), [])
//     — no deps since the locale and currency never change

// ─────────────────────────────────────────────
// ISSUE 5 — handleConfirm ignores fetch response (no error handling, no loading state)
// ─────────────────────────────────────────────

// Problem:
//   function handleConfirm() {
//     fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' })
//     setCount(count + 1)
//   }
//   — the fetch Promise is never awaited or .then()/.catch() chained
//   — if the API returns an error (4xx/5xx), the component silently shows success
//   — setCount runs immediately before the request completes: the UI updates even on failure
//   — there is no loading state on the button, so the user can click multiple times

// Fix:
//   - Make handleConfirm async
//   - await the fetch, check res.ok
//   - wrap in try/catch and surface errors to the user
//   - track isConfirming state, disable the button while the request is in-flight

// ─────────────────────────────────────────────
// ISSUE 6 — setCount(count + 1) stale closure bug
// ─────────────────────────────────────────────

// Problem:
//   setCount(count + 1)
//   — handleConfirm closes over the value of count at the time the function was defined
//   — if handleConfirm is called multiple times before a re-render (e.g. rapid clicks),
//     all calls read the same stale count value and the final result is count + 1, not count + N

// Fix:
//   setCount(prev => prev + 1)
//   — the functional updater form always receives the latest state value, never a stale snapshot

// ─────────────────────────────────────────────
// ISSUE 7 — onClick on a <div> (accessibility violation)
// ─────────────────────────────────────────────

// Problem:
//   <div onClick={handleConfirm} ...>
//   — a <div> is not an interactive element; it is not keyboard-focusable and not reachable
//     by screen readers as a button
//   — keyboard users cannot activate it with Enter or Space
//   — screen readers will not announce it as a button

// Fix (choose one):
//   Option A — use a <button> as the root element instead of <div> (simplest)
//   Option B — if a block wrapper is needed, put a <button> inside the <div> for the action
//   Option C — add role="button", tabIndex={0}, and onKeyDown handler to the <div>
//     (this is more work and still results in non-semantic HTML — Option A is preferred)
