# Challenge 07 — Multi-Step Form with Zod Validation

**Format:** BUILD
**Topic:** Build a multi-step form with Zod validation
**App:** Tripz — Laravel + React school booking platform

---

## Context

Tripz needs a booking creation wizard that guides school administrators through a 3-step process. Each step collects different data, validates it independently, and prevents progression until all fields are valid. The form must handle server-side errors on submission and redirect on success.

---

## Form Structure

### Step 1 — Trip Selection
- Trip selector (required, must select from list)
- Departure date (required, must be a future date)

### Step 2 — School Details
- School name (required, minimum 3 characters)
- Contact email (required, valid email format)
- Contact phone (required, UAE format: `+971` followed by exactly 9 digits)
- Number of students (required, integer between 1 and 200 inclusive)

### Step 3 — Review & Submit
- Read-only summary of all data entered in Steps 1 and 2
- Confirmation checkbox: "I confirm the details above are correct" (required to be checked)
- Submit button

---

## Zod Schemas

```typescript
import { z } from 'zod'

const step1Schema = z.object({
  tripId:        z.number({ required_error: 'Select a trip' }),
  departureDate: z.string().refine(
    (d) => new Date(d) > new Date(),
    'Must be a future date'
  ),
})

const step2Schema = z.object({
  schoolName:   z.string().min(3, 'Min 3 characters'),
  contactEmail: z.string().email('Invalid email'),
  contactPhone: z.string().regex(/^\+971[0-9]{9}$/, 'Must be UAE format: +971XXXXXXXXX'),
  studentCount: z.number().min(1).max(200),
})

const step3Schema = z.object({
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm' }),
  }),
})
```

---

## Requirements

### Navigation
- "Next" button validates the current step before proceeding; if validation fails, show errors and stay on the current step
- "Back" button returns to the previous step and restores the previously entered values — no data should be lost
- A progress indicator displays "Step X of 3" at the top

### Validation
- Validate on Next click using `schema.safeParse()`
- Display field-level errors below each input (not in a summary list)
- Errors should clear when the user corrects the field
- Do not show errors for a step the user has not yet attempted to submit

### Submission
- On Step 3 submit: POST to `/api/bookings` with the combined data from all three steps
- While submitting: disable the submit button and show a loading indicator
- On success: redirect to `/dashboard` using `useNavigate`
- On server error: map server validation errors back to the specific fields (e.g. if the server returns `{ errors: { contactEmail: ['Already registered'] } }`, show that error under the contactEmail field)

---

## Starter Code (incomplete)

```tsx
import { useState } from 'react'
import { z } from 'zod'

// Schemas defined above (already correct — do not change them)

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

type FormData = Partial<Step1Data & Step2Data & Step3Data>

function BookingWizard() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // TODO: implement handleNext — validate current step, advance if valid
  function handleNext() {
    // BUG: advances without validating
    setStep(step + 1)
  }

  // TODO: implement handleBack — go back without losing data
  function handleBack() {
    setStep(step - 1)
    // BUG: errors from the next step are still visible after going back
  }

  // TODO: implement handleSubmit — POST combined data, handle errors, redirect
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // BUG: no step3 validation before submit
    // BUG: no isSubmitting state
    await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
    // BUG: no success redirect
    // BUG: no server error handling
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* TODO: progress indicator */}
      {step === 1 && <Step1Form data={formData} onChange={setFormData} errors={errors} />}
      {step === 2 && <Step2Form data={formData} onChange={setFormData} errors={errors} />}
      {step === 3 && <Step3Form data={formData} onChange={setFormData} errors={errors} />}
      {/* TODO: Back / Next / Submit buttons */}
    </form>
  )
}
```

---

## Expected Output

- Clicking Next on Step 1 with no trip selected shows "Select a trip" under the trip selector
- Clicking Next on Step 1 with a past date shows "Must be a future date" under the date input
- Clicking Back from Step 2 restores the Step 1 values exactly as entered
- Entering `+9711234567` (8 digits after 971) on Step 2 shows the UAE format error
- Clicking Submit on Step 3 without checking the box shows "You must confirm"
- A successful POST redirects to `/dashboard`
- A server error `{ errors: { contactEmail: ['Already registered'] } }` displays under the email field in Step 2 (even though the user is on Step 3)

---

## What to Submit

A single `BookingWizard.tsx` file containing the wizard component and all step sub-components.
