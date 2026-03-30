// ============================================================
// Problem 02 — Booking Flow Under Time Pressure
// ============================================================



// ============================================================
// types/booking.ts
//
// type ModalStep = "view" | "book" | "confirm" | "success"
//
// interface BookingFormData:
//   trip_date: string
//   student_count: number
//
// interface AvailabilityResult:
//   available: boolean
//   message?: string       // "Only 8 spots remain"
//   total_price: number
// ============================================================



// ============================================================
// hooks/useBookingFlow.ts
//
// function useBookingFlow(destination: Destination)
//
// State: step: ModalStep = "view"
// State: formData = { trip_date: "", student_count: 1 }
// State: availability: AvailabilityResult | null = null
// State: isChecking=false, isSubmitting=false, bookingId=null, error=null
//
// checkAvailability():
//   setIsChecking(true); setError(null)
//   POST /api/destinations/${destination.id}/check-availability
//     body: { trip_date, student_count }
//   → setAvailability(data)
//   → if data.available: setStep("confirm")
//   → catch: setError(err.message)
//   → finally: setIsChecking(false)
//
// confirmBooking():
//   setIsSubmitting(true); setError(null)
//   POST /api/bookings  body: { destination_id, ...formData }
//   → setBookingId(data.id); setStep("success")
//   → catch: setError(err.message)   // "Capacity exceeded", etc.
//   → finally: setIsSubmitting(false)
//
// setField<K extends keyof BookingFormData>(key, value):
//   setFormData(prev => ({ ...prev, [key]: value }))
//
// reset():
//   setStep("view"); setFormData(initial); setAvailability(null); setError(null)
//
// return { step, formData, availability, isChecking, isSubmitting,
//          bookingId, error, setField, checkAvailability, confirmBooking, goToStep, reset }
// ============================================================



// ============================================================
// components/DestinationModal.tsx  (extended with steps)
//
// Add: const flow = useBookingFlow(destination)
// Swap modal body based on flow.step:
//
// step "view":
//   Same info layout as Problem 01
//   "Book This Trip" → flow.goToStep("book")
//
// step "book":
//   Back button → goToStep("view")
//   Date input: type="date" min=today, value=formData.trip_date, onChange → setField
//   Number input: min=1 max=available_spots, value=student_count, onChange → setField
//   error message if flow.error
//   "Check Availability" button:
//     disabled if isChecking || !trip_date || student_count < 1
//     label: isChecking ? "Checking…" : "Check Availability"
//     onClick: checkAvailability()
//
// step "confirm":
//   Back button → goToStep("book")
//   Summary table: Destination / Date / Students / Total (highlighted)
//   Amber warning if availability.message exists
//   error message if flow.error
//   "Confirm Booking" button:
//     disabled={isSubmitting}
//     onClick: confirmBooking()
//
// step "success":
//   ✅ large icon + "Booking Confirmed!"
//   Trip summary text
//   "View Booking" link → /bookings/${bookingId}
//   "Close" button → onClose()
// ============================================================



// ============================================================
// Scope creep decisions (ship vs skip)
//
// SHIP (free with what's already built):
//   min attr on date input → prevents past dates
//   max attr on number input → prevents over-booking
//   formData preserved when stepping back (state already holds it)
//
// SKIP (> 2 min, not in requirements):
//   Confetti animation   — time cost > value
//   Payment step         — out of scope
//   Email copy           — backend concern
//   Optimistic booking ID — wait for real API
//
// Rule: if a feature takes > 2 min and isn't in requirements, skip and note it
// ============================================================
