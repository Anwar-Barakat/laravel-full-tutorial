# REACT_TEST_33 — Framer Motion • Animations • Layout

**Time:** 25 minutes | **Stack:** React + TypeScript + Framer Motion v11

---

## Problem 01 — Animated Booking UI (Medium)

Build smooth animated booking UI with enter/exit, stagger, layout animations, and micro-interactions.

---

### Core motion components

```tsx
import { motion, AnimatePresence, useAnimation } from "framer-motion"

// motion.div = div with animation superpowers
// Any HTML/SVG element: motion.div, motion.li, motion.button, motion.svg

<motion.div
  initial={{ opacity: 0, y: 20 }}   // start state
  animate={{ opacity: 1, y: 0 }}    // target state
  exit={{ opacity: 0, y: -20 }}     // unmount state (needs AnimatePresence parent)
  transition={{ duration: 0.3, ease: "easeOut" }}
/>
```

---

### BookingCard — animated card with micro-interactions

```tsx
// variants/bookingCard.ts
export const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
  exit: {
    opacity: 0, x: -100, scale: 0.9,
    transition: { duration: 0.2, ease: "easeIn" }
  },
}

// BookingCard.tsx
interface BookingCardProps {
  booking: Booking
  onDelete: (id: number) => void
}

function BookingCard({ booking, onDelete }: BookingCardProps) {
  return (
    <motion.div
      layout                          // ← smoothly repositions when list reorders
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
      whileTap={{ scale: 0.98 }}
      className="booking-card"
    >
      <h3>{booking.school_name}</h3>
      <p>{booking.trip_date}</p>
      <motion.button
        whileHover={{ backgroundColor: "#ef4444" }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onDelete(booking.id)}
      >
        Delete
      </motion.button>
    </motion.div>
  )
}
```

**`layout` prop:** when an item is removed from a list, sibling items animate into their
new positions instead of jumping. Works with `layoutId` for shared transitions.

---

### AnimatePresence — enter/exit animations

```tsx
// BookingList.tsx
function BookingList({ bookings }: { bookings: Booking[] }) {
  return (
    <AnimatePresence mode="popLayout">
      {/*
        mode="popLayout": removed item "pops" out while remaining items
          reflow immediately — best for lists
        mode="wait":    new item waits for old item to exit first
        mode="sync":    (default) enter/exit happen simultaneously
      */}
      {bookings.map(booking => (
        <BookingCard key={booking.id} booking={booking} onDelete={handleDelete} />
      ))}
    </AnimatePresence>
  )
}
```

**Critical:** `AnimatePresence` children must have a stable `key` prop.
Without it, React recycles DOM nodes → exit animation never fires.

---

### Staggered list — variants propagation

```tsx
// Parent defines stagger timing, children inherit and offset
const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,    // ← 70ms delay between each child
      delayChildren: 0.1,       // ← initial delay before first child
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
    // staggerDirection: -1 = reverse order on exit (last exits first)
  },
}

// Child uses same variant names ("hidden"/"visible") — inherits stagger timing
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: 20 },
}

function StaggeredList({ bookings }: { bookings: Booking[] }) {
  return (
    <motion.ul variants={listVariants} initial="hidden" animate="visible" exit="exit">
      <AnimatePresence>
        {bookings.map(b => (
          <motion.li key={b.id} variants={itemVariants} layout>
            <BookingCard booking={b} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
```

**Variants propagation:** when parent has `variants` prop and `animate="visible"`,
children with matching variant keys animate automatically — no explicit `animate` needed on children.

---

### Page transitions with AnimatePresence + routing

```tsx
// PageTransition.tsx
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in:      { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  out:     { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/*
        key={location.pathname}: tells AnimatePresence this is a new "instance"
          → triggers exit on old route, enter on new route
        initial={false}: skip enter animation on first page load
      */}
      <Routes location={location} key={location.pathname}>
        <Route path="/bookings" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="in"
            exit="out"
          >
            <BookingsPage />
          </motion.div>
        } />
        <Route path="/bookings/:id" element={
          <motion.div variants={pageVariants} initial="initial" animate="in" exit="out">
            <BookingDetailPage />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  )
}
```

---

### useAnimation — programmatic control

