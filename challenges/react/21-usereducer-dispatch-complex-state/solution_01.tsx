// ============================================================
// Problem 01 — Booking Wizard with useReducer
// ============================================================



// ============================================================
// types/wizard.ts
//
// type WizardStep = "school" | "destination" | "details" | "review" | "confirm"
// const STEPS: WizardStep[] = [...]
//
// interface WizardFormData:
//   schoolName, contactName, contactEmail        (school step)
//   destinationId, destinationName, destinationType  (destination step)
//   tripDate, studentCount, notes                (details step)
//
// interface WizardState:
//   currentStep, stepIndex, formData, errors, isSubmitting, isComplete, submitError
//
// type WizardAction (discriminated union):
//   NEXT_STEP | PREV_STEP
//   SET_FIELD: { field: keyof WizardFormData; value: ... }
//   SET_ERRORS: { errors }
//   SUBMIT_START | SUBMIT_SUCCESS | SUBMIT_ERROR: { error: string }
//   RESET
// ============================================================



// ============================================================
// utils/wizardValidation.ts
//
// function validateStep(step, data): { valid: boolean; errors }
//
// "school":      schoolName (required), contactName (required), contactEmail (contains @)
// "destination": destinationId !== null, destinationType !== ""
// "details":     tripDate (required + future), studentCount >= 1
// "review":      always valid
// "confirm":     always valid
//
// Return: { valid: Object.keys(errors).length === 0, errors }
// ============================================================



// ============================================================
// reducers/bookingWizardReducer.ts
//
// initialFormData: all fields empty / null / 0
// initialState: currentStep="school", stepIndex=0, formData, errors={},
//               isSubmitting=false, isComplete=false, submitError=null
//
// bookingWizardReducer(state, action):
//
//   NEXT_STEP:
//     validate current step → if invalid: return { ...state, errors } (stay)
//     nextIndex = stepIndex + 1
//     if nextIndex >= STEPS.length: return state
//     return { ...state, errors:{}, stepIndex: nextIndex, currentStep: STEPS[nextIndex] }
//
//   PREV_STEP:
//     prevIndex = Math.max(0, stepIndex - 1)
//     return { ...state, errors:{}, stepIndex: prevIndex, currentStep: STEPS[prevIndex] }
//
//   SET_FIELD:
//     return { ...state,
//       formData: { ...state.formData, [field]: value },
//       errors: { ...state.errors, [field]: undefined }  ← clear field error on change
//     }
//
//   SUBMIT_START:  { ...state, isSubmitting: true, submitError: null }
//   SUBMIT_SUCCESS:{ ...state, isSubmitting: false, isComplete: true }
//   SUBMIT_ERROR:  { ...state, isSubmitting: false, submitError: action.error }
//   RESET:         { ...initialState }   ← spread, NOT reference
//   default:       return state
// ============================================================



// ============================================================
// hooks/useBookingWizard.ts
//
// const [state, dispatch] = useReducer(bookingWizardReducer, initialState)
//
// setField<K extends keyof WizardFormData>(field, value):
//   useCallback → dispatch({ type: "SET_FIELD", field, value })
//
// nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), [])
// prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), [])
// reset    = useCallback(() => dispatch({ type: "RESET" }),     [])
//
// submit = useCallback(async () => {
//   dispatch({ type: "SUBMIT_START" })
//   try:
//     await fetch("/api/bookings", { method:"POST", body: JSON.stringify(state.formData) })
//       .then(r => { if !r.ok throw new Error(...); return r.json() })
//     dispatch({ type: "SUBMIT_SUCCESS" })
//   catch:
//     dispatch({ type: "SUBMIT_ERROR", error: err.message })
// }, [state.formData])
//
// Derived:
//   isFirstStep = state.stepIndex === 0
//   isLastStep  = state.stepIndex === STEPS.length - 1
//   progress    = Math.round((stepIndex / (STEPS.length - 1)) * 100)
//
// return { state, setField, nextStep, prevStep, submit, reset, isFirstStep, isLastStep, progress }
// ============================================================



// ============================================================
// components/WizardProgress.tsx
//
// Props: { steps, currentStep, stepIndex, progress }
//
// <ol> — each step:
//   circle: green+✓ (complete) / blue+ring (current) / gray (future)
//   label: step name (hidden on mobile sm:block)
//   connector line: green (passed) / gray (upcoming)
//
// Progress bar below: <div style={{ width: `${progress}%` }} className="h-1 bg-blue-500 ..." />
// ============================================================



// ============================================================
// components/BookingWizard.tsx
//
// Success state: 🎉 + "Booking Submitted!" + "Start another booking" → reset()
//
// Main render:
//   <WizardProgress />
//   Step content switch on state.currentStep:
//     "school"      → <SchoolStep />
//     "destination" → <DestinationStep />
//     "details"     → <DetailsStep />
//     "review"      → <ReviewStep />
//     "confirm"     → <ConfirmStep />
//   submitError message if present
//
//   Navigation row:
//     Back button (disabled if isFirstStep)
//     Next button OR Submit button (if isLastStep, disabled while isSubmitting)
//
// Step props pattern: { data: state.formData, errors: state.errors, setField }
// ============================================================
