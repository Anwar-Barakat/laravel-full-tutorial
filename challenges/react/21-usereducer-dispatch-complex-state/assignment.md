# REACT_TEST_21 — useReducer • dispatch • Complex State

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Booking Wizard with useReducer (Medium)

Build a multi-step booking wizard using `useReducer` with typed state, discriminated union actions, and per-step validation.

---

### Part A — Types

**File:** `types/wizard.ts`

```ts
// ── Step IDs ──────────────────────────────────────────────
type WizardStep = "school" | "destination" | "details" | "review" | "confirm"

const STEPS: WizardStep[] = ["school", "destination", "details", "review", "confirm"]

// ── Form data accumulated across steps ────────────────────
interface WizardFormData {
  // Step: school
  schoolName: string
  contactName: string
  contactEmail: string
  // Step: destination
  destinationId: number | null
  destinationName: string
  destinationType: "domestic" | "international" | ""
  // Step: details
  tripDate: string
  studentCount: number
  notes: string
  // Step: review — no extra fields, just confirm what was entered
}

// ── State ─────────────────────────────────────────────────
interface WizardState {
  currentStep: WizardStep
  stepIndex: number          // 0–4, derived but stored for convenience
  formData: WizardFormData
  errors: Partial<Record<keyof WizardFormData, string>>
  isSubmitting: boolean
  isComplete: boolean
  submitError: string | null
}

// ── Actions (discriminated union) ─────────────────────────
type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_FIELD"; field: keyof WizardFormData; value: WizardFormData[keyof WizardFormData] }
  | { type: "SET_ERRORS"; errors: WizardState["errors"] }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "RESET" }
```

---

### Part B — Validation

**File:** `utils/wizardValidation.ts`

```ts
type ValidationResult = { valid: boolean; errors: WizardState["errors"] }

function validateStep(step: WizardStep, data: WizardFormData): ValidationResult
```

**Per-step rules:**

| Step | Required fields | Extra rules |
|------|----------------|-------------|
| `school` | `schoolName`, `contactName`, `contactEmail` | email must contain `@` |
| `destination` | `destinationId` (not null), `destinationType` (not `""`) | — |
| `details` | `tripDate`, `studentCount` | `tripDate` must be future; `studentCount` ≥ 1 |
| `review` | — | always valid (read-only confirmation) |
| `confirm` | — | always valid |

```ts
// Implementation pattern:
function validateStep(step, data): ValidationResult {
  const errors: WizardState["errors"] = {}

  if (step === "school") {
    if (!data.schoolName.trim())   errors.schoolName   = "School name is required"
    if (!data.contactName.trim())  errors.contactName  = "Contact name is required"
    if (!data.contactEmail.includes("@")) errors.contactEmail = "Valid email required"
  }
  if (step === "destination") {
    if (data.destinationId === null) errors.destinationId = "Select a destination"
    if (!data.destinationType)       errors.destinationName = "Select a destination type"
  }
  if (step === "details") {
    if (!data.tripDate)              errors.tripDate      = "Trip date is required"
    else if (new Date(data.tripDate) <= new Date()) errors.tripDate = "Date must be in the future"
    if (data.studentCount < 1)       errors.studentCount  = "At least 1 student required"
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
```

---

### Part C — Reducer

**File:** `reducers/bookingWizardReducer.ts`

```ts
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
      return { ...initialState }

    default:
      return state                     // exhaustiveness: unknown actions ignored
  }
}
```

---

### Part D — `useBookingWizard` hook

**File:** `hooks/useBookingWizard.ts`

```ts
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

  // Derived helpers
  const isFirstStep = state.stepIndex === 0
  const isLastStep  = state.stepIndex === STEPS.length - 1
  const progress    = Math.round(((state.stepIndex) / (STEPS.length - 1)) * 100)

  return { state, setField, nextStep, prevStep, submit, reset, isFirstStep, isLastStep, progress }
}
```

---

### Part E — `WizardProgress` component

**File:** `components/WizardProgress.tsx`

