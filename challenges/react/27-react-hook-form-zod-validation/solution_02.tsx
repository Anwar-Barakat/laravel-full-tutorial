// ============================================================
// Problem 02 — useFieldArray + FormProvider
// ============================================================



// ============================================================
// bookingWithStudentsSchema
//
// studentSchema = z.object({
//   name:        z.string().min(2)
//   age:         z.coerce.number().int().min(5).max(18)
//   has_passport: z.boolean().default(false)
// })
//
// bookingWithStudentsSchema = bookingSchema.extend({
//   students: z.array(studentSchema).min(1, "Add at least one student")
// })
// .superRefine((data, ctx) => {
//   if (data.students.length !== data.student_count)
//     ctx.addIssue({ code: z.ZodIssueCode.custom,
//                    message: `Must add exactly ${data.student_count} students`,
//                    path: ["students"] })
//   if (data.trip_type === "international"):
//     data.students.forEach((s, i) => {
//       if (!s.has_passport)
//         ctx.addIssue({ code: z.ZodIssueCode.custom,
//                        message: "Passport required for international trips",
//                        path: ["students", i, "has_passport"] })
//     })
// })
//
// Cross-field rules live in superRefine — not in individual field schemas
// path: ["students", i, "field"] targets nested field errors
// ============================================================



// ============================================================
// useFieldArray
//
// const { fields, append, remove, move, swap } = useFieldArray({
//   control: form.control,
//   name: "students"
// })
//
// append({ name: "", age: 0, has_passport: false })   ← adds row
// remove(index)                                        ← removes row
// move(index, index - 1)                               ← move up
// move(index, index + 1)                               ← move down
// swap(indexA, indexB)                                 ← swap two rows
//
// KEY RULE: always use field.id as React key, NOT index:
//   {fields.map((field, index) => (
//     <StudentRow key={field.id} index={index} />
//                     ↑ field.id is stable UUID assigned by RHF
//   ))}
//   Using index as key breaks RHF internal tracking on remove/reorder
//
// Nested field name syntax:
//   register(`students.${index}.name`)
//   errors.students?.[index]?.name?.message
// ============================================================



// ============================================================
// FormProvider + useFormContext
//
// Parent (BookingForm):
//   const methods = useForm<BookingWithStudentsData>({ resolver, ... })
//
//   <FormProvider {...methods}>
//     <form onSubmit={methods.handleSubmit(onSubmit)}>
//       <BookingFields />         ← uses useFormContext
//       <StudentList />           ← uses useFormContext + useFieldArray
//       <SubmitButton />          ← uses useFormContext
//     </form>
//   </FormProvider>
//
// Child (StudentList — no props needed):
//   const { control, register, formState: { errors } } = useFormContext<BookingWithStudentsData>()
//   const { fields, append, remove, move } = useFieldArray({ control, name:"students" })
//
// Benefit: avoids prop-drilling control/register/errors through component tree
// Alternative (without FormProvider): pass control+register as props — works but verbose
// ============================================================



// ============================================================
// StudentList component
//
// const { watch } = useFormContext<BookingWithStudentsData>()
// const tripType = watch("trip_type")   ← reactive — re-renders on change
//
// fields.map((field, index) => (
//   <div key={field.id}>
//     <input {...register(`students.${index}.name`)} />
//     {errors.students?.[index]?.name && (
//       <p>{errors.students[index].name.message}</p>
//     )}
//
//     {tripType === "international" && (
//       <label>
//         <input type="checkbox" {...register(`students.${index}.has_passport`)} />
//         Has passport
//       </label>
//       ← conditional field shown only for international trips
//     )}
//
//     <button onClick={() => move(index, index - 1)} disabled={index === 0}>↑</button>
//     <button onClick={() => move(index, index + 1)} disabled={index === fields.length - 1}>↓</button>
//     <button onClick={() => remove(index)}>Remove</button>
//   </div>
// ))
//
// Array-level error (count mismatch):
//   {typeof errors.students?.message === "string" && (
//     <p>{errors.students.message}</p>
//   )}
//   ← errors.students can be array (per-item) OR object with .message (array-level)
// ============================================================



// ============================================================
// Key concepts
//
// z.infer<typeof schema> — derive TS type from Zod schema:
//   type FormData = z.infer<typeof bookingWithStudentsSchema>
//   No separate interface, schema IS the source of truth
//
// z.coerce.number() — essential for HTML inputs:
//   All <input> values are strings
//   z.number() rejects "5" (string) → validation error
//   z.coerce.number() → Number("5") = 5 → passes
//
// z.superRefine vs z.refine:
//   .refine(fn, msg)       — single error on the whole object
//   .superRefine((data, ctx) => { ctx.addIssue(...) }) — multiple errors, custom paths
//   Use superRefine for cross-field validation targeting specific field paths
//
// useFieldArray field.id:
//   RHF assigns stable UUID to each array item
//   Survives reorder/remove — React reconciles correctly
//   index as key: breaks when items removed from middle
//
// FormProvider spread:
//   <FormProvider {...methods}> passes all RHF methods via context
//   useFormContext() retrieves them in any descendant
//   Same methods object — no extra re-renders
//
// Errors type for arrays:
//   errors.students → FieldErrors<StudentData>[] | { message: string }
//   errors.students?.[i]?.name → per-item field error
//   errors.students?.message → array-level error (from superRefine)
//   errors.students?.root?.message → alternative array root error
// ============================================================