```tsx
// Use when animation is triggered by external logic (not hover/tap)
function BookingStatusBadge({ status }: { status: Booking["status"] }) {
  const controls = useAnimation()

  useEffect(() => {
    if (status === "paid") {
      controls.start({
        scale: [1, 1.3, 1],
        backgroundColor: ["#fbbf24", "#22c55e", "#22c55e"],
        transition: { duration: 0.5, times: [0, 0.6, 1] },
      })
    }
    if (status === "cancelled") {
      controls.start({
        x: [0, -8, 8, -4, 4, 0],  // shake
        transition: { duration: 0.4 },
      })
    }
  }, [status, controls])

  return (
    <motion.span animate={controls} className={`badge badge-${status}`}>
      {status}
    </motion.span>
  )
}

// Sequence animations:
async function runSequence() {
  await controls.start({ x: 100 })   // waits for this to complete
  await controls.start({ opacity: 0 })
  controls.start({ y: -50 })         // fire and forget
}
```

---

### useReducedMotion — accessibility

```tsx
import { useReducedMotion } from "framer-motion"

function BookingCard({ booking }: { booking: Booking }) {
  const shouldReduce = useReducedMotion()
  // true when user has prefers-reduced-motion: reduce in OS/browser settings

  const variants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  }
  // If reduced: still fade in (opacity), but skip movement (y)
  // Never remove animations entirely — opacity is generally safe

  return (
    <motion.div variants={variants} initial="hidden" animate="visible"
      transition={shouldReduce ? { duration: 0.1 } : { type: "spring" }}
    >
      {booking.school_name}
    </motion.div>
  )
}
```

---

### LayoutGroup — coordinated layout animations

```tsx
import { LayoutGroup } from "framer-motion"

// Wrap components that share layout context
function BookingsApp() {
  return (
    <LayoutGroup>
      <FilterTabs />       {/* layout animations in here... */}
      <BookingList />      {/* ...coordinate with layout animations in here */}
    </LayoutGroup>
  )
}

// Active tab indicator using layoutId:
function FilterTabs() {
  const [active, setActive] = useState("all")
  const tabs = ["all", "paid", "pending", "cancelled"]

  return (
    <div className="flex gap-2">
      {tabs.map(tab => (
        <button key={tab} onClick={() => setActive(tab)} className="relative px-4 py-2">
          {tab}
          {active === tab && (
            <motion.div
              layoutId="activeTab"              // ← same layoutId across renders
              className="absolute inset-0 bg-blue-500 rounded-lg -z-10"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
```

**`layoutId`:** Framer Motion morphs the element from its old position/size to the new one.
The "magic" tab underline effect — element jumps between tabs with smooth animation.

---

### motion.button with loading state

```tsx
function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <motion.button
      disabled={isLoading}
      whileHover={isLoading ? {} : { scale: 1.05 }}  // disable hover when loading
      whileTap={isLoading ? {} : { scale: 0.95 }}
      animate={isLoading ? { opacity: 0.7 } : { opacity: 1 }}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <Spinner />
          </motion.span>
        ) : (
          <motion.span key="text"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            Create Booking
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
```

---

## Problem 02 — Advanced Gestures & Physics (Hard)

Drag constraints, pinch-to-zoom, scroll-triggered animations, spring physics, keyframes, shared layout.

---

### Drag with constraints

```tsx
import { motion, useDragControls } from "framer-motion"

function DraggableBookingCard({ booking }: { booking: Booking }) {
  const dragControls = useDragControls()

  return (
    <div>
      {/* Drag handle — initiate drag from specific element */}
      <div onPointerDown={e => dragControls.start(e)} className="drag-handle cursor-grab">
        ⠿
      </div>

      <motion.div
        drag                           // enable both axes
        dragControls={dragControls}
        dragListener={false}           // ← only respond to dragControls (not direct drag)
        dragConstraints={{ left: -100, right: 100, top: 0, bottom: 0 }}
        // constrain drag within bounding box (px offsets from origin)
        dragElastic={0.1}              // 0=rigid, 1=full elastic beyond constraints
        dragMomentum={false}           // disable momentum/inertia on release
        onDragEnd={(event, info) => {
          if (Math.abs(info.offset.x) > 100) {
            onDelete(booking.id)       // swipe-to-delete threshold
          }
        }}
        // info: { offset: {x,y}, velocity: {x,y}, point: {x,y} }
        whileDrag={{ scale: 1.05, rotate: 2, zIndex: 10 }}
      >
        {booking.school_name}
      </motion.div>
    </div>
  )
}

// Constrain to a ref:
function BoundedDrag() {
  const constraintsRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={constraintsRef} className="relative h-64 bg-gray-100">
      <motion.div drag dragConstraints={constraintsRef}>
        {/* Constrained within parent div bounds */}
      </motion.div>
    </div>
  )
}
```

