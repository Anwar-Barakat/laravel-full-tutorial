# Testing with MSW & Integration Patterns

Build a complete test setup with Mock Service Worker: intercept API calls, test full user flows, and write maintainable test utilities.

| Topic           | Details                                                         |
|-----------------|-----------------------------------------------------------------|
| MSW Handlers    | Mock API at the network level                                   |
| Integration Tests | Full user flow testing                                        |
| Test Utilities  | Custom render, factories                                        |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — MSW API Mocking Setup (Medium)

### Scenario

Set up Mock Service Worker for testing the booking app: define handlers for all API endpoints, create test utilities, and write integration tests that test real user flows end-to-end.

### Requirements

1. Set up MSW with handlers for booking CRUD endpoints
2. `handlers.ts` — define GET/POST/PUT/DELETE responses
3. `server.ts` — configure MSW server for tests
4. `test-utils.tsx` — custom render with providers (auth, router, query)
5. `factories.ts` — test data factories for Booking, School, User
6. Integration test: user logs in → sees bookings → creates new → sees it in list
7. Override handlers per test for error scenarios

### Expected Code

```tsx
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw"   // MSW v2 API (http, not rest)
import { bookingFactory, userFactory } from "@/test/factories"

// In-memory store — mutations are reflected across handlers within one test
let mockBookings = [
  bookingFactory({ id: 1, status: "pending", school_name: "Al Ain School" }),
  bookingFactory({ id: 2, status: "paid",    school_name: "Dubai Academy" }),
]

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────
  http.post("/api/auth/login", async ({ request }) => {
    const { email, password } = await request.json() as Record<string, string>
    if (email === "admin@test.com" && password === "password") {
      return HttpResponse.json({
        data:    userFactory({ email, role: "admin" }),
        token:   "fake-jwt-token",
        message: "Login successful",
      })
    }
    return HttpResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    )
  }),

  // ── Bookings list ────────────────────────────────────────────
  http.get("/api/bookings", ({ request }) => {
    const url    = new URL(request.url)
    const status = url.searchParams.get("status")
    const page   = Number(url.searchParams.get("page") ?? "1")

    const filtered = status && status !== "all"
      ? mockBookings.filter((b) => b.status === status)
      : mockBookings

    return HttpResponse.json({
      data: filtered,
      meta: {
        current_page: page,
        last_page:    1,
        per_page:     15,
        total:        filtered.length,
        from:         1,
        to:           filtered.length,
      },
      links: { first: null, last: null, prev: null, next: null },
    })
  }),

  // ── Booking detail ──────────────────────────────────────────
  http.get("/api/bookings/:id", ({ params }) => {
    const booking = mockBookings.find((b) => b.id === Number(params.id))
    if (!booking) {
      return HttpResponse.json({ message: "Not found" }, { status: 404 })
    }
    return HttpResponse.json({ data: booking })
  }),

  // ── Create booking ──────────────────────────────────────────
  http.post("/api/bookings", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>

    // Simulate validation error
    if (!body.school_id) {
      return HttpResponse.json(
        { message: "Validation failed", errors: { school_id: ["School is required"] } },
        { status: 422 }
      )
    }

    const newBooking = bookingFactory({
      id:          mockBookings.length + 1,
      school_name: "New School",
      status:      "pending",
      ...body,
    })
    mockBookings.push(newBooking)
    return HttpResponse.json({ data: newBooking, message: "Created" }, { status: 201 })
  }),

  // ── Update booking ──────────────────────────────────────────
  http.patch("/api/bookings/:id", async ({ params, request }) => {
    const body    = await request.json() as Record<string, unknown>
    const index   = mockBookings.findIndex((b) => b.id === Number(params.id))
    if (index === -1) {
      return HttpResponse.json({ message: "Not found" }, { status: 404 })
    }
    mockBookings[index] = { ...mockBookings[index], ...body }
    return HttpResponse.json({ data: mockBookings[index] })
  }),

  // ── Delete booking ──────────────────────────────────────────
  http.delete("/api/bookings/:id", ({ params }) => {
    mockBookings = mockBookings.filter((b) => b.id !== Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
]
```

