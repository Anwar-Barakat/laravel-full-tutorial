// SOLUTION 02 — Prop Drilling Refactor: Context vs Zustand Decision Guide
// ============================================================
// This skeleton explains the reasoning behind choosing Context or Zustand
// for different types of state, and covers component colocation.
// NO executable code — comments only.
// ============================================================

// --- WHEN TO USE REACT CONTEXT ---
// Context is the right choice when:
//
// 1. The value changes rarely (on app events like login/logout, not on user interaction)
// 2. All consumers need to re-render when the value changes anyway
//    (e.g. user changes → Header, Avatar, Settings all need to update — that's fine)
// 3. The value is truly global and not associated with async server state
//
// Good Context candidates in Tripz:
//   user / auth state      → login happens once per session
//   theme                  → user changes it rarely
//   locale / language      → rarely changes
//   feature flags          → set once at app start
//
// Bad Context candidates in Tripz:
//   bookings               → changes frequently (every CRUD action)
//   filters                → changes on every keystroke in the search box
//   isLoading              → changes on every fetch
//
// The problem with using Context for bookings:
//   Every time any booking changes, the Context value is a new object reference.
//   Every component that calls useContext(BookingContext) re-renders.
//   Even BookingCard components for bookings that did not change will re-render.
//   At scale (100 bookings on screen), this causes a cascade of unnecessary renders.

// --- WHEN TO USE ZUSTAND ---
// Zustand is the right choice when:
//
// 1. State changes frequently (user interactions, live data)
// 2. Only some consumers need to re-render on a given change
//    (selector-based subscriptions — only re-render if your slice changed)
// 3. State involves async operations (fetch, optimistic updates)
// 4. You need to access or mutate state outside of React components
//    (e.g. in utility functions, event listeners, interceptors)
//
// Zustand's selector advantage over Context:
//   With Context:    all consumers re-render when anything in the value changes
//   With Zustand:    a component only re-renders when its selected slice changes
//
// Example:
//   BookingCard subscribes to: state => state.bookings.find(b => b.id === id)
//   When booking #5 is updated, only the card for booking #5 re-renders.
//   All other BookingCards are unaffected.

// --- AVOID CONTEXT FOR BOOKINGS: CONCRETE EXAMPLE ---
// Imagine 50 BookingCards on screen, each wrapped in React.memo.
//
// With Context approach:
//   - One booking status changes
//   - BookingContext value is replaced with a new object
//   - All 50 BookingCards re-render (memo doesn't help — context bypasses it)
//   - 49 of those renders are wasted
//
// With Zustand approach:
//   - One booking status changes
//   - Only the BookingCard subscribed to that booking's slice re-renders
//   - 49 other cards are completely unaffected
//   - React.memo works correctly alongside Zustand selectors

// --- COMPONENT COLOCATION ---
// Colocation means a component owns its own data subscriptions rather than
// receiving data through props from a parent that fetched it.
//
// Before refactor (centralised, prop-drilled):
//   App fetches all data → passes down → Dashboard → BookingSection → BookingCard
//   Any change to the data pipeline requires touching every intermediate file
//
// After refactor (colocated):
//   BookingCard subscribes to its own booking slice via useBookingStore()
//   Header subscribes to user via useAuth()
//   BookingSection subscribes to the full list via useBookingStore()
//   Each component is self-contained and independently maintainable
//
// Colocation trade-off:
//   Pro: each component is independently testable (mock the store, not the parent)
//   Pro: no intermediate components need to know about the data
//   Con: harder to see the full data flow from a single file
//   Decision: prefer colocation when data is shared across multiple branches of the tree

// --- FINAL COMPONENT SIGNATURES AFTER REFACTOR ---
// These show the cleaned-up API surface for each component:
//
// App()
//   No props, no state, renders AuthProvider and Dashboard
//
// AuthProvider({ children: ReactNode })
//   Owns user state, provides AuthContext
//
// Dashboard()
//   No props, just layout — renders Header and BookingSection
//
// Header()
//   No props — reads user from useAuth() internally
//   Re-renders only when user changes
//
// BookingSection()
//   No props — reads bookings and isLoading from useBookingStore()
//   Re-renders when bookings array or isLoading changes
//
// BookingCard({ booking: Booking })
//   Receives only its own booking data as a prop
//   Reads updateBooking and deleteBooking from useBookingStore()
//   Re-renders only when its specific booking object changes
//   (if you use useBookingStore(state => state.bookings.find(b => b.id === booking.id)))
//
// The rule of thumb:
//   A component should own its own subscriptions for global state.
//   A component should receive props only for data that is unique to that instance.

// --- TESTING AFTER REFACTOR ---
// Colocated components are easier to test in isolation:
//
// Testing BookingCard:
//   - Render BookingCard with a mock booking prop
//   - Mock useBookingStore to return mock updateBooking / deleteBooking functions
//   - No need to render the full App tree
//   - Assert that clicking Confirm calls updateBooking with the correct arguments
//
// Testing Header:
//   - Mock useAuth to return { user: { name: 'Nasar' } }
//   - Render Header alone
//   - Assert the user name appears in the output
//
// This is a direct improvement over the prop-drilled version where you
// had to render App (with all its state) just to test BookingCard's button click.
