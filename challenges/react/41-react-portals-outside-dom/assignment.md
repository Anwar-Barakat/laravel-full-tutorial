# REACT_TEST_42 — React Portals • Outside DOM

**Time:** 25 minutes | **Stack:** React + TypeScript + Floating UI

---

## Problem 01 — React Portals & Outside DOM (Medium)

Build portals for modals, tooltips, and dropdowns that escape `overflow:hidden` and stacking context issues.

---

### Why portals?

```tsx
// Problem: overflow:hidden clips child elements
<div style={{ overflow: "hidden", position: "relative" }}>
  <button>Open dropdown</button>
  <Dropdown />   {/* CLIPPED — can't escape parent overflow:hidden */}
</div>

// Problem: z-index stacking context limits
// A modal inside a z-index:10 container can't appear above z-index:20 siblings
// Solution: render modal at document.body level — outside all stacking contexts

// React keeps event bubbling + context from the source location:
// - onClick on portal child bubbles through React tree (not DOM tree)
// - useContext() in portal child reads from React parent (correct!)
// - This is the key insight: portal = DOM teleport, React tree unchanged
```

---

### createPortal — basic usage

```tsx
import { createPortal } from "react-dom"

// Simple portal:
function Modal({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay">{children}</div>,
    document.body          // ← target DOM node (second argument)
  )
}

// createPortal(children, container, key?)
// children:  any React renderable
// container: DOM node to render into
// key:       optional stable key for reconciliation
```

---

### usePortal hook — lazy container creation

```tsx
// hooks/usePortal.ts
import { useEffect, useRef } from "react"

export function usePortal(id?: string) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (!containerRef.current) {
    // Create container on first render (not in useEffect — avoids flash)
    const div = document.createElement("div")
    if (id) div.id = id
    div.setAttribute("data-portal", "true")   // for CSS targeting
    containerRef.current = div
  }

  useEffect(() => {
    const container = containerRef.current!
    document.body.appendChild(container)

    return () => {
      // Remove on unmount — clean up DOM node
      document.body.removeChild(container)
    }
  }, [])  // run once on mount/unmount

  return containerRef.current
}

// Usage:
function Toast({ message }: { message: string }) {
  const container = usePortal("toast-container")

  return createPortal(
    <div className="toast">{message}</div>,
    container
  )
}
```

---

### Modal with portal + accessibility

```tsx
// components/Modal.tsx
import { createPortal } from "react-dom"
import { useEffect, useRef, useId } from "react"

interface ModalProps {
  isOpen:    boolean
  onClose:   () => void
  title:     string
  children:  React.ReactNode
  size?:     "sm" | "md" | "lg"
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const titleId    = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevFocus  = useRef<Element | null>(null)

  // Save + restore focus
  useEffect(() => {
    if (isOpen) {
      prevFocus.current = document.activeElement
    } else {
      (prevFocus.current as HTMLElement)?.focus()
    }
  }, [isOpen])

  // Focus first focusable element inside modal on open
  useEffect(() => {
    if (!isOpen) return
    const modal = overlayRef.current?.querySelector("[data-modal-content]")
    const firstFocusable = modal?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeStyles = {
    sm: { maxWidth: "400px" },
    md: { maxWidth: "560px" },
    lg: { maxWidth: "800px" },
  }

  return createPortal(
    <div
      ref={overlayRef}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      // Close on overlay click — but NOT on modal content click
    >
      <div
        data-modal-content
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: "white", borderRadius: "0.5rem",
          padding: "1.5rem", width: "100%",
          ...sizeStyles[size],
        }}
        onClick={e => e.stopPropagation()}
        // Stop propagation: clicks inside modal don't reach overlay
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 id={titleId}>{title}</h2>
          <button onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
```

---

### Focus trap inside portal

```tsx
// hooks/useFocusTrap.ts
const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ")

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      const focusable = Array.from(
        containerRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE)
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()     // Shift+Tab from first → wrap to last
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()    // Tab from last → wrap to first
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isActive])

  return containerRef
}
```

---

### Tooltip with portal + positioning