```tsx
// src/mocks/server.ts
import { setupServer } from "msw/node"
import { handlers } from "./handlers"

// Shared server instance — imported in test setup files
export const server = setupServer(...handlers)
```

```tsx
// src/test/setup.ts  (referenced in vitest.config.ts → setupFiles)
import "@testing-library/jest-dom"
import { server } from "@/mocks/server"

// Lifecycle hooks shared across ALL tests
beforeAll(()  => server.listen({ onUnhandledRequest: "error" }))
afterEach(()  => server.resetHandlers())   // ← isolate per-test overrides
afterAll(()   => server.close())
```

```tsx
// src/test/factories.ts
import { faker } from "@faker-js/faker"
import type { Booking, User, School } from "@/types"

// Factory — merges overrides with sensible defaults
export function bookingFactory(overrides: Partial<Booking> = {}): Booking {
  return {
    id:            faker.number.int({ min: 1, max: 9999 }),
    school_id:     faker.number.int({ min: 1, max: 50 }),
    school_name:   faker.company.name(),
    trip_type:     faker.helpers.arrayElement(["domestic", "international"]),
    status:        faker.helpers.arrayElement(["pending", "confirmed", "paid", "cancelled"]),
    student_count: faker.number.int({ min: 10, max: 200 }),
    amount:        faker.number.float({ min: 500, max: 50000, fractionDigits: 2 }),
    date_from:     faker.date.soon({ days: 30 }).toISOString().split("T")[0],
    date_to:       faker.date.soon({ days: 60 }).toISOString().split("T")[0],
    created_at:    faker.date.past().toISOString(),
    ...overrides,
  }
}

export function userFactory(overrides: Partial<User> = {}): User {
  return {
    id:          faker.number.int({ min: 1, max: 999 }),
    name:        faker.person.fullName(),
    email:       faker.internet.email(),
    role:        "staff",
    permissions: [],
    ...overrides,
  }
}

export function schoolFactory(overrides: Partial<School> = {}): School {
  return {
    id:   faker.number.int({ min: 1, max: 100 }),
    name: faker.company.name(),
    city: faker.helpers.arrayElement(["Abu Dhabi", "Dubai", "Al Ain"]),
    ...overrides,
  }
}
```

```tsx
// src/test/test-utils.tsx
import { render, type RenderOptions } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import type { ReactElement } from "react"

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[]   // initial router history
  user?:           Partial<User>
}

// Fresh QueryClient per test — no cache bleed between tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },   // ← don't retry on error in tests
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui:      ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialEntries = ["/"], user, ...renderOptions } = options
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {/* Inject test user into auth context if provided */}
          <AuthProvider initialUser={user ?? null}>
            <Toaster />
            {children}
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Re-export everything from RTL so tests only import from test-utils
export * from "@testing-library/react"
export { userEvent } from "@testing-library/user-event"
```

```tsx
// src/__tests__/bookings.integration.test.tsx
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/test-utils"
import { server } from "@/mocks/server"
import { http, HttpResponse } from "msw"
import { App } from "@/App"

describe("Booking flow — integration", () => {
  test("user logs in and sees booking list", async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ["/login"] })

    // Fill login form
    await user.type(screen.getByLabelText(/email/i), "admin@test.com")
    await user.type(screen.getByLabelText(/password/i), "password")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    // Should redirect to bookings and show the list
    await screen.findByText("Bookings")                    // heading
    expect(screen.getByText("Al Ain School")).toBeInTheDocument()
    expect(screen.getByText("Dubai Academy")).toBeInTheDocument()
  })

  test("user creates a new booking and sees it in list", async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, {
      initialEntries: ["/bookings"],
      user: { role: "admin" },
    })

    await screen.findByText("Al Ain School")  // wait for initial load

    // Open create form
    await user.click(screen.getByRole("button", { name: /new booking/i }))

    // Fill form
    await user.selectOptions(screen.getByLabelText(/school/i), ["1"])
    await user.click(screen.getByLabelText(/domestic/i))
    await user.type(screen.getByLabelText(/student count/i), "45")

    await user.click(screen.getByRole("button", { name: /create booking/i }))

    // List refreshes and shows new entry
    await screen.findByText("New School")
  })

  test("shows validation errors from server on 422", async () => {
    // Override handler just for this test
    server.use(
      http.post("/api/bookings", () =>
        HttpResponse.json(
          { message: "Validation failed", errors: { school_id: ["School is required"] } },
          { status: 422 }
        )
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<App />, {
      initialEntries: ["/bookings/new"],
      user: { role: "admin" },
    })

    await user.click(screen.getByRole("button", { name: /create booking/i }))

    await screen.findByText("School is required")
  })

  test("shows error toast on 500", async () => {
    server.use(
      http.get("/api/bookings", () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 })
      )
    )

    renderWithProviders(<App />, {
      initialEntries: ["/bookings"],
      user: { role: "admin" },
    })

    await screen.findByText(/server error/i)
  })

  test("filters bookings by status", async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, {
      initialEntries: ["/bookings"],
      user: { role: "admin" },
    })

    await screen.findByText("Al Ain School")

    await user.selectOptions(screen.getByRole("combobox", { name: /status/i }), "paid")

    // Only paid bookings should now appear
    await waitFor(() => {
      expect(screen.queryByText("Al Ain School")).not.toBeInTheDocument()
      expect(screen.getByText("Dubai Academy")).toBeInTheDocument()
    })
  })
})
```

