// ============================================================
// Problem 02 — Booking Flow Under Time Pressure
// ============================================================



// ============================================================
// types/booking.ts
// ============================================================

type ModalStep = "view" | "book" | "confirm" | "success"

interface BookingFormData {
  trip_date:     string
  student_count: number
}

interface AvailabilityResult {
  available:   boolean
  message?:    string       // "Only 8 spots remain" etc.
  total_price: number
}



// ============================================================
// hooks/useBookingFlow.ts
// ============================================================

import { useState } from "react"

const initialFormData: BookingFormData = {
  trip_date:     "",
  student_count: 1,
}

export function useBookingFlow(destination: Destination) {
  const [step,         setStep]         = useState<ModalStep>("view")
  const [formData,     setFormData]     = useState<BookingFormData>(initialFormData)
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [isChecking,   setIsChecking]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingId,    setBookingId]    = useState<number | null>(null)
  const [error,        setError]        = useState<string | null>(null)

  // Step 1 — check if dates/spots are available before confirming
  async function checkAvailability() {
    setIsChecking(true)
    setError(null)
    try {
      const res = await fetch(`/api/destinations/${destination.id}/check-availability`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      })
      const data: AvailabilityResult = await res.json()
      setAvailability(data)
      if (data.available) setStep("confirm")  // only advance if available
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsChecking(false)
    }
  }

  // Step 2 — submit the actual booking
  async function confirmBooking() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ destination_id: destination.id, ...formData }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? "Booking failed")
      }
      const data = await res.json()
      setBookingId(data.id)
      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generic field updater — typed so key must be a real BookingFormData key
  function setField<K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function goToStep(s: ModalStep) {
    setStep(s)
  }

  // Reset all state — called when modal reopens for a different destination
  function reset() {
    setStep("view")
    setFormData(initialFormData)
    setAvailability(null)
    setError(null)
  }

  return {
    step,
    formData,
    availability,
    isChecking,
    isSubmitting,
    bookingId,
    error,
    setField,
    checkAvailability,
    confirmBooking,
    goToStep,
    reset,
  }
}



// ============================================================
// components/DestinationModal.tsx  (extended with booking steps)
// ============================================================

import { useEffect } from "react"

interface DestinationModalProps {
  destination: Destination
  onClose:     () => void
}

