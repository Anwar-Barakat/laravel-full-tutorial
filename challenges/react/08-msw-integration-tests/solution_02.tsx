// ============================================================
// Problem 02 — Test Patterns & Custom Matchers
// ============================================================



// ============================================================
// src/test/matchers.ts
//
// expect.extend({
//
//   toHaveAccessibleName(element, expectedName):
//     computeAccessibleName(element) from "dom-accessibility-api"
//     pass = actual === expected
//     message: "Expected element to have accessible name X, got Y"
//
//   toBeAccessible(element):
//     issues = []
//     check 1: element has a role (or is implicit semantic tag)
//     check 2: interactive elements (BUTTON, A, INPUT, SELECT) have accessible name
//     check 3: walk ancestors — no aria-hidden="true" parent
//     pass = issues.length === 0
//     message: list all issues found
//
// })
// ============================================================



// ============================================================
// src/test/page-objects/BookingListPage.ts
//
// private user = userEvent.setup()
//
// waitForLoad():
//   waitFor(() => queryByTestId("booking-table-skeleton") not in document)
//   await screen.findByRole("table", { name: /bookings/i })
//
// filterByStatus(status): selectOptions + waitForLoad()
// searchFor(query):       clear + type + waitForLoad()
//
// getBookingCount():  getAllByRole("row").length - 1  (minus header)
// getBookingRow(name): getByRole("row", { name: /name/i })
//
// clickCreateBooking(): click button "new booking"
// deleteBooking(name):  within(row).getByRole("button", delete) → click → confirm
// createBooking(data):  clickCreate + fillBookingForm + click submit + waitForLoad
// ============================================================



// ============================================================
// src/test/helpers.ts
//
// waitForLoadingToFinish():
//   waitFor(() => {
//     expect(queryByRole("progressbar")).not.toBeInTheDocument()
//     expect(queryByTestId("skeleton")).not.toBeInTheDocument()
//     expect(queryByText(/loading/i)).not.toBeInTheDocument()
//   }, { timeout: 3000 })
//
// fillBookingForm({ schoolName?, tripType?, studentCount?, dateFrom?, dateTo? }):
//   schoolName:   click combobox → type → findByRole("option") → click
//   tripType:     click radio by name
//   studentCount: clear spinbutton + type
//   dateFrom/To:  type into date inputs by label
// ============================================================



// ============================================================
// Accessibility tests
//
// expect.extend(toHaveNoViolations)  (from jest-axe)
//
// test "no axe violations":
//   const { container } = renderWithProviders(<BookingList bookings={...} />)
//   const results = await axe(container)
//   expect(results).toHaveNoViolations()
//
// test "status badges have aria-labels":
//   getByRole("status", { name: /booking status: pending/i })
//
// test "delete buttons are accessible":
//   getAllByRole("button", { name: /delete booking/i })
//   forEach btn → expect(btn).toBeAccessible()
//
// test "keyboard navigation":
//   user.tab() → row has focus
//   user.keyboard("{Enter}") → dialog opens → toBeAccessible()
//   user.keyboard("{Escape}") → dialog closed
// ============================================================



// ============================================================
// Snapshot tests
//
// test "pending booking matches snapshot":
//   bookingFactory with deterministic values (no faker — stable snapshot)
//   expect(container.firstChild).toMatchSnapshot()
//
// test "paid badge matches inline snapshot":
//   expect(getByRole("status")).toMatchInlineSnapshot(`
//     <span role="status" aria-label="Booking status: paid" class="...bg-green...">
//       Paid
//     </span>
//   `)
//   (inline snapshots stored in source — visible in PRs)
// ============================================================