### MSW v2 API Changes

| MSW v1 | MSW v2 |
|--------|--------|
| `rest.get(...)` | `http.get(...)` |
| `res(ctx.json(...))` | `HttpResponse.json(...)` |
| `res(ctx.status(204))` | `new HttpResponse(null, { status: 204 })` |
| `req.json()` | `await request.json()` |
| `setupServer` from `msw/node` | same |

### What We're Evaluating

- `http.get/post/patch/delete` — MSW v2 handler syntax
- `await request.json()` — async body parsing in MSW v2
- Mutable `mockBookings` array — mutations visible within a test's handler calls
- `server.resetHandlers()` in `afterEach` — clears per-test overrides without restarting
- `server.use(...)` inline — overrides base handler for one test only
- `retry: false` in test QueryClient — errors surface immediately, no async noise
- `userEvent.setup()` — modern user-event API, returns a user instance
- `screen.findBy*` (async) vs `getBy*` (sync) — findBy waits for async render

---

## Problem 02 — Test Patterns & Custom Matchers (Hard)

### Scenario

Build reusable test utilities: custom matchers, page objects for common interactions, and async test helpers.

### Requirements

1. Custom matcher: `expect(element).toBeAccessible()`
2. Page object: `BookingListPage` wrapping common queries
3. `waitForLoadingToFinish()` utility
4. `fillBookingForm(data)` utility for form tests
5. Test accessibility: verify aria attributes, keyboard nav
6. Snapshot testing for UI components

### Expected Code

```tsx
// src/test/matchers.ts  — custom Jest/Vitest matchers
import { expect } from "vitest"
import { computeAccessibleName } from "dom-accessibility-api"

expect.extend({
  // expect(button).toHaveAccessibleName("Submit booking")
  toHaveAccessibleName(element: HTMLElement, expectedName: string) {
    const actualName = computeAccessibleName(element)
    const pass = actualName === expectedName
    return {
      pass,
      message: () =>
        pass
          ? `Expected element NOT to have accessible name "${expectedName}"`
          : `Expected element to have accessible name "${expectedName}", got "${actualName}"`,
    }
  },

  // expect(dialog).toBeAccessible()
  // Checks: has role, has accessible name, no aria-hidden ancestors
  toBeAccessible(element: HTMLElement) {
    const issues: string[] = []

    // Must have a role
    const role = element.getAttribute("role") ?? element.tagName.toLowerCase()
    const implicitRoles = ["button", "a", "input", "select", "textarea", "form"]
    if (!role && !implicitRoles.includes(element.tagName.toLowerCase())) {
      issues.push("Element has no accessible role")
    }

    // Interactive elements must have accessible name
    const interactiveTags = ["BUTTON", "A", "INPUT", "SELECT"]
    if (interactiveTags.includes(element.tagName)) {
      const name = computeAccessibleName(element)
      if (!name) issues.push("Interactive element has no accessible name")
    }

    // Must not be hidden from AT
    let ancestor: Element | null = element
    while (ancestor) {
      if (ancestor.getAttribute("aria-hidden") === "true") {
        issues.push(`Ancestor has aria-hidden="true": ${ancestor.tagName}`)
        break
      }
      ancestor = ancestor.parentElement
    }

    return {
      pass:    issues.length === 0,
      message: () =>
        issues.length === 0
          ? "Expected element NOT to be accessible"
          : `Element has accessibility issues:\n${issues.map((i) => `  - ${i}`).join("\n")}`,
    }
  },
})
```

