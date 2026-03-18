// ============================================================
// Problem 01 — MSW API Mocking Setup
// ============================================================



// ============================================================
// src/mocks/handlers.ts
//
// let mockBookings = [bookingFactory(...), bookingFactory(...)]
// (mutable array — mutations visible within test's handler calls)
//
// http.post("/api/auth/login"):
//   await request.json() → check email/password
//   match: HttpResponse.json({ data: user, token })
//   fail:  HttpResponse.json({ message: "Invalid credentials" }, { status: 401 })
//
// http.get("/api/bookings"):
//   url.searchParams.get("status") → filter mockBookings
//   return paginated response { data, meta: { current_page, last_page, ... } }
//
// http.get("/api/bookings/:id"):
//   find by params.id → 404 if not found
//
// http.post("/api/bookings"):
//   await request.json() → validate school_id
//   422 if missing; push new booking; 201 response
//
// http.patch("/api/bookings/:id"):
//   find index → merge body → return updated booking
//
// http.delete("/api/bookings/:id"):
//   filter out by id → new HttpResponse(null, { status: 204 })
// ============================================================



// ============================================================
// src/mocks/server.ts
//
// import { setupServer } from "msw/node"
// export const server = setupServer(...handlers)
// ============================================================



// ============================================================
// src/test/setup.ts  (vitest.config → setupFiles)
//
// import "@testing-library/jest-dom"
// import { server } from "@/mocks/server"
//
// beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
// afterEach(() => server.resetHandlers())   ← clear per-test overrides
// afterAll(()  => server.close())
// ============================================================



// ============================================================
// src/test/factories.ts
//
// bookingFactory(overrides?): Booking
//   id, school_id, school_name, trip_type, status,
//   student_count, amount, date_from, date_to, created_at
//   (faker values + spread overrides)
//
// userFactory(overrides?): User
//   id, name, email, role: "staff", permissions: []
//
// schoolFactory(overrides?): School
//   id, name, city (Abu Dhabi | Dubai | Al Ain)
// ============================================================



// ============================================================
// src/test/test-utils.tsx
//
// createTestQueryClient():
//   new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
//
// renderWithProviders(ui, { initialEntries?, user?, ...renderOptions }):
//   fresh queryClient per call
//   Wrapper: QueryClientProvider > MemoryRouter > AuthProvider > Toaster > children
//   return { ...render(ui, { wrapper }), queryClient }
//
// re-export * from "@testing-library/react"
// re-export { userEvent } from "@testing-library/user-event"
// ============================================================



// ============================================================
// Integration test: user logs in → sees list → creates → sees it
//
// beforeAll/afterEach/afterAll: server lifecycle
//
// test "logs in and sees list":
//   userEvent.setup()
//   renderWithProviders(<App />, { initialEntries: ["/login"] })
//   type email + password → click Sign In
//   await screen.findByText("Bookings")
//   expect Al Ain School + Dubai Academy in document
//
// test "creates booking and sees it":
//   renderWithProviders(<App />, { initialEntries: ["/bookings"], user: { role: "admin" } })
//   await screen.findByText("Al Ain School")
//   click New Booking → fill form → click Create
//   await screen.findByText("New School")
//
// test "shows 422 validation errors":
//   server.use(http.post("/api/bookings", () => HttpResponse.json({ errors }, { status: 422 })))
//   click Create → await screen.findByText("School is required")
//
// test "shows error toast on 500":
//   server.use(http.get("/api/bookings", () => HttpResponse.json({}, { status: 500 })))
//   await screen.findByText(/server error/i)
// ============================================================