```tsx
interface WizardProgressProps {
  steps: WizardStep[]
  currentStep: WizardStep
  stepIndex: number
}
```

**Render:**
```tsx
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
  {/* Progress bar */}
  <div className="mt-4 h-1 bg-gray-200 rounded-full">
    <div className="h-1 bg-blue-500 rounded-full transition-all duration-300"
         style={{ width: `${progress}%` }} />
  </div>
</nav>
```

---

### Part F — `BookingWizard` component

**File:** `components/BookingWizard.tsx`

```tsx
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
      <WizardProgress steps={STEPS} currentStep={state.currentStep} stepIndex={state.stepIndex} progress={progress} />

      <div className="mt-8">
        {state.currentStep === "school"       && <SchoolStep       data={state.formData} errors={state.errors} setField={setField} />}
        {state.currentStep === "destination"  && <DestinationStep  data={state.formData} errors={state.errors} setField={setField} />}
        {state.currentStep === "details"      && <DetailsStep      data={state.formData} errors={state.errors} setField={setField} />}
        {state.currentStep === "review"       && <ReviewStep       data={state.formData} />}
        {state.currentStep === "confirm"      && <ConfirmStep      />}
      </div>

      {state.submitError && (
        <p className="mt-4 text-sm text-red-600">{state.submitError}</p>
      )}

      {/* Navigation */}
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
```

---

### Step sub-components (quick implementations)

```tsx
// SchoolStep — three text inputs: schoolName, contactName, contactEmail
// DestinationStep — select from list, sets destinationId + destinationName + destinationType
// DetailsStep — date input + number input + textarea for notes
// ReviewStep — read-only summary of all formData fields
// ConfirmStep — "Ready to submit?" message, shows total cost if calculated
```

Each step receives `{ data, errors, setField }` and renders labelled inputs with inline error messages under each field.

---

## Problem 02 — Async Wizard with Dynamic Steps (Hard)

Extend the wizard with dynamic step list, conditional "passport" step, per-step loading, and undo.

---

### Part A — Extended types

**File:** `types/wizard.ts` (additions)

```ts
// Extended step list (passport is conditional)
type WizardStep = "school" | "destination" | "passport" | "details" | "review" | "confirm"

// Passport data
interface WizardFormData {
  // …previous fields…
  // Step: passport (only for international)
  passportNumber: string
  passportExpiry: string
  passportCountry: string
}

// Extended state
interface WizardState {
  // …previous fields…
  activeSteps: WizardStep[]           // dynamic — computed from selections
  stepLoading: boolean                // true while fetching step data
  stepData: Record<string, unknown>   // data fetched for current step (e.g. destinations list)
  history: WizardState[]              // stack for UNDO_LAST
}

// Extended actions
type WizardAction =
  | /* …previous actions… */
  | { type: "SKIP_STEP" }
  | { type: "SET_STEP_LOADING"; loading: boolean }
  | { type: "SET_STEP_DATA"; data: Record<string, unknown> }
  | { type: "SET_ACTIVE_STEPS"; steps: WizardStep[] }
  | { type: "UNDO_LAST" }
```

---

### Part B — Dynamic step computation

```ts
function computeActiveSteps(formData: WizardFormData): WizardStep[] {
  const base: WizardStep[] = ["school", "destination", "details", "review", "confirm"]
  if (formData.destinationType === "international") {
    // Insert "passport" after "destination"
    return ["school", "destination", "passport", "details", "review", "confirm"]
  }
  return base
}
```

**When to recompute:** dispatch `SET_ACTIVE_STEPS` inside `SET_FIELD` when `field === "destinationType"`.

**In reducer `SET_FIELD` case:**
```ts
case "SET_FIELD": {
  const newFormData = { ...state.formData, [action.field]: action.value }
  const activeSteps = action.field === "destinationType"
    ? computeActiveSteps(newFormData)
    : state.activeSteps
  const stepIndex = activeSteps.indexOf(state.currentStep)
  return {
    ...state,
    formData: newFormData,
    activeSteps,
    stepIndex,
    errors: { ...state.errors, [action.field]: undefined },
  }
}
```

