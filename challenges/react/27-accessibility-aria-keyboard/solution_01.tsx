// ============================================================
// Problem 01 — Accessible Components
// ============================================================



// ============================================================
// hooks/useFocusTrap.ts
//
// function useFocusTrap(isActive: boolean): React.RefObject<HTMLDivElement>
//
// containerRef = useRef<HTMLDivElement>(null)
//
// useEffect([isActive]):
//   if !isActive: return
//   container = containerRef.current; if !container: return
//
//   FOCUSABLE selector:
//     "a[href], button:not([disabled]), input:not([disabled]),
//      select:not([disabled]), textarea:not([disabled]),
//      [tabindex]:not([tabindex='-1'])"
//
//   focusable = Array.from(container.querySelectorAll(FOCUSABLE))
//   first = focusable[0]; last = focusable[last]
//
//   first?.focus()   ← auto-focus on trap activation
//
//   handleKeyDown(e):
//     if e.key !== "Tab": return
//     if e.shiftKey && activeElement === first:
//       e.preventDefault(); last?.focus()   ← wrap backward
//     if !e.shiftKey && activeElement === last:
//       e.preventDefault(); first?.focus()  ← wrap forward
//
//   container.addEventListener("keydown", handleKeyDown)
//   cleanup: removeEventListener
//
// return containerRef
// ============================================================



// ============================================================
// hooks/useAnnounce.ts
//
// Module-level singletons: politeEl, assertiveEl (created once, persist)
//
// createLiveRegion(politeness):
//   createElement("div")
//   setAttribute: aria-live, aria-atomic="true", aria-relevant="additions"
//   visually hidden styles (position absolute, 1px×1px, overflow hidden, clip)
//   document.body.appendChild(el); return el
//
// function useAnnounce(): (message, politeness?) => void
//   return useCallback((message, politeness="polite") => {
//     lazy-create politeEl/assertiveEl if null
//     el = politeness==="assertive" ? assertiveEl : politeEl
//     el.textContent = ""
//     setTimeout(() => { el.textContent = message }, 100)
//     ← clear+delay: ensures screen readers announce even repeat messages
//   }, [])
// ============================================================



// ============================================================
// components/a11y/Dialog.tsx
//
// Props: isOpen, onClose, title, description?, children, initialFocusRef?
//
// Hooks: useFocusTrap(isOpen), useId() × 2 (titleId, descId)
// Ref: prevFocusRef — tracks element that opened the dialog
//
// Focus restore useEffect([isOpen]):
//   isOpen:  prevFocusRef.current = document.activeElement
//            initialFocusRef?.current?.focus()
//   !isOpen: prevFocusRef.current?.focus()   ← return to trigger element
//
// Escape key useEffect([isOpen]):
//   keydown → if "Escape": onClose()
//
// Scroll lock useEffect([isOpen]):
//   document.body.style.overflow = isOpen ? "hidden" : ""
//
// if !isOpen: return null
//
// createPortal:
//   backdrop: fixed inset-0 bg-black/50 aria-hidden="true" onClick→onClose
//   panel:
//     ref={trapRef}
//     role="dialog"
//     aria-modal="true"
//     aria-labelledby={titleId}
//     aria-describedby={description ? descId : undefined}
//     fixed centered (left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2)
//     <h2 id={titleId}>{title}</h2>
//     {description && <p id={descId}>{description}</p>}
//     {children}
//     close button: aria-label="Close dialog"
// , document.body)
// ============================================================



// ============================================================
// components/a11y/Combobox.tsx
//
// State: isOpen, query, activeIndex=-1
// Refs: inputRef, listRef
// IDs: listboxId=useId(), labelId=useId()
//
// filtered = useMemo: options.filter by query (label.toLowerCase().includes)
//
// select(option):
//   if option.disabled: return
//   onChange(option.value); setQuery(option.label)
//   setIsOpen(false); setActiveIndex(-1); inputRef.current?.focus()
//
// handleKeyDown on input:
//   ArrowDown: setIsOpen(true); setActiveIndex(i => min(i+1, length-1))
//   ArrowUp:   setActiveIndex(i => max(i-1, 0))
//   Enter:     if isOpen && activeIndex>=0: select(filtered[activeIndex])
//   Escape:    setIsOpen(false); setActiveIndex(-1)
//   Tab:       setIsOpen(false)
//
// Scroll active into view useEffect([activeIndex]):
//   listRef.current.children[activeIndex]?.scrollIntoView({ block: "nearest" })
//
// Input ARIA:
//   role="combobox"
//   aria-autocomplete="list"
//   aria-expanded={isOpen}
//   aria-controls={isOpen ? listboxId : undefined}
//   aria-activedescendant={activeIndex>=0 ? `option-${filtered[activeIndex]?.value}` : undefined}
//   onBlur: setTimeout(() => setIsOpen(false), 150)  ← delay allows click on option first
//
// List ARIA: role="listbox" id={listboxId}
// Option ARIA: role="option" aria-selected aria-disabled
//   onMouseDown (not onClick): fires before input blur
// ============================================================



// ============================================================
// components/a11y/SkipNav.tsx
//
// <a href="#main-content"
//    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
//               focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
//               focus:rounded-lg">
//   Skip to main content
// </a>
//
// DashboardLayout:
//   <SkipNav />
//   <Header />
//   <main id="main-content" tabIndex={-1}>
//     ← tabIndex={-1}: programmatically focusable but not in tab order
//     {children}
//   </main>
// ============================================================
