# Challenge 20 — Collection Chain Debug

**Format:** DEBUG
**Topic:** Find and fix bugs in broken Collection chains
**App:** Tripz — Laravel school booking platform

---

## Brief

Five Collection operations in the Tripz codebase are producing wrong results. Each one has a specific bug. Your job is to identify exactly what is wrong, explain why it produces the incorrect result, and provide the correct fix.

---

## Broken Code

```php
<?php

// -------------------------------------------------------
// BUG 1
// Should return the total revenue of all paid bookings.
// Actual result: always returns 0 instead of ~45000.
// -------------------------------------------------------
$revenue = Booking::all()
    ->where('status', 'paid')
    ->sum('amount');


// -------------------------------------------------------
// BUG 2
// Should return unique trip destinations sorted A–Z.
// Actual result: returns duplicates.
// -------------------------------------------------------
$destinations = Trip::all()
    ->map(fn($t) => $t->destination)
    ->sort()
    ->values();


// -------------------------------------------------------
// BUG 3
// Should group all 2024 bookings by month and return counts.
// Actual result: months with zero bookings are missing entirely.
// -------------------------------------------------------
$byMonth = Booking::whereYear('created_at', 2024)->get()
    ->groupBy(fn($b) => $b->created_at->format('Y-m'))
    ->map(fn($group) => $group->count());


// -------------------------------------------------------
// BUG 4
// Should update all pending bookings to confirmed status
// and persist the change to the database.
// Actual result: no rows are updated in the DB.
// -------------------------------------------------------
$bookings = Booking::where('status', 'pending')->get();
$bookings->each(function ($booking) {
    $booking->status = 'confirmed';
});


// -------------------------------------------------------
// BUG 5
// Should return the booking with the highest amount.
// Actual result: returns the booking with the lowest amount.
// -------------------------------------------------------
$highest = Booking::all()->min('amount');
```

---

## Your Tasks

For each bug:

1. **Identify the bug** — what is the exact mistake?
2. **Explain the cause** — why does it produce the wrong result?
3. **Write the fix** — show the corrected code

---

## Expected Correct Results

```php
// Bug 1 fix should return: 45000.00  (float)

// Bug 2 fix should return:
// ['Abu Dhabi', 'Barcelona', 'Dubai', 'London', 'Paris']  (unique, sorted)

// Bug 3 fix should return:
// ['2024-01' => 0, '2024-02' => 14, '2024-03' => 0, ..., '2024-12' => 7]
// (all 12 months present, zero for months with no bookings)

// Bug 4 fix should result in:
// All previously-pending bookings now having status = 'confirmed' in the database

// Bug 5 fix should return: 8750.00  (the highest booking amount)
```

---

## Constraints

- Explain each bug in plain language (no jargon — a junior developer must understand it)
- For Bug 4, provide two valid fix approaches
- For Bug 3, the fix must include ALL 12 months of 2024, zero-filled
