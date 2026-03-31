# REACT_TEST_31 — React Hook Form • Zod • Schema Validation

**Time:** 25 minutes | **Stack:** React + TypeScript + react-hook-form + zod

---

## Problem 01 — Booking Form with RHF + Zod (Medium)

Build a booking creation form using React Hook Form with Zod schema validation, `watch()` for dependent field logic, and proper server error handling.

---

### Part A — Why React Hook Form + Zod?

```ts
// Manual controlled form (what you've been building):
const [data, setData] = useState({ schoolName: "", studentCount: 1 })
const [errors, setErrors] = useState({})
// → ~80 lines: state, handlers, validation, error display

// React Hook Form + Zod:
const schema = z.object({ schoolName: z.string().min(1), studentCount: z.coerce.number().min(1) })
type FormData = z.infer<typeof schema>
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
// → ~20 lines: same result, uncontrolled inputs (better performance — no re-render on keystroke)
```

**Key differences from controlled forms:**
- **Uncontrolled**: RHF uses `ref`s internally, not `useState`. Inputs don't trigger re-renders on every keystroke.
- **Type inference**: `z.infer<typeof schema>` gives you the TypeScript type for free — no separate interface.
- **Validation mode**: `mode: "onBlur"` validates on blur (less noisy than `onChange`).

---

### Part B — Zod schema

**File:** `schemas/bookingSchema.ts`

```ts
import { z } from "zod"

export const bookingSchema = z.object({
  // String validations
  schoolName:    z.string().min(1, "School name is required").max(100),
  contactName:   z.string().min(1, "Contact name is required"),
  contactEmail:  z.string().email("Invalid email address"),

  // Coerce: form inputs are always strings — coerce to number
  studentCount:  z.coerce.number()
                   .int("Must be a whole number")
                   .min(1, "At least 1 student")
                   .max(200, "Maximum 200 students"),

  // Enum
  tripType: z.enum(["domestic", "international"], {
    errorMap: () => ({ message: "Select a trip type" })
  }),

  // Optional string — empty string treated as undefined
  destinationId: z.coerce.number().positive().optional(),

  // Custom refinement — date must be in the future
  tripDate: z.string()
             .min(1, "Trip date is required")
             .refine(d => new Date(d) > new Date(), {
               message: "Trip date must be in the future"
             }),

  // Conditional — required only for international trips
  notes: z.string().max(500).optional(),
})

// Cross-field refinement:
.superRefine((data, ctx) => {
  if (data.tripType === "international" && !data.destinationId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Destination is required for international trips",
      path: ["destinationId"],
    })
  }
})

// TypeScript type inferred from schema — no separate interface needed!
export type BookingFormData = z.infer<typeof bookingSchema>
// → { schoolName: string; contactName: string; contactEmail: string;
//     studentCount: number; tripType: "domestic" | "international";
//     tripDate: string; notes?: string; destinationId?: number }
```

---

### Part C — `useForm` setup

**File:** `hooks/useBookingForm.ts`

```ts
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

function useBookingForm(onSuccess: () => void) {
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      schoolName:   "",
      contactName:  "",
      contactEmail: "",
      studentCount: 1,
      tripType:     "domestic",
      tripDate:     "",
      notes:        "",
    },
    mode: "onBlur",     // validate on blur (not on every keystroke)
    // mode options: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all"
  })

  const { handleSubmit, setError, formState: { isSubmitting } } = form

  const onSubmit = handleSubmit(async (data: BookingFormData) => {
    // handleSubmit only calls this if Zod validation passes
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const json = await response.json()

        // Map Laravel 422 errors back to RHF fields
        if (response.status === 422) {
          Object.entries(json.errors as Record<string, string[]>).forEach(([field, messages]) => {
            setError(field as keyof BookingFormData, {
              type: "server",
              message: messages[0],   // show first error per field
            })
          })
          return
        }

        // Non-validation server error — set on root
        setError("root.serverError", {
          type: "server",
          message: json.message ?? "Booking creation failed",
        })
        return
      }

      onSuccess()
      form.reset()   // clear form on success

    } catch {
      setError("root.serverError", { type: "server", message: "Network error. Please try again." })
    }
  })

  return { ...form, onSubmit }
}
```

