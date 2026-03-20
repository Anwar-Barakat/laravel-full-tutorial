// SOLUTION 02 — TypeScript API Types
// Approach: utility types deep-dive, type guards, and practical usage patterns

// ─────────────────────────────────────────────────────────────────────────────
// RequireFields<T, K> — make specific optional fields required
// ─────────────────────────────────────────────────────────────────────────────

// Goal: RequireFields<Booking, 'school'>
//         → Booking, but school is School (not School | undefined)

// Construction:
//   type RequireFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

// Breaking it down:
//   Pick<T, K>         — extract only the keys K from T
//                        Pick<Booking, 'school'> → { school?: School }
//   Required<Pick<...>> — make all those keys required (remove the ? modifier)
//                        Required<{ school?: School }> → { school: School }
//   Omit<T, K>         — copy T without the keys K (removes the optional version)
//                        Omit<Booking, 'school'> → Booking without school property
//   & intersection     — combine: all base fields + the now-required K fields
//                        Result: full Booking with school: School (required)

// Why Omit first and then re-add with Required:
//   If you just do T & Required<Pick<T, K>>, TypeScript merges optional and required
//   versions of the same key — the optional version "wins" in some cases
//   Omit removes the ambiguity by stripping the key first

// Multiple fields:
//   RequireFields<Booking, 'school' | 'trip'>
//   → Booking with both school: School and trip: Trip required

// ─────────────────────────────────────────────────────────────────────────────
// StringKeys<T> — extract only the keys whose value type is string
// ─────────────────────────────────────────────────────────────────────────────

// Goal: StringKeys<Booking>
//         → 'schoolName' | 'status' | 'createdAt'
//         (NOT 'id' which is number, NOT 'amount' which is number)

// Construction (mapped type + conditional type):
//   type StringKeys<T> = {
//     [K in keyof T]: T[K] extends string ? K : never
//   }[keyof T]

// Breaking it down:
//   [K in keyof T]: T[K] extends string ? K : never
//   — maps over every key K of T
//   — if the value type T[K] extends string → preserve the key name K as the value
//   — otherwise → produce never (a type that disappears in unions)
//   For Booking: { id: never; schoolName: 'schoolName'; amount: never; status: 'status'; createdAt: 'createdAt'; ... }

//   [keyof T]   — index into that mapped type with all keys
//   — produces a union of all values: never | 'schoolName' | never | 'status' | 'createdAt' | ...
//   — never is the identity element of unions (A | never = A), so it drops out
//   — result: 'schoolName' | 'status' | 'createdAt'

// Practical use: when you need a type-safe way to restrict a parameter to
//   only string fields of a model — e.g. a sort-by-text-field function:
//   function sortByString<T>(items: T[], key: StringKeys<T>): T[]

// ─────────────────────────────────────────────────────────────────────────────
// Type guard: isValidationError
// ─────────────────────────────────────────────────────────────────────────────

// A type guard is a function that returns `value is SomeType`
// TypeScript narrows the type in the true branch of the if statement

// isValidationError(res: unknown): res is ValidationErrors
//   — accepts unknown (safe; caller does not need to cast before calling)
//   — checks at runtime that the required fields are present and correctly typed
//   — TypeScript narrows to ValidationErrors in the if-true branch

// Implementation outline (runtime checks):
//   1. typeof res === 'object' && res !== null  → object, not null/primitive
//   2. 'message' in res                         → has a message property
//   3. typeof (res as any).message === 'string' → message is a string
//   Optional: also check errors is object if present

// Usage pattern:
//   try {
//     const data = await fetch(...).then(r => r.json())
//     if (isValidationError(data)) {
//       // data.message and data.errors are fully typed here
//       showErrors(data.errors)
//     } else {
//       // data is ApiResponse<Booking> (or whatever the success type is)
//       setBooking(data.data)
//     }
//   }

// ─────────────────────────────────────────────────────────────────────────────
// Practical: typing a fetch call end-to-end
// ─────────────────────────────────────────────────────────────────────────────

// Step 1: define an async fetchApi utility
//   async function fetchApi<T>(url: string): Promise<ApiState<T>>
//   — T is the expected success data type (e.g. PaginatedResponse<Booking>)
//   — returns ApiState<T> — the caller handles loading / success / error branching

// Step 2: on 2xx response, cast the json to T
//   const json: T = await res.json()
//   — this is a type assertion (trust); validate with a runtime schema if needed (Zod, Yup)

// Step 3: on 4xx/5xx, check if it is a validation error
//   const errJson: unknown = await res.json()
//   if (isValidationError(errJson)) return { status: 'error', error: errJson }
//   return { status: 'error', error: { message: 'Unknown error' } }

// Step 4: usage in a component
//   const [state, setState] = useState<ApiState<PaginatedResponse<Booking>>>({ status: 'loading' })
//   useEffect(() => { fetchApi<PaginatedResponse<Booking>>('/api/bookings').then(setState) }, [])
//   if (state.status === 'loading') return <Spinner />
//   if (state.status === 'error')   return <ErrorMessage message={state.error.message} />
//   // state.status === 'success' — state.data is PaginatedResponse<Booking>
//   return <BookingsTable bookings={state.data.data} meta={state.data.meta} />

// ─────────────────────────────────────────────────────────────────────────────
// Why never use `any` in this type system
// ─────────────────────────────────────────────────────────────────────────────

// `any` disables TypeScript for that value and everything downstream
//   const data: any = await res.json()
//   data.bookigns   ← typo — no error, silently undefined at runtime

// `unknown` is the safe alternative:
//   — TypeScript forces you to narrow or assert before use
//   — Errors surface at compile time, not runtime

// `as SomeType` (type assertion) is sometimes necessary when crossing the JS/TS boundary
//   (fetch, JSON.parse, localStorage) — acceptable when you know the contract
//   — prefer `as SomeType` over `as any as SomeType` (double assertion is a code smell)
//   — add a comment explaining why the assertion is safe when you use it

// Generics propagate types through the call stack automatically:
//   fetchApi<PaginatedResponse<Booking>>() → state.data → state.data.data → Booking[]
//   — zero `any`, zero manual casting in the component
