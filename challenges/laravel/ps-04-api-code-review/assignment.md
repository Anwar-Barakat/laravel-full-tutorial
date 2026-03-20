# Challenge 04 — API Code Review

**Format:** REVIEW
**Topic:** Spot all problems in this API code
**App:** Tripz — Laravel school booking platform

---

## Problem

You are reviewing a pull request. The developer has written a `BookingController` for the Tripz API.

**Your job:** Find every problem in this code. Security issues, performance issues, bad practices, missing validation, wrong status codes, missing error handling — everything that should not go to production.

List each issue with:
1. A short label for the problem.
2. An explanation of why it is a problem.
3. What the fix is.

You must identify **at least 8 distinct problems**.

---

## Code to Review

```php
// routes/api.php

Route::post('/bookings', [BookingController::class, 'store']);
Route::get('/bookings', [BookingController::class, 'index']);
Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);
```

```php
// BookingController.php

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $bookings = Booking::all();

        if ($request->school_id) {
            $bookings = $bookings->filter(fn($b) => $b->school_id == $request->school_id);
        }

        return response()->json($bookings);
    }

    public function store(Request $request)
    {
        $booking = Booking::create($request->all());

        return response()->json($booking);
    }

    public function destroy($id)
    {
        $booking = Booking::find($id);
        $booking->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
```

---

## Requirements

- List each problem clearly — one problem per item.
- Explain why each one matters (security impact, performance impact, correctness issue, etc.).
- For each problem, state the fix in plain language.
- Write the corrected version of the full controller in your solution (as code comments).
- Do not fix only some of the problems — catch all of them.

---

## Hints

- Think about what happens when `Booking::find($id)` returns `null`.
- Think about who can currently call these endpoints.
- Think about what `$request->all()` contains.
- Think about what `Booking::all()` does to a table with 50,000 rows.
- Think about HTTP status code conventions for `store` and `destroy`.
- Think about what `==` vs `===` means in PHP when comparing IDs.
- Think about what the `filter()` method runs on — a Collection or a Query Builder?
- Think about whether soft deletes should be used here.
