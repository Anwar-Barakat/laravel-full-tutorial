# Challenge 04: Find and Fix Stale Closure and useEffect Bugs

**Format:** DEBUG
**App:** Tripz — Laravel + React school booking platform
**Topic:** Diagnose and fix four classic React hook bugs

---

## Context

The Tripz codebase has accumulated some subtle hook bugs that pass code review but cause real problems in production. Your task is to identify exactly what is wrong with each component, explain why it happens at the JavaScript/React level, and describe the correct fix.

---

## Instructions

For each bug below:
1. Identify the exact line with the problem
2. Explain what goes wrong and why (not just "missing dependency" — explain the mechanism)
3. Describe the correct fix

---

## Bug 1 — Stale Counter

```tsx
function BookingCounter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1)  // ← problem here
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return <div>Count: {count}</div>
}
// Observed behaviour: count shows 1 after the first second, then never changes
```

**Question:** Why does `count` never go above 1, even though `setInterval` keeps firing?

---

## Bug 2 — Missing Dependency

```tsx
function BookingDetail({ bookingId }: { bookingId: number }) {
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then(res => res.json())
      .then(setBooking)
  }, [])  // ← bookingId is missing from the dependency array

  return <div>{booking?.schoolName}</div>
}
// Observed behaviour: navigating from booking #1 to booking #2 still shows booking #1's data
```

**Question:** Why does the component show stale data when `bookingId` changes?

---

## Bug 3 — No Cleanup

```tsx
function LiveBookingStatus({ bookingId }: { bookingId: number }) {
  const [status, setStatus] = useState('')

  useEffect(() => {
    const ws = new WebSocket(`wss://api.tripz.com/bookings/${bookingId}`)
    ws.onmessage = (e) => setStatus(JSON.parse(e.data).status)
    // ← no cleanup function returned
  }, [bookingId])

  return <div>Status: {status}</div>
}
// Observed behaviour: after clicking through several bookings, the app becomes slow
// and status updates appear from multiple bookings simultaneously
```

**Question:** What exactly happens when `bookingId` changes and there is no cleanup?

---

## Bug 4 — Object in Dependency Array Causes Infinite Loop

```tsx
function BookingList({ filters }: { filters: { status: string } }) {
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    fetch(`/api/bookings?status=${filters.status}`)
      .then(res => res.json())
      .then(setBookings)
  }, [filters])  // ← object reference changes on every render

  return <div>{bookings.length} bookings</div>
}
// Observed behaviour: the network tab shows continuous non-stop API requests
```

**Question:** Why does putting `filters` in the dependency array cause an infinite loop even when the filter values do not change?

---

## Expected Output

A written explanation for each bug covering:
- The exact mechanism (not just the symptom)
- Why the React/JavaScript model causes this specific behaviour
- The minimal correct fix
- Any alternative fixes and their trade-offs

---

## Hints

- Bug 1: Think about closures and when the callback function is created vs. when it runs
- Bug 2: The effect function is a closure — what values does it "remember" from when it was created?
- Bug 3: Count how many WebSocket connections exist after clicking through 5 different bookings
- Bug 4: Try `console.log(filters === filters)` in two consecutive renders — what do you expect?
