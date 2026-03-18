// ============================================================
// Problem 02 — Animated Components & Transitions
// ============================================================



// ============================================================
// components/Toast.tsx
//
// Props: { message, variant, isVisible, onDismiss, duration? }
//
// TOAST_CLASSES: Record<ToastVariant, string>
//   success: bg-green-600 dark:bg-green-700
//   error:   bg-red-600   dark:bg-red-700
//   warning: bg-amber-500 dark:bg-amber-600
//   info:    bg-blue-600  dark:bg-blue-700
//
// useEffect [isVisible]: setTimeout(onDismiss, duration) + cleanup
//
// Outer div (role="alert" aria-live="polite"):
//   fixed top-4 right-4 z-50
//   transform transition-all duration-300 ease-out
//   isVisible: translate-x-0 opacity-100
//   hidden:    translate-x-full opacity-0 pointer-events-none
// ============================================================



// ============================================================
// hooks/useToast.ts
//
// interface ToastItem { id, message, variant }
// const [toasts, setToasts] = useState<ToastItem[]>([])
//
// toast(message, variant):
//   id = crypto.randomUUID()
//   setToasts(prev => [...prev, { id, message, variant }])
//
// dismiss(id): setToasts(prev => prev.filter(t => t.id !== id))
//
// ToastContainer: flex flex-col gap-2 fixed top-4 right-4 z-50
//   render toasts.map(<Toast ... onDismiss={() => dismiss(id)} />)
// ============================================================



// ============================================================
// components/Dropdown.tsx
//
// Props: { trigger, children, align?: "left"|"right" }
//
// const [isOpen, setIsOpen] = useState(false)
// useEffect: mousedown outside ref → setIsOpen(false)
// useEffect: Escape → setIsOpen(false)
//
// trigger button: aria-haspopup="true" aria-expanded={isOpen}
//
// Dropdown panel (role="menu"):
//   absolute z-20 mt-1 w-48
//   right-0 (align=right) or left-0
//   transform transition-all duration-200 ease-out origin-top-right
//   isOpen:  opacity-100 scale-100 pointer-events-auto
//   closed:  opacity-0 scale-95 pointer-events-none
//
// DropdownItem (role="menuitem"):
//   variant "danger": text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20
//   variant "default": text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700
// ============================================================



// ============================================================
// components/Skeleton.tsx + ContentFade
//
// Skeleton: animate-pulse bg-gray-200 dark:bg-gray-700 rounded
//   aria-hidden="true"
//
// BookingCardSkeleton: matches real card layout using Skeleton blocks
//
// ContentFade({ isLoading, skeleton, children }):
//   skeleton div:  transition-opacity duration-300
//     isLoading → opacity-100
//     loaded    → opacity-0 absolute inset-0 pointer-events-none
//   content div:   transition-opacity duration-300
//     isLoading → opacity-0
//     loaded    → opacity-100
// ============================================================



// ============================================================
// StaggeredList<T>
//
// Props: { items, renderItem, keyFn }
//
// Each <li>:
//   style={{ animationDelay: `${i * 50}ms` }}
//   className: opacity-0 translate-y-2 animate-[fadeSlideIn_0.3s_ease-out_forwards]
//
// tailwind.config keyframes:
//   fadeSlideIn: { "0%": { opacity: "0", transform: "translateY(8px)" },
//                  "100%": { opacity: "1", transform: "translateY(0)" } }
//
// NOTE: inline style for delay — Tailwind can't generate delay-[${i*50}ms] at runtime
// ============================================================



// ============================================================
// usePrefersReducedMotion()
//
// const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
// useState(mq.matches)
// addEventListener "change" → update state
// return prefersReduced boolean
//
// Usage: if prefersReduced → skip animation classes
// Tailwind: motion-reduce:transition-none motion-reduce:animate-none
// ============================================================
