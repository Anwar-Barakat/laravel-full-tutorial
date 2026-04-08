// ============================================================
// Problem 02 — Multi-Step Form with React Hook Form + Zod
// ============================================================


// ============================================================
// utils/bookingSchemas.ts
// ============================================================

import { z } from "zod"
import { useForm, useReducer, useCallback } from "react"
import { Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

type WizardStep = "school" | "destination" | "details" | "review" | "confirm"
const STEPS: WizardStep[] = ["school", "destination", "details", "review", "confirm"]

// ── Per-step Zod schemas ───────────────────────────────────

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

// ── Merged full schema ─────────────────────────────────────
const bookingSchema = schoolSchema.merge(destinationSchema).merge(detailsSchema)

// ── Type inferred from schema — no separate interface needed ──
type BookingFormData = z.infer<typeof bookingSchema>

// ── Maps each step to its fields for trigger() ────────────
const STEP_FIELDS: Record<WizardStep, (keyof BookingFormData)[]> = {
  school:      ["schoolName", "contactName", "contactEmail"],
  destination: ["destinationId", "destinationType"],
  details:     ["tripDate", "studentCount"],
  review:      [],
  confirm:     [],
}


// ============================================================
// reducers/stepReducer.ts  (navigation only — RHF owns form data)
// ============================================================

type StepAction = { type: "NEXT" } | { type: "PREV" }

function stepReducer(state: number, action: StepAction): number {
  switch (action.type) {
    case "NEXT": return Math.min(state + 1, STEPS.length - 1)
    case "PREV": return Math.max(state - 1, 0)
    default:     return state
  }
}


// ============================================================
// hooks/useBookingForm.ts
// ============================================================

function useBookingForm() {
  // useReducer owns step navigation only
  const [stepIndex, dispatch] = useReducer(stepReducer, 0)
  const currentStep = STEPS[stepIndex]

  // React Hook Form owns all form data + validation
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

  // Validate only current step's fields before advancing
  const nextStep = useCallback(async () => {
    const valid = await trigger(STEP_FIELDS[currentStep])
    if (valid) dispatch({ type: "NEXT" })
  }, [currentStep, trigger])

  const prevStep = useCallback(() => dispatch({ type: "PREV" }), [])

  // handleSubmit runs full schema validation before calling onSubmit
  const onSubmit = handleSubmit(async (data: BookingFormData) => {
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
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


// ============================================================
// components/steps/SchoolStep.tsx
// register — for native HTML inputs (text, email)
// ============================================================

interface StepProps {
  register: any
  control?: any
  errors: any
}

function SchoolStep({ register, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">School Name</label>
        <input {...register("schoolName")}
               className="mt-1 block w-full border rounded-lg px-3 py-2" />
        {errors.schoolName && (
          <p className="mt-1 text-sm text-red-500">{errors.schoolName.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Contact Name</label>
        <input {...register("contactName")}
               className="mt-1 block w-full border rounded-lg px-3 py-2" />
        {errors.contactName && (
          <p className="mt-1 text-sm text-red-500">{errors.contactName.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Contact Email</label>
        <input {...register("contactEmail")} type="email"
               className="mt-1 block w-full border rounded-lg px-3 py-2" />
        {errors.contactEmail && (
          <p className="mt-1 text-sm text-red-500">{errors.contactEmail.message}</p>
        )}
      </div>
    </div>
  )
}


// ============================================================
// components/steps/DestinationStep.tsx
// Controller — for custom/controlled inputs (select)
// ============================================================

function DestinationStep({ register, control, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination Name</label>
        <input {...register("destinationName")}
               className="mt-1 block w-full border rounded-lg px-3 py-2" />
        {errors.destinationName && (
          <p className="mt-1 text-sm text-red-500">{errors.destinationName.message}</p>
        )}
      </div>

      {/* Controller for select — register doesn't work well with <select> for enum values */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination Type</label>
        <Controller
          name="destinationType"
          control={control}
          render={({ field }) => (
            <select {...field} className="mt-1 block w-full border rounded-lg px-3 py-2">
              <option value="">Select type</option>
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
            </select>
          )}
        />
        {errors.destinationType && (
          <p className="mt-1 text-sm text-red-500">{errors.destinationType.message}</p>
        )}
      </div>
    </div>
  )
}


// ============================================================
// components/steps/DetailsStep.tsx
// ============================================================

function DetailsStep({ register, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Trip Date</label>
        <input {...register("tripDate")} type="date"
               className="mt-1 block w-full border rounded-lg px-3 py-2" />
        {errors.tripDate && (
          <p className="mt-1 text-sm text-red-500">{errors.tripDate.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Student Count</label>
        <input {...register("studentCount", { valueAsNumber: true })} type="number" min={1}
               className="mt-1 block w-full border rounded-lg px-3 py-2" />
        {errors.studentCount && (
          <p className="mt-1 text-sm text-red-500">{errors.studentCount.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea {...register("notes")}
                  className="mt-1 block w-full border rounded-lg px-3 py-2" />
      </div>
    </div>
  )
}


// ============================================================
// components/BookingWizardRHF.tsx
// ============================================================

function BookingWizardRHF(): JSX.Element {
  const {
    currentStep, stepIndex,
    register, control, errors, isSubmitting,
    nextStep, prevStep, onSubmit,
    isFirstStep, isLastStep, progress,
  } = useBookingForm()

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-6">
      <WizardProgress
        steps={STEPS}
        currentStep={currentStep}
        stepIndex={stepIndex}
        progress={progress}
      />

      <div className="mt-8">
        {currentStep === "school"      && <SchoolStep      register={register} errors={errors} />}
        {currentStep === "destination" && <DestinationStep register={register} control={control} errors={errors} />}
        {currentStep === "details"     && <DetailsStep     register={register} errors={errors} />}
        {currentStep === "review"      && <ReviewStep />}
        {currentStep === "confirm"     && <ConfirmStep />}
      </div>

      <div className="flex justify-between mt-8">
        {/* type="button" — prevents triggering form submit */}
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


/*
================================================================
TIPS
================================================================

ZOD SCHEMAS
-----------
• z.object({}) → defines shape of one step's data
• z.string().min(1, "msg") → required string with custom error message
• z.string().email("msg") → validates email format
• z.number().min(1, "msg") → number with minimum value
• z.enum(["a", "b"]) → only allows specific string values
• z.string().refine(fn, "msg") → custom validation logic (e.g. future date)
• z.string().optional() → field is not required
• schema.merge(otherSchema) → combines two schemas into one

Z.INFER — TYPE FROM SCHEMA
---------------------------
• type BookingFormData = z.infer<typeof bookingSchema>
• no need to write a separate interface — type is derived from schema automatically
• schema and type are always in sync — change schema → type updates too
• this is the main reason to use Zod with TypeScript

ZODRESOLVER
-----------
• zodResolver(schema) → connects React Hook Form with Zod
• RHF calls Zod to validate on submit and on trigger()
• import from "@hookform/resolvers/zod"
• useForm({ resolver: zodResolver(bookingSchema) })

TRIGGER — PER-STEP VALIDATION
-------------------------------
• trigger(fields) → manually runs validation for specific fields RIGHT NOW
• returns Promise<boolean> → true if all fields valid, false if any failed
• must use await — validation is async, you need the result before deciding to advance
• await trigger(["schoolName", "contactEmail"]) → validate only step 1 fields
• if false → errors appear automatically in formState.errors, stay on current step
• if true  → all fields passed → safe to advance to next step
• trigger() with no args validates ALL fields (used on final submit by handleSubmit)
• without trigger: user could skip step 1 with empty fields and advance freely
• think of trigger as: "validate these fields right now and tell me if they passed"

REGISTER vs CONTROLLER
-----------------------
• register("fieldName") → spreads ref, name, onChange, onBlur onto native input
• works for: input, textarea, select (simple cases)
• Controller → wraps custom or controlled components that don't support ref
• use Controller for: custom select libs, date pickers, radio groups, sliders
• register("studentCount", { valueAsNumber: true }) → converts string input to number

USEREDUCER + RHF SPLIT
-----------------------
• useReducer → owns step index only (navigation logic)
• useForm (RHF) → owns all form data + validation
• form data persists between steps automatically — RHF holds it in memory
• never duplicate form state in useReducer — single source of truth in RHF

TYPE="BUTTON" IMPORTANT
------------------------
• Back and Next buttons must be type="button" — otherwise they submit the form
• only the final Submit button should be type="submit"
• type="button" prevents the form's onSubmit from firing on click

================================================================
*/
