// SOLUTION 01 — BaseModal: focus trap implementation, scroll lock, Escape key
// Focus: the core useEffect that wires together all keyboard and focus behaviour

// ─── SAVING AND RESTORING FOCUS ───────────────────────────────────────────────

// Before moving focus into the modal, save whatever element currently has focus.
// This is the "trigger" element — the button the user clicked to open the modal.

// Inside the useEffect (runs when isOpen changes):
//   if (isOpen) {
//     savedFocusRef.current = document.activeElement as HTMLElement
//   }

// document.activeElement is the DOM node that currently has focus.
// Cast to HTMLElement so we can call .focus() on it later.
// Store it in a ref (not state) — we do not want a re-render when we save it.

// On close, restore focus in the cleanup or in the isOpen === false branch:
//   if (!isOpen) {
//     savedFocusRef.current?.focus()
//   }

// ─── MOVING FOCUS INTO THE MODAL ──────────────────────────────────────────────

// After saving the trigger element, move focus inside the modal.
// Wait one tick (requestAnimationFrame or setTimeout 0) to ensure the modal
// has rendered and is in the DOM before querying focusable elements.

//   requestAnimationFrame(() => {
//     const target = initialFocus?.current
//       ?? modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
//     target?.focus()
//   })

// Priority order:
//   1. initialFocus prop (custom element specified by consumer — e.g. Confirm button)
//   2. First element matching FOCUSABLE_SELECTOR inside the modal container
//   3. The modal container itself (if nothing else is focusable — set tabIndex={-1})

// ─── SCROLL LOCK ─────────────────────────────────────────────────────────────

// While the modal is open, prevent the page behind from scrolling:
//   document.body.style.overflow = 'hidden'

// Restore it when the modal closes (in cleanup function):
//   return () => {
//     document.body.style.overflow = ''
//   }

// Setting overflow to empty string (not 'auto') restores whatever the original
// value was — usually the browser default. Avoid hardcoding 'auto' because some
// pages use 'scroll' or 'visible' as their default body overflow.

// ─── ESCAPE KEY HANDLER ───────────────────────────────────────────────────────

// Add a keydown listener on document so it fires regardless of which element
// inside the modal is focused:

//   function handleKeyDown(e: KeyboardEvent) {
//     if (e.key === 'Escape') {
//       e.preventDefault()   // prevent browser default (e.g. exiting fullscreen)
//       onClose()
//     }
//   }
//   document.addEventListener('keydown', handleKeyDown)

// Clean up in the return:
//   return () => document.removeEventListener('keydown', handleKeyDown)

// ─── FOCUS TRAP: TAB AND SHIFT+TAB ────────────────────────────────────────────

// The focus trap intercepts Tab to keep focus cycling within the modal.

// Step 1: query all focusable elements inside the modal container:
//   const focusableElements = Array.from(
//     modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
//   )
//   const firstElement = focusableElements[0]
//   const lastElement  = focusableElements[focusableElements.length - 1]

// Step 2: in the keydown handler, check for Tab:
//   if (e.key === 'Tab') {
//     if (e.shiftKey) {
//       // Shift+Tab: if currently on the first element, wrap to last
//       if (document.activeElement === firstElement) {
//         e.preventDefault()
//         lastElement.focus()
//       }
//     } else {
//       // Tab: if currently on the last element, wrap to first
//       if (document.activeElement === lastElement) {
//         e.preventDefault()
//         firstElement.focus()
//       }
//     }
//   }

// e.preventDefault() stops the browser from moving focus to the next element
// in the natural DOM order (which would escape the modal). We manually focus
// the wrap-around target instead.

// ─── COMBINED useEffect STRUCTURE ────────────────────────────────────────────

// useEffect(() => {
//   if (!isOpen) return

//   savedFocusRef.current = document.activeElement as HTMLElement
//   document.body.style.overflow = 'hidden'

//   requestAnimationFrame(() => {
//     const target = initialFocus?.current
//       ?? modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
//     target?.focus()
//   })

//   function handleKeyDown(e: KeyboardEvent) {
//     if (e.key === 'Escape') { e.preventDefault(); onClose(); return }

//     if (e.key === 'Tab') {
//       const focusable = Array.from(
//         modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
//       )
//       const first = focusable[0]
//       const last  = focusable[focusable.length - 1]
//       if (e.shiftKey && document.activeElement === first) {
//         e.preventDefault(); last.focus()
//       } else if (!e.shiftKey && document.activeElement === last) {
//         e.preventDefault(); first.focus()
//       }
//     }
//   }

//   document.addEventListener('keydown', handleKeyDown)

//   return () => {
//     document.removeEventListener('keydown', handleKeyDown)
//     document.body.style.overflow = ''
//     savedFocusRef.current?.focus()
//   }
// }, [isOpen, onClose, initialFocus])

// ─── WHY ONE useEffect HANDLES EVERYTHING ────────────────────────────────────

// All four concerns (saved focus, scroll lock, focus move, key listener) are
// tied to the same lifecycle: mount when isOpen becomes true, clean up when it
// becomes false. Keeping them in one effect ensures they always run and clean up
// together — no risk of one running without the other.
