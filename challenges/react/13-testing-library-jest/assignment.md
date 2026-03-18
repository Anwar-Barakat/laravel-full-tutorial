# React Testing with Jest & RTL

Write component tests with React Testing Library: render, query, user events, mock API calls, and test custom hooks.

| Topic           | Details                                                         |
|-----------------|-----------------------------------------------------------------|
| Component Tests | render, screen, userEvent                                       |
| API Mocking     | MSW, fetch mock, handlers                                       |
| Hook Testing    | renderHook, waitFor                                             |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Testing Booking Components (Medium)

### Scenario

Write comprehensive tests for `BookingCard` and `BookingForm`: render correct content, handle user interactions, validate form submission, and mock API calls.

### Requirements

1. Test `BookingCard` renders all booking data correctly
2. Test status badge shows correct color/label
3. Test action buttons: View always visible, Edit hidden when completed
4. Test `onClick` handlers fire with correct arguments
5. Test `BookingForm` validation: show errors on invalid submit
6. Test successful form submission calls API
7. Mock fetch/API responses for form submit test
8. Use `userEvent` for realistic interactions (type, click, select)

### Expected Code

```tsx
// __tests__/BookingCard.test.tsx
import { render, screen }          from "@testing-library/react"
import userEvent                   from "@testing-library/user-event"
import { BookingCard }             from "@/components/BookingCard"
import type { Booking }            from "@/types"

// ── Test fixture ─────────────────────────────────────────────
const mockBooking: Booking = {
  id:            42,
  school_name:   "Dubai Aquarium School",
  trip_type:     "international",
  status:        "pending",
  student_count: 45,
  amount:        5000,
  date_from:     "2025-03-10",
  date_to:       "2025-03-15",
  created_at:    "2025-02-01T10:00:00Z",
}

describe("BookingCard", () => {
  test("renders booking details", () => {
    render(<BookingCard booking={mockBooking} onAction={jest.fn()} />)

    expect(screen.getByText("Dubai Aquarium School")).toBeInTheDocument()
    expect(screen.getByText("AED 5,000.00")).toBeInTheDocument()
    expect(screen.getByText("45 students")).toBeInTheDocument()
    expect(screen.getByText("10 Mar – 15 Mar 2025")).toBeInTheDocument()
  })

  test("shows pending badge with correct styling", () => {
    render(<BookingCard booking={mockBooking} onAction={jest.fn()} />)

    const badge = screen.getByRole("status")
    expect(badge).toHaveTextContent("Pending")
    expect(badge).toHaveClass("bg-yellow-100", "text-yellow-800")
  })

  test("shows paid badge for paid booking", () => {
    const paid = { ...mockBooking, status: "paid" as const }
    render(<BookingCard booking={paid} onAction={jest.fn()} />)

    const badge = screen.getByRole("status")
    expect(badge).toHaveTextContent("Paid")
    expect(badge).toHaveClass("bg-green-100", "text-green-800")
  })

  test("View button is always visible", () => {
    render(<BookingCard booking={mockBooking} onAction={jest.fn()} />)
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument()
  })

  test("Edit button hidden when status is completed", () => {
    const completed = { ...mockBooking, status: "completed" as const }
    render(<BookingCard booking={completed} onAction={jest.fn()} />)

    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    // queryBy returns null instead of throwing — use for "should NOT exist" assertions
  })

  test("Edit button visible when status is pending", () => {
    render(<BookingCard booking={mockBooking} onAction={jest.fn()} />)
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  test("calls onAction with 'view' and booking id when View clicked", async () => {
    const user     = userEvent.setup()
    const onAction = jest.fn()
    render(<BookingCard booking={mockBooking} onAction={onAction} />)

    await user.click(screen.getByRole("button", { name: /view/i }))

    // Verify the handler was called with the right arguments
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith("view", 42)
  })

  test("calls onAction with 'edit' and booking id when Edit clicked", async () => {
    const user     = userEvent.setup()
    const onAction = jest.fn()
    render(<BookingCard booking={mockBooking} onAction={onAction} />)

    await user.click(screen.getByRole("button", { name: /edit/i }))

    expect(onAction).toHaveBeenCalledWith("edit", 42)
  })

  test("shows international trip icon for international bookings", () => {
    render(<BookingCard booking={mockBooking} onAction={jest.fn()} />)
    // Query by aria-label for icons
    expect(screen.getByLabelText(/international trip/i)).toBeInTheDocument()
  })
})
```

