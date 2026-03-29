// ============================================================
// Problem 03 — BookingForm with Inertia.js useForm
// ============================================================

// ============================================================
// Pages/Bookings/Create.tsx  (Inertia page component)
//
// BookingFormData interface — snake_case keys matching Laravel field names
// Props interface (schools[], trips[] passed from Laravel controller)
//
// const form = useForm<BookingFormData>({ ...defaultValues })
//   form.data.field          — current field value (replaces useState)
//   form.setData("field", v) — update a single field (replaces handleChange)
//   form.errors.field        — Laravel $errors bag, mapped automatically on 422
//   form.processing          — true while request is in-flight (replaces isSubmitting)
//   form.isDirty             — true if any field differs from initial values
//   form.reset()             — reset all fields to defaultValues
//   form.clearErrors("field")— clear a specific error programmatically
//
// handleSubmit — form.post(route("bookings.store"), { onSuccess, onError })
// isInternational — form.data.booking_type === "international"
// ============================================================

import React from "react";
import { useForm } from "@inertiajs/react";

interface BookingFormData {
    school_id: string;
    trip_id: string;
    booking_type: "domestic" | "international";
    student_count: string;
    trip_date: string;
    amount: string;
    visa_arrangement: string;
}

interface Props {
    schools: { id: number; name: string }[];
    trips: { id: number; name: string }[];
}

export function BookingForm(props: Props) {
    const form = useForm<BookingFormData>({
        school_id: "",
        trip_id: "",
        booking_type: "domestic",
        student_count: "",
        trip_date: "",
        amount: "",
        visa_arrangement: "",
    });

    const isInternational = form.data.booking_type === "international";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route("bookings.store"), {
            onSuccess: () => form.reset(),
            onError: () => {},
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            {/* School */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    School *
                </label>
                <select
                    value={form.data.school_id}
                    onChange={(e) => form.setData("school_id", e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.school_id ? "border-red-500" : "border-gray-300"}`}
                >
                    <option value="">Select school…</option>
                </select>
                {form.errors.school_id && (
                    <p className="mt-1 text-xs text-red-600">
                        {form.errors.school_id}
                    </p>
                )}
            </div>

            {/* Trip type — Controller for radio group */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Type
                </label>


                <div className="flex gap-4">
                    {(["domestic", "international"] as const).map((type) => (
                        <label
                            key={type}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                            <input
                                type="radio"
                                value={type}
                                onChange={(e) =>
                                    form.setData("booking_type", e.target.value)
                                }
                                checked={form.data.booking_type === type}
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                </div>
            </div>

            {/* Conditional: international fields */}
            {isInternational && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Visa Arrangement *
                    </label>
                    <select
                        value={form.data.visa_arrangement}
                        onChange={(e) =>
                            form.setData("visa_arrangement", e.target.value)
                        }
                        className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.visa_arrangement ? "border-red-500" : "border-gray-300"}`}
                    >
                        <option value="">Select…</option>
                        <option value="self">School handles visa</option>
                        <option value="tripz">Tripz handles visa</option>
                    </select>
                    {form.errors.visa_arrangement && (
                        <p className="mt-1 text-xs text-red-600">
                            {form.errors.visa_arrangement}
                        </p>
                    )}
                </div>
            )}

            {/* Student count */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Count *
                </label>
                <input
                    type="number"
                    value={form.data.student_count}
                    onChange={(e) =>
                        form.setData("student_count", e.target.value)
                    }
                    className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.student_count ? "border-red-500" : "border-gray-300"}`}
                />
                {form.errors.student_count && (
                    <p className="mt-1 text-xs text-red-600">
                        {form.errors.student_count}
                    </p>
                )}
            </div>

            {/* Trip date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Date *
                </label>
                <input
                    type="date"
                    value={form.data.trip_date}
                    onChange={(e) => form.setData("trip_date", e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.trip_date ? "border-red-500" : "border-gray-300"}`}
                />
                {form.errors.trip_date && (
                    <p className="mt-1 text-xs text-red-600">
                        {form.errors.trip_date}
                    </p>
                )}
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                </label>
                <input
                    type="number"
                    value={form.data.amount}
                    onChange={(e) => form.setData("amount", e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${form.errors.amount ? "border-red-500" : "border-gray-300"}`}
                />
                {form.errors.amount && (
                    <p className="mt-1 text-xs text-red-600">
                        {form.errors.amount}
                    </p>
                )}
            </div>

            {/* Unsaved changes warning */}
            {form.isDirty && (
                <p className="text-sm text-amber-600">You have unsaved changes</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
                >
                    {form.processing ? "Creating…" : "Create Booking"}
                </button>
                <button
                    type="button"
                    onClick={() => form.reset()}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

/*
================================================================
TIPS
================================================================

USEFORM FROM INERTIA — NOT REACT-HOOK-FORM
--------------------------------------------
• import { useForm } from "@inertiajs/react"  ← different package
• no register, no handleSubmit, no Controller — completely different API
• form state lives in form.data, not separate useState hooks
• use in Laravel + Inertia projects; use react-hook-form for standalone React apps

FORM.DATA + FORM.SETDATA — REPLACES USESTATE
----------------------------------------------
• form.data.field        — read the current value (replaces useState getter)
• form.setData("field", value) — update a single field (replaces setState)
• value={form.data.school_id} onChange={(e) => form.setData("school_id", e.target.value)}
• no useState, no useReducer — Inertia manages the whole form state internally

FORM.ERRORS — STRING, NOT OBJECT
-----------------------------------
• react-hook-form: errors.field?.message  ← .message needed, it's an object
• Inertia:         form.errors.field      ← string directly, no .message
• Laravel's $errors bag is mapped automatically on 422 — no setError loop needed
• {form.errors.school_id && <p>{form.errors.school_id}</p>}

FORM.POST — NO MANUAL FETCH
------------------------------
• form.post(route("bookings.store"), { onSuccess, onError })
• Inertia handles the request, 422 mapping, and CSRF automatically
• onSuccess: () => form.reset()  — called when Laravel redirects back with success
• onError: () => {}              — called on validation failure (errors auto-populated)
• no fetch(), no res.status === 422, no Object.entries loop

FORM.PROCESSING — REPLACES ISSUBMITTING
-----------------------------------------
• form.processing → true while the Inertia request is in-flight
• disabled={form.processing} — prevents double submission
• {form.processing ? "Creating…" : "Create Booking"} — button label feedback
• resets automatically when the request completes

FORM.RESET AND FORM.ISDIRTY
------------------------------
• form.reset()   — resets all fields back to the initial defaultValues
• form.isDirty   — true if any field has changed from its initial value
• use isDirty to warn the user before they navigate away or cancel
• {form.isDirty && <p>You have unsaved changes</p>}
• reset() sets isDirty back to false

RADIO GROUPS WITHOUT CONTROLLER
----------------------------------
• Inertia does not use register/Controller — radio groups are just controlled inputs
• value={type}                            — each radio gets its own value
• checked={form.data.booking_type === type} — controls which is visually selected
• onChange={(e) => form.setData("booking_type", e.target.value)} — updates state
• common mistake: value={form.data.booking_type} — all radios get the same value

================================================================
*/
