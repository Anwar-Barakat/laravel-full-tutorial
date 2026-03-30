// ============================================================
// Problem 02 — Type-Safe Form Builder
// ============================================================



// ============================================================
// lib/formSchema.ts
//
// type SchemaDefinition = Record<string, ZodTypeAny>
//
// InferFormData<S extends SchemaDefinition>:
//   { [K in keyof S]: z.infer<S[K]> }
//   → maps each Zod validator to its TypeScript type
//   e.g. { name: z.string() } → { name: string }
//       { count: z.number() } → { count: number }
//
// BuiltSchema<S>:
//   fields:   S
//   validate: (data: unknown) => success result | { errors: Partial<Record<keyof S, string>> }
// ============================================================



// ============================================================
// FormSchemaBuilder<S extends SchemaDefinition>
//
// constructor(fields: S)
//
// field<K extends string, Z extends ZodTypeAny>(key: K, validator: Z):
//   returns new FormSchemaBuilder<S & Record<K, Z>>
//   ← generic accumulates: each .field() call grows S
//
// build(): BuiltSchema<S>
//   const zodObject = z.object(this.fields)
//   validate(data):
//     safeParse → if success: return { success: true, data }
//     else: flatten issues to { [field]: first message }
//     return { success: false, errors }
//
// createFormSchema(): returns new FormSchemaBuilder({})
//
// Usage:
//   const schema = createFormSchema()
//     .field("school_name",   z.string().min(1))
//     .field("student_count", z.number().min(1).max(500))
//     .field("trip_type",     z.enum(["domestic", "international"]))
//     .build()
//
//   Inferred type: { school_name: string; student_count: number; trip_type: "domestic"|"international" }
// ============================================================



// ============================================================
// hooks/useTypedForm.ts
//
// UseTypedFormReturn<S>:
//   values, errors, touched, isSubmitting
//   setValue<K extends keyof S>(key: K, value: InferFormData<S>[K]): void
//     ← linked generics: key and value types are coupled
//   getValue<K extends keyof S>(key: K): InferFormData<S>[K]
//   setTouched(key: keyof S): void  (validates on blur)
//   handleSubmit(onValid: (data: InferFormData<S>) => Promise<void>)
//   reset(): void
//
// useTypedForm(schema, initialValues?):
//   useState<InferFormData<S>>(initialValues as InferFormData<S>)
//   setState<FormErrors<S>>({})
//   setState<Partial<Record<keyof S, boolean>>>({})
//
//   setValue<K>(key, value):
//     setValues(prev => ({ ...prev, [key]: value }))
//     if touched[key]: re-validate and update that field's error
//
//   handleSubmit(onValid):
//     return async (e) => {
//       e.preventDefault()
//       touch all fields (show all errors at once)
//       result = schema.validate(values)
//       if !success: setErrors; return
//       setIsSubmitting(true)
//       try: await onValid(result.data)
//       finally: setIsSubmitting(false)
//     }
// ============================================================



// ============================================================
// Type safety demonstration:
//
// form.setValue("school_name", "SSI")       // ✓ string field receives string
// form.setValue("student_count", 45)        // ✓ number field receives number
// form.setValue("school_name", 123)         // ✗ Error: number not assignable to string
// form.setValue("nonexistent", "value")     // ✗ Error: "nonexistent" not in keyof S
// form.getValue("missing_field")            // ✗ Error: compile error
//
// Key mechanism: setValue<K extends keyof S>(key: K, value: InferFormData<S>[K])
//   K is inferred from the key argument
//   value type is then constrained to InferFormData<S>[K]
//   → TypeScript links the key and value types together
// ============================================================
