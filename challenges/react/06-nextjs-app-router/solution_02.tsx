// ============================================================
// Problem 02 — Server Actions & Mutations
// ============================================================

// ============================================================
// lib/schemas/bookingSchema.ts  (shared — client AND server)
//
// One schema used everywhere — zodResolver on the client, safeParse on the server
// .refine() for cross-field date check — pure JS, runs on both sides
// BookingFormData — type inferred from BookingSchema
// ============================================================

import { z } from "zod";

export const BookingSchema = z.object({
    school_id:     z.string().min(1, "School is required"),
    trip_type:     z.enum(["domestic", "international"]),
    student_count: z.coerce.number().min(1, "Min 1 student").max(500, "Max 500 students"),
    date_from:     z.string().min(1, "Start date required"),
    date_to:       z.string().min(1, "End date required"),
}).refine(
    (data) => new Date(data.date_to) > new Date(data.date_from),
    { message: "End date must be after start date", path: ["date_to"] },
);

export type BookingFormData = z.infer<typeof BookingSchema>;

// ============================================================
// app/bookings/actions.ts
// "use server"
//
// Uses BookingSchema — same schema as client (includes .refine date check)
//
// createBookingAction(data: unknown):
//   parsed = BookingSchema.safeParse(data)
//   invalid → return { success: false, errors, message: "Validation failed" }
//   try: db.booking.create
//   catch: return { success: false, errors: {}, message: "Database error" }
//   revalidatePath("/bookings") → redirect("/bookings")
// ============================================================

"use server";

import { redirect }      from "next/navigation";
import { revalidatePath } from "next/cache";

export interface ActionResult {
    success: boolean;
    errors:  Record<string, string[]>;
    message: string | null;
}

export async function createBookingAction(data: unknown): Promise<ActionResult> {
    const parsed = BookingSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
            message: "Validation failed",
        };
    }

    try {
        await db.booking.create({ data: parsed.data });
    } catch {
        return { success: false, errors: {}, message: "Database error" };
    }

    revalidatePath("/bookings");
    redirect("/bookings");
}

export async function updateBookingAction(
    id: number,
    data: unknown,
): Promise<ActionResult> {
    const parsed = BookingSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
            message: "Validation failed",
        };
    }

    await db.booking.update({ where: { id }, data: parsed.data });

    revalidatePath(`/bookings/${id}`);
    revalidatePath("/bookings");
    redirect(`/bookings/${id}`);
}

export async function deleteBookingAction(id: number): Promise<void> {
    await db.booking.delete({ where: { id } });
    revalidatePath("/bookings");
    redirect("/bookings");
}

// ============================================================
// components/CreateBookingFormValidated.tsx  ("use client")
//
// react-hook-form + useTransition
// BookingSchema → zodResolver on client, safeParse on server — same schema
//
// const [isPending, startTransition] = useTransition()
// const [serverMessage, setServerMessage] = useState<string | null>(null)
//
// useForm<BookingFormData>({ resolver: zodResolver(BookingSchema) })
//
// onSubmit(data):
//   startTransition(async () => {
//     result = await createBookingAction(data)
//     if !result.success:
//       setServerMessage(result.message)
//       Object.entries(result.errors) → setError(field, { type: "server", message })
//       ← server's .refine error (date_to) appears inline in the date_to field
//   })
// ============================================================

"use client";

import { useTransition, useState }                   from "react";
import { useForm }                                   from "react-hook-form";
import { zodResolver }                               from "@hookform/resolvers/zod";
import { BookingSchema, type BookingFormData }       from "@/lib/schemas/bookingSchema";
import { createBookingAction }                       from "@/app/bookings/actions";

