# Challenge 09 — Re-render Profiler Debug

**Format:** DEBUG
**Topic:** Find and fix unnecessary re-renders using React DevTools Profiler

---

## Context

The Tripz dashboard is sluggish. Teachers report that the bookings table feels slow and unresponsive when they type in the search box. React DevTools Profiler confirms that every single row in `BookingsTable` re-renders whenever **any** booking changes state — even rows whose data has not changed at all.

Your job is to identify the root causes using the Profiler and apply the correct fixes.

---

## Broken Code

```tsx
import { useState } from 'react'

interface Booking {
  id: number
  schoolName: string
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  amount: number
}

interface TableConfig {
  pageSize: number
  sortable: boolean
  selectable: boolean
}

// Parent component — re-renders often (search input causes state change on every keystroke)
function BookingsDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState('all')
  const [searchText, setSearchText] = useState('')

  // Bug 1: new function reference on every render
  const handleConfirm = (id: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
  }

  // Bug 2: new object reference on every render
  const tableConfig = {
    pageSize: 15,
    sortable: true,
    selectable: false,
  }

  return (
    <div>
      <input value={searchText} onChange={e => setSearchText(e.target.value)} />
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="pending">Pending</option>
      </select>
      <BookingsTable
        bookings={bookings}
        onConfirm={handleConfirm}
        config={tableConfig}
      />
    </div>
  )
}

// Child — re-renders on every parent render
function BookingsTable({ bookings, onConfirm, config }) {
  console.log('BookingsTable rendered')
  return (
    <table>
      <tbody>
        {bookings.map(b => (
          <BookingRow key={b.id} booking={b} onConfirm={onConfirm} />
        ))}
      </tbody>
    </table>
  )
}

// Row — re-renders even when its booking didn't change
function BookingRow({ booking, onConfirm }) {
  console.log(`BookingRow ${booking.id} rendered`)
  return (
    <tr>
      <td>{booking.schoolName}</td>
      <td>{booking.status}</td>
      <td>
        <button onClick={() => onConfirm(booking.id)}>Confirm</button>
      </td>
    </tr>
  )
}
```

---

## Requirements

1. Identify **all bugs** causing unnecessary re-renders. There are at least **3 distinct issues** across the three components.
2. Fix each bug using the appropriate React hook or pattern.
3. After your fix, typing in the search box should **not** cause `BookingsTable` or any `BookingRow` to re-render (assuming `bookings` state has not changed).
4. Confirming a single booking should re-render **only** the one `BookingRow` whose data actually changed.
5. Do **not** change the component structure or the props interface — only add/adjust hooks and wrap components.

---

## How to Detect the Problem

- Open React DevTools → **Profiler** tab
- Click **Record**, interact with the search input, click **Stop**
- Components highlighted in the flame graph are ones that re-rendered
- Toggle **"Highlight updates when components render"** in DevTools settings for a live view
- `console.log` statements in `BookingsTable` and `BookingRow` will fire on every re-render — watch the console as you type

---

## Expected Output

After fixes:
- Typing in the search box: `BookingsDashboard` re-renders (owns `searchText` state), but `BookingsTable` and all `BookingRow` components do **not** re-render.
- Confirming booking id=5: only `BookingRow` for id=5 re-renders. All other rows stay unchanged.
- The Profiler flame graph shows grey (no re-render) for unaffected rows.

---

## Hints

- `useCallback` stabilises function references across renders
- `useMemo` stabilises object/array references across renders
- `React.memo` prevents a component from re-rendering when its props have not changed (by reference)
- All three tools must work **together** — `React.memo` alone is not enough if the props passed in are new references every render
- Moving a constant object **outside** the component body is sometimes simpler than `useMemo`
