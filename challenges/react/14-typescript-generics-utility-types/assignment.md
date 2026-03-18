# Advanced TypeScript for React

Master TypeScript generics, utility types, discriminated unions, and type-safe patterns in React components.

| Topic               | Details                                                         |
|---------------------|-----------------------------------------------------------------|
| Generics            | Generic components and hooks                                    |
| Utility Types       | Partial, Pick, Omit, Record                                     |
| Discriminated Unions | Type-safe event handling                                       |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Generic Table & Type-Safe Events (Medium)

### Scenario

Build a generic, reusable `DataTable` component that works with ANY data type — bookings, schools, payments — with typed columns, sorting, and selection.

### Requirements

1. `DataTable` generic component accepting any data shape
2. `Column` type with: `key` (`keyof T`), `header`, `render?`, `sortable?`
3. Typed sort handler: `onSort(key: keyof T, dir: "asc" | "desc")`
4. Typed row selection: `onSelect(item: T)`
5. `Pick` for selecting specific columns
6. `Partial` for optional filter props
7. Discriminated union for table actions: `{ type: "edit", item: T } | { type: "delete", id: number }`

### Expected Code

```tsx
// types/table.ts

// Column definition — key must be a valid field of T
export interface Column<T> {
  key:       keyof T             // ← typed to T's keys only
  header:    string
  render?:   (value: T[keyof T], item: T) => React.ReactNode  // typed value
  sortable?: boolean
  width?:    string
}

// Discriminated union for table actions — exhaustive type narrowing
export type TableAction<T> =
  | { type: "edit";   item: T }        // ← full item for edit
  | { type: "delete"; id: number }     // ← just id for delete
  | { type: "view";   item: T }
  | { type: "duplicate"; item: T }

// Sort state
export interface SortState<T> {
  key: keyof T
  dir: "asc" | "desc"
}

// Table filter props — Partial makes all optional
export type TableFilters<T> = Partial<Pick<T, keyof T>>
// e.g. TableFilters<Booking> = { status?: string; schoolName?: string; ... }
```

```tsx
// components/DataTable.tsx
import type { Column, TableAction, SortState } from "@/types/table"

interface DataTableProps<T extends { id: number }> {
  data:      T[]
  columns:   Column<T>[]
  onSort?:   (key: keyof T, dir: "asc" | "desc") => void
  onAction?: (action: TableAction<T>) => void
  onSelect?: (item: T) => void
  keyField?: keyof T          // default: "id"
  isLoading?: boolean
  emptyMessage?: string
}

// T extends { id: number } — ensures every row has a unique key
export function DataTable<T extends { id: number }>({
  data,
  columns,
  onSort,
  onAction,
  onSelect,
  keyField = "id",
  isLoading = false,
  emptyMessage = "No data",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState<T> | null>(null)

  const handleSort = (key: keyof T) => {
    if (!onSort) return
    const dir = sort?.key === key && sort.dir === "asc" ? "desc" : "asc"
    setSort({ key, dir })
    onSort(key, dir)   // typed: key is keyof T, dir is "asc" | "desc"
  }

  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={5} />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                style={{ cursor: col.sortable ? "pointer" : "default", width: col.width }}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sort?.key === col.key && (
                    <span>{sort.dir === "asc" ? "↑" : "↓"}</span>
                  )}
                </span>
              </th>
            ))}
            {onAction && <th scope="col" className="px-4 py-3" />}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onAction ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={String(item[keyField])}
                onClick={onSelect ? () => onSelect(item) : undefined}
                className="hover:bg-gray-50 transition-colors duration-100"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-sm">
                    {col.render
                      ? col.render(item[col.key], item)  // typed: item[col.key] is T[keyof T]
                      : String(item[col.key] ?? "")
                    }
                  </td>
                ))}

                {onAction && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction({ type: "view", item }) }}
                        className="text-blue-600 text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction({ type: "edit", item }) }}
                        className="text-gray-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction({ type: "delete", id: item.id }) }}
                        className="text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

```tsx
// Usage — works with ANY type, fully typed

// ── Bookings ─────────────────────────────────────────────────
const bookingColumns: Column<Booking>[] = [
  { key: "school_name",   header: "School" },
  { key: "amount",        header: "Amount",
    render: (v) => new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
                       .format(v as number) },
  { key: "status",        header: "Status",  sortable: true,
    render: (v) => <Badge status={v as BookingStatus} /> },
  { key: "student_count", header: "Students", sortable: true },
]