export function CreateBookingFormValidated() {
    const [isPending, startTransition]      = useTransition();
    const [serverMessage, setServerMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<BookingFormData>({
        resolver: zodResolver(BookingSchema),
    });

    function onSubmit(data: BookingFormData) {
        setServerMessage(null);
        startTransition(async () => {
            const result = await createBookingAction(data);
            if (result && !result.success) {
                setServerMessage(result.message);
                Object.entries(result.errors).forEach(([field, messages]) => {
                    setError(field as keyof BookingFormData, {
                        type:    "server",
                        message: messages[0],
                    });
                });
            }
        });
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            {serverMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
                    {serverMessage}
                </div>
            )}

            {/* school */}
            <div>
                <label className="block text-sm font-medium mb-1">School</label>
                <select
                    {...register("school_id")}
                    className={`w-full border rounded px-3 py-2 ${errors.school_id ? "border-red-500" : "border-gray-300"}`}
                >
                    <option value="">Select school…</option>
                    <option value="1">Al Ain School</option>
                    <option value="2">Dubai Academy</option>
                </select>
                {errors.school_id && (
                    <p className="text-red-600 text-sm mt-1">{errors.school_id.message}</p>
                )}
            </div>

            {/* trip type */}
            <div>
                <label className="block text-sm font-medium mb-2">Trip Type</label>
                <div className="flex gap-4">
                    {(["domestic", "international"] as const).map((type) => (
                        <label key={type} className="flex items-center gap-2 text-sm">
                            <input type="radio" value={type} {...register("trip_type")} />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                </div>
                {errors.trip_type && (
                    <p className="text-red-600 text-sm mt-1">{errors.trip_type.message}</p>
                )}
            </div>

            {/* student count */}
            <div>
                <label className="block text-sm font-medium mb-1">Student Count</label>
                <input
                    type="number"
                    {...register("student_count")}
                    className={`w-full border rounded px-3 py-2 ${errors.student_count ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.student_count && (
                    <p className="text-red-600 text-sm mt-1">{errors.student_count.message}</p>
                )}
            </div>

            {/* dates */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">From</label>
                    <input
                        type="date"
                        {...register("date_from")}
                        className={`w-full border rounded px-3 py-2 ${errors.date_from ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.date_from && (
                        <p className="text-red-600 text-sm mt-1">{errors.date_from.message}</p>
                    )}
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">To</label>
                    <input
                        type="date"
                        {...register("date_to")}
                        className={`w-full border rounded px-3 py-2 ${errors.date_to ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.date_to && (
                        <p className="text-red-600 text-sm mt-1">{errors.date_to.message}</p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isPending ? "Creating…" : "Create Booking"}
            </button>
        </form>
    );
}

/*
================================================================
TIPS
================================================================

ONE SCHEMA FOR BOTH CLIENT AND SERVER
--------------------------------------
• BookingSchema used by zodResolver on the client AND safeParse on the server
• no duplication — change it once, both sides update automatically
• type BookingFormData = z.infer<typeof BookingSchema>
  → TypeScript type derived from the schema — no separate interface needed
• split into two schemas ONLY when server needs DB queries client can't run

ZOD .REFINE — CROSS-FIELD VALIDATION
--------------------------------------
• .refine((data) => boolean, { message, path })
• receives the whole object — can compare any fields against each other
• date cross-field: new Date(data.date_to) > new Date(data.date_from)
• path: ["date_to"] — attaches the error to that specific field
• without path → error appears at the form level (not tied to a field)
• runs on BOTH client (zodResolver) and server (safeParse) — pure JS

VALIDATION RESPONSIBILITY TABLE
----------------------------------
• School required      → Client + Server (same schema)
• Student count 1–500  → Client + Server (same schema)
• date_to > date_from  → Client + Server (.refine — pure JS, runs anywhere)
• School at capacity   → Server only (needs DB query — split schema here)
• Duplicate booking    → Server only (needs DB query — split schema here)
• Rule: if it needs a DB query → server only schema, otherwise one schema

CLIENT VS SERVER — WHY ALWAYS VALIDATE BOTH
---------------------------------------------
• client validation = UX: instant feedback, no network round trip
• server validation = security: client code can be bypassed (DevTools, curl)
• NEVER skip server validation even if client already passed
• with one shared schema: safeParse on server costs almost nothing

HOW .REFINE ERRORS SURFACE IN THE FORM
----------------------------------------
• if date_to invalid: server returns { errors: { date_to: ["End date..."] } }
• Object.entries loop → setError("date_to", { type: "server", message })
• errors.date_to.message → shows inline under the date_to field
• also catches on client (zodResolver) before submit — user sees it instantly

================================================================
*/