```tsx
// components/Tooltip.tsx
import { useState, useRef, useLayoutEffect, useCallback } from "react"
import { createPortal } from "react-dom"

interface TooltipProps {
  content:    React.ReactNode
  children:   React.ReactElement
  placement?: "top" | "bottom" | "left" | "right"
  delay?:     number
}

export function Tooltip({ content, children, placement = "top", delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position,  setPosition]  = useState({ top: 0, left: 0 })
  const triggerRef  = useRef<HTMLElement>(null)
  const tooltipRef  = useRef<HTMLDivElement>(null)
  const delayTimer  = useRef<ReturnType<typeof setTimeout>>()

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    // Calculate position based on placement:
    const positions = {
      top:    { top: trigger.top + scrollY - tooltip.height - 8, left: trigger.left + scrollX + trigger.width / 2 - tooltip.width / 2 },
      bottom: { top: trigger.bottom + scrollY + 8,               left: trigger.left + scrollX + trigger.width / 2 - tooltip.width / 2 },
      left:   { top: trigger.top + scrollY + trigger.height / 2 - tooltip.height / 2, left: trigger.left + scrollX - tooltip.width - 8 },
      right:  { top: trigger.top + scrollY + trigger.height / 2 - tooltip.height / 2, left: trigger.right + scrollX + 8 },
    }

    // Clamp to viewport bounds:
    const pos = positions[placement]
    setPosition({
      top:  Math.max(8, Math.min(pos.top,  window.innerHeight + scrollY - tooltip.height - 8)),
      left: Math.max(8, Math.min(pos.left, window.innerWidth  + scrollX - tooltip.width  - 8)),
    })
  }, [placement])

  // Recalculate after tooltip renders (need tooltip dimensions):
  useLayoutEffect(() => {
    if (isVisible) updatePosition()
  }, [isVisible, updatePosition])

  const show = () => { delayTimer.current = setTimeout(() => setIsVisible(true),  delay) }
  const hide = () => { clearTimeout(delayTimer.current); setIsVisible(false) }

  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus:      show,    // keyboard accessible
    onBlur:       hide,
    "aria-describedby": isVisible ? "tooltip" : undefined,
  })

  return (
    <>
      {trigger}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          style={{
            position: "absolute",
            top:  position.top,
            left: position.left,
            background: "#111827",
            color: "white",
            padding: "0.375rem 0.75rem",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            zIndex: 10000,
            pointerEvents: "none",   // ← don't block mouse on content below
            maxWidth: "200px",
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
```

---

### Dropdown with portal

```tsx
// components/Dropdown.tsx — escapes overflow:hidden
export function Dropdown({ trigger, items }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  const openDropdown = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({
      top:   rect.bottom + window.scrollY + 4,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    })
    setIsOpen(true)
  }

  // Close on outside click:
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  return (
    <>
      <button ref={triggerRef} onClick={isOpen ? () => setIsOpen(false) : openDropdown}
        aria-expanded={isOpen} aria-haspopup="listbox">
        {trigger}
      </button>

      {isOpen && createPortal(
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top:   position.top,
            left:  position.left,
            width: position.width,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.07)",
            zIndex: 9998,
            listStyle: "none",
            padding: "0.25rem 0",
          }}
        >
          {items.map(item => (
            <li key={item.value} role="option" aria-selected={item.value === selected}>
              <button onClick={() => { onSelect(item.value); setIsOpen(false) }}
                style={{ width: "100%", textAlign: "left", padding: "0.5rem 1rem" }}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  )
}
```

---

## Problem 02 — Advanced Portals (Hard)

Floating UI library, context menus, toast system, and SSR portal handling.

---

### Floating UI — precise positioning

```bash
npm install @floating-ui/react
```

```tsx
import {
  useFloating, useHover, useFocus, useInteractions, useRole,
  offset, flip, shift, arrow, FloatingArrow, FloatingPortal,
  autoUpdate,
} from "@floating-ui/react"

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactElement }) {
  const [isOpen, setIsOpen] = useState(false)
  const arrowRef = useRef(null)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    // autoUpdate: recalculate on scroll, resize, mutation
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),          // gap between trigger and tooltip
      flip(),             // flip to other side if no room
      shift({ padding: 8 }), // keep within viewport + 8px padding
      arrow({ element: arrowRef }),  // arrow points to trigger
    ],
  })

  const hover   = useHover(context, { delay: { open: 300, close: 100 } })
  const focus   = useFocus(context)
  const role    = useRole(context, { role: "tooltip" })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role])

  return (
    <>
      {/* Reference (trigger) element */}
      {React.cloneElement(children, {
        ref: refs.setReference,
        ...getReferenceProps(),
      })}

      {/* Floating element — rendered in a portal automatically by FloatingPortal */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, background: "#111827", color: "white",
                     padding: "0.375rem 0.75rem", borderRadius: "0.375rem",
                     fontSize: "0.875rem", zIndex: 10000 }}
            {...getFloatingProps()}
          >
            {content}
            <FloatingArrow ref={arrowRef} context={context} fill="#111827" />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
```

