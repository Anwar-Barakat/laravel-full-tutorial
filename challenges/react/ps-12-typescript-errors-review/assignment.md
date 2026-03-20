# Challenge 12 — TypeScript Errors Review

**Format:** REVIEW
**Topic:** Fix TypeScript errors in a React component

---

## Context

A junior developer on the Tripz team wrote the `BookingList` component in plain JavaScript and then added TypeScript. The file now has **10 TypeScript errors** (red squiggles in VS Code). The component itself is logically correct — it just needs proper types applied.

Your job is to fix every error without using `any` or `@ts-ignore`. For each fix, explain *why* the error occurred and *what* the correct type is.

---

## Available Types

```typescript
interface Booking {
  id: number
  schoolName: string
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  createdAt: string
  school?: School
}

interface School {
  id: number
  name: string
  region: string
}

interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    per_page: number
    last_page: number
  }
}
```

---

## Broken Code (10 TypeScript Errors)

```tsx
import { useState, useEffect } from 'react'

function BookingList({ onSelect }) {                        // Error 1
  const [bookings, setBookings] = useState([])             // Error 2
  const [selected, setSelected] = useState(null)           // Error 3

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    const res  = await fetch('/api/bookings')
    const data = await res.json()
    setBookings(data.bookings)                             // Error 4
  }

  function handleStatusFilter(status) {                    // Error 5
    return bookings.filter(b => b.status === status)       // Error 6
  }

  function formatAmount(booking) {                         // Error 7
    return booking.amount.toFixed(2)
  }

  const schools = bookings.map(b => b.school.name)         // Error 8

  function getStatusColor(status: string) {
    const colors = { pending: 'yellow', confirmed: 'blue' }
    return colors[status]                                  // Error 9
  }

  return (
    <div>
      {bookings.map(b => (
        <div key={b.id} onClick={() => onSelect(b)}>
          <span>{b.schoolName}</span>
          <span style={{ color: getStatusColor(b.status) }}>  {/* Error 10 */}
            {b.status}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

## Requirements

Fix all 10 errors. The rules are:

1. **No `any`** — not in type assertions, function parameters, or generic arguments.
2. **No `@ts-ignore` or `@ts-expect-error`** comments.
3. **No non-null assertion operator (`!`)** unless the value genuinely cannot be null/undefined at that point (justify it if you use it).
4. The component's runtime behaviour must remain **identical** — do not change what the component does, only its types.
5. For each error, state: the error message TypeScript would show, and the fix applied.

---

## Error Reference Table

| # | Location | What TypeScript complains about |
|---|----------|--------------------------------|
| 1 | `{ onSelect }` | Parameter implicitly has `any` type |
| 2 | `useState([])` | State inferred as `never[]` |
| 3 | `useState(null)` | State inferred as `null`, not `Booking \| null` |
| 4 | `data.bookings` | `data` is `any`; `bookings` property untyped |
| 5 | `handleStatusFilter(status)` | Parameter implicitly has `any` type |
| 6 | `b.status === status` | `b` is `never` (cascade from Error 2) |
| 7 | `formatAmount(booking)` | Parameter implicitly has `any` type |
| 8 | `b.school.name` | Object is possibly `undefined` (`school` is optional) |
| 9 | `colors[status]` | Element implicitly has `any` type — `string` is not a valid index for this object |
| 10 | `style={{ color: getStatusColor(b.status) }}` | `color` expects `string \| undefined`, but `getStatusColor` may return `any` (cascade from Error 9) |

---

## Expected Output

After all fixes, the file compiles with zero TypeScript errors. The component:
- Accepts `onSelect: (booking: Booking) => void` as a typed prop
- Stores `Booking[]` state (not `never[]`)
- Stores `Booking | null` for the selected booking
- Fetches and correctly types the API response
- Filters bookings by a properly typed status value
- Handles the optional `school` field safely
- Returns a properly typed colour string from `getStatusColor`

---

## Hints

- Errors 2 and 6 are connected — fixing Error 2 automatically resolves Error 6.
- Errors 9 and 10 are connected — fixing the `colors` object type resolves both.
- For Error 4: type the `data` variable as `ApiResponse<{ bookings: Booking[] }>` or use a type assertion (`as`) sparingly and with a comment justifying it.
- For Error 8: use optional chaining (`b.school?.name`) or pre-filter the array.
- For Error 9: change `colors` from an object literal to `Record<Booking['status'], string>` — this tells TypeScript the key type is the status union, not a plain `string`.
- `Booking['status']` is the same as `'pending' | 'confirmed' | 'paid' | 'cancelled'` — index into the interface for reuse.
