// ============================================================
// Problem 02 — Advanced Gestures & Physics
// ============================================================



// ============================================================
// Drag with constraints
//
// <motion.div
//   drag                         ← both axes; drag="x" or drag="y" for single
//   dragConstraints={{ left:-100, right:100, top:0, bottom:0 }}
//   ← px offsets from origin; or pass a ref to constrain within element
//   dragElastic={0.1}            ← 0=rigid walls, 1=full elastic beyond bounds
//   dragMomentum={false}         ← disable inertia/throw on release
//   onDragEnd={(event, info) => {
//     info.offset.x, info.offset.y      ← total drag distance from origin
//     info.velocity.x, info.velocity.y  ← speed at release
//     if Math.abs(info.offset.x) > 100: onDelete()   ← swipe-to-delete threshold
//   }}
//   whileDrag={{ scale:1.05, rotate:2, zIndex:10 }}
// >
//
// Constrain to ref:
//   const constraintsRef = useRef()
//   <div ref={constraintsRef}><motion.div drag dragConstraints={constraintsRef}>
//
// Drag handle (useDragControls):
//   const dragControls = useDragControls()
//   <div onPointerDown={e => dragControls.start(e)}>handle</div>
//   <motion.div dragControls={dragControls} dragListener={false}>
//   ← dragListener:false → only responds to dragControls, not direct touch
// ============================================================



// ============================================================
// useMotionValue + useTransform
//
// const scale = useMotionValue(1)   ← animated value, no React re-renders
// const x = useMotionValue(0)
//
// const opacity = useTransform(scale, [1, 4], [1, 0.5])
// ← maps scale 1→4 to opacity 1→0.5 (derived motion value)
//
// const rotate = useTransform(mouseX, [-200, 200], [-15, 15])
// ← tilt card based on cursor position
//
// Wheel zoom:
//   const delta = e.deltaY > 0 ? 0.9 : 1.1
//   scale.set(Math.min(Math.max(scale.get() * delta, 1), 4))  ← clamp 1–4x
//
// <motion.img style={{ scale, x, y }} />
//   ← style prop with MotionValues: updates DOM without re-render
//
// drag pan when zoomed:
//   drag={scale.get() > 1}   ← only pan when zoomed in
// ============================================================



// ============================================================
// useScroll + useTransform — parallax
//
// const { scrollY } = useScroll()
// ← scrollY: MotionValue<number> for window scroll position
//
// const y = useTransform(scrollY, [0, 500], [0, -150])
// ← parallax: element moves at 30% of scroll speed
//
// const opacity = useTransform(scrollY, [0, 300], [1, 0])
// ← fade out hero on scroll
//
// const smoothY = useSpring(y, { stiffness:100, damping:30 })
// ← spring smoothing prevents jerky parallax
//
// <motion.div style={{ y: smoothY }}>  ← background
// <motion.div style={{ opacity }}>     ← hero text
//
// Element-scoped scroll:
//   const { scrollYProgress } = useScroll({
//     target: ref,
//     offset: ["start end", "end start"]
//     ← "start end" = element top hits viewport bottom (enters view)
//     ← "end start" = element bottom hits viewport top (exits view)
//   })
//   scrollYProgress: 0 → 1 over element's scroll range
// ============================================================



// ============================================================
// whileInView — scroll-triggered entrance
//
// <motion.div
//   initial={{ opacity:0, y:50 }}
//   whileInView={{ opacity:1, y:0 }}
//   viewport={{ once:true, margin:"-100px" }}
//   transition={{ duration:0.5, ease:"easeOut" }}
// >
//
// once:true  → animate only first time (won't re-animate on scroll back)
// margin:"-100px" → trigger 100px before element reaches viewport edge
//
// Stagger on scroll: parent variants with staggerChildren + whileInView
//   Parent: initial="hidden" whileInView="visible" viewport={{ once:true }}
//   Children: variants={{ hidden:{opacity:0,y:20}, visible:{opacity:1,y:0} }}
// ============================================================



