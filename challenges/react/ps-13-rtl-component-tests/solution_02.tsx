// SOLUTION 02 — Interaction Tests, Async State, Callback Verification
// Focus: userEvent vs fireEvent, async assertions, loading states, callback args

// ─── WHY userEvent OVER fireEvent ──────────────────────────────────────────────

// fireEvent.click() dispatches a single synthetic DOM event
// userEvent.click() simulates the full sequence a real browser produces:
//   pointerover → pointerenter → mouseover → mousemove → mousedown →
//   focus → mouseup → click
// userEvent is more realistic and catches bugs that fireEvent misses
// Always prefer: import userEvent from '@testing-library/user-event'
// Call userEvent.setup() at the top of each test (or in beforeEach) for v14+

// ─── ASYNC SETUP PATTERN ───────────────────────────────────────────────────────

// userEvent methods are async in v14+, so tests must be async functions
// Pattern:
//   const user = userEvent.setup()
//   await user.click(button)
// The user instance batches pointer and keyboard events correctly

// ─── TEST 9: clicking confirm calls onConfirm with the booking id ──────────────

//   Create user = userEvent.setup()
//   Render the component with a pending booking (id = 42)
//   Find the confirm button with screen.getByTestId('confirm-btn')
//   await user.click(confirmBtn)
//   Assert expect(mockOnConfirm).toHaveBeenCalledTimes(1)
//   Assert expect(mockOnConfirm).toHaveBeenCalledWith(42)
//   This verifies the correct id is passed, not just that the function was called

// ─── TEST 10: confirm button shows 'Confirming...' and is disabled ─────────────

//   This tests the intermediate loading state that appears between click and resolution
//   Make onConfirm a mock that returns a Promise that does not resolve immediately:
//     mockOnConfirm.mockImplementation(() => new Promise(() => {})) // never resolves
//   Render the component and click confirm
//   Do NOT await — check state synchronously after click dispatches
//   Assert screen.getByTestId('confirm-btn') has text 'Confirming...'
//   Assert expect(confirmBtn).toBeDisabled()
//   This catches UX regressions where the button doesn't lock during the async call

// ─── TEST 11: confirm button re-enables after confirmation completes ───────────

//   Make onConfirm resolve immediately: mockOnConfirm.mockResolvedValue(undefined)
//   Render and click confirm
//   Use await waitFor(() => { expect(confirmBtn).not.toBeDisabled() })
//   waitFor polls the assertion until it passes or times out (1000ms default)
//   Also assert the button text returns to 'Confirm' after resolution

// ─── TEST 12: clicking cancel calls onCancel with the correct id ───────────────

//   Render with a pending booking (both buttons visible)
//   await user.click(screen.getByTestId('cancel-btn'))
//   Assert expect(mockOnCancel).toHaveBeenCalledWith(42)
//   Assert expect(mockOnConfirm).not.toHaveBeenCalled() — confirm was not triggered
//   This verifies the cancel path is independent of confirm

// ─── INTL.NUMBERFORMAT IN TEST ENVIRONMENTS ────────────────────────────────────

// Node/jsdom supports Intl natively since Node 13+
// For amount = 125.50, Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
// produces '£125.50' in most environments
// If running in a CI environment that strips ICU data, the output may vary
// Safe assertion: screen.getByTestId('amount').toHaveTextContent(/£125\.50/)
// Regex approach tolerates minor whitespace or unicode differences in currency symbol
// Do not hardcode the exact unicode character for £ — use the regex /£/ instead

// ─── CALLBACK ARGUMENT MATCHERS ────────────────────────────────────────────────

// expect(fn).toHaveBeenCalledWith(42)         exact argument match
// expect(fn).toHaveBeenCalledWith(expect.any(Number))  type-only match
// expect(fn).toHaveBeenCalledTimes(1)         call count assertion
// expect(fn).not.toHaveBeenCalled()           ensures no unintended calls
// These four matchers cover most callback verification scenarios

// ─── WAITFOR USAGE GUIDELINES ──────────────────────────────────────────────────

// Use waitFor when asserting on state that updates asynchronously after an event
// Do not put multiple assertions inside one waitFor — put the first flaky assertion
// inside and the rest outside, so failures are clearly located
// waitFor(() => expect(something).toBe(true)) retries the callback on every DOM mutation
// Avoid using waitFor for synchronous assertions — it adds unnecessary delay
