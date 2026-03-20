# Challenge 02: Code Review — Find All Problems in This React Component

**Format:** REVIEW
**App:** Tripz — Laravel + React school booking platform
**Topic:** Identify every bug, performance issue, TypeScript problem, and anti-pattern

---

## Context

A junior developer on the Tripz team wrote the following `BookingCard` component. It was shipped to staging and the QA team immediately flagged it as broken. The component is supposed to fetch a booking by ID, display the school name and formatted amount, and let admins confirm the booking.

Your job is to review the code thoroughly and list every problem you can find.

---

## Code to Review

```tsx
export function BookingCard({ bookingId }) {
  const [booking, setBooking] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then(res => res.json())
      .then(data => setBooking(data))
  })

  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(booking.amount)

  function handleConfirm() {
    fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' })
    setCount(count + 1)
  }

  const statusColors = {
    pending:   'yellow',
    confirmed: 'blue',
    paid:      'green',
    cancelled: 'red',
  }

  return (
    <div onClick={handleConfirm} style={{ color: statusColors[booking.status] }}>
      <h2>{booking.school.name}</h2>
      <p>{formattedAmount}</p>
      <button>Confirm</button>
    </div>
  )
}
```

---

## Requirements

Find and explain **at least 8 distinct problems** in the component above. For each problem:

1. State what the problem is
2. Explain why it causes a bug or is problematic
3. Describe how to fix it

Problems may be in any of these categories:

- React anti-patterns (misuse of hooks or JSX)
- Performance issues (unnecessary re-renders, wasteful computations)
- Bugs (crashes, incorrect behaviour, wrong output)
- TypeScript issues (missing or incorrect types)
- Accessibility violations (keyboard, screen reader, semantic HTML)
- Memory leaks or resource cleanup failures

---

## Hints

- Read every line carefully — there is at least one problem in nearly every section of the code
- Some problems are subtle; think about what happens on the very first render
- Some problems are about what is missing entirely, not just what is wrong
- Consider what happens when the component unmounts while a fetch is in-flight
- Consider what happens when `bookingId` prop changes after the component has mounted
