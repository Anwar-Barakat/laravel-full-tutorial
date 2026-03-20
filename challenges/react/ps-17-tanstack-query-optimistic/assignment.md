# Challenge 17 — TanStack Query with Optimistic Updates

**Format:** BUILD
**Topic:** Replace manual fetch + useState with TanStack Query (React Query), including optimistic updates for status changes.

---

## Context

You are working on the **Tripz** school booking platform. The `BookingsPage` component currently manages all server state manually using `useState` and `useEffect`. This approach has no caching, no background refetching, and no rollback on error — as shown in the current status confirm handler.

---

## Current Code (to replace)

```tsx
// Before — manual state management
function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => { setBookings(data.data); setIsLoading(false) })
      .catch(e => { setError(e.message); setIsLoading(false) })
  }, [])

  async function confirmBooking(id: number) {
    // Optimistically set confirmed — but no rollback if the request fails
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
    await fetch(`/api/bookings/${id}/confirm`, { method: 'POST' })
    // Bug: no rollback on error
  }
}
```

---

## Types

```typescript
type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

interface Booking {
  id: number
  schoolName: string
  date: string
  status: BookingStatus
  studentCount: number
}

interface BookingFilters {
  status?: BookingStatus
  schoolId?: number
  dateFrom?: string
  dateTo?: string
}

interface BookingsResponse {
  data: Booking[]
  meta: {
    total: number
    page: number
    perPage: number
  }
}
```

---

## Requirements

Replace the manual implementation with TanStack Query. Your solution must include:

1. **`useQuery` for the bookings list** — with `BookingFilters` as part of the query key so the cache is filter-aware
2. **`useQuery` for a single booking detail** — conditionally enabled when an `id` is present
3. **`useMutation` for confirming a booking** — with a full optimistic update cycle:
   - Cancel any in-flight queries before mutating
   - Snapshot the previous cache value
   - Update the cache immediately (before the server responds)
   - On error: restore from the snapshot
   - On settled: invalidate to sync with true server state
4. **`useMutation` for deleting a booking** — immediately remove the booking from the list cache
5. **Query invalidation** after mutations so the UI stays in sync
6. **Query key factory** using the pattern below

### Query Key Factory (required shape)

```typescript
const bookingKeys = {
  all:    () => ['bookings'] as const,
  list:   (filters: BookingFilters) => [...bookingKeys.all(), 'list', filters] as const,
  detail: (id: number) => [...bookingKeys.all(), 'detail', id] as const,
}
```

---

## Expected Behaviour

| Action | Cache behaviour |
|---|---|
| Page load | Fetch bookings list; cache for 30 s |
| Change filter | New cache entry per filter shape |
| Confirm booking | Status flips immediately; reverts if API fails |
| Delete booking | Row disappears immediately from list |
| Any mutation settles | Invalidate all booking queries to refetch |

---

## Starter Shell

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// TODO: define bookingKeys factory

// TODO: define API functions
async function fetchBookings(filters: BookingFilters): Promise<BookingsResponse> {
  throw new Error('Not implemented')
}

async function fetchBooking(id: number): Promise<Booking> {
  throw new Error('Not implemented')
}

async function confirmBookingApi(id: number): Promise<Booking> {
  throw new Error('Not implemented')
}

async function deleteBookingApi(id: number): Promise<void> {
  throw new Error('Not implemented')
}

// TODO: implement BookingsPage using useQuery + useMutation
export function BookingsPage() {
  return <div>Replace me</div>
}

// TODO: implement useBookingDetail hook with conditional query
export function useBookingDetail(id: number | null) {
  // ...
}
```
