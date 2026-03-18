// ============================================================
// Problem 02 — Inertia.js useForm Hook
// ============================================================



// ============================================================
// Pages/Bookings/Create.tsx  (Inertia page component)
//
// BookingFormData interface — snake_case keys matching Laravel field names
// Props interface (schools[], trips[] from Inertia shared data)
//
// const form = useForm<BookingFormData>({ ...initialValues })
//
// handleSubmit:
//   form.post(route("bookings.store"), {
//     onSuccess: () => form.reset(),
//     onError:   () => { /* form.errors already set */ }
//   })
//
// Inputs:  value={form.data.field}  onChange={e => form.setData("field", e.target.value)}
// Errors:  {form.errors.field && <p>{form.errors.field}</p>}
// Button:  disabled={form.processing}
// Dirty:   {form.isDirty && <p>Unsaved changes</p>}
// ============================================================
