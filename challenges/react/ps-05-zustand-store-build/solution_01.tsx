// SOLUTION 01 — Zustand Store: create(set, get) pattern + async actions
// ============================================================
// This skeleton explains the core implementation approach using
// Zustand's standard create() with set and get.
// NO executable code — comments only.
// ============================================================

// --- STORE CREATION PATTERN ---
// Use create<BookingStore>((set, get) => ({ ... }))
// `set` updates state immutably (Zustand handles shallow merge)
// `get` reads current state inside actions without subscribing to it
// Both set and get are always in sync with the latest committed state

// --- FETCHING: fetchBookings ---
// 1. set({ isLoading: true, error: null })
//    Always clear the previous error before a new fetch attempt
//
// 2. Read current filters from store via get().filters
//    Merge with overrideFilters if provided:
//      const merged = { ...get().filters, ...overrideFilters }
//
// 3. Build query string from merged filters using URLSearchParams
//    e.g. new URLSearchParams({ status, search, page, perPage }).toString()
//
// 4. Wrap the fetch in try/catch/finally:
//    try   → await fetch, parse JSON, set({ bookings: data.data, total: data.total })
//    catch → set({ error: err.message })
//    finally → set({ isLoading: false })
//    The finally block guarantees isLoading is always cleared,
//    even if an unhandled promise rejection occurs

// --- CREATING: createBooking ---
// 1. set({ isLoading: true, error: null })
// 2. POST /api/bookings with JSON body
// 3. On success:
//      const newBooking = await res.json()
//      set((state) => ({ bookings: [...state.bookings, newBooking] }))
//      return newBooking
// 4. On error:
//      set({ error: err.message })
//      return null
// 5. finally: set({ isLoading: false })
// Returning null on error lets the calling component react to failure
// without needing to catch anything itself

// --- OPTIMISTIC UPDATE: updateBooking ---
// Goal: update the UI instantly, revert only if the server disagrees
//
// Step 1 — Save original state before touching anything:
//   const originalBookings = get().bookings
//   const original = originalBookings.find(b => b.id === id)
//
// Step 2 — Apply update to local state immediately:
//   set((state) => ({
//     bookings: state.bookings.map(b =>
//       b.id === id ? { ...b, ...data } : b
//     )
//   }))
//   The user sees the change with zero latency
//
// Step 3 — Fire the async request:
//   await fetch(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
//
// Step 4 — On error: restore original and surface the error:
//   set({ bookings: originalBookings, error: err.message })
//   Zustand re-renders once with the restored state; user sees the revert
//
// No finally/isLoading toggle here — the optimistic pattern avoids
// showing a spinner since the UI is already updated

// --- OPTIMISTIC DELETE: deleteBooking ---
// Same pattern as updateBooking but simpler:
//
// Step 1 — Save current list:
//   const originalBookings = get().bookings
//
// Step 2 — Remove immediately:
//   set((state) => ({
//     bookings: state.bookings.filter(b => b.id !== id)
//   }))
//
// Step 3 — Fire DELETE request
//
// Step 4 — On error: restore full list
//   set({ bookings: originalBookings, error: err.message })

// --- FILTER: setFilter ---
// set((state) => ({
//   filters: {
//     ...state.filters,
//     [key]: value,
//     page: 1,          // ← ALWAYS reset pagination on any filter change
//   }
// }))
// Resetting page prevents showing page 3 of results after a new search
// where there may only be 1 page of results

// --- FILTER: clearFilters ---
// set({ filters: { status: '', search: '', page: 1, perPage: 10 } })
// Hard reset to defaults — no need for get() here since we're replacing,
// not merging

// --- SELECTORS (outside the store) ---
// Selectors are plain hooks that call useBookingStore with a selector fn.
// They do NOT go inside the store definition.
//
// export const usePaidBookings = () =>
//   useBookingStore((state) => state.bookings.filter(b => b.status === 'paid'))
//
// export const usePendingCount = () =>
//   useBookingStore((state) => state.bookings.filter(b => b.status === 'pending').length)
//
// Why outside the store?
// - Zustand re-renders a component only when the selected slice changes
// - If paidBookings were stored in state, every booking change would update it
// - Selector hooks re-compute only for the component that subscribes to them
// - Other components subscribing to `bookings` are unaffected

// --- KEY MENTAL MODEL ---
// set()    → schedule a state update (batched by Zustand, always immutable)
// get()    → read current state synchronously inside an action
// selector → narrows what a component subscribes to (fine-grained reactivity)
// optimistic → update UI before server confirms, revert on failure
