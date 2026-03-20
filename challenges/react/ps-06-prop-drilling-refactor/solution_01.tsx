// SOLUTION 01 — Prop Drilling Refactor: Identifying State Ownership
// ============================================================
// This skeleton explains how to categorise state and choose the
// right solution for each category before writing any code.
// NO executable code — comments only.
// ============================================================

// --- STEP 1: CATEGORISE THE STATE ---
// Before refactoring, ask three questions for each piece of state:
//
// Q: Is it needed by many unrelated components across the tree?
// Q: Does it change frequently?
// Q: Does it need async operations (fetch, update, delete)?
//
// user         → needed globally, changes rarely (login/logout only) → AuthContext
// bookings     → needed by multiple components, changes frequently,
//                has async operations → Zustand store
// isLoading    → part of booking lifecycle → Zustand store
// onBookingUpdate / onBookingDelete → actions, belong in Zustand store

// --- STEP 2: CREATE AuthContext ---
// Create a file AuthContext.tsx with three exports:
//
// 1. The context object itself (created with React.createContext)
//    Default value should match the context shape, e.g. { user: null, setUser: () => {} }
//    This default only activates if a component is rendered outside the provider —
//    in practice the provider should always wrap the app
//
// 2. AuthProvider component:
//    - Owns the useState for user
//    - Wraps children in <AuthContext.Provider value={{ user, setUser }}>
//    - Place this at the root of the app (inside App, wrapping everything)
//
// 3. useAuth hook:
//    - A thin wrapper around useContext(AuthContext)
//    - Add a guard: if context is undefined, throw a meaningful error
//      ("useAuth must be used inside AuthProvider")
//    - This prevents silent bugs when a component is accidentally rendered
//      outside the provider

// --- STEP 3: CREATE useBookingStore ---
// Move all booking logic from App into a Zustand store:
//
// State:
//   bookings: Booking[]         initialised to []
//   isLoading: boolean          initialised to false
//
// Actions:
//   updateBooking(id, data)     PATCH /api/bookings/:id
//   deleteBooking(id)           DELETE /api/bookings/:id
//
// The store replaces:
//   - useState for bookings in App
//   - useState for isLoading in App
//   - the onBookingUpdate inline function in App's JSX
//   - the onBookingDelete inline function in App's JSX
//
// Components import the store directly — no props needed for these values

// --- STEP 4: REFACTOR App ---
// App no longer owns any state — it is purely structural
//
// Before: App has three useState calls and passes 5 props to Dashboard
// After:  App renders AuthProvider wrapping Dashboard, nothing else
//
// If App needs to trigger an initial data fetch (e.g. fetchBookings on mount),
// it can call useBookingStore() itself — but it does not pass the results down

// --- STEP 5: REFACTOR Dashboard ---
// Dashboard previously received user, bookings, isLoading, onBookingUpdate, onBookingDelete
// After refactor: Dashboard receives zero props
//
// Dashboard only renders Header and BookingSection.
// Both children read their own data directly from their respective sources.
// Dashboard does not need to know anything about what those children need.

// --- STEP 6: REFACTOR Header ---
// Header previously received user as a prop from Dashboard
// After refactor: Header calls useAuth() internally
//
// const { user } = useAuth()
//
// Header owns its own data subscription. If user changes (e.g. logout),
// only Header re-renders — not Dashboard, not BookingSection.

// --- STEP 7: REFACTOR BookingSection ---
// BookingSection previously received bookings, isLoading, onBookingUpdate, onBookingDelete
// After refactor: BookingSection calls useBookingStore() internally
//
// const { bookings, isLoading } = useBookingStore()
//
// BookingSection still passes individual booking objects down to BookingCard,
// because each BookingCard needs its specific booking data.
// But it no longer passes action callbacks — BookingCard handles those itself.

// --- STEP 8: REFACTOR BookingCard ---
// BookingCard previously received booking, onUpdate, onDelete as props
// After refactor: BookingCard receives only booking as a prop
//
// BookingCard reads actions from the store:
//   const { updateBooking, deleteBooking } = useBookingStore()
//
// It passes booking as a prop because:
//   - BookingSection knows which booking each card represents
//   - Passing the booking object as a prop is correct — it is the card's own data
//   - This is not prop drilling because booking is used directly by BookingCard, not forwarded
//
// The key distinction:
//   Prop drilling = passing props through components that don't use them
//   Normal props  = passing data to the component that actually needs and uses it

// --- IDENTIFYING PROP DRILLING VS NORMAL PROPS ---
// A prop is being drilled when:
//   - The receiving component never reads the prop itself
//   - It only passes the prop to a child
//   - The chain crosses 2+ intermediate components
//
// A prop is normal when:
//   - The receiving component directly uses it in its render or logic
//   - It represents the component's "own" data (e.g. a specific booking for a card)
//
// After this refactor:
//   booking in BookingCard → normal prop (BookingCard renders booking.schoolName directly)
//   bookings in Dashboard  → was prop drilling (Dashboard never used bookings)
