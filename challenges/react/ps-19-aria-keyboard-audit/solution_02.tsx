// SOLUTION 02 — ARIA + keyboard fixes: input labels, return focus, axe-core testing
// Covers bugs 5 and 7, plus the bonus axe-core test pattern

// ─── BUG 5: FORM INPUTS HAVE NO ASSOCIATED LABELS ─────────────────────────────

// WCAG 1.3.1 Info and Relationships + 4.1.2 Name, Role, Value (both Level A):
// Every form input must have a programmatically associated label so that screen
// readers announce the purpose of the field when it receives focus.

// Using placeholder text alone is NOT sufficient:
//   - Placeholders disappear once the user types
//   - Screen readers do not consistently announce placeholders as labels
//   - axe-core flags "Form elements must have labels" as a Critical violation

// Fix option A — explicit <label> with htmlFor:
//   <label htmlFor="booking-note-input">Add note</label>
//   <input id="booking-note-input" type="text" placeholder="Add note..." />

//   <label htmlFor="booking-students-input">Number of students</label>
//   <input id="booking-students-input" type="number" placeholder="Students..." />

// Fix option B — aria-label directly on the input (when a visible label is
// undesirable for visual design reasons):
//   <input type="text" aria-label="Add note" placeholder="Add note..." />
//   <input type="number" aria-label="Number of students" placeholder="Students..." />

// Option A is preferred because it provides a visible label for all users,
// not just screen reader users. Visible labels also help users with cognitive
// disabilities and those using voice control ("click Add note").

// ─── BUG 7: FOCUS NOT RETURNED ON CLOSE ──────────────────────────────────────

// WCAG 2.4.3 Focus Order (Level A): when a dialog closes, focus should return to
// the element that triggered it. If focus is lost (e.g. drops to <body>), the
// keyboard user has no idea where they are in the page.

// Fix: save document.activeElement before the modal opens (in the parent or passed
// as a ref), and call .focus() on it when onClose is called.

// Pattern using a ref inside the modal itself:
//   const triggerElementRef = useRef<Element | null>(null)
//
//   useEffect(() => {
//     // Capture whatever was focused when the modal mounted
//     triggerElementRef.current = document.activeElement
//
//     // On unmount, return focus to the trigger
//     return () => {
//       (triggerElementRef.current as HTMLElement | null)?.focus()
//     }
//   }, [])

// The useEffect cleanup runs when the modal unmounts (i.e. when onClose causes
// the parent to stop rendering the modal). At that point, document.activeElement
// has moved to <body>, so we restore it to the saved trigger element.

// Alternative: pass the trigger ref as a prop from the parent:
//   <BookingModal booking={b} onClose={handleClose} triggerRef={openButtonRef} />
// This is useful when the trigger is a button in a list row — the ref is already
// managed in the parent and passed down.

// ─── BACKDROP CLICK BONUS ─────────────────────────────────────────────────────

// A good modal also closes when clicking the backdrop (the dark overlay).
// This must NOT close when the user clicks inside the modal content itself.

// Fix: attach onClick to the backdrop, check that the click target IS the backdrop:
//   <div
//     className="fixed inset-0 bg-black/50"
//     onClick={e => { if (e.target === e.currentTarget) onClose() }}
//   >

// e.target is the element the user actually clicked.
// e.currentTarget is the element with the onClick listener (the backdrop div).
// If they are the same, the user clicked the backdrop, not the modal content.

// ─── axe-CORE TESTING ────────────────────────────────────────────────────────

// After fixing all violations, verify with an automated accessibility test.
// Install: npm install --save-dev @axe-core/react jest-axe

// Test pattern:
//   import { render } from '@testing-library/react'
//   import { axe, toHaveNoViolations } from 'jest-axe'
//   expect.extend(toHaveNoViolations)

//   test('BookingModal has no accessibility violations', async () => {
//     const booking = { id: 1, schoolName: 'Westbrook Primary', status: 'pending', ... }
//     const { container } = render(<BookingModal booking={booking} onClose={() => {}} />)
//     const results = await axe(container)
//     expect(results).toHaveNoViolations()
//   })

// axe-core catches: missing labels, missing roles, colour contrast failures,
// missing alt text, duplicate IDs, and more. It does NOT catch focus management
// issues (those require manual keyboard testing or Playwright e2e tests).

// ─── FULL VIOLATION RESOLUTION CHECKLIST ─────────────────────────────────────

// Bug 1 → role="dialog" aria-modal="true" aria-labelledby on the inner card
// Bug 2 → useEffect focuses first focusable element on mount
// Bug 3 → aria-label="Close booking details modal" on the × button
// Bug 4 → status text visible + decorative dot marked aria-hidden="true"
// Bug 5 → <label htmlFor> or aria-label on both inputs
// Bug 6 → keydown listener for Escape in useEffect, cleaned up on unmount
// Bug 7 → capture document.activeElement on mount, restore it in cleanup
