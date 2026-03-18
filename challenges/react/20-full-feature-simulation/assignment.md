# REACT_TEST_20 — Full Feature • 25-Min Simulation

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Destination Browser (Full Build) (Medium)

Build a Destination Browser from scratch following the minute-by-minute plan.

**Pacing guide:**
- Min 0–2: TypeScript interfaces
- Min 2–7: `useDestinations` hook (fetch + filter)
- Min 7–12: `DestinationCard` component
- Min 12–20: `DestinationBrowser` (grid + search + filter + all states)
- Min 20–23: Modal + error handling
- Min 23–25: Review and fix bugs

---

### Part A — TypeScript interfaces (Min 0–2)

**File:** `types/destination.ts`

```ts
interface Destination {
  id: number
  name: string
  city: string
  country: string
  image_url: string
  price_per_student: number
  available_spots: number
  total_spots: number
  description: string
  tags: string[]
  rating: number          // 1–5
  duration_days: number
}

interface DestinationFilters {
  search: string
  city: string
}

interface UseDestinationsReturn {
  destinations: Destination[]
  filteredDestinations: Destination[]
  filters: DestinationFilters
  setSearch: (search: string) => void
  setCity: (city: string) => void
  cities: string[]           // unique, derived from data
  isLoading: boolean
  error: string | null
  retry: () => void
}
```

---

### Part B — `useDestinations` hook (Min 2–7)

**File:** `hooks/useDestinations.ts`

```ts
function useDestinations(): UseDestinationsReturn
```

**Implementation:**
- `destinations` state: `Destination[]`, init `[]`
- `isLoading` state: `boolean`, init `true`
- `error` state: `string | null`, init `null`
- `filters` state: `DestinationFilters`, init `{ search: "", city: "" }`
- `retryCount` state: `number`, init `0` — incrementing triggers re-fetch

- **Fetch** `useEffect([retryCount])`:
  ```ts
  setIsLoading(true)
  setError(null)
  fetch("/api/destinations")
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then((data: Destination[]) => setDestinations(data))
    .catch(err => setError(err.message))
    .finally(() => setIsLoading(false))
  ```

- **`cities`**: `useMemo(() => [...new Set(destinations.map(d => d.city))].sort(), [destinations])`

- **`filteredDestinations`**: `useMemo(() => destinations.filter(d => {`
  ```ts
  const matchesSearch = d.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                        d.city.toLowerCase().includes(filters.search.toLowerCase())
  const matchesCity   = !filters.city || d.city === filters.city
  return matchesSearch && matchesCity
  }), [destinations, filters])`
  ```

- `setSearch = (search) => setFilters(prev => ({ ...prev, search }))`
- `setCity   = (city)   => setFilters(prev => ({ ...prev, city }))`
- `retry     = ()       => setRetryCount(prev => prev + 1)`

---

### Part C — `DestinationCard` component (Min 7–12)

**File:** `components/DestinationCard.tsx`

```tsx
interface DestinationCardProps {
  destination: Destination
  onClick: (destination: Destination) => void
}
```

**Render:**
```tsx
<div
  onClick={() => onClick(destination)}
  className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer
             hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
