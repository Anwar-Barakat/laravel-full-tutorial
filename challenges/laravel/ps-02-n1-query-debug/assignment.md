# Challenge 02 — N+1 Query Debug

**Format:** DEBUG
**Topic:** Find and fix N+1 queries in a controller
**App:** Tripz — Laravel school booking platform

---

## Problem

This `BookingsController` is causing **150+ database queries** on every page load in the admin bookings list. A page that should run 2–3 queries is hammering the database.

Your job is to:
1. Identify every N+1 query source in the code below.
2. Fix all of them.
3. Add pagination (15 per page).
4. Load only the columns that are actually needed.
5. Comment your "before" query count vs "after" query count.

---

## Starter Code (Broken)

```php
// BookingsController.php

class BookingsController extends Controller
{
    public function index()
    {
        $bookings = Booking::all();

        return view('bookings.index', [
            'bookings' => $bookings,
        ]);
    }

    public function show(Booking $booking)
    {
        return view('bookings.show', [
            'booking'  => $booking,
            'school'   => $booking->school,
            'trip'     => $booking->trip,
            'payments' => $booking->payments,
        ]);
    }
}
```

```blade
{{-- resources/views/bookings/index.blade.php --}}

@foreach($bookings as $booking)
    <tr>
        <td>{{ $booking->school->name }}</td>
        <td>{{ $booking->trip->destination }}</td>
        <td>{{ $booking->payments->sum('amount') }}</td>
        <td>{{ $booking->trip->school->region }}</td>
        <td>{{ $booking->user->email }}</td>
    </tr>
@endforeach
```

---

## Relationships Reference

```
Booking  belongsTo  School
Booking  belongsTo  Trip
Booking  belongsTo  User
Booking  hasMany    Payment
Trip     belongsTo  School
```

---

## Requirements

1. Fix every N+1 query in both `index()` and `show()`.
2. Use `paginate(15)` in `index()` — not `all()` or `get()`.
3. Use `select()` to load only the columns that the view actually uses.
4. In a comment at the top of your fixed controller, state:
   - Query count before your fix (estimate for 30 bookings on the page).
   - Query count after your fix.
5. Do not change the Blade template structure (columns stay the same).

---

## Expected Behaviour After Fix

- Loading the index page with 30 bookings on it: **4 queries total** (bookings + schools + trips + users + payments — with smart column selection).
- No query should fire inside the `@foreach` loop.
- The `show()` page should run **1 query** (booking already loaded via route model binding; relationships loaded with a single `load()` call).

---

## Hints

- `with(['relation1', 'relation2'])` eager-loads multiple relationships in one call.
- Nested relationships use dot notation: `with('trip.school')`.
- `withSum('payments', 'amount')` loads the sum as a virtual column without loading all Payment models.
- In `show()`, the model is already loaded by route model binding — use `$booking->load(...)` instead of re-querying.
- Laravel Debugbar or Telescope can show you the exact query count per request — install one locally to verify your fix.