---

### Pinch-to-zoom on images

```tsx
import { motion, useMotionValue, useTransform } from "framer-motion"

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const scale = useMotionValue(1)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale.set(Math.min(Math.max(scale.get() * delta, 1), 4))  // clamp 1–4x
  }

  // Touch pinch via Pointer Events API
  const pointers = useRef<Map<number, PointerEvent>>(new Map())

  const handlePointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, e.nativeEvent)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, e.nativeEvent)
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
      // compare to previous distance to derive scale delta
    }
  }

  return (
    <div className="overflow-hidden" style={{ touchAction: "none" }}>
      <motion.img
        src={src} alt={alt}
        style={{ scale, x, y }}          // ← motion values, not React state
        drag={scale.get() > 1}           // allow pan only when zoomed in
        dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
        onWheel={handleWheel as any}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
    </div>
  )
}
```

**MotionValues:** `useMotionValue` creates a value that animates without triggering React re-renders.
`useTransform` derives new motion values: `const opacity = useTransform(scale, [1, 4], [1, 0.5])`.

---

### useTransform + useScroll — parallax

```tsx
import { useScroll, useTransform, useSpring } from "framer-motion"

function ParallaxHero() {
  const { scrollY } = useScroll()
  // scrollY: MotionValue<number> tracking window scroll position

  const y = useTransform(scrollY, [0, 500], [0, -150])
  // maps scrollY 0→500 to y 0→-150 (parallax: moves slower than scroll)

  const opacity = useTransform(scrollY, [0, 300], [1, 0])
  // fade out hero content as user scrolls down

  // Spring smoothing — prevent jerky parallax
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 })

  return (
    <div className="relative h-screen overflow-hidden">
      <motion.div style={{ y: smoothY }} className="absolute inset-0">
        <img src="/hero-bg.jpg" alt="" className="w-full h-full object-cover" />
      </motion.div>
      <motion.div style={{ opacity }} className="relative z-10 hero-content">
        <h1>Tripz Booking Platform</h1>
      </motion.div>
    </div>
  )
}

// useScroll on a specific element (not window):
function ScrollableSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
    // "start end" = when element top hits viewport bottom (enters)
    // "end start" = when element bottom hits viewport top (exits)
  })
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8])

  return (
    <div ref={ref}>
      <motion.div style={{ scale }}>{/* content */}</motion.div>
    </div>
  )
}
```

---

### whileInView — scroll-triggered animations

```tsx
function BookingFeatureCard({ feature }: { feature: Feature }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      // once: true → animate only first time element enters viewport
      // margin: "-100px" → trigger 100px before element reaches viewport edge
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {feature.title}
    </motion.div>
  )
}

// Stagger on scroll:
function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <motion.div
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {features.map(f => (
        <motion.div key={f.id} variants={{ hidden: { opacity:0, y:20 }, visible: { opacity:1, y:0 } }}>
          {f.title}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

---

### Spring physics customization

```tsx
// Spring types and their feel:
const springs = {
  snappy: { type: "spring", stiffness: 500, damping: 30 },
  // High stiffness: fast. Higher damping: less oscillation. Good for UI buttons.

  bouncy: { type: "spring", stiffness: 200, damping: 10 },
  // Low damping: more oscillation/bounce. Good for playful elements.

  gentle: { type: "spring", stiffness: 100, damping: 20, mass: 1.5 },
  // Higher mass: slower response. Good for large/heavy elements.

  wobbly: { type: "spring", stiffness: 300, damping: 5 },
  // Very low damping: significant wobble. Use sparingly.
}

// useSpring — smoothly follow a value:
const x = useMotionValue(0)
const springX = useSpring(x, { stiffness: 200, damping: 20 })
// springX lags behind x with spring physics → smooth cursor follower

