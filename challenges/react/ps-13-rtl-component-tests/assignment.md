# Challenge 13: RTL Component Tests (BUILD)

**Topic:** Write React Testing Library tests for a booking component

**Context:** Tripz — Laravel + React school booking platform

---

## Task

Write a complete test suite for the `BookingCard` component using React Testing Library and Vitest.

You must write **at minimum 10 test cases** covering:

- Rendering: school name, status badge, formatted amount
- Conditional button rendering based on booking status
- Correct CSS class applied for each status
- Currency formatting (GBP) using `Intl.NumberFormat`
- Click interactions: confirm and cancel callbacks
- Loading state while confirming (disabled button, changed label)
- Callback argument correctness (called with the right ID)
- Buttons absent for non-applicable statuses (e.g. paid, cancelled)

---

## Component Under Test

```tsx
import { useState } from 'react'

interface Booking {
  id:         number
  schoolName: string
  status:     'pending' | 'confirmed' | 'paid' | 'cancelled'
  amount:     number
}

interface BookingCardProps {
  booking:   Booking
  onConfirm: (id: number) => void
  onCancel:  (id: number) => void
}

export function BookingCard({ booking, onConfirm, onCancel }: BookingCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP'
  }).format(booking.amount)

  async function handleConfirm() {
    setIsConfirming(true)
    await onConfirm(booking.id)
    setIsConfirming(false)
  }

  return (
    <div data-testid="booking-card">
      <h3 data-testid="school-name">{booking.schoolName}</h3>
      <span data-testid="status" className={`status-${booking.status}`}>
        {booking.status}
      </span>
      <span data-testid="amount">{formattedAmount}</span>

      {booking.status === 'pending' && (
        <button
          data-testid="confirm-btn"
          onClick={handleConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? 'Confirming...' : 'Confirm'}
        </button>
      )}

      {['pending', 'confirmed'].includes(booking.status) && (
        <button data-testid="cancel-btn" onClick={() => onCancel(booking.id)}>
          Cancel
        </button>
      )}
    </div>
  )
}
```

---

## Starter Test File

Create `BookingCard.test.tsx` and fill in the missing tests:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { BookingCard } from './BookingCard'

// TODO: define a reusable mock booking object here

describe('BookingCard', () => {

  // TODO: test 1 — renders school name

  // TODO: test 2 — renders formatted amount in GBP

  // TODO: test 3 — renders status text

  // TODO: test 4 — applies correct CSS class for status

  // TODO: test 5 — shows confirm and cancel buttons when status is pending

  // TODO: test 6 — hides confirm button when status is confirmed

  // TODO: test 7 — hides both buttons when status is paid

  // TODO: test 8 — hides both buttons when status is cancelled

  // TODO: test 9 — clicking confirm calls onConfirm with correct booking id

  // TODO: test 10 — confirm button shows 'Confirming...' and is disabled while confirming

  // TODO: test 11 — clicking cancel calls onCancel with correct booking id

  // TODO: test 12 — confirm button re-enables after confirmation completes
})
```

---

## Requirements

- Use `vi.fn()` for all callback mocks
- Use `userEvent` (not `fireEvent`) for interactions
- Use `await waitFor()` for async state assertions
- All assertions must use `@testing-library/jest-dom` matchers
- Do not test implementation details — test what the user sees

---

## Expected Output

All 12+ tests pass with `npx vitest run`.
```
✓ BookingCard > renders school name
✓ BookingCard > renders formatted amount in GBP
✓ BookingCard > renders status text
✓ BookingCard > applies correct CSS class for status
✓ BookingCard > shows confirm and cancel buttons when pending
✓ BookingCard > hides confirm button when confirmed
✓ BookingCard > hides both buttons when paid
✓ BookingCard > hides both buttons when cancelled
✓ BookingCard > clicking confirm calls onConfirm with correct id
✓ BookingCard > confirm button shows Confirming... and is disabled
✓ BookingCard > clicking cancel calls onCancel with correct id
✓ BookingCard > confirm button re-enables after completion
```
