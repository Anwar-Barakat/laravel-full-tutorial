# Challenge 19 — ARIA and Keyboard Accessibility Audit

**Format:** AUDIT
**Topic:** Find and fix all ARIA and keyboard accessibility violations in a modal component.

---

## Context

You are working on the **Tripz** school booking platform. The `BookingModal` component has been flagged by QA after running an **axe-core** audit. It reports **7 accessibility violations**. Some are blocking (users with screen readers cannot use the modal at all), some are serious (keyboard-only users are trapped behind the modal), and some are moderate (colour-only status information).

Your job is to identify each violation, explain why it fails WCAG 2.1, and apply the correct fix.

---

## Broken Code

```tsx
function BookingModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    // Bug 1: plain <div> — no role, no ARIA attributes
    <div className="fixed inset-0 bg-black/50">
      {/* Bug 2: no focus management — focus stays on whatever had it before */}
      <div className="bg-white rounded-lg p-6 max-w-md mx-auto mt-20">

        {/* Bug 3: close button has no accessible label — screen reader says "times" or nothing */}
        <button onClick={onClose}>×</button>

        <h2>Booking Details</h2>

        <dl>
          <dt>School</dt>
          <dd>{booking.schoolName}</dd>
          <dt>Status</dt>
          {/* Bug 4: status communicated only by colour — fails WCAG 1.4.1 */}
          <dd style={{ color: booking.status === 'pending' ? 'orange' : 'green' }}>
            ●
          </dd>
        </dl>

        {/* Bug 5: form inputs have no labels — fails WCAG 1.3.1 and 4.1.2 */}
        <input type="text" placeholder="Add note..." />
        <input type="number" placeholder="Students..." />

        {/* Bug 6: Escape key does not close the modal */}
        <div>
          <button onClick={onClose}>Cancel</button>
          <button>Confirm Booking</button>
        </div>
      </div>
    </div>
  )
}
```

---

## Types

```typescript
type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

interface Booking {
  id: number
  schoolName: string
  date: string
  status: BookingStatus
  studentCount: number
  notes?: string
}
```

---

## Requirements

Find and fix all 7 accessibility violations. For each fix:

- Name the WCAG success criterion it violates
- Apply the correct ARIA attribute or structural fix
- Do not change the visual design — only fix the accessibility layer

### Violations Checklist

| # | Category | Description |
|---|----------|-------------|
| 1 | Role | Outer container is not a dialog |
| 2 | Focus | Focus is not moved into the modal on open |
| 3 | Label | Close button has no accessible name |
| 4 | Colour | Status is communicated only via colour |
| 5 | Label | Form inputs have no associated labels |
| 6 | Keyboard | Escape key does not close the modal |
| 7 | Focus | Focus is not returned to the trigger element on close |

### WCAG References

- **1.3.1** Info and Relationships — structure must be programmatically determinable
- **1.4.1** Use of Colour — colour must not be the sole means of conveying information
- **2.1.1** Keyboard — all functionality must be operable via keyboard
- **2.4.3** Focus Order — focus must move to the modal and return on close
- **4.1.2** Name, Role, Value — all UI components must have accessible names and roles

---

## Starter Shell

```tsx
import { useEffect, useRef } from 'react'

function BookingModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null)

  // TODO: focus trap on mount, return focus on close
  // TODO: Escape key listener
  useEffect(() => {

  }, [onClose])

  return (
    // TODO: add role="dialog", aria-modal, aria-labelledby
    <div className="fixed inset-0 bg-black/50">
      <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md mx-auto mt-20">

        {/* TODO: fix close button label */}
        <button onClick={onClose}>×</button>

        {/* TODO: give this an id to match aria-labelledby */}
        <h2>Booking Details</h2>

        <dl>
          <dt>School</dt>
          <dd>{booking.schoolName}</dd>
          <dt>Status</dt>
          {/* TODO: fix colour-only status */}
          <dd style={{ color: booking.status === 'pending' ? 'orange' : 'green' }}>
            ●
          </dd>
        </dl>

        {/* TODO: associate labels with inputs */}
        <input type="text" placeholder="Add note..." />
        <input type="number" placeholder="Students..." />

        <div>
          <button onClick={onClose}>Cancel</button>
          <button>Confirm Booking</button>
        </div>
      </div>
    </div>
  )
}
```