---

### Part D — Field components with `register`

**File:** `components/forms/BookingForm.tsx`

```tsx
function BookingForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty, isValid },
    onSubmit,
  } = useBookingForm(() => navigate("/bookings"))

  // watch() — react to field value changes
  const tripType = watch("tripType")
  const studentCount = watch("studentCount")
  // tripType changes: show/hide destination selector

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Root server error */}
      {errors.root?.serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {errors.root.serverError.message}
        </div>
      )}

      {/* School name */}
      <FormField
        label="School Name"
        error={errors.schoolName?.message}
        required
      >
        <input
          {...register("schoolName")}
          type="text"
          id="schoolName"
          className={inputClass(!!errors.schoolName)}
          aria-invalid={!!errors.schoolName}
          aria-describedby={errors.schoolName ? "schoolName-error" : undefined}
        />
      </FormField>

      {/* Student count */}
      <FormField label="Number of Students" error={errors.studentCount?.message} required>
        <input
          {...register("studentCount")}
          type="number"
          min={1}
          max={200}
          className={inputClass(!!errors.studentCount)}
        />
      </FormField>

      {/* Trip type */}
      <FormField label="Trip Type" error={errors.tripType?.message} required>
        <select {...register("tripType")} className={inputClass(!!errors.tripType)}>
          <option value="">Select type…</option>
          <option value="domestic">Domestic</option>
          <option value="international">International</option>
        </select>
      </FormField>

      {/* Destination — only for international */}
      {tripType === "international" && (
        <FormField label="Destination" error={errors.destinationId?.message} required>
          <DestinationSelect {...register("destinationId")} />
        </FormField>
      )}

      {/* Trip date */}
      <FormField label="Trip Date" error={errors.tripDate?.message} required>
        <input
          {...register("tripDate")}
          type="date"
          min={new Date().toISOString().split("T")[0]}
          className={inputClass(!!errors.tripDate)}
        />
      </FormField>

      {/* Notes */}
      <FormField label="Notes" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
          rows={3}
          className={inputClass(!!errors.notes)}
        />
      </FormField>

      {/* Submit */}
      <div className="flex justify-between items-center">
        {isDirty && <p className="text-sm text-amber-600">You have unsaved changes</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold
                     disabled:opacity-50 hover:bg-blue-700 ms-auto"
        >
          {isSubmitting ? "Creating…" : "Create Booking"}
        </button>
      </div>
    </form>
  )
}
```

---

### Part E — `FormField` wrapper component

**File:** `components/forms/FormField.tsx`

```tsx
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactElement   // expects a single input/select/textarea
}

function FormField({ label, error, required, children }: FormFieldProps) {
  const inputId = useId()

  // Clone child to inject id (for label association)
  const inputWithId = React.cloneElement(children, {
    id:    inputId,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${inputId}-error` : undefined,
  })

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
      </label>
      {inputWithId}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
```

---

### Part F — Useful `register` options

```ts
// register() returns: { name, ref, onChange, onBlur }
// These are spread directly onto the input:
<input {...register("fieldName")} />

// Register with validation (in addition to Zod):
<input {...register("fieldName", { required: true })} />
// ↑ Usually not needed — Zod handles all validation

// setValueAs — transform the value before storing:
<input {...register("price", { setValueAs: (v) => parseFloat(v) || 0 })} />

// onChange override (while keeping register):
const { onChange, ...rest } = register("fieldName")
<input {...rest} onChange={(e) => { onChange(e); doSomethingExtra(e) }} />

// Disabled field — still registered but not submitted:
<input {...register("fieldName")} disabled />

// setValue — programmatically set a field value:
const { setValue } = useForm(...)
setValue("schoolName", "SSI London", { shouldValidate: true, shouldDirty: true })

// trigger — manually run validation:
const { trigger } = useForm(...)
await trigger("tripDate")   // validate just this field
await trigger()             // validate all fields
```

---

### Part G — Controlled field with `Controller`

Some UI components (custom date pickers, select libraries) don't work with `register()` because they don't expose a native input ref. Use `Controller` instead:

```tsx
import { Controller } from "react-hook-form"

