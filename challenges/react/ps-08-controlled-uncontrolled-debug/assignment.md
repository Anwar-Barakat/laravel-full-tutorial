# Challenge 08 — Controlled vs Uncontrolled Input Debug

**Format:** DEBUG
**Topic:** Fix controlled vs uncontrolled input conflicts
**App:** Tripz — Laravel + React school booking platform

---

## Context

A junior developer on the Tripz team wrote this booking form quickly. The console shows multiple warnings, the studentCount field submits the wrong type, and sometimes the submitted data is stale. There are 5 distinct bugs to find and fix.

---

## Broken Code

```tsx
function BookingForm() {
  const [form, setForm] = useState({
    schoolName:   undefined,   // ← bug 1
    studentCount: '',
    status:       'pending',
    notes:        null,        // ← bug 2
  })

  // Bug 3: mutating state directly
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    form[e.target.name] = e.target.value
    setForm(form)
  }

  // Bug 4: not converting string to number
  function handleStudentCountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, studentCount: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Bug 5: submitting stale state inside async callback
    setTimeout(() => {
      fetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(form),  // ← may be stale
      })
    }, 0)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="schoolName"
        value={form.schoolName}
        onChange={handleChange}
      />
      <input
        name="studentCount"
        type="number"
        value={form.studentCount}
        onChange={handleStudentCountChange}
      />
      <textarea
        name="notes"
        value={form.notes}
        onChange={handleChange}
      />
      <select
        value={form.status}
        onChange={handleChange}
      >
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
      </select>
      <button type="submit">Submit</button>
    </form>
  )
}
```

---

## Observed Problems

1. Console warning on first render: `Warning: A component is changing an uncontrolled input to be controlled`
2. The same warning appears for the textarea
3. Typing in the `schoolName` field sometimes does not update the displayed value
4. `studentCount` arrives at the API as a string `"12"` instead of a number `12`
5. If the user clicks Submit very quickly after typing, the submitted data is sometimes missing the last few characters

---

## Your Task

Identify all 5 bugs, explain why each one causes the problem described, and provide the corrected code.

For each bug, you must state:
- What the bug is
- Why it causes the observed problem
- The fix

---

## Hints

- React determines whether an input is "controlled" or "uncontrolled" based on whether the `value` prop is `undefined` or a real value on the **first render**
- `null` is treated the same as `undefined` for this purpose
- `Object.is(form, form)` is always `true` — what does that mean for `setForm`?
- What does a closure capture, and when does that captured value become stale?

---

## Expected Output After Fixing

```tsx
// The form initialises with empty strings, not undefined or null
// handleChange spreads state correctly (no mutation)
// studentCount is stored and submitted as a number
// The submitted payload always reflects the latest state
// Zero console warnings
```

---

## What to Submit

The corrected `BookingForm` component with all 5 bugs fixed and a comment above each fix explaining what was wrong.
