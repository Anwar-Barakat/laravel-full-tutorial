# REACT_TEST_25 — forwardRef • useImperativeHandle • Refs

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Modal & Input with Imperative API (Medium)

Build a Modal and FormInput that expose imperative methods via `forwardRef` + `useImperativeHandle`, allowing parent components to call `ref.current.open()`, `ref.current.focus()`, etc.

---

### Part A — Why useImperativeHandle?

The default behaviour of `forwardRef` passes the ref directly to a DOM element. `useImperativeHandle` intercepts this and lets you expose a **custom object** instead — so the parent can call methods like `open()` without knowing anything about the internal DOM structure.

```ts
// Without useImperativeHandle — parent gets raw DOM node:
ref.current.style.display = "block"   // brittle, couples parent to internals

// With useImperativeHandle — parent gets a typed API:
ref.current.open()    // clean, the component controls its own internals
ref.current.focus()
ref.current.validate()
```

---

### Part B — `ModalHandle` and `Modal` component

**File:** `components/Modal.tsx`

```ts
// Public API (what the parent ref gets)
interface ModalHandle {
  open:   () => void
  close:  () => void
  toggle: () => void
  isOpen: boolean        // readable state snapshot
}

// Props
interface ModalProps {
  title: string
  children: ReactNode
  onClose?: () => void
  size?: "sm" | "md" | "lg"
}
```

**Implementation:**
```tsx
const Modal = forwardRef<ModalHandle, ModalProps>(function Modal(
  { title, children, onClose, size = "md" },
  ref
) {
  const [isOpen, setIsOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    open:   () => setIsOpen(true),
    close:  () => { setIsOpen(false); onClose?.() },
    toggle: () => setIsOpen(prev => !prev),
    isOpen,
  }), [isOpen, onClose])
  //   ↑ dependency array: re-creates handle when isOpen changes
  //     so ref.current.isOpen stays in sync

  // Scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else        document.body.style.overflow = ""
    return ()  => { document.body.style.overflow = "" }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  if (!isOpen) return null

  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) { setIsOpen(false); onClose?.() } }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={() => { setIsOpen(false); onClose?.() }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
})

Modal.displayName = "Modal"
```

**Parent usage:**
```tsx
const modalRef = useRef<ModalHandle>(null)

<button onClick={() => modalRef.current?.open()}>Open Modal</button>

<Modal ref={modalRef} title="Confirm Booking" onClose={() => console.log("closed")}>
  <p>Are you sure?</p>
  <button onClick={() => modalRef.current?.close()}>Cancel</button>
</Modal>
```

---

### Part C — `FormInputHandle` and `FormInput` component

**File:** `components/FormInput.tsx`

```ts
interface FormInputHandle {
  focus:    () => void
  blur:     () => void
  clear:    () => void
  validate: () => boolean         // runs validation, returns result, shows inline error
  getValue: () => string          // read current value imperatively
  setValue: (v: string) => void   // set value imperatively (e.g. pre-fill)
}

interface FormInputProps {
  label: string
  placeholder?: string
  type?: "text" | "email" | "password" | "number"
  validator?: (value: string) => string | undefined
  onChange?: (value: string) => void
  defaultValue?: string
}
```

**Implementation:**
```tsx
const FormInput = forwardRef<FormInputHandle, FormInputProps>(function FormInput(
  { label, placeholder, type = "text", validator, onChange, defaultValue = "" },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | undefined>(undefined)

  useImperativeHandle(ref, () => ({
    focus:    () => inputRef.current?.focus(),
    blur:     () => inputRef.current?.blur(),
    clear:    () => { setValue(""); setError(undefined); onChange?.("") },
    validate: () => {
      const err = validator?.(value)
      setError(err)
      return !err
    },
    getValue: () => value,
    setValue: (v: string) => { setValue(v); onChange?.(v) },
  }), [value, validator, onChange])   // re-create when value changes so getValue stays fresh

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => {
          setValue(e.target.value)
          setError(undefined)          // clear error on change
          onChange?.(e.target.value)
        }}
        className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
          focus:ring-blue-500 transition-colors
          ${error ? "border-red-500 bg-red-50" : "border-gray-300"}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})

FormInput.displayName = "FormInput"
```

