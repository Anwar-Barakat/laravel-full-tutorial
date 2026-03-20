# Challenge 11 — TypeScript API Types

**Format:** BUILD
**Topic:** Type a complex API response with TypeScript generics and utility types

---

## Context

The Tripz backend is a Laravel API. Every endpoint returns a consistent JSON envelope. The frontend team is currently using `any` throughout the API layer, which means TypeScript offers no protection against typos, missing fields, or malformed responses.

Your job is to build a complete, reusable type system for the API layer — using generics, utility types, and conditional/mapped types — so that the entire data flow from `fetch()` to component props is fully typed.

---

## API Response Shapes

```
GET  /api/bookings        → { data: Booking[], meta: { total, page, per_page, last_page } }
GET  /api/bookings/42     → { data: Booking }
POST /api/bookings        → { data: Booking }
DELETE /api/bookings/42   → 204 No Content (no body)

Error (4xx / 5xx):
{
  message: string,
  errors?: Record<string, string[]>   ← Laravel validation errors
}

Booking with optional relationships:
  ?include=school    → booking.school is present (School object)
  ?include=payments  → booking.payments is present (Payment[])
  ?include=trip      → booking.trip is present (Trip object)
  No include param   → those fields are undefined
```

---

## Starter Code (Incomplete / Broken)

```typescript
// TODO: implement all of the types below.
// Do NOT use `any` anywhere.

// 1. Generic API response wrapper — used for single-resource endpoints
type ApiResponse<T> = // ...

// 2. Paginated response — used for list endpoints
type PaginatedResponse<T> = // ...

// 3. Pagination metadata
interface PaginationMeta {
  // ...
}

// 4. Booking base type — always present regardless of includes
interface Booking {
  // ...
}

// 5. Related models
interface School {
  // ...
}

interface Payment {
  // ...
}

interface Trip {
  // ...
}

// 6. Booking with optional includes — use TypeScript generics/conditional types
//    BookingWith<'school'>            → Booking & { school: School }
//    BookingWith<'payments'>          → Booking & { payments: Payment[] }
//    BookingWith<'school' | 'trip'>   → Booking & { school: School } & { trip: Trip }
type BookingWith<T extends 'school' | 'payments' | 'trip'> = // ...

// 7. Laravel validation error shape
interface ValidationErrors {
  // ...
}

// 8. Utility: make specific fields required on a type that might have them optional
//    RequireFields<Booking, 'school'>  →  Booking with school: School (not School | undefined)
type RequireFields<T, K extends keyof T> = // ...

// 9. Utility: extract only the keys of T whose value type is string
//    StringKeys<Booking>  →  'schoolName' | 'status' | 'createdAt'  (not 'id' | 'amount')
type StringKeys<T> = // ...

// 10. API state — discriminated union for loading / success / error
type ApiState<T> = // ...
```

---

## Requirements

1. `ApiResponse<T>` must wrap any single resource (`{ data: T }`).
2. `PaginatedResponse<T>` must extend `ApiResponse<T[]>` and add a `meta` field.
3. `Booking` must include at least: `id`, `schoolName`, `amount`, `status` (literal union), `createdAt`, and the three optional relationship fields.
4. `BookingWith<T>` must correctly intersect the right relationship fields based on the union passed in. `BookingWith<'school' | 'trip'>` should give both `school` and `trip` as **required** (not optional).
5. `RequireFields<T, K>` must use `Omit` + `Required` + `Pick`.
6. `StringKeys<T>` must use a mapped type with a conditional.
7. `ApiState<T>` must be a discriminated union with three variants: `loading`, `success`, and `error` — each with a different `status` literal.
8. Write a **type guard function** `isValidationError(res: unknown): res is ValidationErrors`.
9. Show a usage example for `useFetch<PaginatedResponse<Booking>>()` (comment or type annotation only — no implementation needed).

---

## Expected Output

The following must compile without errors:

```typescript
// Single booking fetch
const single: ApiResponse<Booking> = { data: { id: 1, schoolName: 'City School', amount: 250, status: 'pending', createdAt: '2025-01-01' } }

// Paginated list
const list: PaginatedResponse<Booking> = {
  data: [],
  meta: { total: 0, page: 1, per_page: 15, last_page: 1 },
}

// Booking with school included
const withSchool: ApiResponse<BookingWith<'school'>> = {
  data: {
    id: 1, schoolName: 'City School', amount: 250, status: 'confirmed', createdAt: '2025-01-01',
    school: { id: 10, name: 'City School', region: 'London' },
  },
}

// RequireFields usage
type BookingWithRequiredSchool = RequireFields<Booking, 'school'>

// StringKeys usage — must equal 'schoolName' | 'status' | 'createdAt'
type BookingStringKeys = StringKeys<Booking>
```

---

## Hints

- For `BookingWith<T>`: a mapped type `{ [K in T]: ... }[T]` combined with a lookup produces intersection types.
- For `RequireFields`: combine `Omit<T, K>` (remove the optional keys) with `Required<Pick<T, K>>` (make those keys required again).
- For `StringKeys`: `{ [K in keyof T]: T[K] extends string ? K : never }[keyof T]`
- For `ApiState`: the discriminant field is `status: 'loading' | 'success' | 'error'` — TypeScript narrows to the right variant in `if/switch` blocks.
- A type guard returns `res is ValidationErrors` and checks `typeof res === 'object'` and `'message' in res`.
