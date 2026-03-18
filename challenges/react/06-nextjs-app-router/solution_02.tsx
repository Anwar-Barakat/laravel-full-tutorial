// ============================================================
// Problem 02 — Server Actions & Mutations
// ============================================================



// ============================================================
// app/bookings/actions.ts
// "use server"  ← marks ALL exports as Server Actions
//
// ActionState interface: { errors: Record<string, string[]>; message: string | null; success: boolean }
//
// createBookingAction(prevState: ActionState, formData: FormData):
//   raw = Object.fromEntries(formData.entries())
//   parsed = BookingSchema.safeParse(raw)
//   if invalid → return { errors: parsed.error.flatten().fieldErrors, message: "Validation failed", success: false }
//   await db.booking.create(...)
//   revalidatePath("/bookings")
//   revalidateTag("bookings")
//   redirect("/bookings")   ← outside try block (throws internally)
//
// updateBookingAction(prevState, formData):
//   id = formData.get("id")
//   same validation pattern
//   revalidatePath(`/bookings/${id}`) + revalidatePath("/bookings")
//   redirect(`/bookings/${id}`)
//
// deleteBookingAction(formData: FormData): void
//   id = formData.get("id")
//   await db.booking.delete(...)
//   revalidatePath("/bookings")
//   redirect("/bookings")
// ============================================================



// ============================================================
// components/CreateBookingForm.tsx  ("use client")
//
// const [state, formAction] = useFormState(createBookingAction, initialState)
//
// <form action={formAction}>   ← progressive enhancement (works without JS)
//   error banner if state.message && !state.success
//   school_id select + state.errors.school_id display
//   trip_type radio group + state.errors.trip_type display
//   student_count number input + state.errors.student_count display
//   date_from + date_to inputs
//   <SubmitButton label="Create Booking" />
// </form>
// ============================================================



// ============================================================
// components/SubmitButton.tsx  ("use client")
//
// MUST be a separate component — useFormStatus reads PARENT form context
//
// const { pending } = useFormStatus()
//
// <button type="submit" disabled={pending}>
//   {pending ? "Saving…" : label}
// </button>
// ============================================================



// ============================================================
// components/DeleteBookingButton.tsx  ("use client")
//
// <form action={deleteBookingAction}>
//   <input type="hidden" name="id" value={bookingId} />
//   <SubmitButton label="Delete Booking" />
// </form>
// ============================================================
