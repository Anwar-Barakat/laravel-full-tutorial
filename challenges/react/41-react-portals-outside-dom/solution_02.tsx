// ============================================================
// Problem 02 — Advanced React Portals
// ============================================================



// ============================================================
// Floating UI — useFloating hook
//
// npm install @floating-ui/react
//
// const { refs, floatingStyles, context } = useFloating({
//   open, onOpenChange,
//   placement: "top",
//   whileElementsMounted: autoUpdate,
//   ← autoUpdate: recalculate on scroll, resize, DOM mutation
//   ← pass as whileElementsMounted (not in middleware) — handles cleanup
//
//   middleware: [
//     offset(8),          ← gap between trigger and floating element
//     flip(),             ← flip to opposite side when no space
//     shift({ padding:8 }),← nudge to stay within viewport
//     arrow({ element:arrowRef }),  ← arrow positioned to point at trigger
//   ]
// })
//
// refs.setReference → attach to trigger element
// refs.setFloating  → attach to floating element
// floatingStyles    → { position, top, left, transform } — apply as style
//
// Interactions (hooks for event handling):
//   useHover(context, { delay:{ open:300, close:100 } })
//   useFocus(context)
//   useRole(context, { role:"tooltip" })
//   useInteractions([hover, focus, role])
//   → getReferenceProps() spread on trigger
//   → getFloatingProps() spread on floating element
// ============================================================



// ============================================================
// FloatingPortal — SSR-aware portal
//
// import { FloatingPortal } from "@floating-ui/react"
//
// {isOpen && (
//   <FloatingPortal>
//     <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
//       {content}
//       <FloatingArrow ref={arrowRef} context={context} fill="#111827" />
//     </div>
//   </FloatingPortal>
// )}
//
// FloatingPortal vs createPortal:
//   FloatingPortal: SSR-safe, handles z-index context, preserves id for aria
//   createPortal:   manual, need to handle SSR yourself
//
// FloatingArrow: renders <svg> arrow pointing from floating element to trigger
//   ref={arrowRef} ← attach to arrowRef passed to arrow() middleware
//   context={context} ← required, provides position data
//   fill="#111827"   ← match tooltip background
// ============================================================



// ============================================================
// Context menu (right-click)
//
// onContextMenu handler:
//   e.preventDefault()   ← prevent browser's native context menu
//   setPosition({ x: e.clientX, y: e.clientY })
//
// position: "fixed" (not absolute):
//   clientX/clientY are viewport coords, not document coords
//   position:fixed elements use viewport coords
//   ← no need to add scrollX/scrollY
//
// Viewport clamping:
//   top:  Math.min(position.y, window.innerHeight - menuHeight)
//   left: Math.min(position.x, window.innerWidth  - menuWidth)
//   ← prevents menu from going off-screen
//
// Close triggers:
//   document.addEventListener("mousedown", close)  ← any click outside
//   Escape key → close
//   Menu item click → item.action() then close
//
// ARIA:
//   role="menu" on ul
//   role="menuitem" on each item li/button
// ============================================================



// ============================================================
// Toast system — portal inside context provider
//
// KEY INSIGHT: createPortal rendered inside <ToastContext.Provider>
//   DOM: toast list is in document.body (portal)
//   React: toast list is inside the provider (correct context!)
//   ← ToastItem can call useToast() even though it's portal-rendered
//
// ToastProvider state: Toast[] with { id, message, type, duration }
//
// addToast(toast):
//   id = crypto.randomUUID()
//   setToasts(prev => [...prev, { ...toast, id }])
//   setTimeout(() => removeToast(id), toast.duration)
//   ← auto-remove after duration
//
// removeToast(id):
//   setToasts(prev => prev.filter(t => t.id !== id))
//
// Portal container:
//   position:fixed, bottom:1rem, right:1rem
//   display:flex, flexDirection:column, gap:0.5rem
//   aria-live="polite" aria-atomic="false"
//   ← polite: announce when user is idle (not assertive/interrupting)
//   ← atomic:false: announce each toast individually as added
// ============================================================



// ============================================================
// SSR-safe portal
//
// Problem: document is undefined on the server (Next.js SSR)
//   createPortal(children, document.body) → ReferenceError
//
// Solution 1 — useState + useEffect (safest):
//   const [mounted, setMounted] = useState(false)
//   useEffect(() => setMounted(true), [])  ← runs only on client
//   if (!mounted) return null
//   return createPortal(children, document.body)
//
// Solution 2 — typeof check:
//   const isBrowser = typeof document !== "undefined"
//   if (!isBrowser) return null
//   return createPortal(children, document.body)
//
// Solution 3 — FloatingPortal (handles automatically)
//
// Hydration note:
//   Server renders null for portal → no HTML in initial page
//   Client mounts → portal renders → no hydration mismatch
//   (Mismatch would occur if server rendered portal content in wrong DOM location)
// ============================================================



// ============================================================
// Testing portals
//
// React Testing Library: portals render into document.body by default
//   ← no special setup needed for portals!
//   queries search entire document: getByRole, getByText etc.
//
// test("modal renders title", () => {
//   render(<Modal isOpen onClose={fn} title="Confirm Delete">content</Modal>)
//   expect(screen.getByRole("dialog")).toBeInTheDocument()
//   expect(screen.getByText("Confirm Delete")).toBeInTheDocument()
// })
//
// test("modal closes on Escape", async () => {
//   const onClose = vi.fn()
//   render(<Modal isOpen onClose={onClose} title="Test">content</Modal>)
//   await userEvent.keyboard("{Escape}")
//   expect(onClose).toHaveBeenCalledOnce()
// })
//
// test("focus returns to trigger on close", async () => {
//   render(<><button>Open</button><Modal isOpen ...></Modal></>)
//   // Open → close → assert document.activeElement is the trigger button
// })
//
// Cleanup: RTL clears document.body between tests → portals cleaned up
// ============================================================



// ============================================================
// Key concepts
//
// createPortal event bubbling:
//   React synthetic events bubble through REACT tree, not DOM tree
//   onClick on portal modal → bubbles to React parent (the trigger component)
//   This means: event handlers on ancestors work correctly
//   Watch out: stopPropagation() stops React bubble, not DOM bubble
//
// When NOT to use portals:
//   Simple modals in apps without overflow:hidden → regular rendering is fine
//   If the element naturally fits in the DOM flow → no portal needed
//   Portals add complexity; justify their use
//
// Position: fixed vs absolute for portals:
//   position:fixed: viewport-relative (use with clientX/clientY)
//   position:absolute: document-relative (add scrollX/scrollY to viewport coords)
//   Modals/toasts: fixed (viewport-anchored)
//   Tooltips/dropdowns: absolute (follow document scroll naturally)
//   DragOverlay (dnd-kit): position:fixed by default
// ============================================================
