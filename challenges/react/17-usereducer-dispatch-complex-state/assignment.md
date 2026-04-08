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

## Problem 02 — Multi-Step Form with React Hook Form + Zod (Hard)

Replace manual validation from Problem 01 with **React Hook Form + Zod**. Each step has its own Zod schema, the full type is inferred with `z.infer<>`, and per-step validation uses `trigger()`.

---

### Part A — Zod Schemas

**File:** `utils/bookingSchemas.ts`

```ts
import { z } from "zod"

// Per-step schemas
const schoolSchema = z.object({
  schoolName:   z.string().min(1, "School name is required"),
  contactName:  z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email required"),
})

const destinationSchema = z.object({
  destinationId:   z.number({ required_error: "Select a destination" }),
  destinationName: z.string().min(1, "Destination name is required"),
  destinationType: z.enum(["domestic", "international"], {
    required_error: "Select a destination type",
  }),
})

const detailsSchema = z.object({
  tripDate: z.string()
    .min(1, "Trip date is required")
    .refine(d => new Date(d) > new Date(), "Date must be in the future"),
  studentCount: z.number().min(1, "At least 1 student required"),
  notes: z.string().optional(),
})

// Merged full schema
const bookingSchema = schoolSchema.merge(destinationSchema).merge(detailsSchema)

// TypeScript type inferred directly from schema — no separate interface needed
type BookingFormData = z.infer<typeof bookingSchema>
```

---

### Part B — Step Fields Map

**File:** `utils/bookingSchemas.ts` (addition)

```ts
// Maps each step to the fields that belong to it
// Used by trigger() to validate only the current step's fields
const STEP_FIELDS: Record<WizardStep, (keyof BookingFormData)[]> = {
  school:      ["schoolName", "contactName", "contactEmail"],
  destination: ["destinationId", "destinationType"],
  details:     ["tripDate", "studentCount"],
  review:      [],
  confirm:     [],
}
```

---

### Part C — `useBookingForm` hook

**File:** `hooks/useBookingForm.ts`

```ts
function useBookingForm() {
  // Step navigation — useReducer owns step state only
  const [stepIndex, dispatch] = useReducer(stepReducer, 0)
  const currentStep = STEPS[stepIndex]

  // React Hook Form — owns all form data + validation
  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      schoolName: "", contactName: "", contactEmail: "",
      destinationId: undefined, destinationName: "", destinationType: undefined,
      tripDate: "", studentCount: 1, notes: "",
    },
  })

  // Validate current step's fields before advancing
  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[currentStep])
    if (valid) dispatch({ type: "NEXT" })
  }

  const prevStep = () => dispatch({ type: "PREV" })

  // Final submit — RHF runs full schema validation first
  const onSubmit = handleSubmit(async (data) => {
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  })

  const isFirstStep = stepIndex === 0
  const isLastStep  = stepIndex === STEPS.length - 1
  const progress    = Math.round((stepIndex / (STEPS.length - 1)) * 100)

  return {
    currentStep, stepIndex,
    register, control, errors, isSubmitting,
    nextStep, prevStep, onSubmit,
    isFirstStep, isLastStep, progress,
  }
}

// Simple step reducer — only handles navigation
type StepAction = { type: "NEXT" } | { type: "PREV" }

function stepReducer(state: number, action: StepAction): number {
  switch (action.type) {
    case "NEXT": return Math.min(state + 1, STEPS.length - 1)
    case "PREV": return Math.max(state - 1, 0)
    default:     return state
  }
}
```

---

### Part D — Step Components with `register` and `Controller`

**File:** `components/steps/SchoolStep.tsx`

```tsx
// register — for native HTML inputs (text, email, date, number)
function SchoolStep({ register, errors }) {
  return (
    <div className="space-y-4">
      <div>
        <label>School Name</label>
        <input {...register("schoolName")} className="input" />
        {errors.schoolName && <p className="text-red-500 text-sm">{errors.schoolName.message}</p>}
      </div>
      <div>
        <label>Contact Email</label>
        <input {...register("contactEmail")} type="email" className="input" />
        {errors.contactEmail && <p className="text-red-500 text-sm">{errors.contactEmail.message}</p>}
      </div>
    </div>
  )
}

// Controller — for custom/controlled inputs (select, custom pickers)
function DestinationStep({ register, control, errors }) {
  return (
    <div className="space-y-4">
      <Controller
        name="destinationType"
        control={control}
        render={({ field }) => (
          <select {...field} className="input">
            <option value="">Select type</option>
            <option value="domestic">Domestic</option>
            <option value="international">International</option>
          </select>
        )}
      />
      {errors.destinationType && (
        <p className="text-red-500 text-sm">{errors.destinationType.message}</p>
      )}
    </div>
  )
}
```

---

### Part E — `BookingWizardRHF` component

**File:** `components/BookingWizardRHF.tsx`

```tsx
function BookingWizardRHF(): JSX.Element {
  const {
    currentStep, stepIndex,
    register, control, errors, isSubmitting,
    nextStep, prevStep, onSubmit,
    isFirstStep, isLastStep, progress,
  } = useBookingForm()

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-6">
      <WizardProgress steps={STEPS} currentStep={currentStep} stepIndex={stepIndex} progress={progress} />

      <div className="mt-8">
        {currentStep === "school"      && <SchoolStep      register={register} errors={errors} />}
        {currentStep === "destination" && <DestinationStep register={register} control={control} errors={errors} />}
        {currentStep === "details"     && <DetailsStep     register={register} errors={errors} />}
        {currentStep === "review"      && <ReviewStep      />}
        {currentStep === "confirm"     && <ConfirmStep     />}
      </div>

      <div className="flex justify-between mt-8">
        <button type="button" onClick={prevStep} disabled={isFirstStep}
                className="px-6 py-2 border rounded-lg disabled:opacity-40">
          Back
        </button>
        {isLastStep
          ? <button type="submit" disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
              {isSubmitting ? "Submitting…" : "Submit Booking"}
            </button>
          : <button type="button" onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Next →
            </button>
        }
      </div>
    </form>
  )
}
```

---

### What We're Evaluating

- Zod schema per step + `merge()` into full schema
- `z.infer<typeof bookingSchema>` — type from schema, no duplicate interface
- `zodResolver(bookingSchema)` — connects RHF + Zod
- `trigger([...fields])` — validates only current step's fields before advancing
- `register` vs `Controller` — native inputs vs custom/controlled inputs
- Single `useForm` instance across all steps — data persists between steps
- `useReducer` for navigation only — RHF owns form data
- `type="button"` on Back/Next — prevents accidental form submission
