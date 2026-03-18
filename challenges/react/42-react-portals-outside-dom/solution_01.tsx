// ============================================================
// Problem 01 — React Portals & Outside DOM
// ============================================================



// ============================================================
// Why portals — the two main problems they solve
//
// 1. overflow:hidden clips children:
//    Dropdown inside a table cell (overflow:hidden) → gets clipped
//    Portal: render dropdown at document.body → no clipping possible
//
// 2. z-index stacking context:
//    Modal inside a position:relative container with z-index:10
//    Can't appear above a sibling with z-index:20
//    Portal: render at document.body → outside all stacking contexts
//
// Key insight: React tree vs DOM tree are DIFFERENT for portals:
//   DOM tree:   modal is a child of document.body
//   React tree: modal is a child of the button that opened it
//
//   Result: events bubble through REACT tree (not DOM)
//   Result: useContext reads from REACT parent (correct!)
// ============================================================



// ============================================================
// createPortal — basic syntax
//
// import { createPortal } from "react-dom"
//
// createPortal(children, container, key?)
//   children:  any React renderable (JSX, string, null, fragment)
//   container: DOM node — usually document.body or a dedicated div
//   key:       optional — for stable reconciliation across positions
//
// Where to call createPortal:
//   Inside a component's render/return
//   Inside useEffect (for imperative portals)
//   NOT inside event handlers directly
//
// Return: render this in JSX like any React element
// ============================================================



// ============================================================
// usePortal — lazy container creation
//
// containerRef = useRef<HTMLDivElement | null>(null)
//
// If !containerRef.current (first render):
//   div = document.createElement("div")
//   div.id = id
//   div.setAttribute("data-portal", "true")
//   containerRef.current = div
// ← Create during render (not useEffect) → avoids one-frame flash
//
// useEffect(() => {
//   document.body.appendChild(containerRef.current!)
//   return () => document.body.removeChild(containerRef.current!)
// }, [])
// ← Append to DOM after mount, remove on unmount
// ← cleanup prevents orphaned DOM nodes
//
// return containerRef.current
// ← call createPortal(children, container)
// ============================================================



// ============================================================
// Modal — accessibility requirements
//
// role="dialog"         ← announces dialog context to screen readers
// aria-modal="true"     ← tells screen reader to treat as modal (hide background)
// aria-labelledby={id}  ← points to h2 title element (useId() for stable id)
//
// Focus management:
//   Save: prevFocus.current = document.activeElement  (before open)
//   Move: first focusable element inside modal on open
//   Restore: (prevFocus.current as HTMLElement)?.focus()  (on close)
//
// Scroll lock:
//   document.body.style.overflow = "hidden"  (on open)
//   document.body.style.overflow = ""        (cleanup)
//
// Escape key:
//   document.addEventListener("keydown", handler)
//   if e.key === "Escape": onClose()
//   cleanup: removeEventListener
//
// Overlay click:
//   onClick on overlay: if e.target === overlayRef.current: onClose()
//   onClick on content: e.stopPropagation()
//   ← only close if clicking the semi-transparent background, not the card
// ============================================================



// ============================================================
// useFocusTrap
//
// FOCUSABLE selector:
//   "a[href], button:not([disabled]), input:not([disabled]),
//    select:not([disabled]), textarea:not([disabled]),
//    [tabindex]:not([tabindex='-1'])"
//
// handleKeyDown(e):
//   if e.key !== "Tab": return
//   focusable = containerRef.current.querySelectorAll(FOCUSABLE)
//   first = focusable[0],  last = focusable[last]
//
//   if e.shiftKey && activeElement === first:
//     e.preventDefault(); last.focus()    ← Shift+Tab from first → wrap to last
//   if !e.shiftKey && activeElement === last:
//     e.preventDefault(); first.focus()   ← Tab from last → wrap to first
//
// document.addEventListener("keydown", handleKeyDown) when isActive
// cleanup removes listener
// return containerRef (attach to modal container element)
// ============================================================



// ============================================================
// Tooltip — positioning with getBoundingClientRect
//
// useLayoutEffect (not useEffect) for position calculation:
//   Layout effect runs synchronously after DOM mutation, before paint
//   ← tooltip dimensions available (rendered but not painted)
//   ← avoids one-frame flash at (0,0) position
//
// Position calculation:
//   trigger = triggerRef.current.getBoundingClientRect()
//   ← relative to viewport
//   + window.scrollX / scrollY to convert to document coords
//   ← needed because tooltip is position:absolute (not fixed)
//
// placement offsets:
//   top:    trigger.top - tooltip.height - 8px gap
//   bottom: trigger.bottom + 8px gap
//   left:   trigger.left - tooltip.width - 8px gap
//   right:  trigger.right + 8px gap
//
// Clamp to viewport:
//   Math.max(8, Math.min(pos.left, window.innerWidth - tooltip.width - 8))
//
// pointerEvents: "none"  ← tooltip must not block mouse on content below
// role="tooltip" + aria-describedby on trigger → accessible
// ============================================================



// ============================================================
// Dropdown — portal + outside click
//
// openDropdown():
//   rect = triggerRef.current.getBoundingClientRect()
//   setPosition({
//     top:  rect.bottom + scrollY + 4,   ← just below trigger
//     left: rect.left   + scrollX,
//     width: rect.width,                 ← match trigger width
//   })
//   setIsOpen(true)
//
// Outside click to close:
//   document.addEventListener("mousedown", handler)
//   if !triggerRef.current.contains(e.target): setIsOpen(false)
//   ← mousedown not click: fires before blur, more reliable for dropdowns
//
// ARIA:
//   trigger: aria-expanded={isOpen} aria-haspopup="listbox"
//   list:    role="listbox"
//   items:   role="option" aria-selected={isActive}
// ============================================================
