// SOLUTION 02 — BaseModal: backdrop click, animation, portal, aria-describedby
// Focus: structural and visual concerns — rendering strategy, portal, animation

// ─── BACKDROP CLICK: CLOSE ONLY WHEN CLICKING THE BACKDROP ITSELF ─────────────

// The backdrop div covers the whole screen. Clicks on the white modal card
// bubble up to the backdrop via event propagation — we must distinguish between
// "clicked the dark overlay" and "clicked inside the card".

// Handler on the backdrop div:
//   function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
//     if (e.target === e.currentTarget) {
//       onClose()
//     }
//   }

// e.target       → the element the user actually clicked on
// e.currentTarget → the element with the onClick listener (the backdrop div)

// If they are the same, the user clicked the backdrop (not something inside it).
// If e.target is a child (button, input, the modal card), they are different → do nothing.

// Do NOT use stopPropagation on the modal content — that breaks other listeners
// (e.g. analytics, outside-click detection in dropdowns).

// ─── PORTAL: RENDER OUTSIDE THE COMPONENT TREE ───────────────────────────────

// Modals should render as children of <body> (or a dedicated #modals container),
// not inside the component that opens them. This avoids z-index and overflow:hidden
// clipping issues — a parent div with overflow:hidden would hide a modal inside it.

// In index.html, add: <div id="modals"></div>

// In the component, wrap the JSX with createPortal:
//   return createPortal(
//     <div ref={backdropRef} ...>{/* modal content */}</div>,
//     document.getElementById('modals')!
//   )

// The modal's React event handlers and context still work normally — portals only
// change where in the DOM the output appears, not where it sits in the React tree.
// Context from parent providers (QueryClient, ThemeProvider, etc.) is still accessible.

// ─── ANIMATION: FADE IN / FADE OUT ───────────────────────────────────────────

// The challenge: we want a fade-out animation before unmounting. But if we just
// render null when isOpen === false, the DOM node disappears instantly with no
// animation.

// Solution A — CSS + isVisible state:
//   const [isVisible, setIsVisible] = useState(false)
//   useEffect(() => {
//     if (isOpen) setIsVisible(true)
//     // on close, delay unmounting until CSS transition finishes
//   }, [isOpen])

//   function handleTransitionEnd() {
//     if (!isOpen) setIsVisible(false)   // actually unmount after fade-out completes
//   }

//   Apply CSS class conditionally:
//   className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
//   onTransitionEnd={handleTransitionEnd}

//   isVisible controls whether the modal is in the DOM at all.
//   isOpen controls the opacity class (which drives the CSS transition).
//   The sequence: isOpen false → opacity transitions to 0 → onTransitionEnd → isVisible false → DOM removed.

// Solution B — Framer Motion AnimatePresence:
//   <AnimatePresence>
//     {isOpen && (
//       <motion.div
//         key="modal-backdrop"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         transition={{ duration: 0.2 }}
//       >
//         ...modal content...
//       </motion.div>
//     )}
//   </AnimatePresence>

//   AnimatePresence detects when a child is removed from the JSX tree, runs its
//   exit animation, then removes the DOM node. Cleaner code, but adds a dependency.
//   For a component library, the CSS approach keeps dependencies minimal.

// ─── aria-describedby ─────────────────────────────────────────────────────────

// aria-describedby supplements aria-labelledby. The title is the label (announced
// first); the description provides additional context (announced after a pause).

// Set aria-describedby on the dialog element only when a description exists:
//   aria-describedby={description ? descId : undefined}

// The description paragraph can be visually hidden if the design does not want it
// visible — use className="sr-only" (Tailwind) or equivalent CSS. The text is still
// read by screen readers via the ARIA reference.

// ─── COMPONENT LIBRARY CONSIDERATIONS ────────────────────────────────────────

// For a reusable component library, consider:

// 1. Multiple concurrent modals — use a stack or z-index counter so newer modals
//    appear on top. Each modal should have its own saved focus ref and Escape handler
//    with stopPropagation so only the top modal closes on Escape.

// 2. Inert attribute (modern browsers) — as an alternative to aria-modal="true",
//    setting inert on the background content actually prevents all interaction with
//    it (keyboard, mouse, screen reader). More robust than aria-modal alone.
//    Background: document.querySelector('#app')?.setAttribute('inert', '')
//    Foreground (modal): remove 'inert' from modal's ancestors

// 3. Testing — write a Playwright test that:
//    - Opens the modal
//    - Tabs through all focusable elements and verifies focus wraps correctly
//    - Presses Escape and verifies focus returns to the trigger
//    axe-core covers static ARIA; Playwright covers dynamic focus behaviour.

// ─── FINAL ARCHITECTURE SUMMARY ──────────────────────────────────────────────

// Rendering:   createPortal → #modals div in index.html
// Lifecycle:   one useEffect gated on isOpen
//               - save trigger, scroll lock, move focus, keydown listener
//               - cleanup: remove listener, restore scroll, restore focus
// Focus trap:  Tab/Shift+Tab intercepted in keydown handler
// Backdrop:    e.target === e.currentTarget check in onClick
// Animation:   isVisible + isOpen + CSS opacity transition + onTransitionEnd
// ARIA:        role=dialog, aria-modal, aria-labelledby, aria-describedby (conditional)
// Accessibility contract: Escape closes, first/initialFocus element receives focus on open
