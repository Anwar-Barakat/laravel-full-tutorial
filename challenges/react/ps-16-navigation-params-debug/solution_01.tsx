// SOLUTION 01 — Bugs 1, 2, and 3
// Focus: stale closure in useEffect, preserving search params during navigation, replace vs push

// ─── BUG 1: useEffect missing id in dependency array ─────────────────────────

// Root cause:
//   useEffect(() => { fetch(...id...) }, [])
//   The empty array [] means the effect runs ONCE on mount and never again
//   When React Router renders /bookings/2 into the same BookingDetail component
//   that was showing /bookings/1, the component does NOT unmount and remount
//   It stays mounted and the effect does not re-run — so booking #1's data remains
//   This is the stale closure bug: id changes but the effect doesn't know

// Symptom:
//   User is on /bookings/1 → clicks a link to /bookings/2
//   The URL updates to /bookings/2 but the booking name stays as booking 1's school

// Fix:
//   Add id to the dependency array: useEffect(() => { ... }, [id])
//   Now whenever id changes (React Router updates useParams), the effect re-runs
//   The new fetch replaces the stale data with data for the new booking id

// Additional improvement:
//   Add a cleanup / cancellation mechanism to ignore the result of the stale request
//   if the user navigates away before the fetch completes
//   Pattern: use a boolean flag `let cancelled = false` or AbortController
//   In the cleanup function, set cancelled = true / call abort()
//   In the .then() handler, check if cancelled before calling setBooking

// ─── BUG 2: navigate('/bookings') wipes all existing search params ────────────

// Root cause:
//   navigate('/bookings') replaces the entire URL with a bare pathname
//   Any existing query params (?date=2024-01-01&school=5) are discarded
//   The status local state is also never included in the new URL

// Symptom:
//   User has filters: /bookings?date=2024-01-01&school=5&status=confirmed
//   Changes status dropdown to 'pending' then clicks Apply
//   URL becomes: /bookings (all other filters lost)

// Fix approach A — build the search string manually:
//   Read existing params with useSearchParams()
//   Clone the params object and update only the status key
//   navigate({ pathname: '/bookings', search: params.toString() })

// Fix approach B — use setSearchParams instead of navigate:
//   If the component is already on /bookings, no pathname change is needed
//   setSearchParams(prev => { prev.set('status', status); return prev })
//   This updates only the changed param while preserving all others
//   Use this approach when the page does not change — only the filters

// Key principle:
//   When merging new params into existing ones, always read the current URLSearchParams
//   and update it, rather than constructing a new string from scratch
//   Constructing from scratch silently drops any param you forgot to include

// ─── BUG 3: navigate() pushes the form onto history ──────────────────────────

// Root cause:
//   After form submit, navigate(`/bookings/${booking.id}`) pushes a new entry
//   History stack: [dashboard, /bookings/new, /bookings/42]
//   Pressing back → goes to /bookings/new (the empty form)
//   The user fills in the form again — this is confusing and is often unintended

// The correct behaviour:
//   After creating a resource, the form page should not be in the back-stack
//   The user should be able to press back and reach the page BEFORE the form
//   History stack goal: [dashboard, /bookings/42]

// Fix:
//   Use navigate(`/bookings/${booking.id}`, { replace: true })
//   replace: true replaces the current history entry instead of pushing a new one
//   The form page is overwritten in the stack by the detail page

// When to use replace: true vs default (push):
//   replace: true — after form submits, after redirects, after completing a multi-step flow
//   default push — normal link-style navigations where back should return to the previous view

// Note: this is the same reason <Navigate replace /> is used in route guards —
// you don't want the redirect page in the back-stack
