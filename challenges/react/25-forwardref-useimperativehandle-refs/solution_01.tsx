// ============================================================
// Problem 01 — Modal & Input with Imperative API
// ============================================================



// ============================================================
// components/Modal.tsx
//
// interface ModalHandle:
//   open(), close(), toggle(), isOpen: boolean
//
// interface ModalProps:
//   title, children, onClose?, size?: "sm"|"md"|"lg"
//
// const Modal = forwardRef<ModalHandle, ModalProps>(function Modal(props, ref) {
//   State: isOpen = false
//
//   useImperativeHandle(ref, () => ({
//     open:   () => setIsOpen(true),
//     close:  () => { setIsOpen(false); onClose?.() },
//     toggle: () => setIsOpen(prev => !prev),
//     isOpen,                    ← snapshot of current state
//   }), [isOpen, onClose])       ← deps: re-creates handle when isOpen changes
//
//   Scroll lock useEffect([isOpen]):
//     isOpen ? "hidden" : ""  on document.body.style.overflow
//     cleanup: restore ""
//
//   Escape key useEffect([]):
//     keydown → if key==="Escape": setIsOpen(false)
//     cleanup: removeEventListener
//
//   if !isOpen: return null
//
//   return createPortal(
//     backdrop div onClick → close if e.target===e.currentTarget
//     panel: header (title + ✕ button) + body (children)
//     sizeClasses: { sm:"max-w-sm", md:"max-w-md", lg:"max-w-2xl" }
//   , document.body)
// })
//
// Modal.displayName = "Modal"   ← React DevTools shows "Modal" not "ForwardRef"
// ============================================================



// ============================================================
// components/FormInput.tsx
//
// interface FormInputHandle:
//   focus(), blur(), clear(), validate(): boolean, getValue(): string, setValue(v): void
//
// const FormInput = forwardRef<FormInputHandle, FormInputProps>(function FormInput(props, ref) {
//   Refs: inputRef = useRef<HTMLInputElement>(null)
//   State: value=defaultValue, error=undefined
//
//   useImperativeHandle(ref, () => ({
//     focus:    () => inputRef.current?.focus(),
//     blur:     () => inputRef.current?.blur(),
//     clear:    () => { setValue(""); setError(undefined); onChange?.("") },
//     validate: () => {
//       err = validator?.(value)
//       setError(err)
//       return !err
//     },
//     getValue: () => value,      ← must be in deps or returns stale value
//     setValue: (v) => { setValue(v); onChange?.(v) },
//   }), [value, validator, onChange])   ← value in deps = fresh closure
//
//   onChange handler:
//     setValue(e.target.value)
//     setError(undefined)          ← clear error on each keystroke
//     onChange?.(e.target.value)
//
//   Render: label + input (border-red-500 if error) + error message
// })
//
// FormInput.displayName = "FormInput"
// ============================================================



// ============================================================
// hooks/useMeasure.ts
//
// function useMeasure<T extends HTMLElement>():
//   [React.RefCallback<T>, { width, height, top, left, right, bottom }]
//
// State: measurements (all 0 initially)
//
// ref = useCallback((node: T | null) => {
//   if !node: return
//   measure = () => {
//     rect = node.getBoundingClientRect()
//     setMeasurements({ width, height, top, left, right, bottom })
//   }
//   measure()                         ← initial measurement
//   observer = new ResizeObserver(measure)
//   observer.observe(node)
//   return () => observer.disconnect()
// }, [])
//
// return [ref, measurements]
//
// Usage: const [ref, { width, height }] = useMeasure<HTMLDivElement>()
// ============================================================



// ============================================================
// TypeScript patterns for refs
//
// Parent types the ref with the Handle interface:
//   const modalRef = useRef<ModalHandle>(null)
//   ← NOT useRef<typeof Modal> — the handle, not the component
//
// forwardRef generics:
//   forwardRef<HandleType, PropsType>(...)
//   first  = what ref.current will be
//   second = component props
//
// Always optional-chain on the parent side:
//   modalRef.current?.open()   NOT   modalRef.current!.open()
//   ← component may not be mounted yet
//
// useImperativeHandle dependency array:
//   [value, validator, onChange]
//   ← any state/prop used inside handle methods must be listed
//   ← omitting = stale closure: getValue() returns initial value forever
// ============================================================
