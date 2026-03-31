// ============================================================
// Problem 02 — Type-Safe Form Builder
// ============================================================

import { useState } from "react";
import { z } from "zod";
import type { ZodTypeAny } from "zod";

// ============================================================
// InferFormData — mapped type that derives TS types from Zod validators
// ============================================================

// SchemaDefinition: a plain object where each value is a Zod validator
type SchemaDefinition = Record<string, ZodTypeAny>;

// InferFormData<S>: maps each Zod validator to the TypeScript type it produces
// [K in keyof S] → loop over every key in S
// z.infer<S[K]>  → get the TS type for each Zod validator
type InferFormData<S extends SchemaDefinition> = {
    [K in keyof S]: z.infer<S[K]>;
};

// Example:
// S = { name: z.ZodString, count: z.ZodNumber }
// InferFormData<S> = { name: string; count: number }

// ============================================================
// BuiltSchema<S>
// ============================================================

type FormErrors<S extends SchemaDefinition> = Partial<Record<keyof S, string>>;

interface BuiltSchema<S extends SchemaDefinition> {
    fields:   S;
    validate: (data: unknown) =>
        | { success: true;  data: InferFormData<S> }
        | { success: false; errors: FormErrors<S> };
}

// ============================================================
// FormSchemaBuilder<S> — fluent builder pattern
// Each .field() call GROWS S to include the new field
// ============================================================

class FormSchemaBuilder<S extends SchemaDefinition> {
    constructor(private readonly _fields: S) {}

    // field<K, Z>: K = new key name, Z = Zod type for that key
    // Returns a NEW builder whose type is S & Record<K, Z>
    // — TypeScript accumulates the fields as you chain .field() calls
    field<K extends string, Z extends ZodTypeAny>(
        key: K,
        validator: Z,
    ): FormSchemaBuilder<S & Record<K, Z>> {
        return new FormSchemaBuilder({
            ...this._fields,
            [key]: validator,
        } as S & Record<K, Z>);
    }

    build(): BuiltSchema<S> {
        const zodObject = z.object(this._fields);

        return {
            fields: this._fields,
            validate(data: unknown) {
                const result = zodObject.safeParse(data);
                if (result.success) {
                    return { success: true, data: result.data as InferFormData<S> };
                }
                // Flatten Zod errors to { fieldName: "first error message" }
                const errors: FormErrors<S> = {};
                for (const issue of result.error.issues) {
                    const key = issue.path[0] as keyof S;
                    if (key && !errors[key]) {
                        errors[key] = issue.message;
                    }
                }
                return { success: false, errors };
            },
        };
    }
}

// Factory function — starts with an empty schema {}
export function createFormSchema(): FormSchemaBuilder<Record<never, never>> {
    return new FormSchemaBuilder({});
}

// ============================================================
// useTypedForm<S> — generic form state hook
// ============================================================

interface UseTypedFormReturn<S extends SchemaDefinition> {
    values:       InferFormData<S>;
    errors:       FormErrors<S>;
    touched:      Partial<Record<keyof S, boolean>>;
    isSubmitting: boolean;
    // setValue — K is inferred from key, value type is linked: InferFormData<S>[K]
    setValue<K extends keyof S>(key: K, value: InferFormData<S>[K]): void;
    getValue<K extends keyof S>(key: K): InferFormData<S>[K];
    setTouched(key: keyof S): void;
    handleSubmit(onValid: (data: InferFormData<S>) => Promise<void>): (e: React.FormEvent) => Promise<void>;
    reset(): void;
}

function useTypedForm<S extends SchemaDefinition>(
    schema:         BuiltSchema<S>,
    initialValues?: Partial<InferFormData<S>>,
): UseTypedFormReturn<S> {
    const [values,       setValues]       = useState<InferFormData<S>>(
        (initialValues ?? {}) as InferFormData<S>
    );
    const [errors,       setErrors]       = useState<FormErrors<S>>({});
    const [touched,      setTouchedMap]   = useState<Partial<Record<keyof S, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    function setValue<K extends keyof S>(key: K, value: InferFormData<S>[K]) {
        setValues(prev => ({ ...prev, [key]: value }));
        // Re-validate this field if it was already touched
        if (touched[key]) {
            const result = schema.validate({ ...values, [key]: value });
            if (!result.success) {
                setErrors(prev => ({ ...prev, [key]: result.errors[key] }));
            } else {
                setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
            }
        }
    }

    function getValue<K extends keyof S>(key: K): InferFormData<S>[K] {
        return values[key];
    }

    function setTouched(key: keyof S) {
        setTouchedMap(prev => ({ ...prev, [key]: true }));
        // Validate on blur
        const result = schema.validate(values);
        if (!result.success) {
            setErrors(prev => ({ ...prev, [key]: result.errors[key] }));
        }
    }

    function handleSubmit(onValid: (data: InferFormData<S>) => Promise<void>) {
        return async (e: React.FormEvent) => {
            e.preventDefault();
            // Touch all fields to show all errors at once
            const allTouched = Object.fromEntries(
                Object.keys(schema.fields).map(k => [k, true])
            ) as Partial<Record<keyof S, boolean>>;
            setTouchedMap(allTouched);

            const result = schema.validate(values);
            if (!result.success) {
                setErrors(result.errors);
                return;
            }
            setIsSubmitting(true);
            try {
                await onValid(result.data);
            } finally {
                setIsSubmitting(false);
            }
        };
    }

    function reset() {
        setValues((initialValues ?? {}) as InferFormData<S>);
        setErrors({});
        setTouchedMap({});
    }

    return { values, errors, touched, isSubmitting, setValue, getValue, setTouched, handleSubmit, reset };
}

