# REACT_TEST_28 — Accessibility • ARIA • Keyboard

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Accessible Components (Medium)

Build production-ready accessible components: focus trap for modals, screen reader announcements, an accessible combobox with ARIA, and keyboard navigation patterns.

---

### Part A — `useFocusTrap` hook

**File:** `hooks/useFocusTrap.ts`

A focus trap keeps keyboard focus inside a container (e.g. modal) until explicitly released.

```ts
function useFocusTrap(isActive: boolean): React.RefObject<HTMLDivElement>
```

**Implementation:**
```ts
function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) return
    const container = containerRef.current
    if (!container) return

    // Find all focusable elements inside the container
    const FOCUSABLE = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ")

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    // Auto-focus first focusable element
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      if (e.shiftKey) {
        // Shift+Tab: if at first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        // Tab: if at last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown)
    return () => container.removeEventListener("keydown", handleKeyDown)
  }, [isActive])

  return containerRef
}
```

---

### Part B — `useAnnounce` hook

**File:** `hooks/useAnnounce.ts`

Sends messages to screen readers via an off-screen `aria-live` region.

```ts
type Politeness = "polite" | "assertive"

function useAnnounce(): (message: string, politeness?: Politeness) => void
```

**Implementation:**
```ts
// Module-level singleton elements (created once, persist for page lifetime)
let politeEl:    HTMLElement | null = null
let assertiveEl: HTMLElement | null = null

function createLiveRegion(politeness: Politeness): HTMLElement {
  const el = document.createElement("div")
  el.setAttribute("aria-live", politeness)
  el.setAttribute("aria-atomic", "true")
  el.setAttribute("aria-relevant", "additions")
  // Visually hidden but accessible
  Object.assign(el.style, {
    position: "absolute", width: "1px", height: "1px",
    padding: "0", margin: "-1px", overflow: "hidden",
    clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: "0",
  })
  document.body.appendChild(el)
  return el
}

function useAnnounce() {
  return useCallback((message: string, politeness: Politeness = "polite") => {
    // Lazy-create the live regions
    if (!politeEl)    politeEl    = createLiveRegion("polite")
    if (!assertiveEl) assertiveEl = createLiveRegion("assertive")

    const el = politeness === "assertive" ? assertiveEl : politeEl

    // Clear then re-set to ensure screen readers announce even if message is the same
    el.textContent = ""
    // Timeout required: some screen readers ignore immediate updates
    setTimeout(() => { el.textContent = message }, 100)
  }, [])
}
```

**Usage:**
```ts
const announce = useAnnounce()
announce("Booking confirmed successfully")           // polite (waits for idle)
announce("Session expiring in 60 seconds", "assertive")  // assertive (interrupts)
```

---

### Part C — Accessible `Dialog` component

**File:** `components/a11y/Dialog.tsx`

```tsx
interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  initialFocusRef?: React.RefObject<HTMLElement>   // element to focus on open
}
```

**Implementation:**
```tsx
function Dialog({ isOpen, onClose, title, description, children, initialFocusRef }: DialogProps) {
  const trapRef    = useFocusTrap(isOpen)
  const titleId    = useId()       // React 18 — stable unique ID
  const descId     = useId()
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // Remember the element that triggered the dialog, restore focus on close
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement
      initialFocusRef?.current?.focus()
    } else {
      prevFocusRef.current?.focus()   // return focus to trigger element
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" aria-hidden="true" onClick={onClose} />

      {/* Dialog panel */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
      >
        <h2 id={titleId} className="text-xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p id={descId} className="text-sm text-gray-500 mt-1">{description}</p>
        )}
        <div className="mt-4">{children}</div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400
                     hover:text-gray-600 hover:bg-gray-100"
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
    </>,
    document.body
  )
}
```

**Key ARIA attributes:**
- `role="dialog"` — tells AT this is a dialog
- `aria-modal="true"` — signals modal behaviour (AT hides background content)
- `aria-labelledby={titleId}` — links dialog to its heading
- `aria-describedby={descId}` — links dialog to its description
- `aria-hidden="true"` on backdrop — prevents AT from reading it

