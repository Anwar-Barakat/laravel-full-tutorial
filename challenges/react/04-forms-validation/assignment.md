# React Forms & Validation

Build complex forms with field-level validation, conditional fields, API error mapping, and submission states — first with raw React, then with Inertia.js `useForm` which wires directly to Laravel.

| Topic             | Details                                                       |
|-------------------|---------------------------------------------------------------|
| Controlled Forms  | useState + touched/errors/submitting state                    |
| Validation        | validateField on blur, validateForm on submit, inline errors  |
| Inertia useForm   | form.data, form.errors, form.processing, form.post()          |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — BookingForm with Controlled State & Validation (Medium)

### Scenario

Build a booking creation form with field-level validation on blur, form-level validation on submit, conditional passport/visa fields for international trips, API error mapping from Laravel 422 responses, and proper loading/disabled state on submit.

### Requirements

1. `BookingFormData` interface — all form fields typed (`schoolId`, `tripId`, `bookingType`, `studentCount`, `tripDate`, `amount`, `passportRequired`, `visaArrangement`)
2. `FormErrors` — `Partial<Record<keyof BookingFormData, string>>`; one error string per field
3. `touched` state — `Partial<Record<keyof BookingFormData, boolean>>`; errors only shown after field is touched
4. `validateField(name, value)` — per-field rules; returns error string or `""`
5. `validateForm(data)` — runs all fields, plus cross-field rule: `visaArrangement` required when `bookingType === "international"`
6. `handleBlur` — marks field as touched, runs `validateField`, writes to `errors`
7. `handleSubmit` — touches all fields, runs `validateForm`, aborts if errors exist; on 422 maps `res.json().errors` directly to `setErrors`
8. Submit button disabled when `isSubmitting` OR `Object.keys(validateForm(formData)).length > 0`
9. Conditional block: when `bookingType === "international"`, show `passportRequired` checkbox + `visaArrangement` select

### Expected Code

```tsx
// types/bookingForm.ts
interface BookingFormData {
  schoolId:         number | ""
  tripId:           number | ""
  bookingType:      "domestic" | "international"
  studentCount:     number | ""
  tripDate:         string
  amount:           number | ""
  passportRequired: boolean
  visaArrangement:  "self" | "tripz" | ""
}

type FormErrors = Partial<Record<keyof BookingFormData, string>>
type Touched    = Partial<Record<keyof BookingFormData, boolean>>
```

```tsx
// Validation functions
function validateField(name: keyof BookingFormData, value: unknown): string {
  switch (name) {
    case "schoolId":      return !value ? "School is required" : ""
    case "tripId":        return !value ? "Trip is required" : ""
    case "studentCount":
      if (!value)              return "Student count is required"
      if (Number(value) < 1)   return "Must be at least 1 student"
      if (Number(value) > 500) return "Cannot exceed 500 students"
      return ""
    case "tripDate":
      if (!value) return "Trip date is required"
      if (new Date(value as string) <= new Date()) return "Trip date must be in the future"
      return ""
    case "amount":
      if (!value)            return "Amount is required"
      if (Number(value) <= 0) return "Amount must be positive"
      return ""
    default: return ""
  }
}

function validateForm(data: BookingFormData): FormErrors {
  const errors: FormErrors = {}
  const required = ["schoolId", "tripId", "studentCount", "tripDate", "amount"] as const

  for (const field of required) {
    const err = validateField(field, data[field])
    if (err) errors[field] = err
  }

  if (data.bookingType === "international" && !data.visaArrangement) {
    errors.visaArrangement = "Visa arrangement is required for international trips"
  }

  return errors
}
```