**Parent usage — programmatic form validation:**
```tsx
const nameRef    = useRef<FormInputHandle>(null)
const emailRef   = useRef<FormInputHandle>(null)
const messageRef = useRef<FormInputHandle>(null)

const handleSubmit = () => {
  const validName    = nameRef.current?.validate()    ?? false
  const validEmail   = emailRef.current?.validate()   ?? false
  const validMessage = messageRef.current?.validate() ?? false

  if (validName && validEmail && validMessage) {
    // All fields valid — collect values
    const data = {
      name:    nameRef.current?.getValue(),
      email:   emailRef.current?.getValue(),
      message: messageRef.current?.getValue(),
    }
    submitForm(data)
  } else {
    // Focus the first invalid field
    if (!validName)    nameRef.current?.focus()
    else if (!validEmail) emailRef.current?.focus()
    else               messageRef.current?.focus()
  }
}

// Pre-fill form from saved draft
useEffect(() => {
  if (draft) {
    nameRef.current?.setValue(draft.name)
    emailRef.current?.setValue(draft.email)
    messageRef.current?.setValue(draft.message)
  }
}, [draft])
```

---

### Part D — `useMeasure` hook (bonus — getBoundingClientRect)

**File:** `hooks/useMeasure.ts`

```ts
interface Measurements {
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
}

function useMeasure<T extends HTMLElement>(): [React.RefCallback<T>, Measurements]
```

**Implementation:**
```ts
function useMeasure<T extends HTMLElement>(): [React.RefCallback<T>, Measurements] {
  const [measurements, setMeasurements] = useState<Measurements>({
    width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0
  })

  const ref = useCallback((node: T | null) => {
    if (!node) return

    // Initial measure
    const measure = () => {
      const rect = node.getBoundingClientRect()
      setMeasurements({ width: rect.width, height: rect.height,
                        top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom })
    }
    measure()

    // Re-measure on resize
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, measurements]
}
```

**Usage:**
```tsx
const [ref, { width, height }] = useMeasure<HTMLDivElement>()
<div ref={ref}>
  This element is {width}px wide and {height}px tall
</div>
```

---

### Part E — TypeScript patterns for refs

```ts
// 1. Type the ref in the parent:
const modalRef = useRef<ModalHandle>(null)
//                       ↑ handle type, NOT the component type

// 2. forwardRef generic syntax:
const Modal = forwardRef<ModalHandle, ModalProps>(function Modal(props, ref) { ... })
//                       ↑ first  = handle type (what ref.current will be)
//                                  ↑ second = component props

// 3. Optional ref (parent may not attach a ref):
//    In the component, ref may be null — always use optional chaining on the parent side:
ref.current?.open()   // not ref.current!.open() — component may not be mounted

// 4. useImperativeHandle dependency array:
useImperativeHandle(ref, () => ({
  getValue: () => value,    // if value is a state variable, it must be in deps
}), [value])                // ← so getValue() returns the current value, not stale closure

// 5. Always set displayName after forwardRef:
Modal.displayName = "Modal"
//   ↑ React DevTools shows "Modal" instead of "ForwardRef"
```

---

## Problem 02 — Compound Component with Shared Ref (Hard)

Build an `Accordion` compound component where the parent can control which panel is open via a ref, and the component coordinates internally via Context.

---

### Part A — Accordion types

**File:** `components/Accordion/types.ts`

```ts
interface AccordionHandle {
  openPanel:  (id: string) => void
  closePanel: (id: string) => void
  closeAll:   () => void
  getOpenPanels: () => string[]
}

interface AccordionContextValue {
  openPanels: Set<string>
  togglePanel: (id: string) => void
  multiple: boolean
}

interface AccordionProps {
  children: ReactNode
  multiple?: boolean     // allow multiple panels open at once
  defaultOpen?: string[] // initially open panels
}

interface AccordionItemProps {
  id: string
  children: ReactNode
  disabled?: boolean
}

interface AccordionTriggerProps {
  children: ReactNode
  className?: string
}

interface AccordionContentProps {
  children: ReactNode
  className?: string
}
```

---

### Part B — `AccordionContext` and `useAccordionItem`

```ts
// Context for coordinating all panels
const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordion() {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error("Accordion subcomponents must be used inside <Accordion>")
  return ctx
}

// Context for each individual Item — shares its ID with Trigger + Content
const AccordionItemContext = createContext<{ id: string; isOpen: boolean; disabled: boolean } | null>(null)

function useAccordionItem() {
  const ctx = useContext(AccordionItemContext)
  if (!ctx) throw new Error("Trigger/Content must be used inside <Accordion.Item>")
  return ctx
}
```

---

### Part C — `Accordion` root component (with forwardRef)

```tsx
const Accordion = forwardRef<AccordionHandle, AccordionProps>(function Accordion(
  { children, multiple = false, defaultOpen = [] },
  ref
) {
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set(defaultOpen))

  const togglePanel = useCallback((id: string) => {
    setOpenPanels(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiple) next.clear()   // close others in single mode
        next.add(id)
      }
      return next
    })
  }, [multiple])

  useImperativeHandle(ref, () => ({
    openPanel:  (id) => setOpenPanels(prev => {
      const next = new Set(multiple ? prev : new Set<string>())
      next.add(id)
      return next
    }),
    closePanel: (id) => setOpenPanels(prev => { const next = new Set(prev); next.delete(id); return next }),
    closeAll:   ()   => setOpenPanels(new Set()),
    getOpenPanels: () => [...openPanels],
  }), [openPanels, multiple])

  return (
    <AccordionContext.Provider value={{ openPanels, togglePanel, multiple }}>
      <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
        {children}
      </div>
    </AccordionContext.Provider>
  )
})

Accordion.displayName = "Accordion"
```

