// SOLUTION 02 — Controlled vs Uncontrolled Debug: Bug 5 + General Rules
// ============================================================
// This skeleton explains the stale closure bug in handleSubmit,
// plus general rules for avoiding closure and state mutation pitfalls.
// NO executable code — comments only.
// ============================================================

// --- BUG 5: stale closure inside setTimeout ---
//
// Problem:
//   async function handleSubmit(e) {
//     e.preventDefault()
//     setTimeout(() => {
//       fetch('/api/bookings', { body: JSON.stringify(form) })  // ← form is stale
//     }, 0)
//   }
//
// Understanding closures in React:
//   handleSubmit is created inside the component function.
//   Every render creates a new handleSubmit, and each one closes over
//   the value of `form` that existed during THAT render.
//   form is captured by value at the time handleSubmit is created.
//
// What setTimeout does:
//   setTimeout schedules the callback to run after the current call stack clears.
//   The callback runs in a FUTURE tick of the event loop.
//   By then, React may have processed additional state updates.
//   A state update (setForm(...)) creates a new form object in the next render.
//   But the setTimeout callback still holds a reference to the OLD form object
//   from the render when handleSubmit was created.
//
// Concrete scenario where this breaks:
//   User types 'school' in schoolName (setForm is called — new render queued)
//   User clicks Submit before React has flushed the update
//   handleSubmit runs with the old form (schoolName is '' or 'schoo')
//   setTimeout fires and POSTs the stale data
//   Server receives incomplete schoolName
//
// Fix option A — Remove the setTimeout entirely:
//   There is no valid reason to defer a fetch inside an event handler.
//   If it was added to "let React flush first", it is the wrong tool.
//   Just call fetch directly:
//     await fetch('/api/bookings', { method: 'POST', body: JSON.stringify(form) })
//   By the time the user clicks Submit, the latest form state is already captured
//   by the current render's handleSubmit closure.
//
// Fix option B — Capture form in a variable before the setTimeout (if you must keep it):
//   const currentForm = form   ← captures the current render's form value
//   setTimeout(() => {
//     fetch('/api/bookings', { body: JSON.stringify(currentForm) })
//   }, 0)
//   currentForm is a local const that setTimeout's closure captures.
//   But this is still fragile and unnecessary — prefer Fix A.
//
// Fix option C — Use useRef to always access the latest form:
//   const formRef = useRef(form)
//   useEffect(() => { formRef.current = form }, [form])  ← keep ref in sync
//   setTimeout(() => {
//     fetch('/api/bookings', { body: JSON.stringify(formRef.current) })
//   }, 0)
//   Refs are mutable and not part of the render cycle.
//   formRef.current always holds the latest value regardless of when the callback runs.
//   This is the correct pattern when you genuinely need to access state inside
//   a long-lived callback (e.g. an interval, a WebSocket handler, an animation frame).
//   Still unnecessary here — prefer Fix A for a simple form submit.

// --- WHY STALE CLOSURES HAPPEN ---
// React re-renders create new function instances.
// Each instance closes over the state values from its render.
// When you pass a function to setTimeout, addEventListener, or a Promise callback,
// that function holds a snapshot of the state from the render it was created in.
//
// The problem only surfaces when:
//   1. State updates happen between the closure being created and being called
//   2. The callback is invoked asynchronously (after state has moved on)
//
// Synchronous event handlers do NOT have this problem:
//   The handler runs in the same tick as the event.
//   React batches state updates but the handler itself sees the current render's values.
//   By the time the user clicks, the form state has already been committed by React.

// --- GENERAL RULES: AVOIDING STATE AND CLOSURE BUGS ---
//
// Rule 1: Never mutate state
//   State must be replaced with a new object/array, not modified in place.
//   Mutation breaks React's change detection (Object.is comparison).
//   Mutation makes debugging harder — you cannot compare old and new state.
//   Correct: setForm({ ...form, field: value })
//
// Rule 2: Prefer functional state updates when the next value depends on the current value
//   setForm(prev => ({ ...prev, field: value }))
//   This always operates on the latest committed state.
//   Without this, rapid updates (like fast typing) can cause updates to be lost
//   if React batches multiple setForm calls from the same render.
//
// Rule 3: Do not put async callbacks that read state inside setTimeout or setInterval
//   Unless you are specifically working around a layout/paint timing issue,
//   there is no need to defer a state read with a timer.
//   If you do need a timer, capture the value before scheduling the callback.
//
// Rule 4: Use useRef for values that must be read in long-lived callbacks
//   Interval callbacks, WebSocket handlers, and drag-and-drop handlers are all
//   cases where you need the latest state without re-registering the handler.
//   Pattern: keep a ref in sync with state via useEffect, read the ref in the callback.
//
// Rule 5: Initialise form state with the correct types
//   undefined → '' for text
//   null      → '' for text
//   number fields → 0 or '' depending on whether empty is valid
//   boolean fields → false
//   This prevents the controlled/uncontrolled switching warning entirely.

// --- ALL 5 BUGS SUMMARISED ---
// Bug 1: schoolName: undefined  → controlled/uncontrolled warning
//         Fix: schoolName: ''
//
// Bug 2: notes: null            → same warning for textarea
//         Fix: notes: ''
//
// Bug 3: form[key] = val; setForm(form)  → mutation + same reference → may not re-render
//         Fix: setForm(prev => ({ ...prev, [key]: val }))
//
// Bug 4: studentCount: e.target.value   → stores string instead of number
//         Fix: studentCount: Number(e.target.value)
//
// Bug 5: setTimeout(() => fetch(... form ...))  → stale closure, old form value submitted
//         Fix: remove setTimeout, call fetch directly