// ============================================================
// Usage — BookingForm
// ============================================================

// Schema definition — each .field() adds a key to S
// TypeScript accumulates: S grows from {} to the full shape
const bookingSchema = createFormSchema()
    .field("school_name",   z.string().min(1, "School name required"))
    .field("student_count", z.number().min(1).max(500))
    .field("trip_type",     z.enum(["domestic", "international"]))
    .field("amount",        z.number().positive("Must be positive"))
    .build();

// Inferred type (TypeScript derives this automatically):
// type BookingFormData = {
//     school_name:   string;
//     student_count: number;
//     trip_type:     "domestic" | "international";
//     amount:        number;
// }
type BookingFormData = InferFormData<typeof bookingSchema.fields>;

export function BookingForm() {
    const form = useTypedForm(bookingSchema);

    const submit = form.handleSubmit(async (data: BookingFormData) => {
        // data is fully typed — TypeScript knows each field's type
        console.log(data.school_name);    // string
        console.log(data.student_count);  // number
        console.log(data.trip_type);      // "domestic" | "international"
        await fetch("/api/bookings", { method: "POST", body: JSON.stringify(data) });
    });

    return (
        <form onSubmit={submit} className="space-y-4 max-w-md">
            <div>
                <label className="block text-sm font-medium">School Name</label>
                <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.getValue("school_name") ?? ""}
                    onChange={e => form.setValue("school_name", e.target.value)}
                    onBlur={() => form.setTouched("school_name")}
                />
                {form.errors.school_name && (
                    <p className="mt-1 text-sm text-red-500">{form.errors.school_name}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium">Student Count</label>
                <input
                    type="number"
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.getValue("student_count") ?? ""}
                    onChange={e => form.setValue("student_count", Number(e.target.value))}
                    onBlur={() => form.setTouched("student_count")}
                />
                {form.errors.student_count && (
                    <p className="mt-1 text-sm text-red-500">{form.errors.student_count}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium">Trip Type</label>
                <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.getValue("trip_type") ?? ""}
                    onChange={e => form.setValue("trip_type", e.target.value as "domestic" | "international")}
                    onBlur={() => form.setTouched("trip_type")}
                >
                    <option value="">Select...</option>
                    <option value="domestic">Domestic</option>
                    <option value="international">International</option>
                </select>
                {form.errors.trip_type && (
                    <p className="mt-1 text-sm text-red-500">{form.errors.trip_type}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={form.isSubmitting}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {form.isSubmitting ? "Saving…" : "Create Booking"}
            </button>
        </form>
    );
}

// ============================================================
// Type safety demonstration
// ============================================================

// form.setValue("school_name", "SSI")           // ✓ string field receives string
// form.setValue("student_count", 45)            // ✓ number field receives number
// form.setValue("school_name", 123)             // ✗ Error: number not assignable to string
// form.setValue("nonexistent", "value")         // ✗ Error: "nonexistent" not in keyof S
// form.getValue("missing_field")               // ✗ Error: compile error

// KEY MECHANISM:
// setValue<K extends keyof S>(key: K, value: InferFormData<S>[K])
//   1. K is inferred from key — e.g. K = "school_name"
//   2. value type becomes InferFormData<S>["school_name"] = string
//   3. TypeScript rejects setValue("school_name", 123) at compile time

/*
================================================================
TIPS
================================================================

MAPPED TYPES
-------------
• type Result<S> = { [K in keyof S]: z.infer<S[K]> }
• [K in keyof S] — loop over every key in S
• Each key maps to a derived type (z.infer extracts the TS type from Zod)
• Used by: InferFormData, FormErrors, Partial, Record, Pick, Omit

GENERIC ACCUMULATION (BUILDER PATTERN)
----------------------------------------
• Each .field() returns FormSchemaBuilder<S & Record<K, Z>>
• The type GROWS with each call: {} → {name:string} → {name:string,count:number} → ...
• TypeScript tracks the full shape — unknown fields are a compile error at .build()
• Pattern also used by: ORMs (Prisma), query builders, HTTP client options

LINKED GENERICS (KEY ↔ VALUE)
-------------------------------
• setValue<K extends keyof S>(key: K, value: InferFormData<S>[K])
• K is inferred from what you pass as key
• value type is then DERIVED from K — they're linked
• Prevents: setValue("amount", "not a number") → TS error at compile time

ZOD INTEGRATION
----------------
• z.infer<typeof schema> — extracts the TS type from a Zod schema
• safeParse returns { success: true, data } | { success: false, error }
• Use for: API response validation, form validation, env variable parsing

================================================================
*/