---

### Context menu (right-click) portal

```tsx
export function ContextMenu({ items, children }: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()   // ← prevent browser context menu
    setPosition({ x: e.clientX, y: e.clientY })
  }

  // Close on any outside click or Escape:
  useEffect(() => {
    if (!position) return
    const close = () => setPosition(null)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    })
    return () => {
      document.removeEventListener("mousedown", close)
    }
  }, [position])

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>
      {position && createPortal(
        <ul
          role="menu"
          style={{
            position: "fixed",
            top:  Math.min(position.y, window.innerHeight - 200),  // clamp to viewport
            left: Math.min(position.x, window.innerWidth  - 200),
            zIndex: 10000,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
            padding: "0.25rem 0",
            listStyle: "none",
          }}
          onClick={e => e.stopPropagation()}
        >
          {items.map(item => (
            <li key={item.label} role="menuitem">
              <button onClick={() => { item.action(); setPosition(null) }}
                style={{ width:"100%", textAlign:"left", padding:"0.5rem 1rem", cursor:"pointer" }}>
                {item.icon && <span style={{ marginRight:"0.5rem" }}>{item.icon}</span>}
                {item.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  )
}
```

---

### Toast system — portal + context

```tsx
// context/ToastContext.tsx
interface Toast { id: string; message: string; type: "success" | "error" | "info"; duration: number }

const ToastContext = createContext<{
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => removeToast(id), toast.duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Portal renders INSIDE the provider — context is available! */}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{
            position: "fixed", bottom: "1rem", right: "1rem",
            display: "flex", flexDirection: "column", gap: "0.5rem",
            zIndex: 10001,
          }}
        >
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
```

---

### SSR-safe portal

```tsx
// SSR: document is undefined on server (Next.js / Remix)
// Portal must only render on client

function ClientOnlyPortal({ children, container }: { children: React.ReactNode; container?: Element }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)    // effect only runs on client → sets mounted
  }, [])

  if (!mounted) return null
  return createPortal(children, container ?? document.body)
}

// Alternative: check typeof document
const isBrowser = typeof document !== "undefined"

function SafePortal({ children }: { children: React.ReactNode }) {
  if (!isBrowser) return null   // skip on server
  return createPortal(children, document.body)
}
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `createPortal(children, container)` | Renders into `container` DOM node, keeps React tree intact |
| Event bubbling | Bubbles through React tree (not DOM) — `onClick` on portal child reaches React parent |
| Context in portals | React context works across portals — portal children read same context as siblings |
| `usePortal` | Create + append + cleanup `<div>` container — lazy, runs once |
| `useLayoutEffect` for position | Calculate position after paint (DOM dimensions available) — avoid flash |
| `pointerEvents: "none"` | Tooltips must not block interaction with content below |
| `role="tooltip"` + `aria-describedby` | Accessible tooltip: link trigger to tooltip content |
| `role="dialog"` + `aria-modal` | Accessible modal: announce dialog context to screen readers |
| `aria-labelledby` | Connect modal title ID to the dialog element |
| `document.body.style.overflow = "hidden"` | Prevent scroll behind open modal |
| `e.stopPropagation()` on content | Don't let modal content clicks reach overlay (which closes modal) |
| `e.target === overlayRef.current` | Click-outside on overlay — only close if clicking the overlay itself |
| `FloatingPortal` | Floating UI's portal — automatically handles SSR + z-index |
| `autoUpdate` | Recalculate position on scroll/resize — pass to `whileElementsMounted` |
| `flip()` + `shift()` | Flip to other side if no room; keep in viewport |
| SSR: `useState(false)` + `useEffect` | Portal only renders after hydration — prevents server/client mismatch |
