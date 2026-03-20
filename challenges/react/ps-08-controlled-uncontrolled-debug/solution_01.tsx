// SOLUTION 01 — Controlled vs Uncontrolled Debug: Bugs 1-4
// ============================================================
// This skeleton explains the first four bugs: undefined/null initial values,
// direct state mutation, and missing number conversion.
// NO executable code — comments only.
// ============================================================

// --- BUG 1: schoolName initialised to undefined ---
//
// Problem:
//   <input value={form.schoolName} ... />
//   On first render, form.schoolName is undefined.
//   React sees value={undefined} and treats the input as UNCONTROLLED
//   (same as not providing a value prop at all).
//   When the user types, setForm is called, schoolName becomes a string,
//   and React sees value="something" — now the input is CONTROLLED.
//   Switching from uncontrolled to controlled is not allowed in React and
//   triggers the warning: "A component is changing an uncontrolled input to be controlled".
//
// Why undefined specifically:
//   React's rule: if value is undefined, the input is uncontrolled.
//   If value is any other value (including ''), the input is controlled.
//   The distinction is made at mount time based on the first render.
//
// Fix:
//   Initialise schoolName to '' (empty string) in useState.
//   '' is a valid controlled value. React sees value='' from the start
//   and the input is controlled for its entire lifetime.
//   schoolName: ''   ← never undefined, never null

// --- BUG 2: notes initialised to null ---
//
// Problem:
//   <textarea value={form.notes} ... />
//   null behaves exactly like undefined for React input value props.
//   React treats value={null} as no value prop, making the textarea uncontrolled.
//   Same warning as Bug 1 when the user types and notes changes to a string.
//
// Why null and undefined are both problematic:
//   React internally checks: value == null (loose equality)
//   Both undefined == null and null == null are true in JavaScript.
//   So both result in the same "uncontrolled" treatment.
//
// Fix:
//   Initialise notes to ''.
//   notes: ''   ← empty string is a valid controlled value

// --- BUG 3: mutating state directly ---
//
// Problem:
//   form[e.target.name] = e.target.value   ← this mutates the existing form object
//   setForm(form)                           ← this passes the SAME object reference
//
// Two separate issues compound here:
//
//   Issue A — Mutation:
//   Mutating form directly modifies the object in memory.
//   React does not know a mutation happened because no new object was created.
//   React may skip the re-render, or the state update may be dropped silently.
//
//   Issue B — Same reference:
//   setForm(form) passes the exact same object that is already in state.
//   React compares previous and next state with Object.is(prevState, nextState).
//   Object.is(form, form) is always true — same reference.
//   React may bail out of re-rendering entirely (this is an optimisation).
//   Result: the input does not visually update, even though the mutation happened.
//
// Together: the state is corrupted (mutated object) and the component may not re-render.
//
// Fix:
//   Always create a new object for setForm:
//   setForm({ ...form, [e.target.name]: e.target.value })
//
//   { ...form } creates a new object (different reference from form).
//   [e.target.name]: e.target.value uses computed property key to update one field.
//   React sees a new object reference, knows state changed, and schedules a re-render.
//
// Best practice:
//   When the new state depends on the previous state, use the functional form:
//   setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
//   This guarantees you are spreading the latest state, not a stale closure capture.

// --- BUG 4: studentCount stored as string ---
//
// Problem:
//   <input type="number" ... />
//   Even with type="number", e.target.value is always a string in JavaScript.
//   The DOM always gives you strings from event handlers.
//   setForm({ ...form, studentCount: e.target.value }) stores '12', not 12.
//
// Why this matters:
//   If your API or Zod schema expects studentCount to be a number,
//   receiving '12' (string) will cause a validation failure or type error.
//   JSON.stringify({ studentCount: '12' }) sends "studentCount":"12"
//   JSON.stringify({ studentCount: 12 }) sends "studentCount":12
//   These are different values to a strictly-typed backend.
//
// Fix:
//   Convert immediately on input:
//   setForm({ ...form, studentCount: Number(e.target.value) })
//
//   Alternatively: parseInt(e.target.value, 10) for whole numbers
//   Number('') returns 0, so consider validating empty input separately.
//   Number('abc') returns NaN — validate before storing if needed.
//
// General rule:
//   When an input is type="number", always convert the value before storing in state.
//   The input controls the display; your state should hold the correct type.

// --- CONTROLLED INPUT RULES (SUMMARY) ---
// 1. Never initialise a controlled input's value to undefined or null
//    → Always use '' for text, 0 or '' for numbers, false for checkboxes
//
// 2. Never mutate the state object directly
//    → Always spread: setForm({ ...form, field: value })
//    → Prefer functional update: setForm(prev => ({ ...prev, field: value }))
//
// 3. Match the stored type to what your backend expects
//    → Number inputs: convert e.target.value with Number() before storing
//    → Checkboxes: use e.target.checked, not e.target.value
//    → Select: e.target.value is always a string — convert if needed
//
// 4. The value prop determines control:
//    value={undefined or null} → uncontrolled (React ignores the prop)
//    value={anything else}     → controlled (React owns the value)
//    Once controlled, always controlled — never switch between the two