>
  {/* Image with availability badge */}
  <div className="relative">
    <img src={destination.image_url} alt={destination.name}
         className="w-full h-48 object-cover" />
    <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full
                      ${destination.available_spots < 10
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"}`}>
      {destination.available_spots} spots left
    </span>
  </div>

  {/* Content */}
  <div className="p-4">
    <div className="flex justify-between items-start mb-1">
      <h3 className="font-semibold text-gray-900">{destination.name}</h3>
      <StarRating rating={destination.rating} />
    </div>
    <p className="text-sm text-gray-500 mb-3">{destination.city}, {destination.country}</p>

    <div className="flex flex-wrap gap-1 mb-3">
      {destination.tags.slice(0, 3).map(tag => (
        <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
          {tag}
        </span>
      ))}
    </div>

    <div className="flex justify-between items-center">
      <span className="text-blue-600 font-bold">£{destination.price_per_student}/student</span>
      <span className="text-xs text-gray-400">{destination.duration_days} days</span>
    </div>
  </div>
</div>
```

---

### Part D — `DestinationBrowser` component (Min 12–20)

**File:** `components/DestinationBrowser.tsx`

```tsx
function DestinationBrowser(): JSX.Element
```

**State:** `selectedDestination: Destination | null = null`

**Hooks:** `const { filteredDestinations, filters, setSearch, setCity, cities, isLoading, error, retry } = useDestinations()`

**Render structure:**
```tsx
<div className="max-w-7xl mx-auto px-4 py-8">
  {/* Header */}
  <h1 className="text-3xl font-bold text-gray-900 mb-2">Destination Browser</h1>
  <p className="text-gray-500 mb-8">Find the perfect trip for your students</p>

  {/* Filter bar */}
  <div className="flex flex-col sm:flex-row gap-4 mb-8">
    <input
      type="search"
      placeholder="Search destinations…"
      value={filters.search}
      onChange={e => setSearch(e.target.value)}
      className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    />
    <select
      value={filters.city}
      onChange={e => setCity(e.target.value)}
      className="border rounded-lg px-4 py-2 bg-white"
    >
      <option value="">All cities</option>
      {cities.map(city => <option key={city} value={city}>{city}</option>)}
    </select>
  </div>

  {/* Loading skeleton */}
  {isLoading && (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )}

  {/* Error state */}
  {error && !isLoading && (
    <div className="text-center py-16">
      <p className="text-red-600 mb-4">Failed to load destinations: {error}</p>
      <button onClick={retry}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
        Try again
      </button>
    </div>
  )}

  {/* Results */}
  {!isLoading && !error && (
    <>
      <p className="text-sm text-gray-500 mb-4">
        Showing {filteredDestinations.length} destination{filteredDestinations.length !== 1 ? "s" : ""}
      </p>

      {/* Empty state */}
      {filteredDestinations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-gray-500">No destinations match your filters.</p>
          <button onClick={() => { setSearch(""); setCity("") }}
                  className="mt-4 text-blue-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map(d => (
            <DestinationCard key={d.id} destination={d} onClick={setSelectedDestination} />
          ))}
        </div>
      )}
    </>
  )}

  {/* Detail modal */}
  {selectedDestination && (
    <DestinationModal
      destination={selectedDestination}
      onClose={() => setSelectedDestination(null)}
    />
  )}
</div>
```

---

### Part E — `DestinationModal` component (Min 20–23)

**File:** `components/DestinationModal.tsx`

```tsx
interface DestinationModalProps {
  destination: Destination
  onClose: () => void
}
```

**Behaviour:**
- Close on backdrop click (`e.target === e.currentTarget`)
- Close on Escape key (`useEffect` → `keydown` listener, cleanup on unmount)
- Trap scroll: `useEffect` → `document.body.style.overflow = "hidden"`, cleanup restores `""`

**Render:**
```tsx
{/* Backdrop */}
<div
  onClick={e => e.target === e.currentTarget && onClose()}
  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
>
  {/* Panel */}
  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
    {/* Hero image */}
    <div className="relative">
      <img src={destination.image_url} className="w-full h-64 object-cover rounded-t-2xl" />
      <button onClick={onClose}
              className="absolute top-4 right-4 bg-white/80 rounded-full p-2 hover:bg-white">
        ✕
      </button>
    </div>

    <div className="p-6">
      <h2 className="text-2xl font-bold mb-1">{destination.name}</h2>
      <p className="text-gray-500 mb-4">{destination.city}, {destination.country}</p>
      <p className="text-gray-700 mb-6">{destination.description}</p>

      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xl font-bold text-blue-600">£{destination.price_per_student}</p>
          <p className="text-xs text-gray-500">per student</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xl font-bold text-green-600">{destination.available_spots}</p>
          <p className="text-xs text-gray-500">spots left</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xl font-bold text-purple-600">{destination.duration_days}</p>
          <p className="text-xs text-gray-500">days</p>
        </div>
      </div>

      <button
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
        disabled={destination.available_spots === 0}
      >
        {destination.available_spots === 0 ? "Fully Booked" : "Book This Trip"}
      </button>
    </div>
  </div>
</div>
```

---

## Problem 02 — Add Booking Flow Under Time Pressure (Hard)

Extend the modal with a multi-step booking flow. Manage scope — ship working core, skip polish.

---

### Part A — Step types and state

**File:** `types/booking.ts`

```ts
type ModalStep = "view" | "book" | "confirm" | "success"

interface BookingFormData {
  trip_date: string
  student_count: number
}

