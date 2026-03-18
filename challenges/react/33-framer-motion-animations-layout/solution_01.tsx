// ============================================================
// Problem 01 — Animated Booking UI
// ============================================================



// ============================================================
// motion component basics
//
// motion.div, motion.li, motion.button — any HTML/SVG element
//
// <motion.div
//   initial={{ opacity: 0, y: 20 }}    ← start state
//   animate={{ opacity: 1, y: 0 }}     ← target state
//   exit={{ opacity: 0, y: -20 }}      ← unmount state (needs AnimatePresence)
//   transition={{ duration: 0.3, ease: "easeOut" }}
// />
//
// Prefer: x, y, scale, rotate, opacity — GPU composited, no layout reflow
// Avoid: width, height, top, left — cause reflow, expensive
// ============================================================



// ============================================================
// BookingCard variants + micro-interactions
//
// cardVariants = {
//   hidden:  { opacity:0, y:20, scale:0.95 }
//   visible: { opacity:1, y:0, scale:1,
//              transition: { type:"spring", stiffness:300, damping:24 } }
//   exit:    { opacity:0, x:-100, scale:0.9,
//              transition: { duration:0.2, ease:"easeIn" } }
// }
//
// <motion.div
//   layout                    ← smooth reposition when siblings are added/removed
//   variants={cardVariants}
//   initial="hidden"
//   animate="visible"
//   exit="exit"
//   whileHover={{ scale:1.02, boxShadow:"0 8px 30px rgba(0,0,0,0.12)" }}
//   whileTap={{ scale:0.98 }}
// >
//
// layout prop:
//   When an item is removed, sibling items animate into new position
//   Without layout: siblings "jump" immediately
//   layout="position" → only x/y (cheaper); layout → size + position
// ============================================================



// ============================================================
// AnimatePresence — enter/exit on list items
//
// <AnimatePresence mode="popLayout">
//   {bookings.map(b => <BookingCard key={b.id} ... />)}
// </AnimatePresence>
//
// CRITICAL: children must have stable key prop
//   Without key: React recycles DOM → exit animation never fires
//
// mode options:
//   "sync"      (default) — enter/exit simultaneous
//   "wait"      — new item waits for old to finish exiting
//   "popLayout" — removed item pops out, remaining reflow immediately (best for lists)
//
// initial={false} on AnimatePresence:
//   skip enter animation on first render (already-present items don't animate in)
// ============================================================



// ============================================================
// Staggered list — variants propagation
//
// listVariants = {
//   hidden: {}
//   visible: { transition: { staggerChildren:0.07, delayChildren:0.1 } }
//   exit:    { transition: { staggerChildren:0.05, staggerDirection:-1 } }
// }
// staggerDirection: -1 = last child exits first
//
// itemVariants = {
//   hidden: { opacity:0, x:-20 }
//   visible: { opacity:1, x:0 }
//   exit:    { opacity:0, x:20 }
// }
//
// <motion.ul variants={listVariants} initial="hidden" animate="visible">
//   {bookings.map(b => (
//     <motion.li key={b.id} variants={itemVariants} layout>
//
// Variants propagation:
//   Parent animate="visible" → children with matching variant names animate
//   Children don't need their own initial/animate — they inherit + stagger timing
// ============================================================



// ============================================================
// Page transitions — AnimatePresence + routing
//
// pageVariants = {
//   initial: { opacity:0, x:20 }
//   in:      { opacity:1, x:0, transition:{ duration:0.3, ease:"easeOut" } }
//   out:     { opacity:0, x:-20, transition:{ duration:0.2, ease:"easeIn" } }
// }
//
// <AnimatePresence mode="wait" initial={false}>
//   <Routes location={location} key={location.pathname}>
//     ← key={location.pathname}: tells AnimatePresence this is a new instance
//     ← triggers exit on old route, enter on new route
//
//   <Route path="/bookings" element={
//     <motion.div variants={pageVariants} initial="initial" animate="in" exit="out">
//       <BookingsPage />
//     </motion.div>
//   } />
//
// initial={false}: skip entrance animation on first app load
// mode="wait": old route fully exits before new route enters
// ============================================================



// ============================================================
// useAnimation — programmatic control
//
// const controls = useAnimation()
//
// useEffect(() => {
//   if (status === "paid"):
//     controls.start({ scale:[1,1.3,1], backgroundColor:["#fbbf24","#22c55e","#22c55e"] })
//   if (status === "cancelled"):
//     controls.start({ x:[0,-8,8,-4,4,0] })   ← shake keyframe
// }, [status])
//
// <motion.span animate={controls}>
//
// Use when animation is triggered by external logic, not user gesture
// Sequence with await:
//   await controls.start({ x:100 })   ← waits for completion
//   await controls.start({ opacity:0 })
//
// controls.stop()  — halt animation mid-way
// ============================================================



// ============================================================
// layoutId — tab indicator (magic underline)
//
// LayoutGroup wraps components that share layout context
//
// {tabs.map(tab => (
//   <button key={tab} className="relative">
//     {tab}
//     {active === tab && (
//       <motion.div
//         layoutId="activeTab"
//         className="absolute inset-0 bg-blue-500 rounded"
//         transition={{ type:"spring", stiffness:400, damping:30 }}
//       />
//     )}
//   </button>
// ))}
//
// layoutId: same value across renders → Framer morphs between positions
// Result: indicator smoothly slides from tab to tab
// ============================================================



// ============================================================
// useReducedMotion — accessibility
//
// const shouldReduce = useReducedMotion()
// ← true when OS/browser "prefers-reduced-motion: reduce"
//
// variants = {
//   hidden: { opacity:0, y: shouldReduce ? 0 : 20 },
//   visible: { opacity:1, y:0 },
// }
// transition = shouldReduce ? { duration:0.1 } : { type:"spring" }
//
// Rule: never remove opacity changes (flashes are jarring)
//       remove or reduce movement (vestibular disorder)
// ============================================================



// ============================================================
// Key concepts
//
// AnimatePresence placement:
//   Wrap conditional renders: {show && <motion.div exit=...>}
//   Wrap mapped lists: {items.map(item => <motion.li key=...>)}
//   One AnimatePresence can have multiple children — each exits independently
//
// Transition shorthand per-property:
//   animate={{ x:100, opacity:1 }}
//   transition={{ x:{ type:"spring" }, opacity:{ duration:0.2 } }}
//
// whileHover/whileTap safety:
//   Pass empty object {} to disable gesture during loading:
//   whileHover={isLoading ? {} : { scale:1.05 }}
//
// MotionValues vs React state:
//   useMotionValue: updates without React re-renders (DOM-level)
//   useState: triggers re-render on every change
//   Prefer MotionValue for continuous animations (scroll, drag, mouse)
// ============================================================
