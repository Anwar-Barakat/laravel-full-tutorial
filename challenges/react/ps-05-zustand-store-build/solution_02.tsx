// SOLUTION 02 — Zustand Store: Middleware, Selectors, and Testing
// ============================================================
// This skeleton covers advanced Zustand patterns:
// devtools, persist, immer, and testing strategies.
// NO executable code — comments only.
// ============================================================

// --- SELECTORS: WHY OUTSIDE THE STORE ---
// Selectors are functions passed to useBookingStore() that extract
// a slice of state. Zustand only re-renders a component when its
// selected slice changes (using Object.is comparison by default).
//
// Pattern:
//   useBookingStore(state => state.bookings.filter(b => b.status === 'paid'))
//
// If you stored paidBookings as state inside the store:
//   - Every unrelated booking update would recalculate paidBookings
//   - All components subscribed to paidBookings would re-render
//   - You'd need to keep paidBookings in sync manually on every mutation
//
// With a selector:
//   - Recalculation happens only inside components that subscribe to it
//   - Components that don't use paidBookings are completely unaffected
//   - Derived data stays co-located with the component that needs it
//
// For expensive derivations, wrap the selector with useShallow() or
// use a memoised selector library like reselect

// --- DEVTOOLS MIDDLEWARE ---
// Wrap the store creator with the devtools() middleware to enable
// the Redux DevTools browser extension for Zustand stores.
//
// Pattern:
//   create<BookingStore>()(devtools((set, get) => ({ ... }), { name: 'BookingStore' }))
//
// Note the double parentheses — this is Zustand's middleware currying pattern.
// Each set() call appears as a named action in DevTools if you pass a name:
//   set({ bookings: data }, false, 'fetchBookings/success')
//   Third argument: false = do not replace state, just merge
//   Fourth argument: action label shown in DevTools timeline
//
// This makes debugging async flows much easier — you can time-travel
// through each state transition in the browser

// --- PERSIST MIDDLEWARE ---
// Use persist() to save parts of the store to localStorage between sessions.
// You typically want to persist filters, not bookings (bookings come from server).
//
// Pattern:
//   create<BookingStore>()(
//     persist(
//       devtools((set, get) => ({ ... })),
//       {
//         name: 'tripz-booking-filters',   // localStorage key
//         partialize: (state) => ({ filters: state.filters }),
//         // partialize limits what gets persisted — only filters, not bookings/loading
//       }
//     )
//   )
//
// On page load, Zustand will rehydrate filters from localStorage automatically.
// This lets users return to the same filtered view they left.
// Never persist isLoading or error — those are transient runtime values.

// --- IMMER MIDDLEWARE ---
// Immer lets you write "mutating" logic that is actually immutable under the hood.
// Useful when updating deeply nested state (e.g., a booking inside a nested object).
//
// Without immer (manual spread):
//   set((state) => ({
//     bookings: state.bookings.map(b =>
//       b.id === id ? { ...b, ...data } : b
//     )
//   }))
//
// With immer:
//   set(produce((state) => {
//     const booking = state.bookings.find(b => b.id === id)
//     if (booking) Object.assign(booking, data)
//   }))
//
// For flat state (like this store), immer adds little value.
// Prefer immer when state is deeply nested (e.g., bookings with nested passenger objects).
// Stack order matters: devtools(persist(immer(...))) is the conventional order.

// --- MIDDLEWARE STACKING ORDER ---
// Conventional order for combining middleware:
//   create<Store>()(
//     devtools(
//       persist(
//         immer(
//           (set, get) => ({ ...storeDefinition })
//         ),
//         { name: 'store-key', partialize: ... }
//       ),
//       { name: 'StoreName' }
//     )
//   )
//
// DevTools wraps outermost (sees all state changes)
// Persist wraps next (knows how to hydrate/dehydrate)
// Immer wraps innermost (transforms set calls before they reach Zustand core)

// --- TESTING A ZUSTAND STORE ---
// Zustand stores are plain functions — they are easy to test without a React component.
//
// Step 1 — Import the store and reset state before each test:
//   beforeEach(() => {
//     useBookingStore.setState({ bookings: [], isLoading: false, error: null })
//   })
//
// Step 2 — Call actions directly via getState():
//   await act(async () => {
//     await useBookingStore.getState().fetchBookings()
//   })
//
// Step 3 — Assert on state after the action:
//   expect(useBookingStore.getState().bookings).toHaveLength(3)
//   expect(useBookingStore.getState().isLoading).toBe(false)
//
// Step 4 — Test optimistic update revert by mocking a failing fetch:
//   global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
//   // pre-populate a booking in state via setState
//   await act(async () => {
//     await useBookingStore.getState().deleteBooking(1)
//   })
//   // booking should still be present because delete failed and was reverted
//   expect(useBookingStore.getState().bookings).toHaveLength(1)
//
// act() from @testing-library/react ensures all state updates are flushed
// before assertions run — required for async Zustand actions.
//
// You do not need to render any component to test the store logic.
// That is one of Zustand's biggest advantages over component-level useState.

// --- SUBSCRIBE FOR SIDE EFFECTS ---
// useBookingStore.subscribe() lets you react to state changes outside React:
//   useBookingStore.subscribe(
//     (state) => state.filters,
//     (filters) => fetchBookings(filters),
//     { equalityFn: shallow }
//   )
// Useful for triggering refetches when filters change, without useEffect in a component.
// The second argument to subscribe is the selector, third is the callback.
// shallow from zustand/shallow prevents re-running when filters object reference
// changes but values are identical.
