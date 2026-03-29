// ============================================================
// Problem 02 — BookingForm with react-hook-form + Zod
// ============================================================

// ============================================================
// components/BookingForm.tsx
//
// bookingSchema — z.object({ ... }) with all validation rules centralised
// BookingFormData — z.infer<typeof bookingSchema> (type derived from schema)
//
// useForm<BookingFormData>({ resolver: zodResolver(bookingSchema), defaultValues })
//   register("field")    — no inline rules needed, schema handles everything
//   Controller           — for radio group (booking_type)
//   watch("booking_type")— reactive value for conditional block
//   setError             — inject Laravel 422 server errors
//   formState.errors     — populated by Zod on submit
//   formState.isSubmitting
//
// onSubmit — POST /api/bookings; on 422 map serverErrors via setError
// ============================================================

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const bookingSchema = z
    .object({
        school_id: z.string().min(1, "School is required"),
        trip_id: z.string().min(1, "Trip is required"),
        booking_type: z.enum(["domestic", "international"]),
        student_count: z.coerce
            .number()
            .min(1, "Student count must be at least 1")
            .max(500, "Student count must not exceeded 500"),

        trip_date: z
            .string()
            .min(1, "Trip date is required")
            .refine(
                (v) => new Date(v) > new Date(),
                "Trip date must be in the future",
            ),

        amount: z.coerce.number().positive("Amount must be positive"),
        visa_arrangement: z.string(),
    })
    .refine(
        (data) =>
            data.booking_type !== "international" || !!data.visa_arrangement,
        {
            message: "Visa arrangement is required",
            path: ["visa_arrangement"],
        },
    );

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
    onSuccess: (booking: unknown) => void;
    onCancel: () => void;
}

export function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
    const {
        register,
        control,
        formState: { errors, isSubmitting },
        setError,
        watch,
        handleSubmit,
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            school_id: "",
            trip_id: "",
            booking_type: "domestic",
            student_count: 0,
            trip_date: "",
            amount: 0,
            visa_arrangement: "",
        },
    });

    const isInternational = watch("booking_type") === "international";

    async function onSubmit(data: BookingFormData) {
        const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (res.status === 422) {
            const { errors: serverErrors } = await res.json();
            Object.entries(serverErrors).forEach(([field, message]) => {
                setError(field as keyof BookingFormData, {
                    message: message as string,
                });
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    School *
                </label>
                <select
                    {...register("school_id")}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.school_id ? "border-red-500" : "border-gray-300"}`}
                >
                    <option value="">Select school…</option>
                </select>
                {errors.school_id && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors.school_id.message}
                    </p>
                )}
            </div>

            {/* Trip type — Controller for radio group */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Type
                </label>
                <Controller
                    name="booking_type"
                    control={control}
                    render={({ field }) => (
                        <div className="flex gap-4">
                            {(["domestic", "international"] as const).map(
                                (type) => (
                                    <label
                                        key={type}
                                        className="flex items-center gap-2 text-sm cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            {...field}
                                            value={type}
                                            checked={field.value === type}
                                        />
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                    </label>
                                ),
                            )}
                        </div>
                    )}
                />
            </div>

            {/* Conditional: international fields */}
            {isInternational && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Visa Arrangement *
                    </label>
                    <select
                        {...register("visa_arrangement")}
                        className={`w-full border rounded-md px-3 py-2 text-sm ${errors.visa_arrangement ? "border-red-500" : "border-gray-300"}`}
                    >
                        <option value="">Select…</option>
                        <option value="self">School handles visa</option>
                        <option value="tripz">Tripz handles visa</option>
                    </select>
                    {errors.visa_arrangement && (
                        <p className="mt-1 text-xs text-red-600">
                            {errors.visa_arrangement.message}
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
                    {...register("student_count")}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.student_count ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.student_count && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors.student_count.message}
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
                    {...register("trip_date")}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.trip_date ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.trip_date && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors.trip_date.message}
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
                    {...register("amount")}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.amount ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.amount && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors.amount.message}
                    </p>
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

ZOD SCHEMA — CENTRALISED VALIDATION
--------------------------------------
• z.object({ field: z.string().min(1, "error") }) — all rules in one place
• no inline rules in register() — schema handles everything
• errors.field.message — same JSX API as Problem 01, nothing changes in the template
• benefit: one schema reusable across API validation, tests, and the form

Z.INFER — DERIVE TYPE FROM SCHEMA
------------------------------------
• type BookingFormData = z.infer<typeof bookingSchema>
• TypeScript type is automatically derived — no separate interface needed
• schema changes → type updates automatically → no manual sync required

Z.COERCE — CONVERT STRING INPUTS TO NUMBER
--------------------------------------------
• HTML inputs always return strings, even type="number"
• z.coerce.number() converts "5" → 5 automatically before running .min()/.max()
• without coerce: z.number() would fail on "5" (string ≠ number)
• rule: always use z.coerce.number() for number inputs in forms

FIELD .REFINE VS SCHEMA .REFINE
---------------------------------
• field .refine: receives one value — use for single-field custom rules
  trip_date: z.string().refine((v) => new Date(v) > new Date(), "Must be future")
• schema .refine: receives full data object — use for cross-field rules
  z.object({...}).refine((data) => data.x !== "y" || !!data.z, { path: ["z"] })
• path: ["field"] — tells Zod which field to attach the error to

ZODRESOLVER — CONNECT SCHEMA TO USEFORM
-----------------------------------------
• resolver: zodResolver(bookingSchema) — replaces all inline register() rules
• install: npm install @hookform/resolvers zod
• react-hook-form calls zodResolver on submit and on change
• errors object is the same shape — JSX does not change between Problem 01 and 02

WITHOUT ZOD VS WITH ZOD
-------------------------
• Without: register("field", { required: "...", min: {...}, validate: (v) => ... })
• With:    register("field")  ← rules live in the schema
• Without: interface BookingFormData { ... }  ← manual type
• With:    type BookingFormData = z.infer<typeof bookingSchema>  ← auto type
• Zod wins for large forms — rules in one place, easier to maintain and test

================================================================
*/