<DataTable<Booking>
  data={bookings}
  columns={bookingColumns}
  onSort={(key, dir) => setSort({ key, dir })}
  onAction={(action) => {
    // Discriminated union narrows type — TypeScript knows action.item exists on "edit"
    if (action.type === "edit")   openEditModal(action.item)    // action.item: Booking
    if (action.type === "delete") confirmDelete(action.id)      // action.id: number
    if (action.type === "view")   navigate(`/bookings/${action.item.id}`)
  }}
/>

// ── Schools — same component, different type ─────────────────
const schoolColumns: Column<School>[] = [
  { key: "name",     header: "School Name" },
  { key: "city",     header: "City" },
  { key: "capacity", header: "Capacity", sortable: true },
]

<DataTable<School>
  data={schools}
  columns={schoolColumns}
  onSelect={(school) => console.log(school.name)}  // school: School — fully typed
/>

// TypeScript prevents invalid column keys:
const bad: Column<Booking>[] = [
  { key: "nonexistent_field", header: "Bad" }  // ✗ Error: not in keyof Booking
]
```

```tsx
// Utility type examples used in the component ecosystem

// Pick — extract only needed fields
type BookingListItem = Pick<Booking, "id" | "school_name" | "status" | "amount">

// Omit — remove sensitive/internal fields from API response
type PublicBooking = Omit<Booking, "internal_notes" | "payment_token">

// Partial — all fields optional (for update payloads)
type UpdateBookingData = Partial<Omit<Booking, "id" | "created_at">>

// Record — map of status to display config
const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", className: "bg-blue-100   text-blue-800"   },
  paid:      { label: "Paid",      className: "bg-green-100  text-green-800"  },
  cancelled: { label: "Cancelled", className: "bg-red-100    text-red-800"    },
}

// Required — make all fields mandatory (opposite of Partial)
type RequiredBooking = Required<Booking>

// ReturnType — infer return type from existing function
type BookingStats = ReturnType<typeof computeBookingStats>

// Parameters — infer parameter types from function
type FilterParams = Parameters<typeof bookingApi.getAll>[0]
// = GetBookingsParams
```

```tsx
// Generic hook — useSort<T>
function useSort<T>(initialKey?: keyof T) {
  const [sort, setSort] = useState<SortState<T> | null>(
    initialKey ? { key: initialKey, dir: "asc" } : null
  )

  const toggle = useCallback((key: keyof T) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    )
  }, [])

  const sortFn = useCallback(
    (a: T, b: T): number => {
      if (!sort) return 0
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : (av as number) - (bv as number)
      return sort.dir === "asc" ? cmp : -cmp
    },
    [sort]
  )

  return { sort, toggle, sortFn }
}

// Usage — keyof Booking is the only valid argument
const { sort, toggle, sortFn } = useSort<Booking>("amount")
const sorted = useMemo(() => [...bookings].sort(sortFn), [bookings, sortFn])
```

### Discriminated Union Exhaustiveness

```tsx
// TypeScript narrows the type in each branch
function handleAction(action: TableAction<Booking>) {
  switch (action.type) {
    case "edit":
      // action is { type: "edit"; item: Booking }
      openEditModal(action.item)         // action.item: Booking ✓
      break
    case "delete":
      // action is { type: "delete"; id: number }
      confirmDelete(action.id)           // action.id: number ✓
      break
    case "view":
      navigate(`/bookings/${action.item.id}`)
      break
    case "duplicate":
      duplicateBooking(action.item)
      break
    default:
      // Exhaustiveness check — TS errors if a new case is added to the union
      const _exhaustive: never = action
      throw new Error(`Unhandled action: ${_exhaustive}`)
  }
}
```

### What We're Evaluating

- `<T extends { id: number }>` — constrained generic ensures rows are uniquely identifiable
- `keyof T` — Column.key limited to actual fields of T; invalid keys are compile errors
- `T[keyof T]` — render function receives the actual value type at that key (not `unknown`)
- `Partial<Pick<T, keyof T>>` — `TableFilters` makes all T fields optional for filter objects
- Discriminated union `type` field — narrows to specific shape in `if` / `switch` branches
- `never` in default branch — exhaustiveness check: TS errors when union grows but switch doesn't
- `Record<BookingStatus, Config>` — forces every enum member to have a config entry

---

## Problem 02 — Type-Safe Form Builder (Hard)

### Scenario

Build a generic form builder that creates forms from a schema definition — fully typed so TypeScript catches invalid field names and wrong value types.

### Requirements

1. `FormSchema` type that maps field names to validation rules
2. `useTypedForm(schema)` hook returning typed getters/setters
3. Field-level type safety: number fields only accept numbers
4. `createFormSchema()` builder with chainable validation
5. Infer form data type from schema definition
6. Error messages typed to schema fields

### Expected Code

```tsx
// lib/formSchema.ts
import { z, type ZodTypeAny, type infer as ZodInfer } from "zod"

