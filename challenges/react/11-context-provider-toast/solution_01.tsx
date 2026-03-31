// ============================================================
// Problem 01 — Toast Notification System
// ============================================================



// ============================================================
// types/toast.ts
//
// ToastVariant = "success" | "error" | "info" | "warning"
//
// interface Toast:
//   id, message, variant, duration (ms; 0 = persistent), isLeaving (bool)
//
// interface ToastContextValue:
//   toasts: Toast[]
//   success(message, duration?) → id: string
//   error(message, duration?)   → id: string
//   info(message, duration?)    → id: string
//   warning(message, duration?) → id: string
//   dismiss(id): void
//   dismissAll(): void
// ============================================================



// ============================================================
// context/ToastContext.tsx
//
// DEFAULT_DURATIONS: Record<ToastVariant, number>
//   success: 3000, error: 6000, info: 4000, warning: 5000
//
// ToastProvider:
//   const [toasts, setToasts] = useState<Toast[]>([])
//   const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
//     ← useRef for timer IDs — persists without triggering re-renders
//
//   startDismiss(id):
//     clearTimeout(timers.current.get(id)) + timers.current.delete(id)
//     setToasts: mark isLeaving: true  ← triggers CSS exit animation
//     setTimeout(300ms): filter out id from array  ← remove after animation
//
//   addToast(message, variant, duration?):
//     id = crypto.randomUUID()
//     push { id, message, variant, duration: ms, isLeaving: false }
//     if ms > 0: setTimeout(startDismiss, ms) + timers.current.set(id, timer)
//     return id
//
//   success = useCallback((m, d?) => addToast(m, "success", d), [addToast])
//   error   = useCallback(...)
//   dismiss = useCallback((id) => startDismiss(id), [startDismiss])
//
//   return <ToastContext.Provider value={...}>{children}<ToastContainer /></Provider>
//     ← ToastContainer rendered inside Provider — accesses context automatically
//
// useToast():
//   ctx = useContext(ToastContext)
//   if !ctx: throw new Error("useToast must be inside <ToastProvider>")
//   return ctx
// ============================================================



// ============================================================
// components/ToastContainer.tsx
//
// VARIANT_CLASSES: Record<ToastVariant, string>
//   success: "bg-green-600", error: "bg-red-600", etc.
//
// VARIANT_ICONS: Record<ToastVariant, string>
//   success: "✓", error: "✕", info: "ℹ", warning: "⚠"
//
// <div aria-live="polite" aria-label="Notifications"
//      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
//
// Each toast div:
//   role="alert"
//   pointer-events-auto  ← container is none, but individual toasts intercept clicks
//   transition-all duration-300
//   isLeaving: false → translate-x-0 opacity-100  (visible)
//   isLeaving: true  → translate-x-full opacity-0  (sliding out)
//
// Dismiss button: onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"
// ============================================================