```tsx
// src/test/page-objects/BookingListPage.ts
import { screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

export class BookingListPage {
  private user = userEvent.setup()

  // ── Navigation / load ────────────────────────────────────────
  async waitForLoad() {
    // Wait until the loading skeleton is gone and real content shows
    await waitFor(() => {
      expect(screen.queryByTestId("booking-table-skeleton")).not.toBeInTheDocument()
    })
    await screen.findByRole("table", { name: /bookings/i })
  }

  // ── Filtering ────────────────────────────────────────────────
  async filterByStatus(status: string) {
    const select = screen.getByRole("combobox", { name: /status/i })
    await this.user.selectOptions(select, status)
    await this.waitForLoad()
  }

  async searchFor(query: string) {
    const input = screen.getByRole("searchbox", { name: /search/i })
    await this.user.clear(input)
    await this.user.type(input, query)
    await this.waitForLoad()
  }

  // ── Queries ──────────────────────────────────────────────────
  getBookingCount(): number {
    return screen.getAllByRole("row").length - 1   // subtract header row
  }

  getBookingRow(schoolName: string) {
    return screen.getByRole("row", { name: new RegExp(schoolName, "i") })
  }

  getBookingById(id: number) {
    return screen.getByTestId(`booking-row-${id}`)
  }

  // ── Actions ──────────────────────────────────────────────────
  async clickCreateBooking() {
    await this.user.click(screen.getByRole("button", { name: /new booking/i }))
  }

  async deleteBooking(schoolName: string) {
    const row         = this.getBookingRow(schoolName)
    const deleteBtn   = within(row).getByRole("button", { name: /delete/i })
    await this.user.click(deleteBtn)
    // Confirm dialog
    await this.user.click(screen.getByRole("button", { name: /confirm/i }))
  }

  async clickBooking(schoolName: string) {
    await this.user.click(this.getBookingRow(schoolName))
  }

  // ── Create flow ──────────────────────────────────────────────
  async createBooking(data: {
    schoolName?:   string
    tripType?:     "domestic" | "international"
    studentCount?: number
  }) {
    await this.clickCreateBooking()
    await fillBookingForm(data)
    await this.user.click(screen.getByRole("button", { name: /create booking/i }))
    await this.waitForLoad()
  }
}
```

```tsx
// src/test/helpers.ts  — shared async utilities
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── waitForLoadingToFinish ────────────────────────────────────
// Waits for all loading spinners and skeletons to disappear
export async function waitForLoadingToFinish() {
  await waitFor(
    () => {
      // Check for common loading indicators
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument()
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    },
    { timeout: 3000 }
  )
}

// ── fillBookingForm ───────────────────────────────────────────
export async function fillBookingForm(data: {
  schoolName?:   string
  tripType?:     "domestic" | "international"
  studentCount?: number
  dateFrom?:     string
  dateTo?:       string
}) {
  const user = userEvent.setup()

  if (data.schoolName) {
    // Type to filter the school combobox
    const schoolInput = screen.getByRole("combobox", { name: /school/i })
    await user.click(schoolInput)
    await user.type(schoolInput, data.schoolName)
    const option = await screen.findByRole("option", { name: new RegExp(data.schoolName, "i") })
    await user.click(option)
  }

  if (data.tripType) {
    await user.click(screen.getByRole("radio", { name: new RegExp(data.tripType, "i") }))
  }

  if (data.studentCount !== undefined) {
    const countInput = screen.getByRole("spinbutton", { name: /student count/i })
    await user.clear(countInput)
    await user.type(countInput, String(data.studentCount))
  }

  if (data.dateFrom) {
    await user.type(screen.getByLabelText(/from/i), data.dateFrom)
  }

  if (data.dateTo) {
    await user.type(screen.getByLabelText(/to/i), data.dateTo)
  }
}
```

