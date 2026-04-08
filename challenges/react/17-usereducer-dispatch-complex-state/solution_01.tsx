// ============================================================
// Problem 01 — Booking Wizard with useReducer
// ============================================================


// ============================================================
// types/wizard.ts
// ============================================================

import { useReducer, useCallback } from "react"

type WizardStep = "school" | "destination" | "details" | "review" | "confirm"

const STEPS: WizardStep[] = ["school", "destination", "details", "review", "confirm"]

interface WizardFormData {
  schoolName: string
  contactName: string
  contactEmail: string
  destinationId: number | null
  destinationName: string
  destinationType: "domestic" | "international" | ""
  tripDate: string
  studentCount: number
  notes: string
}

interface WizardState {
  currentStep: WizardStep
  stepIndex: number
  formData: WizardFormData
  errors: Partial<Record<keyof WizardFormData, string>>
  isSubmitting: boolean
  isComplete: boolean
  submitError: string | null
}

type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_FIELD"; field: keyof WizardFormData; value: WizardFormData[keyof WizardFormData] }
  | { type: "SET_ERRORS"; errors: WizardState["errors"] }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "RESET" }


// ============================================================
// utils/wizardValidation.ts
// ============================================================

type ValidationResult = { valid: boolean; errors: WizardState["errors"] }

function validateStep(step: WizardStep, data: WizardFormData): ValidationResult {
  const errors: WizardState["errors"] = {}

  if (step === "school") {
    if (!data.schoolName.trim())            errors.schoolName   = "School name is required"
    if (!data.contactName.trim())           errors.contactName  = "Contact name is required"
    if (!data.contactEmail.includes("@"))   errors.contactEmail = "Valid email required"
  }

  if (step === "destination") {
    if (data.destinationId === null)  errors.destinationId   = "Select a destination"
    if (!data.destinationType)        errors.destinationName = "Select a destination type"
  }

  if (step === "details") {
    if (!data.tripDate)
      errors.tripDate = "Trip date is required"
    else if (new Date(data.tripDate) <= new Date())
      errors.tripDate = "Date must be in the future"
    if (data.studentCount < 1)
      errors.studentCount = "At least 1 student required"
  }

  return { valid: Object.keys(errors).length === 0, errors }
}


// ============================================================
// reducers/bookingWizardReducer.ts
// ============================================================

const initialFormData: WizardFormData = {
  schoolName: "", contactName: "", contactEmail: "",
  destinationId: null, destinationName: "", destinationType: "",
  tripDate: "", studentCount: 1, notes: "",
}

const initialState: WizardState = {
  currentStep: "school",
  stepIndex: 0,
  formData: initialFormData,
  errors: {},
  isSubmitting: false,
  isComplete: false,
  submitError: null,
}

function bookingWizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {

    case "NEXT_STEP": {
      const { valid, errors } = validateStep(state.currentStep, state.formData)
      if (!valid) return { ...state, errors }           // stay on step, show errors
      const nextIndex = state.stepIndex + 1
      if (nextIndex >= STEPS.length) return state       // already at last step
      return {
        ...state,
        errors: {},
        stepIndex: nextIndex,
        currentStep: STEPS[nextIndex],
      }
    }

    case "PREV_STEP": {
      const prevIndex = Math.max(0, state.stepIndex - 1)
      return {
        ...state,
        errors: {},
        stepIndex: prevIndex,
        currentStep: STEPS[prevIndex],
      }
    }

    case "SET_FIELD":
      return {
        ...state,
        formData: { ...state.formData, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: undefined }, // clear field error on change
      }

    case "SET_ERRORS":
      return { ...state, errors: action.errors }

    case "SUBMIT_START":
      return { ...state, isSubmitting: true, submitError: null }

    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false, isComplete: true }

    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, submitError: action.error }

    case "RESET":
      return { ...initialState }  // spread — NOT reference

    default:
      return state
  }
}


// ============================================================
// hooks/useBookingWizard.ts
// ============================================================

function useBookingWizard() {
  const [state, dispatch] = useReducer(bookingWizardReducer, initialState)

  const setField = useCallback(
    <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) =>
      dispatch({ type: "SET_FIELD", field, value }),
    []
  )

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), [])
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), [])
  const reset    = useCallback(() => dispatch({ type: "RESET" }),     [])

  const submit = useCallback(async () => {
    dispatch({ type: "SUBMIT_START" })
    try {
      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.formData),
      }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      dispatch({ type: "SUBMIT_SUCCESS" })
    } catch (err) {
      dispatch({ type: "SUBMIT_ERROR", error: (err as Error).message })
    }
  }, [state.formData])

  const isFirstStep = state.stepIndex === 0
  const isLastStep  = state.stepIndex === STEPS.length - 1
  const progress    = Math.round((state.stepIndex / (STEPS.length - 1)) * 100)

  return { state, setField, nextStep, prevStep, submit, reset, isFirstStep, isLastStep, progress }
}


// ============================================================
// components/WizardProgress.tsx
// ============================================================

interface WizardProgressProps {
  steps: WizardStep[]
  currentStep: WizardStep
  stepIndex: number
  progress: number
}

