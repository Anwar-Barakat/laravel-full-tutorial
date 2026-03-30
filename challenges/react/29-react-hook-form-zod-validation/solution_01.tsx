// ============================================================
// Problem 01 — React Hook Form + Zod Validation
// ============================================================



// ============================================================
// bookingSchema (zod)
//
// z.object({
//   school_name:  z.string().min(2).max(100)
//   contact_email: z.string().email()
//   trip_date:    z.string().refine(s => !isNaN(Date.parse(s)), "Invalid date")
//                  .refine(s => new Date(s) > new Date(), "Must be future")
//   student_count: z.coerce.number().int().min(1).max(500)
//   trip_type:    z.enum(["domestic", "international"])
//   destination:  z.string().optional()
// })
// .superRefine((data, ctx) => {
//   if (data.trip_type === "international" && !data.destination?.trim())
//     ctx.addIssue({ code: z.ZodIssueCode.custom,
//                    message: "Destination required for international trips",
//                    path: ["destination"] })
// })
//
// type BookingFormData = z.infer<typeof bookingSchema>
//   ← TypeScript type auto-derived from schema — no separate interface needed
// ============================================================



// ============================================================
// useBookingForm
//
// const form = useForm<BookingFormData>({
//   resolver: zodResolver(bookingSchema),
//   mode: "onBlur",                 ← validate on blur (not onChange — too noisy)
//   defaultValues: { trip_type: "domestic", student_count: 1 }
// })
//
// handleSubmit = form.handleSubmit(async (data) => {
//   ← only called when ALL fields pass Zod validation
//   try:
//     await submitBooking(data)
//   catch (err):
//     if err.status === 422:
//       Object.entries(err.errors).forEach(([field, msgs]) =>
//         form.setError(field as keyof BookingFormData, { message: msgs[0] })
//       )
//       ← maps Laravel validation errors back to individual fields
//     else:
//       form.setError("root.serverError", { message: "Unexpected error" })
//       ← root.serverError = non-field error (shown outside form inputs)
// })
//
// watch("trip_type"):
//   const tripType = form.watch("trip_type")
//   {tripType === "international" && <DestinationField />}
//   ← conditional field visibility driven by watched value
// ============================================================



// ============================================================
// FormField component
//
// interface FormFieldProps:
//   name: keyof BookingFormData
//   label: string
//   children: ReactElement
//
// const id = useId()   ← stable, unique for label + input association
// const { register, formState: { errors } } = useFormContext<BookingFormData>()
// const error = errors[name]
//
// <div>
//   <label htmlFor={id}>{label}</label>
//   {cloneElement(children, {
//     id,
//     "aria-invalid": error ? "true" : undefined,
//     "aria-describedby": error ? `${id}-error` : undefined,
//     ...register(name)   ← spread register props (ref, onChange, onBlur, name)
//   })}
//   {error && <p id={`${id}-error`} role="alert">{error.message}</p>}
// </div>
//
// role="alert" on error: announces to screen readers when error appears
// aria-invalid → red border via CSS [aria-invalid="true"]
// ============================================================



// ============================================================
// register() vs Controller
//
// register() — uncontrolled (preferred for native inputs):
//   <input {...register("school_name")} />
//   ← RHF manages DOM ref directly, no React state per keystroke
//   ← best for: text, email, number, date inputs
//
// Controller — controlled (for custom components):
//   <Controller
//     name="trip_type"
//     control={form.control}
//     render={({ field }) => (
//       <CustomSelect {...field} options={TRIP_TYPES} />
//     )}
//   />
//   ← field = { value, onChange, onBlur, ref }
//   ← use when component needs controlled value (not native input)
//   ← best for: custom dropdowns, date pickers, rich editors
//
// z.coerce.number():
//   HTML inputs always return strings
//   z.coerce.number() → Number(value) before validation
//   Without coerce: student_count "5" fails z.number() type check
// ============================================================



// ============================================================
// Key concepts
//
// zodResolver bridges Zod ↔ RHF:
//   import { zodResolver } from "@hookform/resolvers/zod"
//   resolver: zodResolver(schema) → runs schema.safeParse on submit/blur
//
// mode options:
//   "onSubmit"  (default) — only validate on submit
//   "onBlur"    — validate field when user leaves it (recommended UX)
//   "onChange"  — validate every keystroke (noisy, avoid)
//   "onTouched" — first blur, then onChange
//   "all"       — onBlur + onChange
//
// formState.isSubmitting:
//   true while handleSubmit's async function runs
//   use to disable submit button: disabled={isSubmitting}
//
// formState.isDirty:
//   true if any field differs from defaultValues
//   use to warn on navigation away (unsaved changes)
//
// setError("root.serverError"):
//   special RHF key for non-field errors
//   access: formState.errors.root?.serverError?.message
//   display above submit button
// ============================================================
