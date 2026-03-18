// ============================================================
// Problem 02 — Inertia Form with Server Validation
// ============================================================



// ============================================================
// Pages/Bookings/Create.tsx
//
// interface BookingFormData:
//   school_name, destination, student_count, amount, trip_date,
//   trip_type: "domestic"|"international"|"", notes
//
// const form = useForm<BookingFormData>({ ...initial empty values })
//
// handleSubmit(e):
//   e.preventDefault()
//   form.post("/bookings", {
//     onSuccess: () => form.reset()  ← clears data + errors + dirty
//     onError:   () => window.scrollTo({ top: 0 })  ← scroll to first error
//     preserveScroll: true  ← don't jump on validation failure
//   })
//
// Each field pattern:
//   value={form.data.field_name}
//   onChange={(e) => form.setData("field_name", e.target.value)}
//   error highlight: form.errors.field_name && border-red-500
//   {form.errors.field_name && <p className="text-red-600 text-xs">{form.errors.field_name}</p>}
//
// Submit button:
//   disabled={form.processing}
//   {form.processing ? "Creating…" : "Create Booking"}
//
// Dirty indicator:
//   {form.isDirty && <p>You have unsaved changes</p>}
//
// CreateBookingPage.layout = (page) => <MainLayout>{page}</MainLayout>
// ============================================================



// ============================================================
// Inertia useForm — what it replaces vs raw React
//
// Raw React needs:
//   useState for each field (or one object)
//   useState<Record<string,string>>({}) for errors
//   useState(false) for isLoading
//   useState(false) for isDirty + setter in each onChange
//   fetch() with try/catch in handleSubmit
//   manual 422 parsing: Object.entries(data.errors).forEach → flatten
//   manual redirect: window.location.href
//   manual flash: context/toast.success(...)
//   manual reset: setFormData(initial) + setErrors({}) + setIsDirty(false)
//   ~80 lines total
//
// Inertia useForm gives you:
//   form.data        ← all field values
//   form.errors      ← auto-populated from Laravel 422
//   form.processing  ← auto true/false during request
//   form.isDirty     ← auto computed vs initial values
//   form.setData(field, value)
//   form.post(url, { onSuccess, onError, preserveScroll })
//   form.reset()     ← one call clears everything
//   ~30 lines total
// ============================================================



// ============================================================
// Laravel side (for reference):
//
// BookingController::store():
//   $request->validate([...])  ← 422 auto-sent on failure
//   Booking::create($validated)
//   return to_route("bookings.index")->with("success", "Booking #N created")
//
// HandleInertiaRequests::share():
//   "flash" => [ "success" => session()->get("success"), ... ]
//   ← flash message delivered to React on the redirect page
//
// Flow:
//   form.post("/bookings")
//     server returns 302 + flash
//     Inertia follows redirect → new page + flash props
//     FlashMessages component shows the success toast automatically
//   OR:
//     server returns 422 + errors JSON
//     form.errors auto-populated
//     form.processing → false
//     onError callback fires
// ============================================================
