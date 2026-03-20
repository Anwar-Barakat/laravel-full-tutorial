// SOLUTION 01 — ARIA + keyboard fixes: role, focus management, button label, colour
// Covers bugs 1–4 and Escape key (bug 6)

// ─── BUG 1: MISSING role="dialog" ────────────────────────────────────────────

// The outer backdrop div needs no role — it is purely visual.
// The inner container (the white card) is the actual dialog.
// Add these three attributes to the inner container div:

//   role="dialog"
//   aria-modal="true"
//   aria-labelledby="booking-modal-title"

// role="dialog" → tells screen readers this is a dialog overlay.
//   The reader announces "dialog" when focus enters, so the user knows
//   they are now in a modal context, not the main page.

// aria-modal="true" → tells screen readers that content BEHIND the modal
//   should be treated as inert (not navigable). Without this, NVDA and JAWS
//   users can still browse the background content with arrow keys.

// aria-labelledby="booking-modal-title" → points to the <h2>'s id.
//   The screen reader announces the dialog title when focus enters.
//   Add id="booking-modal-title" to the <h2>Booking Details</h2>.

// ─── BUG 2: NO FOCUS MANAGEMENT ON OPEN ──────────────────────────────────────

// When the modal opens, keyboard focus stays on whatever element was focused before
// (usually a button on the page behind the overlay). Screen reader users and
// keyboard users cannot access the modal content without tabbing through everything.

// Fix: in a useEffect that runs on mount, move focus into the modal.
//   useEffect(() => {
//     const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
//       'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
//     )
//     firstFocusable?.focus()
//   }, [])

// This moves focus to the close button (the first focusable element in the modal),
// which is the expected behaviour per ARIA Authoring Practices Guide (APG).

// For more control, accept an optional `initialFocus` ref prop and focus that
// element instead — useful when the "Confirm" button should receive initial focus.

// ─── BUG 3: CLOSE BUTTON HAS NO ACCESSIBLE LABEL ──────────────────────────────

// The button content is "×" (the multiplication sign). Screen readers announce this
// as "times" or simply skip it — it conveys nothing to a blind user.

// Fix: add aria-label with a descriptive name:
//   <button onClick={onClose} aria-label="Close booking details modal">×</button>

// The visible "×" is still shown but the accessible name overrides it for AT.
// The label should describe the action AND the context (not just "close") so the
// user knows what they are closing — especially if multiple modals can stack.

// Alternative: replace the × with a visually hidden span:
//   <button onClick={onClose}>
//     <span aria-hidden="true">×</span>
//     <span className="sr-only">Close booking details modal</span>
//   </button>
// Both approaches are valid. aria-label is simpler for a single character.

// ─── BUG 4: STATUS COMMUNICATED ONLY BY COLOUR ────────────────────────────────

// WCAG 1.4.1 Use of Colour (Level A): colour must not be the sole visual means
// of conveying information. A user with colour blindness, or using a screen reader,
// cannot distinguish "pending" (orange) from "confirmed" (green) from the coloured
// dot alone.

// Fix: include the status text in the visible output. The coloured dot can remain
// as a decorative visual indicator, but it must be supplemented with text:

//   <dd>
//     {booking.status}           ← visible text (satisfies 1.4.1)
//     <span aria-hidden="true" style={{ color: ... }}> ●</span>
//     {/* aria-hidden hides the decorative dot from screen readers — the text alone is enough */}
//   </dd>

// The status text itself ("pending", "confirmed", "cancelled") is unambiguous.
// You may also capitalise or translate it: "Pending", "Confirmed", "Cancelled".

// ─── BUG 6: ESCAPE KEY DOES NOT CLOSE MODAL ──────────────────────────────────

// WCAG 2.1.2 No Keyboard Trap (Level A) and ARIA dialog pattern both require
// that pressing Escape closes the modal and returns focus to the trigger.

// Fix: in the same useEffect, add a keydown listener:

//   useEffect(() => {
//     function handleKeyDown(e: KeyboardEvent) {
//       if (e.key === 'Escape') onClose()
//     }
//     document.addEventListener('keydown', handleKeyDown)
//     return () => document.removeEventListener('keydown', handleKeyDown)
//   }, [onClose])

// Attach to document so it fires regardless of which element is focused inside
// the modal. The cleanup removes the listener when the modal unmounts.

// onClose must be stable across renders (useCallback in the parent) to avoid
// stale closures recreating the listener on every render.

// ─── COMBINED ATTRIBUTE SUMMARY ──────────────────────────────────────────────

// Outer backdrop div     → no changes needed (purely visual)
// Inner card div         → role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" ref={modalRef}
// <h2>                   → id="booking-modal-title"
// Close <button>         → aria-label="Close booking details modal"
// Status <dd>            → text content + aria-hidden decorative dot
// useEffect              → focus first focusable + keydown Escape listener + cleanup
