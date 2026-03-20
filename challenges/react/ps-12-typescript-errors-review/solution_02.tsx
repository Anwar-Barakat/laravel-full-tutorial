// SOLUTION 02 — TypeScript Errors Review
// Approach: fix Errors 6–10, explain cascades, and state the golden rules

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 6 — b is 'never' inside filter callback
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Property 'status' does not exist on type 'never'."
// Location: bookings.filter(b => b.status === status)

// Why: this is a cascade from Error 2
//   When bookings is typed as never[], the element type of .filter(b => ...) is never
//   never has no properties — accessing b.status on never is an error
//   TypeScript is correct: a never[] cannot contain any element, so b is never

// Fix: fix Error 2 (useState<Booking[]>([]))
//   With bookings typed as Booking[], the element type is Booking
//   b.status is now Booking['status'] — valid, no error
//   This error requires zero additional changes beyond the Error 2 fix

// Lesson: TypeScript errors often cascade — fix the root cause, not the symptom
//   Always trace "never" or "any" errors back to where the type originated

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 7 — formatAmount parameter not typed
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Parameter 'booking' implicitly has an 'any' type."
// Location: function formatAmount(booking)

// Why: same pattern as Errors 1 and 5 — implicit any in strict mode

// Fix: type the parameter as Booking
//   function formatAmount(booking: Booking)
//   — booking.amount is now known to be number
//   — .toFixed(2) is a valid method on number
//   — TypeScript will also catch any future code that passes the wrong type to this function

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 8 — b.school is possibly undefined
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Object is possibly 'undefined'."
// Location: bookings.map(b => b.school.name)
//   school is typed as School | undefined (optional field: school?: School)
//   Accessing .name on School | undefined fails — undefined has no .name

// Fix option A — optional chaining (returns undefined when school is absent):
//   bookings.map(b => b.school?.name)
//   — result type: (string | undefined)[]
//   — safe: returns undefined instead of throwing at runtime
//   — correct when undefined is an acceptable value in the resulting array

// Fix option B — filter before map (narrow the type):
//   bookings
//     .filter((b): b is Booking & { school: School } => b.school !== undefined)
//     .map(b => b.school.name)
//   — the type predicate (b is Booking & { school: School }) tells TypeScript that
//     school is definitely present after the filter
//   — result type: string[] (no undefined in the array)
//   — correct when you only want bookings that have a school

// Fix option C — non-null assertion (only if you are certain school is always present here):
//   bookings.map(b => b.school!.name)
//   — the ! tells TypeScript "trust me, this is not undefined"
//   — unsafe: if school IS undefined at runtime, this throws a TypeError
//   — only use when the business logic guarantees school is present (e.g. after a server
//     query that always includes the school relationship)

// Recommendation: use option A (optional chaining) by default; use option B when you
// need a clean string[] without undefined entries

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 9 — string is not a valid index for the colors object
// ─────────────────────────────────────────────────────────────────────────────

// TS error: "Element implicitly has an 'any' type because expression of type 'string'
//            can't be used to index type '{ pending: string; confirmed: string; }'."
// Location: colors[status] where status: string

// Why: TypeScript infers the type of colors as { pending: string; confirmed: string }
//   The two allowed keys are the literal types 'pending' and 'confirmed'
//   Indexing with a plain string is rejected because TypeScript cannot guarantee
//   the string is one of those two values — it could be anything

// Fix option A — use Record<Booking['status'], string>:
//   const colors: Record<Booking['status'], string> = {
//     pending: 'yellow', confirmed: 'blue', paid: 'green', cancelled: 'red'
//   }
//   — Booking['status'] is the key type: 'pending' | 'confirmed' | 'paid' | 'cancelled'
//   — TypeScript now knows every valid status has a colour entry
//   — colors[status] where status: Booking['status'] is valid — no error
//   — TypeScript also enforces completeness: all four statuses must have an entry
//     (omitting any one of them would be a compile error)

// Fix option B — change the function parameter type to Booking['status']:
//   function getStatusColor(status: Booking['status'])
//   — narrows the parameter from string to the specific union
//   — the object literal's inferred key type now matches
//   — less explicit than option A but also correct

// Recommendation: option A is better — it documents intent clearly and enforces
// that all statuses are handled (exhaustiveness check at the type level)

// ─────────────────────────────────────────────────────────────────────────────
// ERROR 10 — style.color receives wrong type from getStatusColor
// ─────────────────────────────────────────────────────────────────────────────

// TS error: (cascade from Error 9) getStatusColor returns string | undefined
//   style={{ color: ... }} expects color: string | undefined (CSSProperties.color)
//   With the broken colors object (implicit any index) the return type could be any
//   Some TypeScript configurations flag this as an error

// Why it is a cascade:
//   If colors is typed as { pending: string; confirmed: string } and you index with string,
//   the return type is string — but only because TypeScript widens it to match the object values
//   In strict configurations or with noUncheckedIndexedAccess, the return type becomes
//   string | undefined (the key might not exist)

// Fix: fix Error 9 (Record<Booking['status'], string> for colors)
//   — with a complete Record, TypeScript knows every valid status has a string colour
//   — getStatusColor(status: Booking['status']) always returns string (not string | undefined)
//   — style={{ color: getStatusColor(b.status) }} compiles cleanly

// ─────────────────────────────────────────────────────────────────────────────
// GOLDEN RULES — TypeScript in React components
// ─────────────────────────────────────────────────────────────────────────────

// 1. Never use `any`
//    — use unknown at trust boundaries (fetch, localStorage, third-party callbacks)
//    — use generics to propagate types through the call stack
//    — use type guards to narrow unknown at runtime

// 2. Always provide explicit generic arguments to useState when the initial value
//    does not carry enough information (null, [], 0 are all ambiguous)

// 3. Use Booking['status'] instead of repeating the literal union
//    — single source of truth; updating the interface updates all usages

// 4. Trace cascade errors to their root cause
//    — never → find where the type was narrowed to never (usually a missing generic)
//    — any → find where the any was introduced (fetch boundary, missing type annotation)

// 5. Optional chaining (?.) over non-null assertion (!)
//    — ?. is safe and expressive; ! is a promise to TypeScript that can fail at runtime
//    — only use ! when the invariant is guaranteed by business logic and documented

// 6. Record<K, V> for lookup tables with enum-like keys
//    — TypeScript enforces completeness (all keys must be present)
//    — indexing with a value of type K is always safe (no string index issues)
