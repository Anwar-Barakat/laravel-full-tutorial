# React Forms & Validation

Build the same booking form three ways — progressively adding power at each step.

| Problem | Approach | Validation lives in |
|---------|----------|---------------------|
| 01 | react-hook-form (no Zod) | inline `register()` rules |
| 02 | react-hook-form + Zod | centralised schema |
| 03 | Inertia.js `useForm` | Laravel (server-side) |

## Rules

- **35 minutes** total for 3 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Timer starts immediately when you click Begin

---

## Problem 01 — react-hook-form without Zod (Easy)

### Scenario

Build a booking form using `react-hook-form` with inline validation rules inside each `register()` call. No external schema library — rules live directly on each field.

### Requirements

1. `BookingFormData` interface — snake_case keys matching Laravel field names
2. `useForm<BookingFormData>({ defaultValues })` — initialise the form
3. `register("field", { required, min, max, validate })` — inline rules per field
4. `Controller` — for the radio group (`booking_type`)
5. `watch("booking_type")` — show/hide visa block when international
6. On 422: loop `serverErrors` with `Object.entries` → call `setError` for each field
7. `formState.errors.field?.message` — display inline per field
8. `formState.isSubmitting` — disable submit button while in-flight

### Expected Code

```tsx
import { useForm, Controller } from "react-hook-form"

const {
  register, control, handleSubmit, watch, setError,
  formState: { errors, isSubmitting },
} = useForm<BookingFormData>({ defaultValues: { ... } })

// Inline rules on each field
{...register("school_id",     { required: "School is required" })}
{...register("student_count", { required: "...", min: { value: 1, message: "..." }, max: { value: 500, message: "..." } })}
{...register("trip_date",     { required: "...", validate: (v) => new Date(v) > new Date() || "Must be in the future" })}
{...register("visa_arrangement", { validate: (v) => !isInternational || !!v || "Required" })}

// 422 error mapping
if (res.status === 422) {
  const { errors: serverErrors } = await res.json()
  Object.entries(serverErrors).forEach(([field, message]) => {
    setError(field as keyof BookingFormData, { message: message as string })
  })
  return
}
```

### Key Patterns

| Pattern | Why |
|---------|-----|
| `register("field", { rules })` | wires value, onChange, onBlur — no useState needed |
| `Controller` | radio group needs manual control — `register` spread conflicts |
| `watch("booking_type")` | reactive — re-renders when field changes |
| `validate: (v) => condition \|\| "error"` | custom rule — returns true or error string |
| `setError("field", { message })` | inject server 422 errors into same errors object |

---

## Problem 02 — react-hook-form + Zod (Medium)

### Scenario

Rebuild the same form using a Zod schema. All validation rules move out of `register()` into a centralised `z.object({})`. The TypeScript type is derived from the schema automatically.

### Requirements

1. `bookingSchema` — `z.object({})` with all field rules
2. `z.coerce.number()` — for number inputs (HTML inputs return strings)
3. `.refine()` on the schema — cross-field rule: visa required when international
4. `type BookingFormData = z.infer<typeof bookingSchema>` — derive type from schema
5. `resolver: zodResolver(bookingSchema)` in `useForm` — connects schema to form
6. `register("field")` — no inline rules needed, schema handles everything
7. Same 422 mapping and JSX as Problem 01 — only the schema changes

### Expected Code

```tsx
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const bookingSchema = z.object({
  school_id:     z.string().min(1, "School is required"),
  student_count: z.coerce.number().min(1, "...").max(500, "..."),
  trip_date:     z.string().refine((v) => new Date(v) > new Date(), "Must be in the future"),
  visa_arrangement: z.string(),
  // ...
}).refine(
  (data) => data.booking_type !== "international" || !!data.visa_arrangement,
  { message: "Visa arrangement is required", path: ["visa_arrangement"] }
)

type BookingFormData = z.infer<typeof bookingSchema>

useForm<BookingFormData>({
  resolver: zodResolver(bookingSchema),
  defaultValues: { ... },
})

// register has NO inline rules — schema owns them
{...register("school_id")}
{...register("student_count")}
```

### Without Zod vs With Zod

| Concern | Problem 01 (no Zod) | Problem 02 (Zod) |
|---|---|---|
| Rules location | inside each `register()` call | centralised `z.object({})` |
| TypeScript type | manual `interface BookingFormData` | `z.infer<typeof schema>` |
| Cross-field rules | `validate` inside `register` | `.refine()` on whole schema |
| JSX | same | same — nothing changes |
| Reuse | rules only in the form | schema reusable in API, tests |

---

## Problem 03 — Inertia.js `useForm` (Hard)

### Scenario

Rebuild the form using Inertia's `useForm` hook. This is the correct approach for Laravel + Inertia projects — no manual fetch, no error mapping, no loading state management.

### Requirements

1. `useForm<BookingFormData>({ ...defaultValues })` — snake_case keys matching Laravel
2. `form.setData("field", value)` — update a single field
3. `form.post(route("bookings.store"), { onSuccess, onError })` — Inertia handles everything
4. `form.errors.field` — Laravel `$errors` bag mapped automatically on 422
5. `form.processing` — true while in-flight
6. `form.reset()` — clear all fields on success
7. `form.isDirty` — warn user about unsaved changes

### Expected Code

```tsx
import { useForm } from "@inertiajs/react"

const form = useForm<BookingFormData>({ school_id: "", ... })

// No fetch() — Inertia handles it
form.post(route("bookings.store"), {
  onSuccess: () => form.reset(),
})

// Inputs — value + setData instead of register spread
value={form.data.school_id}
onChange={(e) => form.setData("school_id", e.target.value)}

// Errors — string directly, not .message
{form.errors.school_id && <p>{form.errors.school_id}</p>}

// Loading — form.processing not isSubmitting
disabled={form.processing}
```

### Full Comparison

| Concern | Problem 01 | Problem 02 | Problem 03 |
|---|---|---|---|
| Validation | inline `register` rules | Zod schema | Laravel server-side |
| TypeScript type | manual interface | `z.infer<>` | manual interface |
| Fetch | manual `fetch()` | manual `fetch()` | `form.post()` automatic |
| 422 errors | `setError` loop | `setError` loop | automatic |
| Loading state | `formState.isSubmitting` | `formState.isSubmitting` | `form.processing` |
| Reset | manual | manual | `form.reset()` |
| When to use | learning / standalone | production React app | Laravel + Inertia |
