// SOLUTION 01 — Bugs 1, 2, and 3: stale closure, missing dependency, missing cleanup
// This file contains no executable code — it is a comment-only solution skeleton.

// ─────────────────────────────────────────────
// BUG 1 — Stale closure in setInterval
// ─────────────────────────────────────────────

// Root cause — closure capture at creation time:
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setCount(count + 1)   // 'count' here is ALWAYS 0
//     }, 1000)
//     return () => clearInterval(interval)
//   }, [])
//
//   — the deps array is [] so this effect runs once, on mount, and never again
//   — the setInterval callback is created at mount time, when count === 0
//   — JavaScript closures capture variables by reference to their scope, but 'count'
//     is a const in a specific render's scope — it is frozen at 0 forever in this closure
//   — every time the interval fires: setCount(0 + 1) → count becomes 1
//   — React re-renders, but the interval callback still has the old closure over count=0
//   — next tick: setCount(0 + 1) again → count is already 1, no change → no re-render
//   — result: count oscillates between 0 and 1 and appears stuck at 1

// Why [] makes it worse:
//   If deps included [count], React would re-run the effect on each count change,
//   creating a fresh closure with the new count value — but also clearing and restarting
//   the interval on every tick, which defeats the purpose.

// Fix — functional updater form:
//   setCount(prev => prev + 1)
//   — the functional form does not close over 'count' at all
//   — React passes the current state value as 'prev' at the moment of execution
//   — the closure no longer needs to capture 'count', so the stale value is irrelevant
//   — the interval can safely have [] deps: it fires forever, always incrementing correctly

// ─────────────────────────────────────────────
// BUG 2 — Missing dependency: stale bookingId in effect closure
// ─────────────────────────────────────────────

// Root cause — effect only runs on mount:
//   useEffect(() => {
//     fetch(`/api/bookings/${bookingId}`)   // bookingId captured at mount
//       .then(setBooking)
//   }, [])
//
//   — same closure mechanism as Bug 1: the effect function is created on mount
//   — 'bookingId' inside the closure is the value from the first render (e.g. 1)
//   — when the parent renders <BookingDetail bookingId={2} />, the component re-renders
//     and the new render has bookingId=2, but the effect does NOT re-run ([] deps)
//   — the fetch from mount (bookingId=1) already resolved; booking state holds booking #1
//   — the component re-renders with the new prop but no new fetch; shows stale data

// The mechanism in detail:
//   Render 1: bookingId=1, effect fires → fetches /api/bookings/1 → sets booking to #1
//   Render 2: bookingId=2, effect does NOT fire ([] means "run once") → booking is still #1
//   User sees booking #1's data with bookingId=2 — silently wrong

// Fix — add bookingId to deps:
//   useEffect(() => { fetch(...) }, [bookingId])
//   — now the effect re-runs whenever bookingId changes
//   — a new closure is created for each run, capturing the current bookingId
//   — each closure fetches the correct booking
//   — also add AbortController cleanup so the previous fetch is cancelled when
//     bookingId changes mid-flight (avoids race condition: old response arriving after new one)

// ─────────────────────────────────────────────
// BUG 3 — No cleanup: WebSocket connections leak
// ─────────────────────────────────────────────

// Root cause — effect has no return value:
//   useEffect(() => {
//     const ws = new WebSocket(`wss://api.tripz.com/bookings/${bookingId}`)
//     ws.onmessage = (e) => setStatus(JSON.parse(e.data).status)
//     // no return () => ws.close()
//   }, [bookingId])
//
//   — React calls the effect cleanup before re-running the effect (when deps change)
//     and on component unmount
//   — without a cleanup, the old WebSocket is never closed when bookingId changes
//   — each new bookingId creates a new WebSocket; old ones remain open and active

// What happens after clicking through 5 bookings:
//   ws1: connected to booking/1, onmessage fires setStatus (component still mounted)
//   ws2: connected to booking/2, ws1 is still open and still fires setStatus
//   ws3: connected to booking/3, ws1 + ws2 still open
//   ws4: connected to booking/4, three old connections still active
//   ws5: connected to booking/5, four old connections still active
//   — status updates arrive from all 5 connections simultaneously
//   — the displayed status flickers between values from different bookings
//   — browser memory and connection pool are exhausted over time

// Fix — return cleanup function that closes the socket:
//   useEffect(() => {
//     const ws = new WebSocket(...)
//     ws.onmessage = (e) => setStatus(JSON.parse(e.data).status)
//     return () => ws.close()   // ← this is the entire fix
//   }, [bookingId])
//   — when bookingId changes: cleanup runs (ws.close()) → new effect runs (new WebSocket)
//   — on unmount: cleanup runs (ws.close()) → no dangling connection
//   — at any moment, exactly one WebSocket connection exists per mounted component
