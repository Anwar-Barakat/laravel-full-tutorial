# Challenge 10 — Memo / useCallback / useMemo Refactor

**Format:** REFACTOR
**Topic:** Add memo, useCallback, and useMemo correctly to a slow component

---

## Context

The Tripz analytics panel renders on every keystroke in the parent's search bar, even though the booking data has not changed. Inside the component, a complex stats calculation runs from scratch on every render — including an O(n²) nested reduce that gets noticeably slow with large booking lists.

Your job is to add `React.memo`, `useMemo`, and `useCallback` in the right places, fix the algorithmic inefficiency, and explain every decision.

---

## Code to Optimise

```tsx
import { useState } from 'react'

interface Booking {
  id: number
  schoolName: string
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
}

interface Props {
  bookings: Booking[]
  onStatusChange: (id: number, status: string) => void
  currencyCode: string
}

function BookingAnalytics({ bookings, onStatusChange, currencyCode }: Props) {
  // Expensive calculation — runs on every render even when bookings hasn't changed
  const stats = {
    total: bookings.length,
    revenue: bookings
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0),
    pending: bookings.filter(b => b.status === 'pending').length,
    topSchool: bookings.reduce((top, b) => {
      // Bug: O(n²) — this inner reduce runs once per booking in the outer reduce
      const counts = bookings.reduce(
        (acc, x) => ({ ...acc, [x.schoolName]: (acc[x.schoolName] || 0) + 1 }),
        {} as Record<string, number>
      )
      return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? ''
    }, ''),
  }

  // Formatter object created on every render (Intl.NumberFormat instantiation is not free)
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currencyCode,
  })

  // Handlers recreated on every render — breaks React.memo on BookingRow
  const handleConfirm = (id: number) => onStatusChange(id, 'confirmed')
  const handleCancel  = (id: number) => onStatusChange(id, 'cancelled')

  return (
    <div>
      <p>Revenue: {formatter.format(stats.revenue)}</p>
      <p>Pending: {stats.pending}</p>
      <p>Top School: {stats.topSchool}</p>
      {bookings.map(b => (
        <BookingRow
          key={b.id}
          booking={b}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ))}
    </div>
  )
}

function BookingRow({
  booking,
  onConfirm,
  onCancel,
}: {
  booking: Booking
  onConfirm: (id: number) => void
  onCancel:  (id: number) => void
}) {
  console.log(`BookingRow ${booking.id} rendered`)
  return (
    <div>
      <span>{booking.schoolName}</span>
      <button onClick={() => onConfirm(booking.id)}>Confirm</button>
      <button onClick={() => onCancel(booking.id)}>Cancel</button>
    </div>
  )
}
```

---

## Requirements

1. Wrap `BookingAnalytics` in `React.memo` so it does not re-render when the parent re-renders with identical props.
2. Memoize the `stats` object with `useMemo`. Choose the correct dependency array.
3. **Fix the O(n²) algorithm** inside `topSchool` before memoising it — the `reduce` inside `reduce` must become a single pass.
4. Memoize the `formatter` with `useMemo`. Choose the correct dependency array.
5. Stabilise `handleConfirm` and `handleCancel` with `useCallback`. Choose the correct dependency arrays.
6. Wrap `BookingRow` in `React.memo` so it only re-renders when its own props change.
7. For each change, add a **brief comment** explaining *why* this optimisation is applied here.

---

## Expected Output

After refactoring:
- Parent re-renders (e.g. from search input) do **not** cause `BookingAnalytics` to re-render when `bookings`, `onStatusChange`, and `currencyCode` are unchanged.
- Changing `currencyCode` causes `formatter` to be recreated and the component to re-render.
- Changing `bookings` causes `stats` to be recalculated.
- `BookingRow` components only re-render when their individual `booking` prop changes.
- The `topSchool` computation completes in O(n) instead of O(n²).

---

## Hints

- `useMemo(() => value, [deps])` — recalculates only when `deps` changes
- `useCallback(fn, [deps])` — returns a stable function reference; only changes when `deps` changes
- `React.memo(Component)` — skips re-render if all props are shallowly equal
- All three must cooperate: `React.memo` on `BookingRow` is only effective if the function props passed to it are stable (i.e. wrapped in `useCallback`)
- Ask yourself before each optimisation: "Is the cost of this calculation or re-render actually high enough to justify the added complexity?"