---

### Part D — Accessible `Combobox` component

**File:** `components/a11y/Combobox.tsx`

ARIA combobox pattern: an input with a popup listbox.

```ts
interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}
```

**Implementation:**
```tsx
function Combobox({ options, value, onChange, label, placeholder }: ComboboxProps) {
  const [isOpen, setIsOpen]           = useState(false)
  const [query, setQuery]             = useState("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef    = useRef<HTMLInputElement>(null)
  const listRef     = useRef<HTMLUListElement>(null)
  const listboxId   = useId()
  const labelId     = useId()

  const filtered = useMemo(() =>
    query.trim() === ""
      ? options
      : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  )

  const select = (option: ComboboxOption) => {
    if (option.disabled) return
    onChange(option.value)
    setQuery(option.label)
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setIsOpen(true)
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case "Enter":
        if (isOpen && activeIndex >= 0) {
          e.preventDefault()
          select(filtered[activeIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        setActiveIndex(-1)
        break
      case "Tab":
        setIsOpen(false)
        break
    }
  }

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement
    item?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const selectedLabel = options.find(o => o.value === value)?.label ?? ""

  return (
    <div className="relative">
      <label id={labelId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `option-${filtered[activeIndex]?.value}` : undefined}
        aria-labelledby={labelId}
        value={query || selectedLabel}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}  // delay: allow click on option
        onChange={e => { setQuery(e.target.value); setIsOpen(true); setActiveIndex(-1) }}
        onKeyDown={handleKeyDown}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none
                   focus:ring-2 focus:ring-blue-500"
      />

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl
                     shadow-xl mt-1 max-h-60 overflow-y-auto py-1"
        >
          {filtered.map((option, i) => (
            <li
              key={option.value}
              id={`option-${option.value}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
              onMouseDown={() => select(option)}    // mousedown fires before input blur
              className={`px-3 py-2 cursor-pointer text-sm transition-colors
                ${i === activeIndex        ? "bg-blue-50 text-blue-700"
                  : option.disabled        ? "text-gray-300 cursor-not-allowed"
                  : option.value === value ? "text-blue-600 font-medium"
                  : "hover:bg-gray-50 text-gray-900"}`}
            >
              {option.label}
              {option.value === value && (
                <span className="float-right" aria-hidden="true">✓</span>
              )}
            </li>
          ))}
          {filtered.length === 0 && query && (
            <li role="option" aria-selected="false" className="px-3 py-2 text-sm text-gray-400">
              No results for "{query}"
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
```

---

### Part E — Skip navigation link

**File:** `components/a11y/SkipNav.tsx`

Allows keyboard users to skip repeated navigation and jump to main content:

```tsx
function SkipNav({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
                 focus:rounded-lg focus:shadow-lg"
    >
      Skip to main content
    </a>
  )
}

// Usage in layout:
function DashboardLayout({ children }) {
  return (
    <>
      <SkipNav />
      <Header />
      <main id="main-content" tabIndex={-1}>   {/* tabIndex={-1}: programmatically focusable */}
        {children}
      </main>
    </>
  )
}
```

---

## Problem 02 — Advanced Accessibility Patterns (Hard)

Add roving tabindex for composite widgets, accessible data table with arrow key navigation, focus management after route changes, and reduced motion support.

---

### Part A — `useRovingTabIndex` hook

**File:** `hooks/useRovingTabIndex.ts`

The roving tabindex pattern makes a group of elements behave as a single tab stop, with arrow keys navigating between items.

```ts
function useRovingTabIndex<T extends HTMLElement>(
  itemCount: number
): {
  activeIndex: number
  setActiveIndex: (index: number) => void
  getItemProps: (index: number) => {
    tabIndex: number
    onFocus: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    ref: (el: T | null) => void
  }
}
```

**Implementation:**
```ts
function useRovingTabIndex<T extends HTMLElement>(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(T | null)[]>([])

  const focusItem = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, itemCount - 1))
    setActiveIndex(clamped)
    itemRefs.current[clamped]?.focus()
  }, [itemCount])

  const getItemProps = useCallback((index: number) => ({
    tabIndex: index === activeIndex ? 0 : -1,   // only active item in tab order
    onFocus: () => setActiveIndex(index),
    ref: (el: T | null) => { itemRefs.current[index] = el },
    onKeyDown: (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault()
          focusItem(activeIndex + 1)
          break
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault()
          focusItem(activeIndex - 1)
          break
        case "Home":
          e.preventDefault()
          focusItem(0)
          break
        case "End":
          e.preventDefault()
          focusItem(itemCount - 1)
          break
      }
    },
  }), [activeIndex, focusItem, itemCount])

  return { activeIndex, setActiveIndex, getItemProps }
}
```

**Usage — accessible tab list:**
```tsx
function TabList({ tabs }: { tabs: string[] }) {
  const { getItemProps } = useRovingTabIndex<HTMLButtonElement>(tabs.length)

  return (
    <div role="tablist" aria-label="Navigation">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          role="tab"
          aria-selected={i === activeTab}
          aria-controls={`tabpanel-${i}`}
          {...getItemProps(i)}
          className="px-4 py-2 ..."
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
```

---

### Part B — Accessible `DataTable` with keyboard navigation

**File:** `components/a11y/DataTable.tsx`

```ts
interface DataTableProps<T> {
  data: T[]
  columns: Array<{ key: keyof T; header: string; sortable?: boolean }>
  caption: string
  onSort?: (key: keyof T, direction: "asc" | "desc") => void
}
```

**Keyboard grid navigation:**
```tsx
// State: focusedCell = { row: 0, col: 0 }
const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 })
const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map())

