# Challenge 16: Navigation & URL Params Debug (DEBUG)

**Topic:** Fix navigation and URL params bugs in React Router

**Context:** Tripz — Laravel + React school booking platform

---

## Task

The components below have bugs causing wrong data to load, broken navigation, and state that does not survive page refresh. Find and fix all 4 bugs.

---

## Broken Code

```tsx
// Bug 1: Route params not updating component when navigating between bookings
function BookingDetail() {
  const { id } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(res => res.json())
      .then(setBooking)
  }, [])  // ← suspect

  return <div>{booking?.schoolName}</div>
}

// Bug 2: Programmatic navigation loses search params
function BookingFilters() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('all')

  function applyFilters() {
    navigate('/bookings')  // ← suspect
  }

  return (
    <select value={status} onChange={e => setStatus(e.target.value)}>
      <option value="all">All</option>
      <option value="pending">Pending</option>
    </select>
  )
}

// Bug 3: Back button goes to wrong page after form submit
function CreateBooking() {
  const navigate = useNavigate()

  async function handleSubmit(data: BookingFormData) {
    const res = await fetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) })
    const booking = await res.json()
    navigate(`/bookings/${booking.id}`)  // ← suspect
  }

  return <BookingForm onSubmit={handleSubmit} />
}

// Bug 4: Page number not reflected in URL
function BookingList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)  // ← suspect

  function handlePageChange(newPage: number) {
    setPage(newPage)  // ← suspect
  }

  return <Pagination page={page} onChange={handlePageChange} />
}
```

---

## Requirements

- Identify the root cause of each bug with a clear explanation
- Write the corrected version of each component
- Ensure fixes make the URL the single source of truth for shareable state

---

## Hints

- Bug 1: Navigate from `/bookings/1` to `/bookings/2` — does the data update?
- Bug 2: The user has already filtered by `?status=pending&date=2024-01-01` — what happens after `applyFilters()`?
- Bug 3: After submitting the form, press the browser back button — where does the user land?
- Bug 4: Refresh the page on page 3 — what page does the component show?

---

## Expected Output

After your fixes:

- Navigating `/bookings/1` → `/bookings/2` loads booking #2's data automatically
- Calling `applyFilters()` with `status = 'pending'` results in URL `/bookings?status=pending`
  without wiping any other existing search params
- After creating a booking, the back button goes to the page before the form (not to the blank form)
- Changing to page 3 updates the URL to `?page=3`, and refreshing shows page 3 correctly
