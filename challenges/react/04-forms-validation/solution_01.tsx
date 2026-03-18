// ============================================================
// Problem 01 — BookingForm with Controlled State & Validation
// ============================================================



// ============================================================
// types/bookingForm.ts
// BookingFormData interface (all fields typed)
// FormErrors  = Partial<Record<keyof BookingFormData, string>>
// Touched     = Partial<Record<keyof BookingFormData, boolean>>
// BookingFormProps (onSuccess, onCancel, initialValues?)
// ============================================================



// ============================================================
// validateField(name, value): string
// (switch on name → return error string or "")
// ============================================================



// ============================================================
// validateForm(data: BookingFormData): FormErrors
// (loop required fields + cross-field: visaArrangement required when international)
// ============================================================



// ============================================================
// components/BookingForm.tsx
//
// State: formData, errors, touched, isSubmitting, apiError
//
// handleChange  — update formData; if touched, re-validate field
// handleBlur    — mark touched; run validateField; update errors
// handleSubmit  — touch all; validateForm; abort if errors;
//                 fetch POST; on 422 setErrors(serverErrors); onSuccess(booking)
//
// isInternational = formData.bookingType === "international"
// isFormValid     = Object.keys(validateForm(formData)).length === 0
//
// Render: apiError banner, school select, trip type radios,
//         conditional international block, studentCount, actions
// ============================================================