export function DestinationModal({ destination, onClose }: DestinationModalProps) {
  const flow  = useBookingFlow(destination)
  const today = new Date().toISOString().split("T")[0]

  // Escape key + scroll lock
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Always-visible hero image */}
        <div className="relative">
          <img
            src={destination.image_url}
            alt={destination.name}
            className="w-full h-48 object-cover rounded-t-2xl"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full
                       flex items-center justify-center hover:bg-black/70"
          >
            ✕
          </button>
        </div>

        <div className="p-6">

          {/* ── Step: view ── */}
          {flow.step === "view" && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{destination.name}</h2>
              <p className="text-gray-500 text-sm mb-3">
                {destination.city}, {destination.country}
              </p>
              <p className="text-gray-600 text-sm mb-6">{destination.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-blue-600">£{destination.price_per_student}</p>
                  <p className="text-xs text-gray-400">per student</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-green-600">{destination.available_spots}</p>
                  <p className="text-xs text-gray-400">spots left</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-purple-600">{destination.duration_days}</p>
                  <p className="text-xs text-gray-400">days</p>
                </div>
              </div>

              <button
                onClick={() => flow.goToStep("book")}
                disabled={destination.available_spots === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {destination.available_spots === 0 ? "Fully Booked" : "Book This Trip"}
              </button>
            </>
          )}

          {/* ── Step: book ── */}
          {flow.step === "book" && (
            <>
              <button
                onClick={() => flow.goToStep("view")}
                className="text-sm text-blue-600 mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <h3 className="text-xl font-bold mb-6">Choose Your Dates</h3>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Trip date</span>
                  <input
                    type="date"
                    min={today}
                    value={flow.formData.trip_date}
                    onChange={(e) => flow.setField("trip_date", e.target.value)}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Number of students</span>
                  <input
                    type="number"
                    min={1}
                    max={destination.available_spots}
                    value={flow.formData.student_count}
                    onChange={(e) => flow.setField("student_count", Number(e.target.value))}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Max {destination.available_spots} available
                  </p>
                </label>
              </div>

              {flow.error && (
                <p className="mt-4 text-sm text-red-600">{flow.error}</p>
              )}

              <button
                onClick={flow.checkAvailability}
                disabled={flow.isChecking || !flow.formData.trip_date || flow.formData.student_count < 1}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {flow.isChecking ? "Checking…" : "Check Availability"}
              </button>
            </>
          )}

          {/* ── Step: confirm ── */}
          {flow.step === "confirm" && flow.availability && (
            <>
              <button
                onClick={() => flow.goToStep("book")}
                className="text-sm text-blue-600 mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <h3 className="text-xl font-bold mb-6">Confirm Booking</h3>

              {/* Summary table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2 text-gray-500">Destination</td>
                      <td className="px-4 py-2 font-medium text-right">{destination.name}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2 text-gray-500">Date</td>
                      <td className="px-4 py-2 font-medium text-right">{flow.formData.trip_date}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2 text-gray-500">Students</td>
                      <td className="px-4 py-2 font-medium text-right">{flow.formData.student_count}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-bold text-gray-900">Total</td>
                      <td className="px-4 py-2 font-bold text-blue-600 text-right">
                        £{flow.availability.total_price.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {flow.availability.message && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
                                text-sm text-amber-800 mb-4">
                  {flow.availability.message}
                </div>
              )}

              {flow.error && (
                <p className="text-sm text-red-600 mb-4">{flow.error}</p>
              )}

              <button
                onClick={flow.confirmBooking}
                disabled={flow.isSubmitting}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {flow.isSubmitting ? "Confirming…" : "Confirm Booking"}
              </button>
            </>
          )}

          {/* ── Step: success ── */}
          {flow.step === "success" && (
            <div className="text-center py-6">
              <p className="text-6xl mb-4">✅</p>
              <h3 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-500 mb-6">
                Your trip to {destination.name} has been booked for{" "}
                {flow.formData.student_count} students on {flow.formData.trip_date}.
              </p>
              <div className="flex flex-col gap-2">
                {flow.bookingId && (
                  <a
                    href={`/bookings/${flow.bookingId}`}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
                               hover:bg-blue-700 text-center"
                  >
                    View Booking
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl
                             font-semibold hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}


/*
================================================================
TIPS
================================================================

MULTI-STEP FLOW STATE
---------------------
• Single step state drives which JSX renders — cleaner than multiple boolean flags
• formData persists across steps: going back to "book" keeps date/count inputs filled
• reset() returns to "view" — call when modal reopens for a different destination
• goToStep() is just setStep() exposed — keeps flow control readable in JSX

AVAILABILITY GATE
-----------------
• checkAvailability must succeed before advancing to "confirm"
• if data.available === false: stay on "book" step, show server error message
• goToStep("confirm") called inside checkAvailability only if data.available is true
• formData is already valid at this point — date and student_count were validated by HTML attrs

SETFIELD GENERIC PATTERN
-------------------------
• setField<K extends keyof BookingFormData>(key, value) — TypeScript ensures key + value types match
• setFormData(prev => ({ ...prev, [key]: value })) — spreads existing data, updates only one key
• Avoids one setter per field — one setField handles both trip_date and student_count

SHIP VS SKIP DECISIONS
-----------------------
• min attr on date input — free, prevents past dates without extra code
• max attr on number input — free, prevents over-booking attempt
• formData preserved when stepping back — state already holds it, no extra work
• Confetti, payment step, email copy — skip; not in requirements, cost > value
• Optimistic booking ID — skip; wait for real API response (correctness > speed)

ERROR POSITIONING
-----------------
• Error message rendered directly above the submit button in each step
• Inline errors are easier to notice than toasts in a multi-step form
• flow.error cleared at start of each async call with setError(null)

DATE FORMAT
-----------
• today = new Date().toISOString().split("T")[0] → "YYYY-MM-DD" for min attribute
• type="date" input always returns "YYYY-MM-DD" regardless of user locale
• Display as-is in summary; use Intl.DateTimeFormat for localised display elsewhere

================================================================
*/
