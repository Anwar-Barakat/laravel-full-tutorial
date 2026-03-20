# Challenge 20 — Build a Focus Trap and Accessible Modal from Scratch

**Format:** BUILD
**Topic:** Implement a fully accessible `BaseModal` component with a hand-rolled focus trap — no external focus-trap libraries.

---

## Context

You are building a component library for the **Tripz** school booking platform. The design system needs a `BaseModal` that is accessible by default, so that feature teams cannot accidentally ship inaccessible modals by forgetting ARIA attributes or Escape key handling. Everything must be built from first principles — no `focus-trap-react` or similar dependencies.

---

## Requirements

### Functional requirements

1. `role="dialog"` with `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`
2. **Focus trap** — Tab cycles through focusable elements inside the modal only; focus never escapes to the page behind
3. **Shift+Tab** cycles backwards through focusable elements
4. **Escape key** closes the modal
5. On open: focus moves to the first focusable element inside the modal (or `initialFocus` if provided)
6. On close: focus returns to the element that was focused when the modal opened
7. **Backdrop click** closes the modal (clicking inside the modal content does NOT close it)
8. **Scroll lock** — `document.body.style.overflow = 'hidden'` while modal is open
9. **Named regions** — title slot, content slot (children), optional footer slot
10. **Animation** — fade in on open, fade out on close (handle unmounting correctly)

### Non-requirements (out of scope for this challenge)

- Nested modals (stacking)
- Server-side rendering
- IE11 support

---

## Types

```typescript
interface BaseModalProps {
  isOpen:        boolean
  onClose:       () => void
  title:         string
  children:      React.ReactNode
  footer?:       React.ReactNode
  initialFocus?: React.RefObject<HTMLElement>  // custom focus target on open
  description?:  string                        // for aria-describedby
}
```

---

## Focus Trap — How It Works

A focus trap intercepts Tab and Shift+Tab key events and manually redirects focus:

```
[Close ×]  [School input]  [Students input]  [Cancel btn]  [Confirm btn]
    ↑                                                              ↓
    └──────────────────── Shift+Tab ◄────────────────────────────┘
    └──────────────────── Tab ────────────────────────────────────►┘
```

Focusable elements selector (standard):
```
'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]),
 textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
```

---

## Expected Usage

```tsx
function BookingConfirmModal({ booking, isOpen, onOpen, onClose }) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button ref={/* trigger ref */} onClick={onOpen}>
        Confirm Booking
      </button>

      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Confirm Booking"
        description="Review the booking details before confirming."
        initialFocus={confirmButtonRef}
        footer={
          <>
            <button onClick={onClose}>Cancel</button>
            <button ref={confirmButtonRef} onClick={handleConfirm}>
              Confirm
            </button>
          </>
        }
      >
        <p>School: {booking.schoolName}</p>
        <p>Date: {booking.date}</p>
        <p>Students: {booking.studentCount}</p>
      </BaseModal>
    </>
  )
}
```

---

## Starter Shell

```tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface BaseModalProps {
  isOpen:        boolean
  onClose:       () => void
  title:         string
  children:      React.ReactNode
  footer?:       React.ReactNode
  initialFocus?: React.RefObject<HTMLElement>
  description?:  string
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  initialFocus,
  description,
}: BaseModalProps) {
  const backdropRef  = useRef<HTMLDivElement>(null)
  const modalRef     = useRef<HTMLDivElement>(null)
  const savedFocusRef = useRef<HTMLElement | null>(null)
  const titleId      = 'modal-title'
  const descId       = 'modal-desc'

  // TODO: save trigger element on open, restore on close
  // TODO: scroll lock
  // TODO: move focus to initialFocus or first focusable element
  // TODO: Escape key listener
  // TODO: Tab / Shift+Tab focus trap
  useEffect(() => {

  }, [isOpen, onClose, initialFocus])

  // TODO: backdrop click handler
  function handleBackdropClick(e: React.MouseEvent) {

  }

  if (!isOpen) return null

  // TODO: wrap in createPortal targeting document.getElementById('modals')
  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId}>{title}</h2>
          <button onClick={onClose} aria-label={`Close ${title} modal`}>×</button>
        </div>

        {description && <p id={descId} className="sr-only">{description}</p>}

        <div>{children}</div>

        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
```