---

### Part D — `Accordion.Item`, `Accordion.Trigger`, `Accordion.Content`

```tsx
// Accordion.Item — provides id + isOpen to children
function AccordionItem({ id, children, disabled = false }: AccordionItemProps) {
  const { openPanels } = useAccordion()
  const isOpen = openPanels.has(id)

  return (
    <AccordionItemContext.Provider value={{ id, isOpen, disabled }}>
      <div className={disabled ? "opacity-50" : ""}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

// Accordion.Trigger — button that toggles the item
function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const { togglePanel } = useAccordion()
  const { id, isOpen, disabled } = useAccordionItem()

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => togglePanel(id)}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${id}`}
      className={`w-full flex justify-between items-center px-6 py-4 text-left font-medium
                  text-gray-900 hover:bg-gray-50 transition-colors focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-blue-500 ${className ?? ""}`}
    >
      {children}
      <ChevronIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200
                               ${isOpen ? "rotate-180" : ""}`} />
    </button>
  )
}

// Accordion.Content — animated panel
function AccordionContent({ children, className }: AccordionContentProps) {
  const { id, isOpen } = useAccordionItem()
  const contentRef = useRef<HTMLDivElement>(null)

  // Animate height with CSS custom property
  // grid trick: grid-rows-[0fr] → grid-rows-[1fr]
  return (
    <div
      id={`accordion-content-${id}`}
      role="region"
      aria-labelledby={`accordion-trigger-${id}`}
      className={`grid transition-[grid-template-rows] duration-200 ease-in-out
                  ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className="overflow-hidden">
        <div ref={contentRef} className={`px-6 py-4 ${className ?? ""}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
```

> **Why the grid trick for height animation?**
> `height: auto` cannot be CSS-transitioned (browser doesn't know the end value).
> `grid-template-rows: 0fr → 1fr` achieves the same effect with a pure CSS transition — no JS measurement needed.

---

### Part E — Attaching subcomponents as static properties

```ts
// Assign subcomponents as static properties on the root
const AccordionNamespace = Object.assign(Accordion, {
  Item:    AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
})

export { AccordionNamespace as Accordion }
export type { AccordionHandle }
```

**Usage:**
```tsx
const accordionRef = useRef<AccordionHandle>(null)

// Programmatic control
<button onClick={() => accordionRef.current?.openPanel("panel-2")}>
  Open Panel 2
</button>
<button onClick={() => accordionRef.current?.closeAll()}>
  Close All
</button>

// Compound component JSX
<Accordion ref={accordionRef} multiple defaultOpen={["panel-1"]}>
  <Accordion.Item id="panel-1">
    <Accordion.Trigger>What is Tripz?</Accordion.Trigger>
    <Accordion.Content>
      <p>Tripz is a school trip management platform.</p>
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="panel-2">
    <Accordion.Trigger>How do I book a trip?</Accordion.Trigger>
    <Accordion.Content>
      <p>Fill out the booking form and submit.</p>
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="panel-3" disabled>
    <Accordion.Trigger>Premium feature (disabled)</Accordion.Trigger>
    <Accordion.Content>This requires a premium account.</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

---

### Key concepts reference

```ts
// forwardRef signature:
forwardRef<HandleType, PropsType>(function Name(props, ref) { ... })
// ↑ HandleType = what ref.current will be (ModalHandle, FormInputHandle, etc.)
// ↑ PropsType  = component props type

// useImperativeHandle — when to include a dependency array:
useImperativeHandle(ref, () => ({ getValue: () => value }), [value])
// ← include any state/prop used inside the handle methods
// ← omitting them causes stale closures: getValue() returns the initial value forever

// createPortal for modals:
createPortal(jsx, document.body)
// ← renders into document.body regardless of where Modal appears in React tree
// ← avoids z-index + overflow:hidden stacking context issues from parent containers

// grid-rows trick vs max-height animation:
// max-height: 0 → 9999px  ← works but transition speed is wrong (eases over 9999px, not actual height)
// grid-rows: 0fr → 1fr    ← transitions over actual content height, correct speed

// Compound component pattern (Object.assign):
const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
})
// ← <Accordion.Item> is just property access on the same export
// ← keeps the API discoverable: import { Accordion } + use Accordion.Item etc.
```