// duration-based spring (v11):
{ type: "spring", duration: 0.5, bounce: 0.25 }
// bounce: 0=no bounce, 0.5=moderate, 1=maximum. Simpler mental model.
```

---

### Keyframe animations

```tsx
// Array syntax = keyframes (CSS @keyframes equivalent):
<motion.div
  animate={{
    x: [0, 100, 50, 100, 0],       // sequence of positions
    backgroundColor: ["#3b82f6", "#22c55e", "#ef4444", "#3b82f6"],
    rotate: [0, 45, 0],
  }}
  transition={{
    duration: 2,
    times: [0, 0.25, 0.5, 0.75, 1],  // relative timestamps (0–1) for each keyframe
    ease: ["easeOut", "easeIn", "easeOut", "easeIn"],  // per-segment easing
    repeat: Infinity,
    repeatType: "loop",    // "loop" | "reverse" | "mirror"
    repeatDelay: 0.5,
  }}
/>

// Pulse animation:
<motion.div
  animate={{ scale: [1, 1.1, 1] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
/>

// Notification shake:
<motion.div
  animate={{ x: [0, -10, 10, -8, 8, -4, 4, 0] }}
  transition={{ duration: 0.5 }}
/>
```

---

### Shared layout animations across routes (layoutId)

```tsx
// Booking card in list → expands to full detail page
// Same layoutId makes Framer Motion animate between the two DOM positions

// BookingsList.tsx
function BookingsList({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {bookings.map(booking => (
        <Link key={booking.id} to={`/bookings/${booking.id}`}>
          <motion.div layoutId={`booking-card-${booking.id}`} className="card">
            <motion.h3 layoutId={`booking-title-${booking.id}`}>
              {booking.school_name}
            </motion.h3>
          </motion.div>
        </Link>
      ))}
    </div>
  )
}

// BookingDetail.tsx — receives matching layoutId
function BookingDetail({ booking }: { booking: Booking }) {
  return (
    <motion.div layoutId={`booking-card-${booking.id}`} className="card-expanded">
      <motion.h3 layoutId={`booking-title-${booking.id}`}>
        {booking.school_name}
      </motion.h3>
      {/* Additional detail content without a layoutId animates in separately */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}>
        {booking.trip_date}
      </motion.p>
    </motion.div>
  )
}

// Wrap both routes in same AnimatePresence for exit to work:
<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    <Route path="/bookings" element={<BookingsList />} />
    <Route path="/bookings/:id" element={<BookingDetail />} />
  </Routes>
</AnimatePresence>
```

---

### Performance tips

```tsx
// 1. Use transform/opacity — GPU composited, no layout thrash
//    ✅ x, y, scale, rotate, opacity
//    ❌ width, height, top, left — cause reflow

// 2. will-change hint for complex animations:
<motion.div style={{ willChange: "transform" }} animate={{ x: 100 }} />
// Remove will-change when not animating to free GPU memory

// 3. Lazy evaluation with MotionValues (no re-renders):
const mouseX = useMotionValue(0)
const mouseY = useMotionValue(0)
const rotate = useTransform(mouseX, [-200, 200], [-15, 15])
// ← mouseX/rotate update without React re-renders

// 4. AnimatePresence with mode="popLayout" for list performance:
// Removed items "pop" out immediately, remaining items reflow without waiting
<AnimatePresence mode="popLayout">{items.map(...)}</AnimatePresence>

// 5. layout="position" vs layout="size" vs layout (full):
<motion.div layout="position" />  // only animates x/y changes (not size)
<motion.div layout="size" />      // only animates size changes
<motion.div layout />             // animates both (most expensive)
```

---

### Key concepts summary

| Concept | Use case |
|---|---|
| `motion.div` | Any element needing animation |
| `AnimatePresence` | Mount/unmount animations — always wrap conditional renders |
| `layout` | Smooth position/size changes when list reorders |
| `layoutId` | Shared element transitions across routes/states |
| `variants` | Named animation states, enables stagger propagation |
| `staggerChildren` | Cascade delay across parent → children |
| `whileHover/whileTap` | Micro-interactions — gesture states |
| `whileInView` | Scroll-triggered entrance animations |
| `useAnimation` | Programmatic control (triggered by logic, not gestures) |
| `useMotionValue` | Animated values without re-renders |
| `useTransform` | Derive one motion value from another |
| `useScroll` | Scroll position as motion value |
| `useSpring` | Smooth/physics-follow a motion value |
| `drag` + `dragConstraints` | Bounded dragging |
| `useReducedMotion` | Accessibility — respect OS reduced-motion setting |
