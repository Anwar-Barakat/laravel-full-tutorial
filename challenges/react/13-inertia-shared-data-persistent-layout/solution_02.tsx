// ============================================================
// Problem 02 — Inertia Form with Server Validation
// ============================================================

import { Head, useForm } from "@inertiajs/react";
import type React from "react";
import { MainLayout } from "./solution_01";

// ============================================================
// Types
// ============================================================

interface BookingFormData {
    school_name:   string;
    destination:   string;
    student_count: string;   // useForm uses strings; coercion happens on server
    amount:        string;
    trip_date:     string;
    trip_type:     "domestic" | "international" | "";
    notes:         string;
}

// ============================================================
// CreateBookingPage
// ============================================================

export default function CreateBookingPage() {
    // useForm replaces: useState per field, error state, loading state, dirty tracking
    const form = useForm<BookingFormData>({
        school_name:   "",
        destination:   "",
        student_count: "",
        amount:        "",
        trip_date:     "",
        trip_type:     "",
        notes:         "",
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        form.post("/bookings", {
            onSuccess: () => form.reset(),   // clear form after success
            onError:   () => window.scrollTo({ top: 0, behavior: "smooth" }),
            preserveScroll: true,            // don't jump on validation failure
        });
    }

    return (
        <>
            <Head title="Create Booking" />

            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold mb-6">Create Booking</h1>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
                >
                    {/* School Name */}
                    <div>
                        <label htmlFor="school_name" className="block text-sm font-medium mb-1">
                            School Name
                        </label>
                        <input
                            id="school_name"
                            type="text"
                            value={form.data.school_name}
                            onChange={(e) => form.setData("school_name", e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 text-sm ${
                                form.errors.school_name ? "border-red-500 bg-red-50" : "border-gray-300"
                            }`}
                        />
                        {form.errors.school_name && (
                            <p className="text-red-600 text-xs mt-1">{form.errors.school_name}</p>
                        )}
                    </div>

                    {/* Destination */}
                    <div>
                        <label htmlFor="destination" className="block text-sm font-medium mb-1">
                            Destination
                        </label>
                        <input
                            id="destination"
                            type="text"
                            value={form.data.destination}
                            onChange={(e) => form.setData("destination", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        {form.errors.destination && (
                            <p className="text-red-600 text-xs mt-1">{form.errors.destination}</p>
                        )}
                    </div>

                    {/* Student Count + Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="student_count" className="block text-sm font-medium mb-1">
                                Student Count
                            </label>
                            <input
                                id="student_count"
                                type="number"
                                min={1}
                                max={500}
                                value={form.data.student_count}
                                onChange={(e) => form.setData("student_count", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                            {form.errors.student_count && (
                                <p className="text-red-600 text-xs mt-1">{form.errors.student_count}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium mb-1">
                                Amount (AED)
                            </label>
                            <input
                                id="amount"
                                type="number"
                                min={0}
                                step={0.01}
                                value={form.data.amount}
                                onChange={(e) => form.setData("amount", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                            {form.errors.amount && (
                                <p className="text-red-600 text-xs mt-1">{form.errors.amount}</p>
                            )}
                        </div>
                    </div>

                    {/* Trip Date */}
                    <div>
                        <label htmlFor="trip_date" className="block text-sm font-medium mb-1">
                            Trip Date
                        </label>
                        <input
                            id="trip_date"
                            type="date"
                            value={form.data.trip_date}
                            onChange={(e) => form.setData("trip_date", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        {form.errors.trip_date && (
                            <p className="text-red-600 text-xs mt-1">{form.errors.trip_date}</p>
                        )}
                    </div>

                    {/* Trip Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Trip Type</label>
                        <div className="flex gap-4">
                            {(["domestic", "international"] as const).map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="trip_type"
                                        value={type}
                                        checked={form.data.trip_type === type}
                                        onChange={() => form.setData("trip_type", type)}
                                    />
                                    <span className="text-sm capitalize">{type}</span>
                                </label>
                            ))}
                        </div>
                        {form.errors.trip_type && (
                            <p className="text-red-600 text-xs mt-1">{form.errors.trip_type}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium mb-1">
                            Notes <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            id="notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(e) => form.setData("notes", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {form.processing ? "Creating…" : "Create Booking"}
                        </button>
                    </div>

                    {/* Unsaved changes warning */}
                    {form.isDirty && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                            You have unsaved changes
                        </p>
                    )}
                </form>
            </div>
        </>
    );
}

CreateBookingPage.layout = (page: React.ReactNode) => (
    <MainLayout>{page}</MainLayout>
);

/*
================================================================
TIPS
================================================================

useForm — what it replaces vs raw React
-----------------------------------------
| Feature        | Raw React                        | Inertia useForm       |
|----------------|----------------------------------|-----------------------|
| Field state    | useState per field               | form.data.field       |
| Error state    | useState + manual 422 parse      | form.errors.field     |
| Loading state  | useState(false) + try/finally    | form.processing       |
| Dirty tracking | useState(false) + manual set     | form.isDirty          |
| Submit         | fetch() + error handling         | form.post()           |
| Reset          | setFormData(initial)+setErrors() | form.reset()          |

form.post() flow
-----------------
• Server returns 302 (success):
  → Inertia follows redirect → new page props delivered
  → FlashMessages shows success automatically (via HandleInertiaRequests::share)
  → onSuccess callback fires → form.reset()

• Server returns 422 (validation failed):
  → form.errors auto-populated from Laravel's JSON response
  → form.processing → false
  → onError callback fires → scroll to top

form.setData("field", value)
------------------------------
• Updates a single field — no spread needed
• TypeScript catches invalid field names at compile time

form.isDirty
-------------
• true when ANY field differs from initial values
• Useful for unsaved changes warning or blocking navigation

preserveScroll: true
---------------------
• Without it: page jumps to top on validation error
• With it: user stays at the failing field — better UX

================================================================
*/