// ============================================================
// Spring physics customization
//
// stiffness: how fast it reaches target (higher = faster)
// damping:   how much it oscillates (lower = more bounce)
// mass:      inertia (higher = slower response)
//
// Presets:
//   snappy:  { type:"spring", stiffness:500, damping:30 }
//   bouncy:  { type:"spring", stiffness:200, damping:10 }
//   gentle:  { type:"spring", stiffness:100, damping:20, mass:1.5 }
//
// v11 simplified:
//   { type:"spring", duration:0.5, bounce:0.25 }
//   bounce: 0=no oscillation, 0.5=moderate, 1=maximum
//
// useSpring — smooth-follow cursor/scroll:
//   const springX = useSpring(rawX, { stiffness:200, damping:20 })
//   springX lags behind rawX → smooth trailing cursor follower
// ============================================================



// ============================================================
// Keyframe animations
//
// Array syntax = keyframes (sequence of values):
//
// animate={{ x:[0,100,50,100,0] }}
//   ← moves through each position in sequence
//
// animate={{ rotate:[0,45,0], scale:[1,1.2,1] }}
//
// transition={{
//   duration: 2,
//   times: [0, 0.25, 0.5, 0.75, 1],   ← relative timestamps per keyframe
//   ease: ["easeOut","easeIn","easeOut","easeIn"],  ← per-segment easing
//   repeat: Infinity,
//   repeatType: "loop",     ← "loop" | "reverse" | "mirror"
//   repeatDelay: 0.5,
// }}
//
// Common patterns:
//   Pulse:  animate={{ scale:[1,1.1,1] }} transition={{ repeat:Infinity }}
//   Shake:  animate={{ x:[0,-10,10,-8,8,-4,4,0] }} transition={{ duration:0.5 }}
//   Spin:   animate={{ rotate:360 }} transition={{ repeat:Infinity, ease:"linear" }}
// ============================================================



// ============================================================
// Shared layout animations across routes (layoutId)
//
// List view: booking card thumbnail
// <motion.div layoutId={`booking-card-${booking.id}`} className="card-small">
//   <motion.h3 layoutId={`booking-title-${booking.id}`}>
//     {booking.school_name}
//   </motion.h3>
// </motion.div>
//
// Detail view: same layoutId → Framer morphs between positions/sizes
// <motion.div layoutId={`booking-card-${booking.id}`} className="card-expanded">
//   <motion.h3 layoutId={`booking-title-${booking.id}`}>
//     {booking.school_name}
//   </motion.h3>
//   <motion.p initial={{ opacity:0 }} animate={{ opacity:1, transition:{ delay:0.2 } }}>
//     Extra content without layoutId → fades in separately
//   </motion.p>
// </motion.div>
//
// Requirements:
//   Both routes inside same AnimatePresence with key={location.pathname}
//   layoutId must be unique per item (include booking.id)
//   transition on layoutId element controls morph speed:
//     transition={{ type:"spring", stiffness:300, damping:30 }}
// ============================================================



// ============================================================
// Performance
//
// GPU-safe properties (always prefer):
//   ✅ x, y, scale, rotate, opacity — composited, no layout reflow
//   ❌ width, height, top, left     — force reflow, expensive
//
// will-change (use sparingly):
//   style={{ willChange:"transform" }}
//   Hints browser to promote element to GPU layer
//   Remove when animation ends to free GPU memory
//
// MotionValues avoid re-renders:
//   const x = useMotionValue(0)          ← DOM updates bypass React
//   onMouseMove: x.set(e.clientX)
//   vs: setX(e.clientX)                 ← re-renders every mouse move (avoid)
//
// layout prop variants:
//   layout           → animate both size and position (full)
//   layout="position"→ only x/y changes (cheaper, use when size is fixed)
//   layout="size"    → only size changes
//   layout="preserve-aspect" → resize while maintaining aspect ratio
//
// AnimatePresence mode="popLayout":
//   Best for lists — removed item exits instantly, remaining items reflow
//   mode="wait" only for page transitions (sequential enter/exit)
// ============================================================