```tsx
// __tests__/BookingForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent                   from "@testing-library/user-event"
import { BookingForm }             from "@/components/BookingForm"

// Mock the API module — isolates form from network
jest.mock("@/services/bookingApi", () => ({
  bookingApi: {
    create: jest.fn(),
    update: jest.fn(),
  },
}))
import { bookingApi } from "@/services/bookingApi"

// Helper: fill required fields
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole("combobox", { name: /school/i }), "1")
  await user.click(screen.getByRole("radio",  { name: /domestic/i }))
  await user.type(screen.getByRole("spinbutton", { name: /student count/i }), "30")
  await user.type(screen.getByLabelText(/from/i), "2025-03-10")
  await user.type(screen.getByLabelText(/to/i),   "2025-03-15")
}

describe("BookingForm", () => {
  const onSuccess = jest.fn()
  const onCancel  = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup()
    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getByRole("button", { name: /submit/i }))

    // Validation messages appear
    expect(screen.getByText(/school is required/i)).toBeInTheDocument()
    expect(screen.getByText(/trip type is required/i)).toBeInTheDocument()
    expect(screen.getByText(/student count is required/i)).toBeInTheDocument()

    // API was NOT called — form aborted before submission
    expect(bookingApi.create).not.toHaveBeenCalled()
  })

  test("shows error for student count below minimum", async () => {
    const user = userEvent.setup()
    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await user.type(screen.getByRole("spinbutton", { name: /student count/i }), "0")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    expect(screen.getByText(/minimum 1 student/i)).toBeInTheDocument()
  })

  test("submits successfully and calls onSuccess", async () => {
    const user        = userEvent.setup()
    const mockBooking = { id: 1, school_name: "Test School", status: "pending" }

    // Configure mock to resolve successfully
    ;(bookingApi.create as jest.Mock).mockResolvedValueOnce(mockBooking)

    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /submit/i }))

    // Wait for the async submission to complete
    await waitFor(() => {
      expect(bookingApi.create).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledWith(mockBooking)
    })
  })

  test("shows server validation errors from 422 response", async () => {
    const user = userEvent.setup()

    // Mock a 422 validation error response
    ;(bookingApi.create as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          errors: {
            school_id:     ["School not found"],
            student_count: ["Exceeds school capacity"],
          },
        },
      },
    })

    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByText("School not found")).toBeInTheDocument()
      expect(screen.getByText("Exceeds school capacity")).toBeInTheDocument()
    })
  })

  test("shows generic error for 500 response", async () => {
    const user = userEvent.setup()
    ;(bookingApi.create as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i)
    })
  })

  test("disables submit button while submitting", async () => {
    const user = userEvent.setup()
    // Never resolves — simulates slow network
    ;(bookingApi.create as jest.Mock).mockReturnValue(new Promise(() => {}))

    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /submit/i }))

    // Button should be disabled during the pending request
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled()
  })

  test("calls onCancel when Cancel clicked", async () => {
    const user = userEvent.setup()
    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test("shows international fields when international selected", async () => {
    const user = userEvent.setup()
    render(<BookingForm onSuccess={onSuccess} onCancel={onCancel} />)

    // International fields hidden initially
    expect(screen.queryByLabelText(/visa arrangement/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: /international/i }))

    // Now visible
    expect(screen.getByLabelText(/visa arrangement/i)).toBeInTheDocument()
  })
})
```

### Query Priority (RTL Best Practices)

| Priority | Query | When to use |
|----------|-------|-------------|
| 1st | `getByRole` | Most elements — buttons, inputs, headings, lists |
| 2nd | `getByLabelText` | Form fields associated with `<label>` |
| 3rd | `getByPlaceholderText` | When no label exists |
| 4th | `getByText` | Non-interactive elements — paragraphs, spans |
| 5th | `getByTestId` | Last resort when no semantic query works |

### `getBy` vs `queryBy` vs `findBy`

| Query | Throws if missing? | Returns | Use for |
|-------|-------------------|---------|---------|
| `getBy*` | Yes (synchronous) | Element | Asserting element IS present |
| `queryBy*` | No (returns null) | Element \| null | Asserting element is NOT present |
| `findBy*` | Yes (async, awaited) | Promise\<Element\> | Element that appears after async work |

### What We're Evaluating

- `userEvent.setup()` — modern API, returns a user instance with realistic browser simulation
- `screen.queryByRole()` returning `null` — used with `.not.toBeInTheDocument()` for absence assertions
- `jest.fn()` — stub; `toHaveBeenCalledWith(arg1, arg2)` — verify exact call arguments
- `jest.mock("@/services/bookingApi")` — replaces entire module; `mockResolvedValueOnce` for one call
- `waitFor(() => expect(...))` — polls assertion until it passes or times out
- `beforeEach(() => jest.clearAllMocks())` — prevent mock state from leaking between tests
- `new Promise(() => {})` — a never-resolving promise; simulates in-flight request for disabled state test

