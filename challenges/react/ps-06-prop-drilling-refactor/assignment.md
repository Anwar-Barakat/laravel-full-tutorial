# Challenge 06 — Prop Drilling Refactor

**Format:** REFACTOR
**Topic:** Refactor deep prop drilling to Context + Zustand
**App:** Tripz — Laravel + React school booking platform

---

## Context

The Tripz dashboard was built quickly and now has a classic prop drilling problem. The same props are passed through 4 component levels, with middle components receiving and forwarding props they never actually use. The codebase is hard to maintain and every new prop requires touching multiple files.

---

## The Problem (Broken Code)

```tsx
// App.tsx — owns all state and passes everything down
function App() {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Dashboard
      user={user}
      bookings={bookings}
      isLoading={isLoading}
      onBookingUpdate={(id, data) => { /* update logic */ }}
      onBookingDelete={(id) => { /* delete logic */ }}
    />
  )
}

// Dashboard.tsx — passes everything through without using bookings
function Dashboard({ user, bookings, isLoading, onBookingUpdate, onBookingDelete }) {
  return (
    <div>
      <Header user={user} />
      <BookingSection
        bookings={bookings}
        isLoading={isLoading}
        onBookingUpdate={onBookingUpdate}
        onBookingDelete={onBookingDelete}
      />
    </div>
  )
}

// BookingSection.tsx — passes through again without transformation
function BookingSection({ bookings, isLoading, onBookingUpdate, onBookingDelete }) {
  return (
    <div>
      {bookings.map(b => (
        <BookingCard
          key={b.id}
          booking={b}
          onUpdate={onBookingUpdate}
          onDelete={onBookingDelete}
        />
      ))}
    </div>
  )
}

// BookingCard.tsx — finally uses the props here
function BookingCard({ booking, onUpdate, onDelete }) {
  return (
    <div>
      <h3>{booking.schoolName}</h3>
      <button onClick={() => onUpdate(booking.id, { status: 'confirmed' })}>Confirm</button>
      <button onClick={() => onDelete(booking.id)}>Delete</button>
    </div>
  )
}
```

---

## What Is Wrong

1. `Dashboard` receives `bookings`, `isLoading`, `onBookingUpdate`, and `onBookingDelete` but never uses any of them — it just forwards them
2. `BookingSection` receives all four props but only uses them to forward further down
3. Adding a new booking-related prop requires editing App, Dashboard, BookingSection, and BookingCard
4. User data is passed as a prop but is needed globally across many future components
5. Booking state logic (update, delete) lives in App but belongs closer to the data layer

---

## Refactor Requirements

### Step 1 — Move bookings state to a Zustand store
- Create `useBookingStore` with `bookings`, `isLoading`, `updateBooking(id, data)`, and `deleteBooking(id)`
- Components access the store directly — no props needed

### Step 2 — Move user to a React Context
- Create `AuthContext` with `user` and `setUser`
- Wrap the app in `AuthProvider`
- Components read user via `useAuth()` hook

### Step 3 — Clean up component signatures
After refactoring, component signatures should be:

```tsx
function App()                         // no state, just renders providers + Dashboard
function Dashboard()                   // no props at all
function Header()                      // reads user from useAuth() internally
function BookingSection()              // reads bookings/isLoading from useBookingStore()
function BookingCard({ booking })      // only receives its own booking data as prop
                                       // calls useBookingStore() for actions
```

### Step 4 — BookingCard calls the store directly
```tsx
// Before (prop drilling):
function BookingCard({ booking, onUpdate, onDelete }) {
  return <button onClick={() => onUpdate(booking.id, { status: 'confirmed' })}>...</button>
}

// After (direct store access):
function BookingCard({ booking }) {
  const { updateBooking, deleteBooking } = useBookingStore()
  return <button onClick={() => updateBooking(booking.id, { status: 'confirmed' })}>...</button>
}
```

---

## Expected Output

The component tree after refactoring renders identically to before. The difference is only in how data flows:

```
App
 └── AuthProvider
      └── Dashboard
           ├── Header           ← reads user from useAuth()
           └── BookingSection   ← reads bookings from useBookingStore()
                └── BookingCard ← reads actions from useBookingStore()
```

No component passes booking or user props to a child unless that child genuinely needs a specific booking instance as its own data.

---

## What to Submit

Refactored versions of all four components plus:
- `AuthContext.tsx` with `AuthProvider` and `useAuth` hook
- `useBookingStore.ts` with the Zustand store
