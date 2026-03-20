// SOLUTION 02 — BookingCard: issues 8–12 and fixed component outline
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// ISSUE 8 — No AbortController (memory leak on unmount)
// ─────────────────────────────────────────────

// Problem:
//   useEffect(() => {
//     fetch(`/api/bookings/${bookingId}`).then(...).then(data => setBooking(data))
//   }, [bookingId])
//   — if the component unmounts (e.g. user navigates away) before the fetch completes,
//     the .then callback still fires and calls setBooking on an unmounted component
//   — React will log: "Warning: Can't perform a React state update on an unmounted component"
//   — in high-traffic views this causes subtle state corruption and memory leaks

// Fix:
//   useEffect(() => {
//     const controller = new AbortController()
//     fetch(url, { signal: controller.signal })
//       .then(res => res.json())
//       .then(data => setBooking(data))
//       .catch(err => {
//         if (err.name === 'AbortError') return  // not a real error — request was cancelled
//         setError(err.message)
//       })
//     return () => controller.abort()  // runs on unmount or before next effect execution
//   }, [bookingId])

// ─────────────────────────────────────────────
// ISSUE 9 — Status colour from inline style (should use Tailwind class map)
// ─────────────────────────────────────────────

// Problem:
//   style={{ color: statusColors[booking.status] }}
//   — inline styles bypass Tailwind's utility system and are harder to maintain
//   — statusColors maps to plain colour names ('yellow', 'blue') which are not valid CSS
//     colour values in most contexts — they need to be hex/rgb or Tailwind class names
//   — inline styles cannot use Tailwind's responsive or dark-mode modifiers
//   — if booking.status is undefined or an unexpected value, statusColors[booking.status]
//     is undefined, resulting in style={{ color: undefined }} — no visual feedback

// Fix:
//   const statusClasses: Record<Booking['status'], string> = {
//     pending:   'text-yellow-600 bg-yellow-50',
//     confirmed: 'text-blue-600 bg-blue-50',
//     paid:      'text-green-600 bg-green-50',
//     cancelled: 'text-red-600 bg-red-50',
//   }
//   — apply with className={statusClasses[booking.status] ?? 'text-gray-600'}

// ─────────────────────────────────────────────
// ISSUE 10 — Nested interactive elements (<button> inside <div onClick>)
// ─────────────────────────────────────────────

// Problem:
//   <div onClick={handleConfirm}>
//     ...
//     <button>Confirm</button>
//   </div>
//   — the <div> fires handleConfirm on any click anywhere in the card
//   — the <button> click also bubbles up and triggers the div's handler
//   — clicking "Confirm" fires handleConfirm twice (once from button, once from div)
//   — this is semantically invalid HTML: interactive elements should not be nested

// Fix:
//   - Remove onClick from the outer <div>
//   - Move the confirm action exclusively to the <button onClick={handleConfirm}>
//   - If the whole card should be clickable for navigation, use a separate action:
//       <div role="group"> wrapping a Link for navigation + a button for the action

// ─────────────────────────────────────────────
// ISSUE 11 — No loading state shown to user
// ─────────────────────────────────────────────

// Problem:
//   useState(null) is the initial state but there is no isLoading flag
//   — the component renders nothing useful (or crashes, see Issue 3) while the fetch runs
//   — the user sees a blank space or an error with no indication that data is incoming

// Fix:
//   const [isLoading, setIsLoading] = useState(true)
//   — set to false in the .then() callback and in the .catch() callback
//   — render a <Skeleton /> or <Spinner /> while isLoading is true
//   — this also makes the null guard in Issue 3 cleaner (return early if isLoading)

// ─────────────────────────────────────────────
// ISSUE 12 — No error state
// ─────────────────────────────────────────────

// Problem:
//   fetch(...).then(...).then(data => setBooking(data))
//   — there is no .catch() handler on the fetch
//   — if the network request fails (no connection, 500 error, JSON parse error),
//     the Promise rejection is unhandled
//   — booking stays null, isLoading stays true (or is never set false), and the user
//     sees a blank card with no way to retry

// Fix:
//   const [error, setError] = useState<string | null>(null)
//   — add .catch(err => setError(err.message)) to the fetch chain
//   — render an error message with a "Retry" button when error is non-null:
//       if (error) return <div>Failed to load booking. <button onClick={refetch}>Retry</button></div>

// ─────────────────────────────────────────────
// FIXED COMPONENT OUTLINE — what the corrected version looks like
// ─────────────────────────────────────────────

// interface BookingCardProps { bookingId: number }

// const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

// export function BookingCard({ bookingId }: BookingCardProps)
//   — state: booking (Booking | null), isLoading (true), error (string | null), isConfirming (false)
//   — useEffect with [bookingId] dep:
//       create AbortController
//       setIsLoading(true), setError(null)
//       fetch with signal → res.json() → setBooking → finally setIsLoading(false)
//       catch AbortError separately (ignore it), catch real errors → setError
//       return () => controller.abort()
//   — if isLoading → return <BookingCardSkeleton />
//   — if error    → return <ErrorMessage message={error} onRetry={...} />
//   — if !booking → return null  (should not happen after loading resolves, but guards TypeScript)
//   — const formattedAmount = currencyFormatter.format(booking.amount)
//   — async handleConfirm():
//       setIsConfirming(true)
//       try: await fetch confirm endpoint, check res.ok, update booking state
//       catch: show error toast
//       finally: setIsConfirming(false)
//   — return (
//       <div className={statusClasses[booking.status]}>
//         <h2>{booking.school.name}</h2>
//         <p>{formattedAmount}</p>
//         <button onClick={handleConfirm} disabled={isConfirming}>
//           {isConfirming ? 'Confirming…' : 'Confirm'}
//         </button>
//       </div>
//     )