---

## Problem 02 — Testing Custom Hooks & Async Logic (Hard)

### Scenario

Test custom hooks in isolation: `useBookings` data fetching, `useDebounce` timing, and Zustand store actions.

### Requirements

1. Test `useBookings` hook with `renderHook` from RTL
2. Mock API responses for hook tests
3. Test loading → data → error state transitions
4. Test `useDebounce` with fake timers (`jest.useFakeTimers`)
5. Test Zustand store actions directly
6. Test optimistic update + rollback on failure
7. Use `act()` for state updates

### Expected Code

```tsx
// __tests__/hooks/useDebounce.test.ts
import { renderHook, act } from "@testing-library/react"
import { useDebounce }     from "@/hooks/useDebounce"

describe("useDebounce", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(()  => jest.useRealTimers())

  test("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300))
    expect(result.current).toBe("hello")
  })

  test("does not update before delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 300 } }
    )

    rerender({ value: "hello world", delay: 300 })

    // Advance time partially — should NOT have updated yet
    act(() => jest.advanceTimersByTime(200))
    expect(result.current).toBe("hello")
  })

  test("updates after delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    )

    rerender({ value: "hello world" })

    act(() => jest.advanceTimersByTime(300))
    expect(result.current).toBe("hello world")
  })

  test("only uses latest value when changed multiple times", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    )

    rerender({ value: "ab" })
    act(() => jest.advanceTimersByTime(100))   // reset timer
    rerender({ value: "abc" })
    act(() => jest.advanceTimersByTime(100))   // reset again
    rerender({ value: "abcd" })

    act(() => jest.advanceTimersByTime(300))   // final timer fires
    expect(result.current).toBe("abcd")        // only the last value
  })
})
```

```tsx
// __tests__/hooks/useBookings.test.ts
import { renderHook, waitFor, act } from "@testing-library/react"
import { useBookings }              from "@/hooks/useBookings"
import { bookingApi }               from "@/services/bookingApi"

jest.mock("@/services/bookingApi")

const mockBookings = [
  { id: 1, school_name: "SSI", status: "pending",  amount: 5000 },
  { id: 2, school_name: "NIS", status: "paid",     amount: 8000 },
]

describe("useBookings", () => {
  beforeEach(() => jest.clearAllMocks())

  test("starts with loading state", () => {
    // Mock that never resolves → hook stays in loading state
    ;(bookingApi.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useBookings())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.bookings).toEqual([])
    expect(result.current.error).toBeNull()
  })

  test("transitions loading → data on success", async () => {
    ;(bookingApi.getAll as jest.Mock).mockResolvedValueOnce({
      data: mockBookings,
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 },
    })

    const { result } = renderHook(() => useBookings())

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.bookings).toEqual(mockBookings)
    expect(result.current.error).toBeNull()
  })

  test("transitions loading → error on failure", async () => {
    ;(bookingApi.getAll as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    )

    const { result } = renderHook(() => useBookings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe("Network error")
    expect(result.current.bookings).toEqual([])
  })

  test("setFilter refetches with new params", async () => {
    ;(bookingApi.getAll as jest.Mock)
      .mockResolvedValueOnce({ data: mockBookings, meta: {} })
      .mockResolvedValueOnce({ data: [mockBookings[1]], meta: {} })

    const { result } = renderHook(() => useBookings())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Change filter
    act(() => {
      result.current.setFilter("status", "paid")
    })

    await waitFor(() => {
      expect(result.current.bookings).toEqual([mockBookings[1]])
    })

    // API called twice: initial load + after filter change
    expect(bookingApi.getAll).toHaveBeenCalledTimes(2)
    expect(bookingApi.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "paid" })
    )
  })

  test("optimistic delete removes booking instantly, then confirms", async () => {
    ;(bookingApi.getAll as jest.Mock).mockResolvedValueOnce({
      data: mockBookings, meta: {},
    })
    ;(bookingApi.delete as jest.Mock).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useBookings())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => { result.current.deleteBooking(1) })

    // Optimistic: removed immediately
    expect(result.current.bookings).not.toContainEqual(
      expect.objectContaining({ id: 1 })
    )

    await waitFor(() => {
      expect(bookingApi.delete).toHaveBeenCalledWith(1)
    })
  })

  test("optimistic delete rolls back on server failure", async () => {
    ;(bookingApi.getAll as jest.Mock).mockResolvedValueOnce({
      data: mockBookings, meta: {},
    })
    ;(bookingApi.delete as jest.Mock).mockRejectedValueOnce(
      new Error("Server error")
    )

    const { result } = renderHook(() => useBookings())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => { result.current.deleteBooking(1) })

    // Wait for rollback to complete
    await waitFor(() => {
      // Booking is restored after the server rejects
      expect(result.current.bookings).toContainEqual(
        expect.objectContaining({ id: 1 })
      )
    })
  })
})
```

