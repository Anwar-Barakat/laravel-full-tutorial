// SOLUTION 02 — Multi-Step Form: React Hook Form + Zod alternative
// ============================================================
// This skeleton explains the same wizard built with React Hook Form,
// zodResolver, and useNavigate, covering RHF-specific patterns.
// NO executable code — comments only.
// ============================================================

// --- REACT HOOK FORM OVERVIEW ---
// React Hook Form (RHF) is an alternative to manual controlled inputs.
// It uses uncontrolled inputs under the hood (refs, not state),
// which means it does not re-render on every keystroke — better performance.
//
// Key functions from useForm():
//   register(name)          → binds an input to the form (provides ref, onChange, name)
//   handleSubmit(fn)        → wraps submit handler, runs validation first
//   formState.errors        → object of field errors (same shape as Zod output)
//   getValues()             → read current values without subscribing to re-renders
//   setValue(name, value)   → programmatically set a field value
//   trigger(fields?)        → manually trigger validation for specific fields
//   setError(name, error)   → manually inject an error (for server errors)
//   reset(values)           → reset all or some fields to new values

// --- ZODRESOLVER: CONNECTING ZOD TO RHF ---
// Import zodResolver from @hookform/resolvers/zod
// Pass it as the resolver option to useForm:
//   useForm({ resolver: zodResolver(fullSchema) })
//
// However for a multi-step form, you need per-step validation.
// Strategy: define a combined schema and use trigger() to validate
// only the current step's fields before advancing.
//
// Alternative strategy: use a separate useForm() per step
// and persist values in a parent state between steps.
// This is cleaner but requires more coordination.

// --- MULTI-STEP WITH getValues() ---
// The challenge with RHF in a multi-step form is preserving values
// when components unmount between steps.
//
// Approach: render all step forms always, but show/hide with CSS display:none
//   - All inputs remain mounted
//   - RHF retains their values
//   - No need to manually save/restore between steps
//   - Downside: all inputs exist in the DOM at once
//
// Alternative approach: single RHF instance with all fields
//   - One useForm() at the wizard level
//   - Each step renders a subset of registered fields
//   - getValues() captures all values at any time
//   - On step change, call setValue() to restore if needed
//   - Before advancing: trigger(['tripId', 'departureDate']) for step 1 validation

// --- VALIDATING BEFORE ADVANCING: trigger() ---
// trigger() runs validation for specific fields and returns a boolean.
// It updates formState.errors but does not submit the form.
//
// On Next button click:
//   1. Define fields for the current step:
//        step 1: ['tripId', 'departureDate']
//        step 2: ['schoolName', 'contactEmail', 'contactPhone', 'studentCount']
//        step 3: ['confirmed']
//
//   2. Await the result:
//        const isValid = await trigger(currentStepFields)
//
//   3. If true: advance to next step
//      If false: errors are already in formState.errors — RHF displays them
//
// This is cleaner than manual safeParse because RHF handles the error
// display automatically via the errors object from formState.

// --- SERVER ERROR MAPPING WITH setError() ---
// After a failed POST (status 422), the Laravel API returns:
//   { errors: { contactEmail: ['This email is already registered.'] } }
//
// Map these into RHF using setError():
//   For each [field, messages] in the server errors object:
//     setError(field, { type: 'server', message: messages[0] })
//
// RHF will then show these errors under the correct fields,
// even if the user is currently on a different step.
// When they navigate back to the step containing that field, the error is visible.
//
// For a global error (not tied to a field), use:
//   setError('root.serverError', { message: 'Something went wrong' })
// Then display formState.errors?.root?.serverError?.message above the form.

// --- isSubmitting STATE ---
// RHF tracks submission state automatically in formState.isSubmitting
// It is true from when handleSubmit begins until the async handler resolves.
//
// Use it to:
//   - Disable the Submit button: disabled={isSubmitting}
//   - Show a spinner: {isSubmitting && <Spinner />}
//   - Prevent double-submission without manual useState
//
// This replaces the SET_SUBMITTING dispatch from Solution 01.

// --- SUCCESS REDIRECT WITH useNavigate ---
// Import useNavigate from react-router-dom
// Call navigate('/dashboard') inside the handleSubmit callback after a successful POST
//
// The navigate call must happen inside the try block, only after res.ok is confirmed.
// Do not call navigate inside finally — it must be conditional on success.
//
// If using React Router's loader/action pattern (v6.4+):
//   The form submission can be handled by a route action instead
//   No need for manual fetch or navigate — the action handles both
//   This is worth knowing but is beyond the scope of this challenge

// --- PROGRESS BAR COMPONENT ---
// A ProgressBar receives: currentStep (number) and totalSteps (number)
//
// Visual representation options:
//   Option A: numbered circles (step 1 filled, step 2 outline, step 3 outline)
//   Option B: filled bar (width: `${(currentStep / totalSteps) * 100}%`)
//
// Accessible version:
//   Use a native <progress value={currentStep} max={totalSteps}> element
//   Add aria-label="Booking form progress"
//   Screen readers announce the progress automatically
//
// Label: "Step {currentStep} of {totalSteps}" visible above or beside the bar
// This component is purely presentational — receive props, render output, no logic.

// --- COMPARISON: useReducer vs React Hook Form ---
// useReducer approach (Solution 01):
//   Pro: no extra dependency, explicit state transitions, easy to reason about
//   Pro: works well when you need complex inter-field logic (conditional fields)
//   Con: verbose — writing reducers, actions, and dispatches for every field
//   Con: manual error extraction from ZodError
//
// React Hook Form approach (Solution 02):
//   Pro: much less boilerplate — register() handles most of it
//   Pro: better performance (uncontrolled inputs, no re-render per keystroke)
//   Pro: trigger() and setError() are purpose-built for multi-step and server errors
//   Con: adds a dependency, requires learning the RHF API
//   Con: less transparent — harder to see what is happening without knowing RHF
//
// For Tripz: React Hook Form is recommended for production forms.
// For learning: useReducer makes the mechanics visible and is worth understanding first.
