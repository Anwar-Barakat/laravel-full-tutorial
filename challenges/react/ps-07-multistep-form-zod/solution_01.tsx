// SOLUTION 01 — Multi-Step Form: useReducer + safeParse approach
// ============================================================
// This skeleton explains the implementation using useReducer for
// form state management and Zod's safeParse for per-step validation.
// NO executable code — comments only.
// ============================================================

// --- STATE SHAPE WITH useReducer ---
// A multi-step form has more state than a single useState can cleanly manage.
// useReducer keeps all form state in one place with explicit transitions.
//
// State shape:
//   {
//     step: number           current step (1, 2, or 3)
//     step1: Step1Data       data for step 1 (initialised with empty strings)
//     step2: Step2Data       data for step 2
//     step3: Step3Data       data for step 3 (confirmed: false)
//     errors: Record<string, string>  field-level errors for current step
//     isSubmitting: boolean  true while the POST is in flight
//   }
//
// Reducer actions:
//   SET_FIELD  { step, field, value }  → update a single field in stepN data
//   SET_ERRORS { errors }              → replace current errors map
//   NEXT_STEP  { }                     → increment step, clear errors
//   PREV_STEP  { }                     → decrement step, clear errors
//   SET_SUBMITTING { value: boolean }  → toggle isSubmitting

// --- STEP VALIDATION WITH safeParse ---
// Each step has a corresponding Zod schema.
// On Next button click, validate only the current step's data.
//
// Map step number to schema:
//   step 1 → step1Schema
//   step 2 → step2Schema
//   step 3 → step3Schema
//
// Call schema.safeParse(state.stepN):
//   result.success === true  → dispatch NEXT_STEP (or submit if step 3)
//   result.success === false → extract errors and dispatch SET_ERRORS
//
// Extracting field errors from a ZodError:
//   result.error.errors is an array of ZodIssue objects
//   Each issue has: path (string[]) and message (string)
//   path[0] is the field name for flat schemas
//   Reduce the array into a Record<string, string>:
//     errors = result.error.errors.reduce((acc, issue) => {
//       acc[issue.path[0]] = issue.message
//       return acc
//     }, {})
//
// Dispatch SET_ERRORS with this map so each field can read its own error.

// --- DISPLAYING ERRORS PER FIELD ---
// Each input reads its own error from the errors map:
//   {errors.schoolName && <span className="error">{errors.schoolName}</span>}
//
// The span appears directly below the input (not in a summary at the top).
// Errors are cleared whenever SET_ERRORS is dispatched with a fresh map.
// Going Back dispatches PREV_STEP which includes clearing errors,
// so the previous step's fields do not show errors on return.

// --- CONTROLLED INPUTS WITH onChange ---
// Each input dispatches SET_FIELD on every change:
//   onChange={(e) => dispatch({ type: 'SET_FIELD', step: 2, field: 'schoolName', value: e.target.value })}
//
// For number fields (studentCount):
//   value: Number(e.target.value)   ← convert string to number immediately
//   Never store numbers as strings — the Zod schema expects a number and will fail
//
// For the phone field:
//   value: e.target.value           ← store as string, regex validates the format
//
// For the confirmation checkbox:
//   value: e.target.checked         ← boolean, not string
//   step3Schema expects z.literal(true) so the value must be boolean true, not 'true'

// --- BACK BUTTON: PRESERVING DATA ---
// Because all step data is in the reducer state (not local component state),
// going back is trivial:
//   dispatch({ type: 'PREV_STEP' })
//
// The reducer decrements step and clears errors.
// When the form re-renders with step 1, the Step1Form component reads
// from state.step1 which still has the previously entered values.
// Nothing needs to be saved or restored manually.
//
// This is a key advantage of centralised form state:
// data persists across step transitions automatically.

// --- NEXT BUTTON DISABLED LOGIC ---
// The Next button can optionally be disabled while errors exist:
//   disabled={Object.keys(errors).length > 0}
//
// However, it is better to only disable the button while isSubmitting
// and always allow the user to attempt clicking Next (which triggers validation).
// Disabling before any attempt creates confusion about what is wrong.

// --- SUBMIT: POST + ERROR HANDLING ---
// On Step 3 submit:
//   1. Validate step3Schema first (same safeParse flow)
//      If invalid: set errors, return early, do not POST
//
//   2. Dispatch SET_SUBMITTING { value: true }
//      Disables the submit button and shows a spinner
//
//   3. Combine all step data:
//      const payload = { ...state.step1, ...state.step2, ...state.step3 }
//
//   4. POST to /api/bookings with JSON body and Content-Type header
//
//   5. On success (res.ok):
//      navigate('/dashboard')   ← from useNavigate()
//
//   6. On server validation error (res.status === 422):
//      const body = await res.json()
//      body.errors is a Record<string, string[]> from Laravel
//      Flatten to Record<string, string> (first error per field):
//        Object.fromEntries(Object.entries(body.errors).map(([k, v]) => [k, v[0]]))
//      Dispatch SET_ERRORS with this map
//      The correct step's fields will show the errors when the user navigates back
//
//   7. On network error or unexpected status:
//      Set a generic error message (e.g. errors._form = 'Something went wrong')
//
//   8. Finally: dispatch SET_SUBMITTING { value: false }

// --- PROGRESS INDICATOR ---
// A simple component that receives the current step number:
//   "Step {step} of 3"
//   A row of 3 circles or a filled progress bar
//   Active step highlighted, completed steps marked differently
//   This is purely presentational — no logic needed