const cellKey = (row: number, col: number) => `${row}-${col}`

const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
  const colCount = columns.length
  const rowCount = data.length

  let next = { row, col }
  switch (e.key) {
    case "ArrowRight": next = { row, col: Math.min(col + 1, colCount - 1) }; break
    case "ArrowLeft":  next = { row, col: Math.max(col - 1, 0) }; break
    case "ArrowDown":  next = { row: Math.min(row + 1, rowCount - 1), col }; break
    case "ArrowUp":    next = { row: Math.max(row - 1, 0), col }; break
    case "Home":       next = { row, col: 0 }; break
    case "End":        next = { row, col: colCount - 1 }; break
    default: return
  }
  e.preventDefault()
  setFocusedCell(next)
  cellRefs.current.get(cellKey(next.row, next.col))?.focus()
}
```

**Render:**
```tsx
<div role="region" aria-label={caption} className="overflow-x-auto">
  <table className="w-full border-collapse">
    <caption className="sr-only">{caption}</caption>  {/* sr-only: always include caption */}
    <thead>
      <tr>
        {columns.map((col, ci) => (
          <th
            key={String(col.key)}
            scope="col"
            aria-sort={col.sortable ? (sortKey === col.key ? sortDir + "ending" : "none") : undefined}
            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase
                       tracking-wide border-b bg-gray-50"
          >
            {col.sortable
              ? <button onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-gray-900">
                  {col.header}
                  <SortIcon direction={sortKey === col.key ? sortDir : null} />
                </button>
              : col.header
            }
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, ri) => (
        <tr key={ri} className="border-b hover:bg-gray-50">
          {columns.map((col, ci) => (
            <td
              key={String(col.key)}
              ref={el => el && cellRefs.current.set(cellKey(ri, ci), el)}
              tabIndex={focusedCell.row === ri && focusedCell.col === ci ? 0 : -1}
              onFocus={() => setFocusedCell({ row: ri, col: ci })}
              onKeyDown={e => handleCellKeyDown(e, ri, ci)}
              className="px-4 py-3 text-sm text-gray-900 focus:outline-none
                         focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {String(row[col.key])}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**ARIA sort values:** `"ascending"` | `"descending"` | `"none"` | `"other"`

---

### Part C — Focus management after route changes

**File:** `hooks/useFocusOnRouteChange.ts`

After navigation, focus should move to the new page heading so screen readers announce it:

```ts
function useFocusOnRouteChange(headingRef: React.RefObject<HTMLHeadingElement>) {
  const location = useLocation()

  useEffect(() => {
    // Small timeout: let React finish rendering the new page
    const timer = setTimeout(() => {
      headingRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [location.pathname])
}

// Usage on each page:
function BookingsPage() {
  const h1Ref = useRef<HTMLHeadingElement>(null)
  useFocusOnRouteChange(h1Ref)

  return (
    <>
      <h1 ref={h1Ref} tabIndex={-1} className="focus:outline-none text-2xl font-bold">
        Bookings
      </h1>
      {/* page content */}
    </>
  )
}
```

---

### Part D — `useReducedMotion` hook

**File:** `hooks/useReducedMotion.ts`

Respects the user's OS "reduce motion" accessibility preference:

```ts
function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )

  useEffect(() => {
    const mq      = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return prefersReduced
}

// Usage:
function AnimatedCard({ children }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={reduceMotion
      ? "opacity-100"                                     // instant
      : "animate-fade-in transition-all duration-300"     // animated
    }>
      {children}
    </div>
  )
}
```

---

### Part E — `useLiveRegion` hook (enhanced announce)

**File:** `hooks/useLiveRegion.ts`

A hook-based version that manages the DOM element lifecycle properly:

```ts
function useLiveRegion(politeness: Politeness = "polite"): {
  announce: (message: string) => void
  regionRef: React.RefObject<HTMLDivElement>
}
```

**Implementation:**
```ts
function useLiveRegion(politeness: Politeness = "polite") {
  const regionRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string) => {
    const el = regionRef.current
    if (!el) return
    el.textContent = ""
    setTimeout(() => { el.textContent = message }, 100)
  }, [])

  return { announce, regionRef }
}

// Usage — embed the region in your component:
function SearchResults({ results }) {
  const { announce, regionRef } = useLiveRegion()

  useEffect(() => {
    announce(`${results.length} result${results.length !== 1 ? "s" : ""} found`)
  }, [results.length])

  return (
    <>
      {/* Hidden live region */}
      <div ref={regionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      {/* Visible results */}
      <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>
    </>
  )
}
```

---

### Key ARIA patterns reference

```ts
// Dialog / Modal:
role="dialog" aria-modal="true" aria-labelledby="title-id" aria-describedby="desc-id"

// Combobox (searchable select):
input:  role="combobox" aria-expanded aria-controls="listbox-id" aria-activedescendant="option-id"
list:   role="listbox"
option: role="option" aria-selected aria-disabled

// Table:
<table>
  <caption>         ← always present (sr-only is fine)
  <th scope="col">  ← associates column header with cells
  aria-sort="ascending"|"descending"|"none"  ← on sortable <th>

// Tab list (roving tabindex):
role="tablist" → role="tab" aria-selected aria-controls="panel-id" → role="tabpanel" aria-labelledby

// Landmark roles (implicit in HTML5):
<header>   = banner
<nav>      = navigation
<main>     = main
<footer>   = contentinfo
<aside>    = complementary
<section>  = region (only if has accessible name: aria-labelledby)

// aria-live values:
"polite"    — wait for user idle, then announce (form success messages)
"assertive" — interrupt immediately (error alerts, session warnings)
aria-atomic="true"  — announce entire region as one unit, not word-by-word

// Focus management rules:
// 1. When modal opens: move focus inside (to first focusable or initial element)
// 2. When modal closes: return focus to trigger element
// 3. After route change: move focus to page <h1>
// 4. tabIndex={-1}: programmatically focusable but not in natural tab order
//    → use on <h1>, <main>, and target elements of skip links
```
