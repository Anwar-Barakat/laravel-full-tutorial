// SOLUTION 01 — TypeScript Errors Review
// Approach: fix Errors 1–5, explain the chain between related errors

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 1 — onSelect not typed (implicit any on function prop)
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Parameter 'onSelect' implicitly has an 'any' type."
// Location: function BookingList({ onSelect })

// Why: TypeScript does not know what type onSelect is — it could be anything
// In strict mode (noImplicitAny), TypeScript refuses to assume any for untyped params

// Fix: add an explicit type annotation to the destructured props
//   Define a Props interface:
//     interface Props { onSelect: (booking: Booking) => void }
//   Then type the component:
//     function BookingList({ onSelect }: Props)
//   Or inline:
//     function BookingList({ onSelect }: { onSelect: (booking: Booking) => void })

// Why (booking: Booking) => void:
//   — the component calls onSelect(b) where b is a Booking
//   — the return value is ignored → void
//   — using void (not undefined) allows the caller to return any value — they are not forced to return undefined

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 2 — useState([]) inferred as never[]
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Type 'Booking' is not assignable to type 'never'." (or similar, cascades)
// Location: const [bookings, setBookings] = useState([])

// Why: TypeScript infers the type of useState from its initial value
//   useState([]) → TypeScript sees an empty array, infers never[] (the empty array type)
//   never[] means "an array that can never contain any value"
//   setBookings(data.bookings) fails because Booking is not assignable to never

// Fix: provide an explicit generic argument to useState:
//   const [bookings, setBookings] = useState<Booking[]>([])
//   — tells TypeScript: this is an array of Booking objects, initialised as empty
//   — setBookings(data.bookings) works when data.bookings is Booking[]

// Note: this is the most important fix in the file — it is the root cause of Error 6 as well

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 3 — useState(null) inferred as null, not Booking | null
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Type 'Booking' is not assignable to type 'null'." (when setSelected is called)
// Location: const [selected, setSelected] = useState(null)

// Why: TypeScript infers useState(null) as useState<null>
//   The state can only ever be null — setSelected(someBooking) would be rejected

// Fix: provide the union type as the generic:
//   const [selected, setSelected] = useState<Booking | null>(null)
//   — initial value null is valid (null extends Booking | null)
//   — setSelected(booking) and setSelected(null) are both valid

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 4 — res.json() returns any, data.bookings is untyped
// ─────────────────────────────────────────────────────────────────────────────

// TS error: (no explicit error here in default strict mode — data is `any`)
// But: any spreads through the codebase; setBookings(data.bookings) receives any
// In stricter ESLint configs (no-unsafe-assignment) this would be a lint error

// Why: fetch().then(r => r.json()) returns Promise<any>
//   TypeScript does not know the shape of the JSON — it trusts the caller to type it

// Fix option A — type the variable:
//   const data: ApiResponse<{ bookings: Booking[] }> = await res.json()
//   — explicit contract; TypeScript now knows data.bookings is Booking[]
//   — this is a type assertion (the JSON might not match at runtime)
//   — accept this at the API boundary and validate with Zod if paranoia is needed

// Fix option B — type assertion:
//   const data = await res.json() as ApiResponse<{ bookings: Booking[] }>
//   — same outcome, slightly different syntax; use the variable annotation (option A) for clarity

// Then:
//   setBookings(data.data.bookings)   if the response is { data: { bookings: [...] } }
//   or
//   setBookings(data.bookings)        if the response is { bookings: [...] } directly
//   — adjust the property access to match the actual API shape

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 5 — handleStatusFilter parameter not typed
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Parameter 'status' implicitly has an 'any' type."
// Location: function handleStatusFilter(status)

// Why: same as Error 1 — strict mode does not allow implicit any on parameters

// Fix: type status using Booking['status'] (index into the interface)
//   function handleStatusFilter(status: Booking['status'])
//   — Booking['status'] evaluates to 'pending' | 'confirmed' | 'paid' | 'cancelled'
//   — TypeScript then knows that b.status === status is a valid comparison between two
//     values of the same literal union type
//   — callers passing an invalid string are caught at compile time

// Why Booking['status'] instead of string:
//   — string would accept any string including typos like 'comfirmed'
//   — Booking['status'] is narrower, reuses the type from the interface (single source of truth)
//   — if you add 'waitlisted' to the Booking.status union, all usages of Booking['status'] update automatically