function WizardProgress({ steps, stepIndex, progress }: WizardProgressProps) {
  return (
    <nav aria-label="Booking steps">
      <ol className="flex items-center">
        {steps.map((step, i) => {
          const isComplete = i < stepIndex
          const isCurrent  = i === stepIndex
          return (
            <li key={step} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${isComplete ? "bg-green-500 text-white"
                  : isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-gray-200 text-gray-500"}`}>
                {isComplete ? "✓" : i + 1}
              </div>
              <span className={`ml-2 text-sm capitalize hidden sm:block
                ${isCurrent ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                {step}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${i < stepIndex ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-4 h-1 bg-gray-200 rounded-full">
        <div className="h-1 bg-blue-500 rounded-full transition-all duration-300"
             style={{ width: `${progress}%` }} />
      </div>
    </nav>
  )
}


// ============================================================
// components/BookingWizard.tsx
// ============================================================

function BookingWizard(): JSX.Element {
  const { state, setField, nextStep, prevStep, submit, reset, isFirstStep, isLastStep, progress }
    = useBookingWizard()

  if (state.isComplete) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-green-600">Booking Submitted!</h2>
        <button onClick={reset} className="mt-6 text-blue-600 hover:underline">
          Start another booking
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <WizardProgress
        steps={STEPS}
        currentStep={state.currentStep}
        stepIndex={state.stepIndex}
        progress={progress}
      />

      <div className="mt-8">
        {state.currentStep === "school"      && <SchoolStep      data={state.formData} errors={state.errors} setField={setField} />}
        {state.currentStep === "destination" && <DestinationStep data={state.formData} errors={state.errors} setField={setField} />}
        {state.currentStep === "details"     && <DetailsStep     data={state.formData} errors={state.errors} setField={setField} />}
        {state.currentStep === "review"      && <ReviewStep      data={state.formData} />}
        {state.currentStep === "confirm"     && <ConfirmStep />}
      </div>

      {state.submitError && (
        <p className="mt-4 text-sm text-red-600">{state.submitError}</p>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={prevStep} disabled={isFirstStep}
                className="px-6 py-2 border rounded-lg disabled:opacity-40">
          Back
        </button>
        {isLastStep
          ? <button onClick={submit} disabled={state.isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
              {state.isSubmitting ? "Submitting…" : "Submit Booking"}
            </button>
          : <button onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Next →
            </button>
        }
      </div>
    </div>
  )
}


/*
================================================================
TIPS
================================================================

USEREDUCER vs USESTATE
-----------------------
• useReducer when: multiple related fields change together, state transitions are named
• useState when: simple independent values (isOpen, count)
• useReducer gives you: named actions, centralized logic, predictable transitions
• const [state, dispatch] = useReducer(reducer, initialState)
• useReducer is the local/component-level version of Redux — same concept, smaller scale

USEREDUCER vs USECONTEXT
--------------------------
• useContext  → WHO has access to the data (sharing across components)
• useReducer  → HOW the data changes (logic, transitions, actions)
• useContext alone does not manage logic — it just passes a value down the tree
• useReducer alone does not share — it stays in one component
• combine them: useReducer manages state logic, useContext distributes it to the whole tree
• that combination = lightweight Redux without any external library

DISCRIMINATED UNION ACTIONS
----------------------------
• type WizardAction = | { type: "NEXT_STEP" } | { type: "SET_FIELD"; field: ...; value: ... }
• TypeScript narrows inside each case: action.type === "SET_FIELD" → action.field exists
• impossible to dispatch SET_FIELD without field/value — compile-time guarantee
• always add default: return state — unknown actions are safely ignored

REDUCER RULES
-------------
• pure function — no side effects, no async, no API calls
• always return a NEW object — never mutate state directly
• RESET returns { ...initialState } with spread — not the reference itself (prevents mutation)
• validate INSIDE reducer (NEXT_STEP case) — keeps validation logic centralized

SET_FIELD PATTERN
-----------------
• [action.field]: action.value → computed property name — sets any WizardFormData field dynamically
• errors: { ...state.errors, [action.field]: undefined } → clears only that field's error on change
• one action handles all form fields — no separate SET_SCHOOL_NAME, SET_EMAIL, etc.

USECALLBACK IN HOOKS
--------------------
• wrap dispatch helpers in useCallback to prevent unnecessary re-renders of child components
• setField deps array is [] because dispatch is stable (never changes)
• submit deps array is [state.formData] because it reads formData in the closure

VALIDATION PATTERN
------------------
• validateStep returns { valid, errors } — caller decides what to do
• errors: Partial<Record<keyof WizardFormData, string>> → only fields with errors are set
• Object.keys(errors).length === 0 → valid if no error keys exist
• date validation: new Date(data.tripDate) <= new Date() → must be strictly in the future

WIZARD NAVIGATION
-----------------
• NEXT_STEP validates first — if invalid, returns { ...state, errors } (stays on same step)
• PREV_STEP never validates — always allowed to go back
• isFirstStep / isLastStep derived from stepIndex — drives Back/Next/Submit button rendering
• progress = stepIndex / (STEPS.length - 1) * 100 → 0% on step 0, 100% on last step

================================================================
*/
