// SOLUTION 01 — TypeScript API Types
// Approach: build the type system bottom-up, from primitives to generics to utilities

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — ApiResponse<T>: generic wrapper for single-resource endpoints
// ─────────────────────────────────────────────────────────────────────────────

// The simplest generic — T is whatever data the endpoint returns
//   type ApiResponse<T> = { data: T }
// Usage:
//   ApiResponse<Booking>       → { data: Booking }
//   ApiResponse<Booking[]>     → { data: Booking[] }
//   ApiResponse<void>          → { data: void }  (for 204 No Content, or just use `void` directly)

// Why a type alias (type) rather than an interface here:
//   Both work for this shape, but type aliases compose better with generics and unions
//   Interfaces can be extended and merged; type aliases cannot be accidentally merged
//   Use interface when you want a named contract that consumers extend
//   Use type when you want a computed or composed shape

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — PaginationMeta and PaginatedResponse<T>
// ─────────────────────────────────────────────────────────────────────────────

// PaginationMeta is a standalone interface (reusable, can be checked with type guard)
//   interface PaginationMeta { total: number; page: number; per_page: number; last_page: number }

// PaginatedResponse<T> extends ApiResponse<T[]> and adds meta
//   type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta }
// Or as an explicit type:
//   type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta }

// Why T[] and not just T:
//   Paginated endpoints always return arrays; making T[] explicit at the wrapper level
//   means callers write PaginatedResponse<Booking> (not PaginatedResponse<Booking[]>)
//   which reads more naturally and prevents double-array mistakes

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Booking interface: base type with all standard fields
// ─────────────────────────────────────────────────────────────────────────────

// interface Booking {
//   id:          number
//   schoolName:  string
//   amount:      number
//   status:      'pending' | 'confirmed' | 'paid' | 'cancelled'   ← literal union, not string
//   createdAt:   string             ← ISO date string from the API
//   school?:     School             ← optional relationship
//   payments?:   Payment[]          ← optional relationship
//   trip?:       Trip               ← optional relationship
// }

// Why status is a literal union, not string:
//   — TypeScript can check exhaustiveness in switch/if statements
//   — Prevents typos: status === 'comfirmed' is a compile error
//   — Enables Booking['status'] as a reusable type for filter parameters

// Why createdAt is string, not Date:
//   JSON has no Date type; JSON.parse returns strings for ISO dates
//   Parse to Date inside the application layer, not at the API type level
//   Using Date here would create a false contract (the raw API value is always a string)

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — BookingWith<T>: conditional intersection type
// ─────────────────────────────────────────────────────────────────────────────

// Goal: BookingWith<'school'>           → Booking & { school: School }
//       BookingWith<'payments'>         → Booking & { payments: Payment[] }
//       BookingWith<'school' | 'trip'>  → Booking & { school: School } & { trip: Trip }

// Approach 1 — mapped type with conditional lookup, then intersection via distributive mapped type:
//   type IncludeMap = {
//     school:   { school:   School }
//     payments: { payments: Payment[] }
//     trip:     { trip:     Trip }
//   }
//   type BookingWith<T extends keyof IncludeMap> = Booking & UnionToIntersection<IncludeMap[T]>
//   where UnionToIntersection converts a union of objects to an intersection

// Approach 2 — simpler, without UnionToIntersection (works when T is a union key):
//   type BookingWith<T extends 'school' | 'payments' | 'trip'> =
//     Booking
//     & (T extends 'school'   ? { school:   School    } : unknown)
//     & (T extends 'payments' ? { payments: Payment[] } : unknown)
//     & (T extends 'trip'     ? { trip:     Trip      } : unknown)
//   — each conditional contributes its field only when T includes that variant
//   — intersecting with `unknown` is identity (A & unknown = A) so unused branches vanish
//   — when T = 'school' | 'trip': all three conditions evaluate, school and trip are required,
//     payments contribution is unknown (drops out)

// The fields become REQUIRED (not optional) because the intersection adds them
// at the type level without the ? modifier — the include param guarantees presence

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — ValidationErrors: Laravel validation error shape
// ─────────────────────────────────────────────────────────────────────────────

// Laravel returns { message: string, errors: { fieldName: [errorMsg, ...], ... } }
// interface ValidationErrors {
//   message: string
//   errors?: Record<string, string[]>
// }
// errors is optional because non-validation errors (500, 404) return only message

// Record<string, string[]> means: an object with any string keys, each mapping to string[]
// — key is the field name: 'email', 'booking_date', etc.
// — value is an array of error messages for that field

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — ApiState<T>: discriminated union for async state
// ─────────────────────────────────────────────────────────────────────────────

// type ApiState<T> =
//   | { status: 'loading' }
//   | { status: 'success'; data: T }
//   | { status: 'error';   error: ValidationErrors }

// The discriminant is status — TypeScript narrows to the right variant in if/switch:
//   if (state.status === 'success') state.data  ← available, typed as T
//   if (state.status === 'error')   state.error ← available, typed as ValidationErrors
//   if (state.status === 'loading') state.data  ← TS error: property does not exist

// Practical usage with useFetch:
//   const [state, setState] = useState<ApiState<PaginatedResponse<Booking>>>({ status: 'loading' })
//   — reading state.data is only allowed after narrowing to status === 'success'
//   — no need for separate isLoading / isError booleans and optional data fields

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — useFetch usage example (comment only, no implementation)
// ─────────────────────────────────────────────────────────────────────────────

// const { data, error, loading } = useFetch<PaginatedResponse<Booking>>('/api/bookings')
// — T = PaginatedResponse<Booking>
// — data is typed as PaginatedResponse<Booking> | undefined
// — data.data is Booking[]
// — data.meta is PaginationMeta
// — No `any` anywhere; all fields are inferred from the generic chain