```tsx
// __tests__/stores/bookingStore.test.ts
import { act, renderHook } from "@testing-library/react"
import { useBookingStore } from "@/stores/bookingStore"

// Reset Zustand store state between tests
beforeEach(() => {
  useBookingStore.getState().reset()
})

describe("useBookingStore", () => {
  const mockBookings = [
    { id: 1, status: "pending", amount: 5000 },
    { id: 2, status: "paid",    amount: 8000 },
  ]

  test("setBookings updates state", () => {
    act(() => {
      useBookingStore.getState().setBookings(mockBookings)
    })
    expect(useBookingStore.getState().bookings).toEqual(mockBookings)
  })

  test("updateBookingStatus changes single item", () => {
    act(() => {
      useBookingStore.getState().setBookings(mockBookings)
      useBookingStore.getState().updateBookingStatus(1, "paid")
    })

    const updated = useBookingStore.getState().bookings.find((b) => b.id === 1)
    expect(updated?.status).toBe("paid")
  })

  test("selectPaidBookings derived selector", () => {
    act(() => {
      useBookingStore.getState().setBookings(mockBookings)
    })

    const { result } = renderHook(() =>
      useBookingStore((state) => state.bookings.filter((b) => b.status === "paid"))
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe(2)
  })

  test("totalRevenue selector updates when bookings change", () => {
    const { result } = renderHook(() =>
      useBookingStore((state) =>
        state.bookings.reduce((sum, b) => sum + b.amount, 0)
      )
    )

    expect(result.current).toBe(0)

    act(() => {
      useBookingStore.getState().setBookings(mockBookings)
    })

    expect(result.current).toBe(13000)
  })

  test("reset clears all state", () => {
    act(() => {
      useBookingStore.getState().setBookings(mockBookings)
      useBookingStore.getState().reset()
    })

    expect(useBookingStore.getState().bookings).toEqual([])
  })
})
```

```tsx
// __tests__/hooks/useFetch.test.ts — testing with MSW server
import { renderHook, waitFor } from "@testing-library/react"
import { useFetch }            from "@/hooks/useFetch"
import { server }              from "@/mocks/server"
import { http, HttpResponse }  from "msw"

describe("useFetch", () => {
  test("fetches and returns data", async () => {
    server.use(
      http.get("/api/bookings", () =>
        HttpResponse.json({ data: [{ id: 1 }] })
      )
    )

    const { result } = renderHook(() => useFetch("/api/bookings"))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({ data: [{ id: 1 }] })
    expect(result.current.error).toBeNull()
  })

  test("skips fetch when url is null", () => {
    const { result } = renderHook(() => useFetch(null))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  test("refetch re-triggers the fetch", async () => {
    let callCount = 0
    server.use(
      http.get("/api/bookings", () => {
        callCount++
        return HttpResponse.json({ data: [] })
      })
    )

    const { result } = renderHook(() => useFetch("/api/bookings"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => { result.current.refetch() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(callCount).toBe(2)
  })
})
```

### Fake Timer Patterns

```tsx
// jest.useFakeTimers() — replace setTimeout/setInterval with controllable versions
beforeEach(() => jest.useFakeTimers())
afterEach(()  => jest.useRealTimers())

// Advance time
act(() => jest.advanceTimersByTime(300))   // advance 300ms — triggers debounce

// Run all pending timers
act(() => jest.runAllTimers())

// Run only the next queued timer
act(() => jest.runOnlyPendingTimers())

// IMPORTANT: wrap timer advances in act() when they trigger React state updates
```

### What We're Evaluating

- `renderHook(() => useHook())` — renders hook in isolation without a component
- `result.current` — always read from `result.current` (not a local variable) to get latest value
- `rerender({ newProp })` — re-renders the hook with new props (like a parent re-rendering)
- `act(() => jest.advanceTimersByTime(N))` — wraps timer advancement; flushes React state
- `jest.useFakeTimers()` / `jest.useRealTimers()` — must restore real timers in `afterEach`
- `useBookingStore.getState()` — Zustand's escape hatch; read/write store state outside React
- `useBookingStore.getState().reset()` in `beforeEach` — resets Zustand state between tests
- `waitFor(() => expect(...))` — polls until assertion passes (for async state transitions)
- `expect.objectContaining({ id: 1 })` — partial match; other fields don't matter
- `toContainEqual` — checks if array contains an element that matches the expected value
