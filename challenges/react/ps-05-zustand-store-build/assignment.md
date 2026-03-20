# Challenge 05 — Zustand Store Build

**Format:** BUILD
**Topic:** Build a Zustand store for booking management
**App:** Tripz — Laravel + React school booking platform

---

## Context

The Tripz frontend needs a centralised state layer for booking management. You have been asked to build a Zustand store from scratch that handles all booking data, async operations, filtering, and optimistic updates.

---

## Types

```typescript
interface Booking {
  id: number
  schoolName: string
  destination: string
  studentCount: number
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  createdAt: string
}

interface BookingFilters {
  status: string
  search: string
  page: number
  perPage: number
}
```

---

## Store Requirements

Implement the following store shape in full:

```typescript
interface BookingStore {
  // State
  bookings:    Booking[]
  isLoading:   boolean
  error:       string | null
  filters:     BookingFilters
  total:       number

  // Actions
  fetchBookings:  (overrideFilters?: Partial<BookingFilters>) => Promise<void>
  createBooking:  (data: Omit<Booking, 'id' | 'createdAt'>) => Promise<Booking | null>
  updateBooking:  (id: number, data: Partial<Booking>) => Promise<void>
  deleteBooking:  (id: number) => Promise<void>
  setFilter:      (key: keyof BookingFilters, value: string | number) => void
  clearFilters:   () => void

  // Derived (computed via selectors — implement outside the store)
  // paidBookings      → Booking[]
  // pendingCount      → number
}
```

---

## Detailed Requirements

### 1. fetchBookings
- Set `isLoading: true` at start
- Merge `overrideFilters` with current `filters` from store
- Call `GET /api/bookings?status=...&search=...&page=...&perPage=...`
- On success: set `bookings` and `total` from response
- On error: set `error` with the error message
- Always: set `isLoading: false` in `finally`

### 2. createBooking
- Set `isLoading: true`
- POST to `/api/bookings` with the data
- On success: append the new booking to `bookings`, return it
- On error: set `error`, return `null`
- Always: set `isLoading: false`

### 3. updateBooking — Optimistic Update
- Save the original booking before making changes
- Immediately update the booking in `bookings` array in state
- Await the PATCH request to `/api/bookings/:id`
- If the request fails: restore the original booking in state, set `error`

### 4. deleteBooking — Optimistic Update
- Save the full bookings list before deletion
- Immediately remove the booking from `bookings` in state
- Await the DELETE request to `/api/bookings/:id`
- If the request fails: restore the original list, set `error`

### 5. setFilter
- Update the given filter key with the new value
- Always reset `page` back to `1` when any filter changes

### 6. clearFilters
- Reset filters to defaults: `{ status: '', search: '', page: 1, perPage: 10 }`

### 7. Selectors (outside the store)
- `usePaidBookings`: returns bookings where status === 'paid'
- `usePendingCount`: returns count of bookings where status === 'pending'
- Implement using `useBookingStore(state => ...)` selector form

---

## Starter Code (incomplete / broken)

```typescript
import { create } from 'zustand'

// TODO: fill in the missing types
interface BookingStore {
  bookings: Booking[]
  isLoading: boolean
  // ... rest of state

  fetchBookings: () => Promise<void>  // missing overrideFilters param
  // ... rest of actions
}

export const useBookingStore = create<BookingStore>((set) => ({
  bookings: [],
  isLoading: false,
  error: null,
  filters: { status: '', search: '', page: 1, perPage: 10 },
  total: 0,

  fetchBookings: async () => {
    // BUG: no isLoading toggle
    // BUG: not reading filters from store
    // BUG: no error handling
    const res = await fetch('/api/bookings')
    const data = await res.json()
    set({ bookings: data.data })
  },

  createBooking: async (data) => {
    // TODO: implement
  },

  updateBooking: async (id, data) => {
    // BUG: no optimistic update — waits for server before updating UI
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    // TODO: update local state after response
  },

  deleteBooking: async (id) => {
    // BUG: no optimistic update
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    // TODO: update local state after response
  },

  setFilter: (key, value) => {
    // BUG: does not reset page to 1
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
  },

  clearFilters: () => {
    set({ filters: { status: '', search: '', page: 1, perPage: 10 } })
  },
}))

// TODO: implement selectors outside the store
```

---

## Expected Output

After implementation, consuming components should work like this:

```typescript
// In a component:
const { bookings, isLoading, fetchBookings } = useBookingStore()

useEffect(() => {
  fetchBookings({ status: 'pending' })
}, [])

// Optimistic delete — UI updates immediately, no spinner needed
const handleDelete = (id: number) => {
  deleteBooking(id)  // UI removes card instantly; reverts if API fails
}

// Selectors — no re-render unless paid bookings actually change
const paidBookings = usePaidBookings()
const pendingCount = usePendingCount()
```

---

## What to Submit

A single file `useBookingStore.ts` containing:
1. The complete Zustand store with all actions implemented
2. The `usePaidBookings` and `usePendingCount` selector hooks below the store
