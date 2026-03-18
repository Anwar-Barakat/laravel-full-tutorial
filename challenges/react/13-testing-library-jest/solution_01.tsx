// ============================================================
// Problem 01 — Testing Booking Components
// ============================================================



// ============================================================
// __tests__/BookingCard.test.tsx
//
// mockBooking: { id: 42, school_name, status: "pending", student_count, amount, dates }
//
// test "renders booking details":
//   render(<BookingCard booking onAction={jest.fn()} />)
//   getByText("Dubai Aquarium School") toBeInTheDocument
//   getByText("AED 5,000.00")
//   getByText("45 students")
//
// test "shows pending badge with correct styling":
//   getByRole("status") → toHaveTextContent("Pending")
//   toHaveClass("bg-yellow-100", "text-yellow-800")
//
// test "shows paid badge for paid booking":
//   spread mockBooking with status: "paid"
//   getByRole("status") → toHaveClass("bg-green-100", "text-green-800")
//
// test "Edit button hidden when status is completed":
//   queryByRole("button", { name: /edit/i }) → not.toBeInTheDocument()
//   queryBy returns null — use for "should NOT exist" assertions
//
// test "calls onAction with 'view' and booking id when View clicked":
//   const onAction = jest.fn()
//   await user.click(getByRole("button", { name: /view/i }))
//   toHaveBeenCalledTimes(1)
//   toHaveBeenCalledWith("view", 42)
// ============================================================



// ============================================================
// __tests__/BookingForm.test.tsx
//
// jest.mock("@/services/bookingApi") — replace module with auto-mock
//
// fillRequiredFields(user): helper that fills school, trip type, student count, dates
//
// test "shows validation errors when submitted empty":
//   click submit without filling form
//   getByText(/school is required/i) toBeInTheDocument
//   bookingApi.create NOT called
//
// test "submits successfully and calls onSuccess":
//   (bookingApi.create as jest.Mock).mockResolvedValueOnce(mockBooking)
//   fillRequiredFields + click submit
//   await waitFor(() => {
//     bookingApi.create toHaveBeenCalledTimes(1)
//     onSuccess toHaveBeenCalledWith(mockBooking)
//   })
//
// test "shows server 422 validation errors":
//   mockRejectedValueOnce({ response: { status: 422, data: { errors: {...} } } })
//   await waitFor(() => getByText("School not found") toBeInTheDocument)
//
// test "disables submit button while submitting":
//   mockReturnValue(new Promise(() => {}))  ← never resolves
//   after click: getByRole("button", { name: /submit/i }) toBeDisabled()
//
// test "shows international fields when international radio selected":
//   queryByLabelText(/visa/i) → not.toBeInTheDocument()  (before)
//   await user.click(getByRole("radio", { name: /international/i }))
//   getByLabelText(/visa/i) → toBeInTheDocument()  (after)
// ============================================================



// ============================================================
// Query priority cheatsheet:
//   1. getByRole        — buttons, inputs, headings, lists (semantic)
//   2. getByLabelText   — form fields with <label>
//   3. getByText        — paragraphs, spans
//   4. getByTestId      — last resort
//
// getBy  → throws if missing  (asserting IS present)
// queryBy → null if missing   (asserting NOT present)
// findBy  → async, throws     (appears after async work)
// ============================================================
