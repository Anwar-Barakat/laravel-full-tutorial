// SOLUTION 01 — Structure & Static Rendering Tests
// Focus: test file setup, mock data, rendering assertions, conditional display

// ─── FILE STRUCTURE ────────────────────────────────────────────────────────────

// Import render, screen from @testing-library/react
// Import describe, test, expect, vi, beforeEach from vitest
// Import BookingCard from the component file

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────

// Define a base mockBooking object outside all describe/test blocks
// so it can be reused across tests without duplication
//   id: 42
//   schoolName: 'Green Valley Primary'
//   status: 'pending'
//   amount: 125.50

// Define mockOnConfirm and mockOnCancel as vi.fn() at module level
// Reset them in beforeEach with mockOnConfirm.mockReset() to prevent bleed between tests

// ─── DESCRIBE BLOCK ────────────────────────────────────────────────────────────

// describe('BookingCard', () => {

//   beforeEach(() => {
//     Reset both mock functions here so each test starts clean
//   })

// ─── TEST 1: renders school name ───────────────────────────────────────────────

//   Render <BookingCard booking={mockBooking} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
//   Use screen.getByTestId('school-name') to find the element
//   Assert .toHaveTextContent('Green Valley Primary')

// ─── TEST 2: renders formatted amount in GBP ───────────────────────────────────

//   Render the component with booking.amount = 125.50
//   Use screen.getByTestId('amount')
//   Assert .toHaveTextContent('£125.50')
//   Note: Intl.NumberFormat('en-GB') formats 125.50 as '£125.50' in Node/jsdom
//   If the test environment does not support Intl, use toHaveTextContent(/125/)
//   with a regex fallback to avoid locale-sensitive failures in CI

// ─── TEST 3: renders status text ───────────────────────────────────────────────

//   Use screen.getByTestId('status')
//   Assert .toHaveTextContent('pending')
//   This confirms the status string is rendered inside the span

// ─── TEST 4: applies correct CSS class for status ──────────────────────────────

//   Use screen.getByTestId('status')
//   Assert .toHaveClass('status-pending')
//   Repeat this pattern in separate tests for 'confirmed', 'paid', 'cancelled'
//   by creating variant mock bookings with a different status field

// ─── TEST 5: shows confirm and cancel buttons when status is pending ───────────

//   Render with status = 'pending'
//   Assert screen.getByTestId('confirm-btn').toBeInTheDocument()
//   Assert screen.getByTestId('cancel-btn').toBeInTheDocument()
//   Both buttons should exist simultaneously for pending status

// ─── TEST 6: hides confirm button when status is confirmed ─────────────────────

//   Create a variant booking with status = 'confirmed'
//   Render the component
//   Assert screen.queryByTestId('confirm-btn') is null (.not.toBeInTheDocument())
//   Assert screen.getByTestId('cancel-btn').toBeInTheDocument() — cancel still shows
//   queryByTestId returns null instead of throwing when element is absent

// ─── TEST 7: hides both buttons when status is paid ────────────────────────────

//   Create a variant booking with status = 'paid'
//   Render the component
//   Assert screen.queryByTestId('confirm-btn').not.toBeInTheDocument()
//   Assert screen.queryByTestId('cancel-btn').not.toBeInTheDocument()
//   Neither button should appear for a completed booking

// ─── TEST 8: hides both buttons when status is cancelled ───────────────────────

//   Same pattern as test 7 but with status = 'cancelled'
//   This documents that the component treats cancelled the same as paid
//   for button visibility purposes

// ─── KEY QUERY METHODS REFERENCE ───────────────────────────────────────────────

// screen.getByTestId()   — throws if not found, use when element must be present
// screen.queryByTestId() — returns null if not found, use for .not.toBeInTheDocument()
// screen.getByText()     — matches by visible text content
// screen.getByRole()     — preferred for interactive elements (button, combobox, etc.)