```tsx
// components/BookingForm.tsx
interface BookingFormProps {
  onSuccess:      (booking: Booking) => void
  onCancel:       () => void
  initialValues?: Partial<BookingFormData>
}

const BookingForm: React.FC<BookingFormProps> = ({ onSuccess, onCancel, initialValues = {} }) => {
  const [formData, setFormData]     = useState<BookingFormData>({
    schoolId: "", tripId: "", bookingType: "domestic",
    studentCount: "", tripDate: "", amount: "",
    passportRequired: false, visaArrangement: "",
    ...initialValues,
  })
  const [errors, setErrors]         = useState<FormErrors>({})
  const [touched, setTouched]       = useState<Touched>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError]     = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({ ...prev, [name]: val }))

    // Live validation once field has been touched
    if (touched[name as keyof BookingFormData]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name as keyof BookingFormData, val) }))
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name as keyof BookingFormData, value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Touch all fields so every error becomes visible
    setTouched(
      Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Touched)
    )

    const validationErrors = validateForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setApiError(null)

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.status === 422) {
        const { errors: serverErrors } = await res.json()
        setErrors(serverErrors) // Laravel field errors mapped directly
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const { data: booking } = await res.json()
      onSuccess(booking)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInternational = formData.bookingType === "international"
  const formErrors      = validateForm(formData)
  const isFormValid     = Object.keys(formErrors).length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {/* API-level error banner */}
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {apiError}
        </div>
      )}

      {/* School */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
        <select name="schoolId" value={formData.schoolId}
          onChange={handleChange} onBlur={handleBlur}
          className={`w-full border rounded-md px-3 py-2 text-sm ${errors.schoolId ? "border-red-500" : "border-gray-300"}`}
        >
          <option value="">Select school…</option>
        </select>
        {errors.schoolId && touched.schoolId && (
          <p className="mt-1 text-xs text-red-600">{errors.schoolId}</p>
        )}
      </div>

      {/* Trip type radio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type</label>
        <div className="flex gap-4">
          {(["domestic", "international"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="bookingType" value={type}
                checked={formData.bookingType === type} onChange={handleChange} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Conditional: international fields */}
      {isInternational && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
          <h4 className="text-sm font-semibold text-blue-800">International Requirements</h4>

          <label className="flex items-center gap-2 text-sm text-blue-700 cursor-pointer">
            <input type="checkbox" name="passportRequired"
              checked={formData.passportRequired} onChange={handleChange} />
            Passport required for all students
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Arrangement *</label>
            <select name="visaArrangement" value={formData.visaArrangement}
              onChange={handleChange} onBlur={handleBlur}
              className={`w-full border rounded-md px-3 py-2 text-sm ${errors.visaArrangement ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="">Select…</option>
              <option value="self">School handles visa</option>
              <option value="tripz">Tripz handles visa (+AED 200/student)</option>
            </select>
            {errors.visaArrangement && touched.visaArrangement && (
              <p className="mt-1 text-xs text-red-600">{errors.visaArrangement}</p>
            )}
          </div>
        </div>
      )}

      {/* Student count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student Count *</label>
        <input type="number" name="studentCount" value={formData.studentCount}
          onChange={handleChange} onBlur={handleBlur} min={1} max={500}
          className={`w-full border rounded-md px-3 py-2 text-sm ${errors.studentCount ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.studentCount && touched.studentCount && (
          <p className="mt-1 text-xs text-red-600">{errors.studentCount}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting || !isFormValid}
          className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isSubmitting ? "Creating…" : "Create Booking"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

### Validation Timing Rules

| Event | Action |
|-------|--------|
| `onChange` | Only re-validate if field is already `touched` (avoids "red on first keystroke") |
| `onBlur` | Mark as `touched`, run `validateField`, update `errors` |
| `onSubmit` | Touch all fields, run full `validateForm`, abort if any errors |
| Laravel 422 | Map `res.json().errors` directly to `setErrors` — same shape |

### What We're Evaluating

- `touched` state gates error display — no error shown until user leaves the field
- `validateForm` on every render for `isFormValid` — button stays disabled until all valid
- On submit: touch all → validate all → abort if errors (no API call)
- 422 error mapping: `setErrors(serverErrors)` — server errors rendered in same inline elements
- Conditional `{isInternational && (...)}` block — fields mount/unmount based on radio

---

## Problem 02 — Inertia.js `useForm` Hook (Hard)

### Scenario

Rebuild the same form using Inertia's `useForm` — which replaces your manual `isSubmitting`, `errors`, and API fetch with a single hook that integrates directly with Laravel's validation responses.

### Requirements

1. `useForm<BookingFormData>({ ...initialValues })` — initialise with snake_case keys matching Laravel field names
2. `form.setData("field", value)` — controlled input handler (instead of `handleChange`)
3. `form.post(route("bookings.store"), { onSuccess, onError })` — Inertia sends the request, handles 422 automatically
4. `form.errors.field_name` — Laravel's `$errors` bag mapped automatically; use directly in JSX
5. `form.processing` — `true` while request is in-flight; replaces `isSubmitting`
6. `form.reset()` — clears all fields back to initial values
7. `form.isDirty` — `true` if any field differs from initial; use to warn before navigate away
8. `form.clearErrors("field")` — removes a specific error programmatically

### Expected Code

```tsx
// Pages/Bookings/Create.tsx  (Inertia page component)
import { useForm } from "@inertiajs/react"

interface BookingFormData {
  school_id:        string
  trip_id:          string
  booking_type:     "domestic" | "international"
  student_count:    string
  trip_date:        string
  amount:           string
  visa_arrangement: string
}

interface Props {
  schools: { id: number; name: string }[]
  trips:   { id: number; name: string }[]
}

export default function CreateBooking({ schools, trips }: Props) {
  const form = useForm<BookingFormData>({
    school_id:        "",
    trip_id:          "",
    booking_type:     "domestic",
    student_count:    "",
    trip_date:        "",
    amount:           "",
    visa_arrangement: "",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    form.post(route("bookings.store"), {
      onSuccess: () => form.reset(),
      onError:   () => { /* form.errors already populated — nothing to do */ },
    })
  }

  const isInternational = form.data.booking_type === "international"

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">

      {/* School — form.errors.school_id is populated by Laravel validation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
        <select
          value={form.data.school_id}
          onChange={(e) => form.setData("school_id", e.target.value)}
          className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.school_id ? "border-red-500" : "border-gray-300"}`}
        >
          <option value="">Select school…</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {form.errors.school_id && (
          <p className="mt-1 text-xs text-red-600">{form.errors.school_id}</p>
        )}
      </div>

      {/* Trip type */}
      <div className="flex gap-4">
        {(["domestic", "international"] as const).map((type) => (
          <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="booking_type" value={type}
              checked={form.data.booking_type === type}
              onChange={(e) => form.setData("booking_type", e.target.value as "domestic" | "international")}
            />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </label>
        ))}
      </div>

      {/* Conditional international fields */}
      {isInternational && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <select
            value={form.data.visa_arrangement}
            onChange={(e) => form.setData("visa_arrangement", e.target.value)}
            className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.visa_arrangement ? "border-red-500" : "border-gray-300"}`}
          >
            <option value="">Select visa arrangement…</option>
            <option value="self">School handles visa</option>
            <option value="tripz">Tripz handles visa</option>
          </select>
          {form.errors.visa_arrangement && (
            <p className="mt-1 text-xs text-red-600">{form.errors.visa_arrangement}</p>
          )}
        </div>
      )}

      {/* Student count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student Count *</label>
        <input type="number"
          value={form.data.student_count}
          onChange={(e) => form.setData("student_count", e.target.value)}
          className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.student_count ? "border-red-500" : "border-gray-300"}`}
        />
        {form.errors.student_count && (
          <p className="mt-1 text-xs text-red-600">{form.errors.student_count}</p>
        )}
      </div>

      {/* Actions — form.processing replaces isSubmitting */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={form.processing}
          className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
        >
          {form.processing ? "Creating…" : "Create Booking"}
        </button>
      </div>

      {/* Dirty warning */}
      {form.isDirty && (
        <p className="text-xs text-amber-600">You have unsaved changes.</p>
      )}
    </form>
  )
}
```

### Raw React vs Inertia `useForm` Comparison

| Concern | Raw React (Problem 01) | Inertia useForm (Problem 02) |
|---|---|---|
| Form state | `useState<BookingFormData>` | `form.data` |
| Error state | `useState<FormErrors>` | `form.errors` (from Laravel) |
| Submit state | `useState<boolean>` (isSubmitting) | `form.processing` |
| API call | `fetch()` + manual 422 handling | `form.post()` — automatic |
| Error mapping | `setErrors(serverErrors)` | Automatic — Inertia maps Laravel bag |
| Reset | Manual `setFormData(initial)` | `form.reset()` |
| Dirty check | Manual `deepEqual` | `form.isDirty` |

### What We're Evaluating

- `useForm<T>` with snake_case keys — must match Laravel field names exactly
- `form.setData("field", value)` — single-field setter (no spread needed)
- `form.post()` with `onSuccess` / `onError` callbacks
- `form.errors.field` — Laravel's `$errors->first('field')` mapped automatically on 422
- `form.processing` — single boolean, no manual state
- `form.isDirty` — detects any change from initial values
- Why Inertia wins: zero manual fetch, zero error mapping, zero submit state management