---

### Part C — `SKIP_STEP` action

```ts
case "SKIP_STEP": {
  const nextIndex = state.stepIndex + 1
  if (nextIndex >= state.activeSteps.length) return state
  return {
    ...state,
    errors: {},
    stepIndex: nextIndex,
    currentStep: state.activeSteps[nextIndex],
  }
}
```

**Use case:** The "passport" step has a "Skip (I'll add later)" button that dispatches `SKIP_STEP`.

---

### Part D — Per-step data fetching with `useEffect`

**In `useBookingWizard` hook:**

```ts
// Fetch destinations when entering "destination" step
useEffect(() => {
  if (state.currentStep !== "destination") return
  dispatch({ type: "SET_STEP_LOADING", loading: true })
  fetch("/api/destinations")
    .then(r => r.json())
    .then(data => dispatch({ type: "SET_STEP_DATA", data: { destinations: data } }))
    .catch(err => dispatch({ type: "SUBMIT_ERROR", error: err.message }))
    .finally(() => dispatch({ type: "SET_STEP_LOADING", loading: false }))
}, [state.currentStep])
```

**Reducer cases:**
```ts
case "SET_STEP_LOADING":
  return { ...state, stepLoading: action.loading }

case "SET_STEP_DATA":
  return { ...state, stepData: { ...state.stepData, ...action.data } }
```

**In `DestinationStep` component:** read `state.stepData.destinations` to populate the select list.

---

### Part E — `UNDO_LAST` action

```ts
// Every mutating action pushes current state onto history BEFORE modifying:
case "NEXT_STEP": {
  const { valid, errors } = validateStep(state.currentStep, state.formData)
  if (!valid) return { ...state, errors }
  const nextIndex = state.stepIndex + 1
  if (nextIndex >= state.activeSteps.length) return state
  return {
    ...state,
    history: [...state.history, state],   // ← save snapshot
    errors: {},
    stepIndex: nextIndex,
    currentStep: state.activeSteps[nextIndex],
  }
}

// Similar history push in PREV_STEP, SET_FIELD, SKIP_STEP

case "UNDO_LAST": {
  if (state.history.length === 0) return state
  const previous = state.history[state.history.length - 1]
  return {
    ...previous,
    history: state.history.slice(0, -1),  // pop last snapshot
  }
}
```

**History size limit** (prevent memory bloat):
```ts
// In each case that pushes to history:
const trimmedHistory = [...state.history, state].slice(-10)  // keep last 10 states
return { ...newState, history: trimmedHistory }
```

---

### Part F — Updated `BookingWizard` component additions

```tsx
const { state, ... } = useBookingWizard()

// Show UNDO button when history exists
{state.history.length > 0 && (
  <button onClick={() => dispatch({ type: "UNDO_LAST" })}
          className="text-sm text-gray-500 hover:text-gray-700">
    ↩ Undo
  </button>
)}

// Step loading spinner overlay
{state.stepLoading && (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
)}

// Passport step only appears for international destinations
{state.currentStep === "passport" && (
  <PassportStep data={state.formData} errors={state.errors} setField={setField}
                onSkip={() => dispatch({ type: "SKIP_STEP" })} />
)}
```

---

### Key patterns reference

```ts
// Why useReducer over useState for wizards:
// - Single source of truth: all step transitions in one place
// - Impossible states prevented: e.g. can't be on step 3 with step 1 data missing
// - Actions are auditable / loggable (Redux DevTools works with useReducer too)
// - History/undo is trivial: just push state to array before each transition
// - Validation centralized in reducer, not scattered across step components

// Discriminated union guarantees — TypeScript narrows inside each case:
//   action.type === "SET_FIELD" → TypeScript knows action.field exists
//   action.type === "SUBMIT_ERROR" → TypeScript knows action.error exists

// RESET returns { ...initialState } (spread) NOT initialState itself
//   — prevents accidental mutation of the const reference
```