<Controller
  name="tripType"
  control={control}
  render={({ field, fieldState }) => (
    <CustomSelect
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  )}
/>
```

**`register` vs `Controller`:**
- `register` — native HTML elements (`<input>`, `<select>`, `<textarea>`) — uncontrolled
- `Controller` — custom/third-party components that need `value`/`onChange` props — controlled

---

## Problem 02 — useFieldArray & Dynamic Forms (Hard)

Build a dynamic student list inside the booking form using `useFieldArray` with nested Zod validation, add/remove, and reordering.

---

### Part A — Extended Zod schema with array

**File:** `schemas/bookingWithStudentsSchema.ts`

```ts
const studentSchema = z.object({
  name:           z.string().min(1, "Student name is required"),
  grade:          z.string().min(1, "Grade is required"),
  passportNumber: z.string().optional(),   // filled below via superRefine
  dateOfBirth:    z.string().optional(),
})

const bookingWithStudentsSchema = bookingSchema.extend({
  students: z.array(studentSchema)
             .min(1, "Add at least one student")
             .superRefine((students, ctx) => {
               students.forEach((student, i) => {
                 if (!student.name.trim()) {
                   ctx.addIssue({
                     code: z.ZodIssueCode.custom,
                     message: "Student name is required",
                     path: [i, "name"],
                   })
                 }
               })
             }),
})
.superRefine((data, ctx) => {
  // Cross-field: international trips require passport numbers
  if (data.tripType === "international") {
    data.students.forEach((student, i) => {
      if (!student.passportNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport number required for international trips",
          path: ["students", i, "passportNumber"],
        })
      }
    })
  }
  // Array length must match studentCount header field
  if (data.students.length !== data.studentCount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Add exactly ${data.studentCount} students (currently ${data.students.length})`,
      path: ["students"],
    })
  }
})

type BookingWithStudentsData = z.infer<typeof bookingWithStudentsSchema>
```

---

### Part B — `useFieldArray` hook

**File:** `components/forms/StudentList.tsx`

```tsx
import { useFieldArray, useFormContext } from "react-hook-form"

function StudentList() {
  const { control, register, watch, formState: { errors } }
    = useFormContext<BookingWithStudentsData>()

  const tripType     = watch("tripType")
  const studentCount = watch("studentCount")
  const isIntl       = tripType === "international"

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "students",
  })

  const canAddMore = fields.length < (studentCount || Infinity)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">
          Students ({fields.length}{studentCount ? ` / ${studentCount}` : ""})
        </h3>
        <button
          type="button"
          onClick={() => append({ name: "", grade: "", passportNumber: "", dateOfBirth: "" })}
          disabled={!canAddMore}
          className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
        >
          + Add student
        </button>
      </div>

      {/* Array-level error (e.g. count mismatch) */}
      {errors.students?.root?.message && (
        <p role="alert" className="text-sm text-red-600">
          {errors.students.root.message}
        </p>
      )}
      {/* Zod array-level message (non-root) */}
      {errors.students?.message && (
        <p role="alert" className="text-sm text-red-600">{errors.students.message}</p>
      )}

      {fields.map((field, index) => (
        <div key={field.id}  // ← field.id is stable — use this as key, NOT index
             className="bg-gray-50 rounded-xl p-4 border space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Student {index + 1}</span>
            <div className="flex gap-2">
              {/* Reorder buttons */}
              <button type="button" onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      aria-label={`Move student ${index + 1} up`}>
                ↑
              </button>
              <button type="button" onClick={() => move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      aria-label={`Move student ${index + 1} down`}>
                ↓
              </button>
              {/* Remove */}
              <button type="button" onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
                      aria-label={`Remove student ${index + 1}`}>
                Remove
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              {...register(`students.${index}.name`)}
              placeholder="Student full name"
              className={inputClass(!!errors.students?.[index]?.name)}
            />
            {errors.students?.[index]?.name && (
              <p role="alert" className="text-xs text-red-600 mt-0.5">
                {errors.students[index].name.message}
              </p>
            )}
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
            <select
              {...register(`students.${index}.grade`)}
              className={inputClass(!!errors.students?.[index]?.grade)}
            >
              <option value="">Select grade</option>
              {["Year 7","Year 8","Year 9","Year 10","Year 11","Year 12","Year 13"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Passport — international only */}
          {isIntl && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Passport number <span className="text-red-500">*</span>
              </label>
              <input
                {...register(`students.${index}.passportNumber`)}
                placeholder="AB123456"
                className={inputClass(!!errors.students?.[index]?.passportNumber)}
              />
              {errors.students?.[index]?.passportNumber && (
                <p role="alert" className="text-xs text-red-600 mt-0.5">
                  {errors.students[index].passportNumber.message}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-xl">
          No students added yet. Click "+ Add student" to start.
        </div>
      )}
    </div>
  )
}
```

---

### Part C — `useFormContext` for nested components

When the student list is a separate component, `useFormContext` avoids prop drilling:

```tsx
// Parent — wraps everything in FormProvider:
import { FormProvider, useForm } from "react-hook-form"

function BookingWithStudentsPage() {
  const methods = useForm<BookingWithStudentsData>({
    resolver: zodResolver(bookingWithStudentsSchema),
    defaultValues: { ..., students: [{ name: "", grade: "", passportNumber: "" }] },
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <BookingForm />       {/* uses useFormContext() internally */}
        <StudentList />       {/* uses useFormContext() internally */}
        <SubmitButton />
      </form>
    </FormProvider>
  )
}

// Child — no props needed:
function StudentList() {
  const { control, register, watch, formState: { errors } }
    = useFormContext<BookingWithStudentsData>()
  // ...
}
```

---

### Part D — `useFieldArray` operations

```ts
const { fields, append, prepend, insert, remove, swap, move, update } = useFieldArray({
  control,
  name: "students",
  // Optional:
  rules: { minLength: { value: 1, message: "At least one student required" } },
})

// append — add to end (with default values):
append({ name: "", grade: "", passportNumber: "" })

// prepend — add to start:
prepend({ name: "Alice", grade: "Year 10" })

// insert — add at specific index:
insert(2, { name: "", grade: "" })

// remove — by index (or array of indices):
remove(0)          // remove first
remove([0, 2])     // remove indices 0 and 2
remove()           // remove all

// swap — exchange positions of two items:
swap(0, 1)

// move — move item from one index to another:
move(3, 0)   // move item at index 3 to index 0

// update — replace item at index:
update(0, { name: "Updated Name", grade: "Year 11" })

// IMPORTANT: use field.id as React key, NEVER index:
fields.map(field => <div key={field.id}>...)
// ← field.id is stable across moves/inserts; index changes = wrong component state
```

---

### Key patterns reference

```ts
// RHF + Zod in 4 lines:
const schema = z.object({ name: z.string().min(1) })
type FormData = z.infer<typeof schema>
const { register, handleSubmit, formState: { errors } } =
  useForm<FormData>({ resolver: zodResolver(schema) })

// Zod patterns:
z.string().min(1, "Required")              // required string
z.string().email("Invalid email")          // email format
z.string().url()                           // URL
z.coerce.number().min(1)                   // input string → number
z.enum(["a", "b"])                         // enum
z.string().optional()                      // optional (can be undefined)
z.string().nullable()                      // can be null
z.string().refine(v => v.length > 0)      // custom sync predicate
z.string().transform(v => v.trim())        // transform value
z.object({}).superRefine((data, ctx) => {  // cross-field validation
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "...", path: ["field"] })
})

// z.infer — TypeScript type from schema:
type Data = z.infer<typeof schema>   // compile-time type, no separate interface

// Server errors → RHF:
setError("fieldName",   { type: "server", message: "..." })  // field-level
setError("root.serverError", { type: "server", message: "..." })  // page-level
// read: errors.root?.serverError?.message

// useFieldArray key rule:
fields.map(field => <div key={field.id} />)  // ← field.id, NEVER index
```