// The schema is a record mapping field names to Zod types
type SchemaDefinition = Record<string, ZodTypeAny>

// Infer the TS type of the form data from the Zod schema
// e.g. if schema has { name: z.string(), count: z.number() }
// then InferFormData<Schema> = { name: string; count: number }
type InferFormData<S extends SchemaDefinition> = {
  [K in keyof S]: ZodInfer<S[K]>
}

// The built schema object passed to useTypedForm
interface BuiltSchema<S extends SchemaDefinition> {
  fields:   S
  validate: (data: unknown) => { success: true; data: InferFormData<S> }
                             | { success: false; errors: Partial<Record<keyof S, string>> }
}
```

```tsx
// Builder pattern — chainable with full type inference
class FormSchemaBuilder<S extends SchemaDefinition> {
  private fields: S

  constructor(fields: S) {
    this.fields = fields
  }

  // Each call to .field() adds a key to S and returns a new builder
  // The generic grows: Builder<S & { [K]: ZodType<V> }>
  field<K extends string, Z extends ZodTypeAny>(
    key:        K,
    validator:  Z
  ): FormSchemaBuilder<S & Record<K, Z>> {
    return new FormSchemaBuilder({
      ...this.fields,
      [key]: validator,
    } as S & Record<K, Z>)
  }

  build(): BuiltSchema<S> {
    const zodObject = z.object(this.fields)

    return {
      fields: this.fields,
      validate: (data: unknown) => {
        const result = zodObject.safeParse(data)
        if (result.success) {
          return { success: true, data: result.data as InferFormData<S> }
        }
        // Flatten Zod errors to field → first message
        const errors: Partial<Record<keyof S, string>> = {}
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof S
          if (!errors[key]) errors[key] = issue.message
        }
        return { success: false, errors }
      },
    }
  }
}

// Entry point — starts with empty schema, T is inferred via the chain
export function createFormSchema<_T = never>() {
  return new FormSchemaBuilder({})
}

// Usage
const bookingSchema = createFormSchema()
  .field("school_name",   z.string().min(1, "School is required"))
  .field("student_count", z.number().min(1).max(500))
  .field("trip_type",     z.enum(["domestic", "international"]))
  .field("date_from",     z.string().min(1, "Date required"))
  .build()

// TypeScript infers the exact shape:
// InferFormData<typeof bookingSchema.fields> = {
//   school_name:   string
//   student_count: number
//   trip_type:     "domestic" | "international"
//   date_from:     string
// }
```

```tsx
// hooks/useTypedForm.ts
type FormErrors<S extends SchemaDefinition> = Partial<Record<keyof S, string>>

interface UseTypedFormReturn<S extends SchemaDefinition> {
  values:       InferFormData<S>
  errors:       FormErrors<S>
  touched:      Partial<Record<keyof S, boolean>>
  isSubmitting: boolean

  // setValue is typed: key must be keyof S, value must match that field's type
  setValue<K extends keyof S>(key: K, value: InferFormData<S>[K]): void

  getValue<K extends keyof S>(key: K): InferFormData<S>[K]

  setTouched(key: keyof S): void

  handleSubmit(
    onValid: (data: InferFormData<S>) => Promise<void> | void
  ): (e: React.FormEvent) => Promise<void>

  reset(): void
}

