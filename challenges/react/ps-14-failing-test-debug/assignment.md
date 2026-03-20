# Challenge 14: Failing Test Debug (DEBUG)

**Topic:** Failing tests — fix the component code (not the tests)

**Context:** Tripz — Laravel + React school booking platform

---

## Task

These tests were written first using TDD. The component implementation is wrong.

**Fix the component to make all tests pass. Do NOT modify the tests.**

---

## Failing Tests

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { BookingFilters } from './BookingFilters'

describe('BookingFilters', () => {

  test('renders all status options', () => {
    render(<BookingFilters onFilterChange={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Pending' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Confirmed' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Paid' })).toBeInTheDocument()
  })

  test('calls onFilterChange with status when select changes', async () => {
    const onFilterChange = vi.fn()
    render(<BookingFilters onFilterChange={onFilterChange} />)

    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      'pending'
    )

    expect(onFilterChange).toHaveBeenCalledWith({ status: 'pending' })
  })

  test('calls onFilterChange with search after 300ms debounce', async () => {
    vi.useFakeTimers()
    const onFilterChange = vi.fn()
    render(<BookingFilters onFilterChange={onFilterChange} />)

    await userEvent.type(screen.getByRole('searchbox'), 'Green')

    expect(onFilterChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)

    expect(onFilterChange).toHaveBeenCalledWith({ search: 'Green' })
    vi.useRealTimers()
  })

  test('clears search when clear button clicked', async () => {
    render(<BookingFilters onFilterChange={vi.fn()} />)

    await userEvent.type(screen.getByRole('searchbox'), 'test')
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))

    expect(screen.getByRole('searchbox')).toHaveValue('')
  })
})
```

---

## The Broken Component

```tsx
// BookingFilters.tsx — this is the file you must fix
import { useState } from 'react'

export function BookingFilters({ onFilterChange }) {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  return (
    <div>
      <select onChange={e => onFilterChange(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
      </select>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
  )
}
```

---

## Requirements

- Identify exactly why each test fails against the current component
- Fix only `BookingFilters.tsx` — do not change the test file
- All 4 tests must pass after your fix
- Add TypeScript types to the component

---

## Hints

There are **4 distinct bugs** — one per test. Each test failure maps to a different missing or incorrect feature in the component.

---

## Expected Output

```
✓ BookingFilters > renders all status options
✓ BookingFilters > calls onFilterChange with status when select changes
✓ BookingFilters > calls onFilterChange with search after 300ms debounce
✓ BookingFilters > clears search when clear button clicked
```
