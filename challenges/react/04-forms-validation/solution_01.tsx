// ============================================================
// Problem 01 — BookingForm with react-hook-form (no Zod)
// ============================================================

// ============================================================
// components/BookingForm.tsx
//
// BookingFormData interface — snake_case keys matching Laravel field names
// BookingFormProps (onSuccess, onCancel)
//
// useForm<BookingFormData>({ defaultValues })
//   register("field", { rules })  — inline rules per field (required, min, max, validate)
//   Controller                    — for radio group (booking_type)
//   watch("booking_type")         — reactive value for conditional block
//   setError("field", { message })— injects server 422 errors into formState
//   formState.errors              — per-field error objects
//   formState.isSubmitting        — true while onSubmit promise is pending
//
// onSubmit — POST /api/bookings; on 422 map serverErrors via setError
// isInternational — watch("booking_type") === "international"
// ============================================================

import React from "react";
import { useForm, Controller } from "react-hook-form";

interface BookingFormData {
    school_id:        string;
    trip_id:          string;
    booking_type:     "domestic" | "international";
    student_count:    string;
    trip_date:        string;
    amount:           string;
    visa_arrangement: string;
}

interface BookingFormProps {
    onSuccess: (booking: unknown) => void;
    onCancel:  () => void;
}

export function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
    const {
        register,
        control,
        handleSubmit,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormData>({
        defaultValues: {
            school_id:        "",
            trip_id:          "",
            booking_type:     "domestic",
            student_count:    "",
            trip_date:        "",
            amount:           "",
            visa_arrangement: "",
        },
    });

    const isInternational = watch("booking_type") === "international";

    async function onSubmit(data: BookingFormData) {
        const res = await fetch("/api/bookings", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(data),
        });

        if (res.status === 422) {
            const { errors: serverErrors } = await res.json();
            Object.entries(serverErrors).forEach(([field, message]) => {
                setError(field as keyof BookingFormData, { message: message as string });
            });
            return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data: booking } = await res.json();
        onSuccess(booking);
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">

            {/* School */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
                <select
                    {...register("school_id", { required: "School is required" })}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.school_id ? "border-red-500" : "border-gray-300"}`}
                >
                    <option value="">Select school…</option>
                </select>
                {errors.school_id && (
                    <p className="mt-1 text-xs text-red-600">{errors.school_id.message}</p>
                )}
            </div>

            {/* Trip type — Controller for radio group */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type</label>
                <Controller
                    name="booking_type"
                    control={control}
                    render={({ field }) => (
                        <div className="flex gap-4">
                            {(["domestic", "international"] as const).map((type) => (
                                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        {...field}
                                        value={type}
                                        checked={field.value === type}
                                    />
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </label>
                            ))}
                        </div>
                    )}
                />
            </div>

            {/* Conditional: international fields */}
            {isInternational && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visa Arrangement *</label>
                    <select
                        {...register("visa_arrangement", {
                            validate: (v) => !isInternational || !!v || "Visa arrangement is required",
                        })}
                        className={`w-full border rounded-md px-3 py-2 text-sm ${errors.visa_arrangement ? "border-red-500" : "border-gray-300"}`}
                    >
                        <option value="">Select…</option>
                        <option value="self">School handles visa</option>
                        <option value="tripz">Tripz handles visa</option>
                    </select>
                    {errors.visa_arrangement && (
                        <p className="mt-1 text-xs text-red-600">{errors.visa_arrangement.message}</p>
                    )}
                </div>
            )}

            {/* Student count */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Count *</label>
                <input
                    type="number"
                    {...register("student_count", {
                        required: "Student count is required",
                        min: { value: 1,   message: "Must be at least 1 student" },
                        max: { value: 500, message: "Cannot exceed 500 students" },
                    })}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.student_count ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.student_count && (
                    <p className="mt-1 text-xs text-red-600">{errors.student_count.message}</p>
                )}
            </div>

            {/* Trip date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Date *</label>
                <input
                    type="date"
                    {...register("trip_date", {
                        required: "Trip date is required",
                        validate: (v) => new Date(v) > new Date() || "Trip date must be in the future",
                    })}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.trip_date ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.trip_date && (
                    <p className="mt-1 text-xs text-red-600">{errors.trip_date.message}</p>
                )}
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                    type="number"
                    {...register("amount", {
                        required: "Amount is required",
                        validate: (v) => Number(v) > 0 || "Amount must be positive",
                    })}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.amount ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.amount && (
                    <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
                >
                    {isSubmitting ? "Creating…" : "Create Booking"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
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

REGISTER — WIRE ANY INPUT IN ONE SPREAD
-----------------------------------------
• {...register("field", { rules })} — adds name, onChange, onBlur, ref to the input
• react-hook-form reads the value directly from the DOM — no useState needed
• rules: required, min, max, minLength, maxLength, pattern, validate
• errors.field?.message — read the error after validation fails

CONTROLLER — FOR RADIO GROUPS AND CUSTOM INPUTS
-------------------------------------------------
• register spread works on single native inputs (text, number, select, date)
• radio buttons are a GROUP — multiple inputs sharing one field → use Controller
• Controller gives you field = { value, onChange, onBlur, name }
• checked={field.value === type} — you control which radio is visually selected
• rule: if {...register()} causes issues or the input is custom → use Controller

WATCH — REACTIVE FIELD VALUE
------------------------------
• watch("booking_type") — returns the current value of the field
• re-renders when the field changes — like useState but reads from the form
• use for conditional rendering: const isInternational = watch("booking_type") === "international"
• {isInternational && <div>...</div>} — block mounts/unmounts when radio changes

VALIDATE — CUSTOM RULES
-------------------------
• validate: (v) => condition || "error message"
• returns true → valid; returns string → error message shown
• use when built-in rules (min, max, required) are not enough
• custom date: validate: (v) => new Date(v) > new Date() || "Must be in the future"
• conditional: validate: (v) => !isInternational || !!v || "Visa required"

SETERROR — INJECT SERVER 422 ERRORS
--------------------------------------
• Laravel returns: { errors: { school_id: "...", student_count: "..." } }
• Object.entries(serverErrors) → array of [field, message] pairs
• forEach → setError("field", { message }) for each pair
• errors appear in the same inline elements as client-side errors
• user sees no difference between client validation and server validation

ISSUBMITTING — AUTOMATIC LOADING STATE
----------------------------------------
• formState.isSubmitting → true while handleSubmit's async onValid is running
• no need for useState(isSubmitting) — react-hook-form manages it automatically
• disabled={isSubmitting} on the button prevents double submission
• resets to false automatically when onSubmit resolves or throws

HANDLESUBMIT — ONLY FIRES WHEN VALID
--------------------------------------
• <form onSubmit={handleSubmit(onSubmit)}>
• handleSubmit runs all register rules first
• if any rule fails → errors populated, onSubmit NOT called
• if all pass → onSubmit(data) called with typed, validated data
• no need to manually check errors before fetch

================================================================
*/