interface AvailabilityResult {
  available: boolean
  message?: string          // "Only 8 spots remain" etc.
  total_price: number
}
```

---

### Part B — `useBookingFlow` hook

**File:** `hooks/useBookingFlow.ts`

```ts
function useBookingFlow(destination: Destination): {
  step: ModalStep
  formData: BookingFormData
  availability: AvailabilityResult | null
  isChecking: boolean
  isSubmitting: boolean
  bookingId: number | null
  error: string | null
  setField: <K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) => void
  checkAvailability: () => Promise<void>
  confirmBooking: () => Promise<void>
  goToStep: (step: ModalStep) => void
  reset: () => void
}
```

**Implementation:**
- `step` state: `ModalStep = "view"`
- `formData` state: `BookingFormData = { trip_date: "", student_count: 1 }`
- `availability` state: `AvailabilityResult | null = null`
- `isChecking` / `isSubmitting` / `bookingId` / `error` states

- **`checkAvailability`**:
  ```ts
  setIsChecking(true); setError(null)
  POST /api/destinations/${destination.id}/check-availability
    body: { trip_date, student_count }
  → setAvailability(data)
  → if data.available: setStep("confirm")
  → catch: setError(err.message)
  → finally: setIsChecking(false)
  ```

- **`confirmBooking`**:
  ```ts
  setIsSubmitting(true); setError(null)
  POST /api/bookings
    body: { destination_id: destination.id, ...formData }
  → setBookingId(data.id)
  → setStep("success")
  → catch: setError(err.message)  // e.g. "Capacity exceeded"
  → finally: setIsSubmitting(false)
  ```

- `setField = <K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) =>`
  `setFormData(prev => ({ ...prev, [key]: value }))`

- `reset = () => { setStep("view"); setFormData(initial); setAvailability(null); setError(null) }`

---

### Part C — Updated `DestinationModal` with steps

**File:** `components/DestinationModal.tsx` (extended)

Integrate `useBookingFlow(destination)` into the modal. Swap content based on `step`:

**Step: "view"**
```tsx
// Same as Problem 01 render — destination info grid
// "Book This Trip" button → goToStep("book")   (replaces old button)
```

**Step: "book"**
```tsx
<div className="p-6">
  <button onClick={() => goToStep("view")} className="text-sm text-blue-600 mb-4">← Back</button>
  <h3 className="text-xl font-bold mb-6">Choose Your Dates</h3>

  <div className="space-y-4">
    <label className="block">
      <span className="text-sm font-medium text-gray-700">Trip date</span>
      <input
        type="date"
        min={new Date().toISOString().split("T")[0]}
        value={formData.trip_date}
        onChange={e => setField("trip_date", e.target.value)}
        className="mt-1 block w-full border rounded-lg px-3 py-2"
      />
    </label>

    <label className="block">
      <span className="text-sm font-medium text-gray-700">Number of students</span>
      <input
        type="number"
        min={1}
        max={destination.available_spots}
        value={formData.student_count}
        onChange={e => setField("student_count", Number(e.target.value))}
        className="mt-1 block w-full border rounded-lg px-3 py-2"
      />
      <p className="text-xs text-gray-400 mt-1">Max {destination.available_spots} available</p>
    </label>
  </div>

  {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

  <button
    onClick={checkAvailability}
    disabled={isChecking || !formData.trip_date || formData.student_count < 1}
    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
               disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isChecking ? "Checking…" : "Check Availability"}
  </button>
</div>
```

**Step: "confirm"**
```tsx
<div className="p-6">
  <button onClick={() => goToStep("book")} className="text-sm text-blue-600 mb-4">← Back</button>
  <h3 className="text-xl font-bold mb-6">Confirm Booking</h3>

  {/* Summary table */}
  <dl className="space-y-3 mb-6">
    <ConfirmRow label="Destination" value={destination.name} />
    <ConfirmRow label="Date"        value={formData.trip_date} />
    <ConfirmRow label="Students"    value={String(formData.student_count)} />
    <ConfirmRow label="Total"
                value={`£${availability!.total_price.toLocaleString()}`}
                highlight />
  </dl>

  {availability?.message && (
    <p className="text-amber-600 text-sm mb-4">{availability.message}</p>
  )}

  {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

  <button
    onClick={confirmBooking}
    disabled={isSubmitting}
    className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold
               disabled:opacity-50"
  >
    {isSubmitting ? "Confirming…" : "Confirm Booking"}
  </button>
</div>
```

**Step: "success"**
```tsx
<div className="p-6 text-center">
  <div className="text-6xl mb-4">✅</div>
  <h3 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h3>
  <p className="text-gray-500 mb-6">
    Your trip to {destination.name} has been booked for {formData.student_count} students.
  </p>
  <div className="flex gap-3">
    <a href={`/bookings/${bookingId}`}
       className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-center">
      View Booking
    </a>
    <button onClick={onClose}
            className="flex-1 border border-gray-300 py-3 rounded-xl font-semibold">
      Close
    </button>
  </div>
</div>
```

---

### Scope creep decision table

| Feature | Ship? | Reason |
|---------|-------|--------|
| Date validation (past dates) | YES | `min` attr on input — free |
| Max students validation | YES | `max` attr on input — free |
| Optimistic booking ID | NO | Wait for real API response |
| Confetti animation | SKIP | Time cost > value |
| Payment step | SKIP | Out of scope for this test |
| Email confirmation copy | SKIP | Backend concern |
| Form persistence on step back | YES | `formData` state already preserved |

**Rule:** if a feature takes > 2 min and isn't in requirements, skip it and note it.