```tsx
// src/__tests__/bookings.accessibility.test.tsx
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe, toHaveNoViolations } from "jest-axe"
import { renderWithProviders } from "@/test/test-utils"
import { BookingList } from "@/components/BookingList"
import { bookingFactory } from "@/test/factories"

expect.extend(toHaveNoViolations)

describe("BookingList — accessibility", () => {
  const bookings = [
    bookingFactory({ id: 1, status: "pending", school_name: "SSI" }),
    bookingFactory({ id: 2, status: "paid",    school_name: "NIS" }),
  ]

  test("has no axe violations", async () => {
    const { container } = renderWithProviders(
      <BookingList bookings={bookings} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test("status badges have descriptive aria-labels", () => {
    renderWithProviders(<BookingList bookings={bookings} />)
    expect(
      screen.getByRole("status", { name: /booking status: pending/i })
    ).toBeInTheDocument()
  })

  test("delete buttons have accessible names", () => {
    renderWithProviders(<BookingList bookings={bookings} />)
    const deleteButtons = screen.getAllByRole("button", { name: /delete booking/i })
    deleteButtons.forEach((btn) => expect(btn).toBeAccessible())
  })

  test("table is keyboard navigable", async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookingList bookings={bookings} />)

    // Tab into the table
    await user.tab()
    expect(screen.getByRole("row", { name: /SSI/i })).toHaveFocus()

    // Enter opens detail
    await user.keyboard("{Enter}")
    await screen.findByRole("dialog", { name: /booking detail/i })
    expect(screen.getByRole("dialog")).toBeAccessible()

    // Escape closes
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
```

```tsx
// src/__tests__/BookingCard.snapshot.test.tsx
import { render } from "@testing-library/react"
import { BookingCard } from "@/components/BookingCard"
import { bookingFactory } from "@/test/factories"

describe("BookingCard — snapshots", () => {
  test("pending booking renders correctly", () => {
    // Use deterministic factory values for stable snapshots
    const booking = bookingFactory({
      id:            42,
      school_name:   "Al Ain School",
      status:        "pending",
      student_count: 45,
      amount:        12500,
      date_from:     "2025-03-01",
      date_to:       "2025-03-05",
    })

    const { container } = render(<BookingCard booking={booking} />)
    expect(container.firstChild).toMatchSnapshot()
  })

  test("paid booking shows green badge", () => {
    const booking = bookingFactory({ id: 43, status: "paid" })
    const { getByRole } = render(<BookingCard booking={booking} />)
    // Inline snapshot — visible in source, easier to review in PRs
    expect(getByRole("status")).toMatchInlineSnapshot(`
      <span
        aria-label="Booking status: paid"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
        role="status"
      >
        Paid
      </span>
    `)
  })
})
```

```tsx
// Usage — composing page object + utilities
describe("Booking list — user flows", () => {
  test("filter → count → create flow", async () => {
    const bookingPage = new BookingListPage()
    renderWithProviders(<App />, {
      initialEntries: ["/bookings"],
      user: { role: "admin" },
    })

    await bookingPage.waitForLoad()
    expect(bookingPage.getBookingCount()).toBe(2)

    await bookingPage.filterByStatus("paid")
    expect(bookingPage.getBookingCount()).toBe(1)

    await bookingPage.createBooking({
      schoolName:   "SSI",
      tripType:     "domestic",
      studentCount: 30,
    })

    expect(bookingPage.getBookingCount()).toBe(2)   // paid filter + new one
  })
})
```

### What We're Evaluating

- `expect.extend()` — adds custom matchers to Vitest/Jest
- `computeAccessibleName()` from `dom-accessibility-api` — same algorithm browsers use
- `jest-axe` — runs the axe accessibility engine against the rendered DOM
- Page object pattern — encapsulates selectors, reduces test brittleness
- `within(row)` — scope queries to a specific container element
- `userEvent.setup()` — one instance per test, simulates real browser events
- `toMatchInlineSnapshot()` — snapshot stored in source file, visible in PRs
- `waitFor()` with custom timeout — handles slow async operations
- `retry: false` in QueryClient — prevents test timeout on expected errors