export function useTypedForm<S extends SchemaDefinition>(
  schema:       BuiltSchema<S>,
  initialValues?: Partial<InferFormData<S>>
): UseTypedFormReturn<S> {
  // State typed to the inferred form data shape
  const [values,       setValues]       = useState<InferFormData<S>>(
    (initialValues ?? {}) as InferFormData<S>
  )
  const [errors,       setErrors]       = useState<FormErrors<S>>({})
  const [touched,      setTouchedState] = useState<Partial<Record<keyof S, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // K extends keyof S → key must be a real field name
  // InferFormData<S>[K] → value must be the exact type for that field
  function setValue<K extends keyof S>(key: K, value: InferFormData<S>[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }))

    // Re-validate field if already touched
    if (touched[key]) {
      const result = schema.validate({ ...values, [key]: value })
      if (!result.success) {
        setErrors((prev) => ({ ...prev, [key]: result.errors[key] }))
      } else {
        setErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
      }
    }
  }

  function getValue<K extends keyof S>(key: K): InferFormData<S>[K] {
    return values[key]
  }

  function setTouched(key: keyof S): void {
    setTouchedState((prev) => ({ ...prev, [key]: true }))
    // Validate on blur
    const result = schema.validate(values)
    if (!result.success && result.errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: result.errors[key] }))
    }
  }

  function handleSubmit(onValid: (data: InferFormData<S>) => Promise<void> | void) {
    return async (e: React.FormEvent) => {
      e.preventDefault()

      // Touch all fields to show errors
      const allTouched = Object.fromEntries(
        Object.keys(schema.fields).map((k) => [k, true])
      ) as Record<keyof S, boolean>
      setTouchedState(allTouched)

      const result = schema.validate(values)
      if (!result.success) {
        setErrors(result.errors)
        return
      }

      setIsSubmitting(true)
      try {
        await onValid(result.data)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  function reset(): void {
    setValues((initialValues ?? {}) as InferFormData<S>)
    setErrors({})
    setTouchedState({})
  }

  return { values, errors, touched, isSubmitting, setValue, getValue, setTouched, handleSubmit, reset }
}
```

```tsx
// Usage — full type safety in action
const schema = createFormSchema()
  .field("school_name",   z.string().min(1, "School is required"))
  .field("student_count", z.number().min(1).max(500))
  .field("trip_type",     z.enum(["domestic", "international"]))
  .build()

function CreateBookingForm() {
  const form = useTypedForm(schema, {
    student_count: 1,
    trip_type:     "domestic",
  })

  return (
    <form onSubmit={form.handleSubmit(async (data) => {
      // data is fully typed: { school_name: string; student_count: number; trip_type: "domestic" | "international" }
      await bookingApi.create(data)
    })}>
      <input
        value={form.getValue("school_name") ?? ""}
        onChange={(e) => form.setValue("school_name", e.target.value)}
        //                  ^--- TypeScript knows this is a string field
        onBlur={() => form.setTouched("school_name")}
      />
      {form.errors.school_name && (
        <p className="text-red-600">{form.errors.school_name}</p>
      )}

      <input
        type="number"
        value={form.getValue("student_count") ?? ""}
        onChange={(e) => form.setValue("student_count", e.target.valueAsNumber)}
        //                  ^--- TypeScript: must be number (not string!)
        onBlur={() => form.setTouched("student_count")}
      />

      {/* TypeScript errors: */}
      {/* form.setValue("school_name", 123)        ← ✗ number not assignable to string  */}
      {/* form.setValue("nonexistent", "value")    ← ✗ "nonexistent" not in keyof S     */}
      {/* form.getValue("missing_field")           ← ✗ compile error                    */}

      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? "Creating…" : "Create Booking"}
      </button>
    </form>
  )
}
```

```tsx
// Bonus: conditional field types — z.discriminatedUnion for trip_type
const advancedSchema = createFormSchema()
  .field("school_name",   z.string().min(1))
  .field("trip_type",     z.enum(["domestic", "international"]))
  .field("student_count", z.number().min(1))
  // Refinement — cross-field validation baked into schema
  .field("visa_required", z.boolean().optional())
  .build()

// Type of advancedSchema inferred as:
// {
//   school_name:   string
//   trip_type:     "domestic" | "international"
//   student_count: number
//   visa_required?: boolean
// }

// Conditional rendering still needs runtime check, but type system helps:
function VisaField({ form }: { form: UseTypedFormReturn<typeof advancedSchema.fields> }) {
  if (form.getValue("trip_type") !== "international") return null
  return (
    <label>
      <input
        type="checkbox"
        checked={form.getValue("visa_required") ?? false}
        onChange={(e) => form.setValue("visa_required", e.target.checked)}
      />
      Visa arrangement required
    </label>
  )
}
```

### TypeScript Patterns Reference

| Pattern | Syntax | Purpose |
|---------|--------|---------|
| Generic constraint | `<T extends { id: number }>` | Ensure T has specific shape |
| Key access | `T[keyof T]` | Value type at any key of T |
| Mapped type | `{ [K in keyof T]: ... }` | Transform each field |
| Infer return | `ReturnType<typeof fn>` | Extract function return type |
| Infer params | `Parameters<typeof fn>[0]` | Extract first parameter type |
| Conditional | `T extends string ? A : B` | Branch on type condition |
| Template literal | `` `${K}_error` `` | String type manipulation |
| Satisfies | `value satisfies Type` | Type-check without widening |

### What We're Evaluating

- `<T extends SchemaDefinition>` — builder grows as fields are added; TypeScript infers the final shape
- `InferFormData<S>` mapped type — derives concrete types from Zod schema at compile time
- `setValue<K extends keyof S>(key: K, value: InferFormData<S>[K])` — linked generics enforce field/value pairing
- Builder pattern `field()` returns `FormSchemaBuilder<S & Record<K, Z>>` — accumulated type grows with each call
- `z.infer<typeof schema>` — Zod's built-in inference; same pattern as `InferFormData`
- `Partial<Record<keyof S, string>>` — errors object can have any subset of schema keys
- `satisfies` operator (TS 4.9+) — validates object against type while preserving literal types
