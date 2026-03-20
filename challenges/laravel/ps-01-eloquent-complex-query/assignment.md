# Challenge 01 — Eloquent Complex Query

**Format:** BUILD
**Topic:** Eloquent ORM — complex reporting query
**App:** Tripz — Laravel school booking platform

---

## Problem

Build a monthly revenue report for the Tripz admin dashboard.

You are given three tables:

| Table     | Columns |
|-----------|---------|
| `bookings` | `id`, `trip_id`, `school_id`, `status` (`pending`/`confirmed`/`paid`/`cancelled`), `amount`, `created_at` |
| `trips`    | `id`, `destination`, `departure_date` |
| `schools`  | `id`, `name`, `region` |

Write an Eloquent query (or Query Builder) that returns, **for each month of the current year**, the following fields:

| Field | Description |
|-------|-------------|
| `month` | Full month name (e.g. `"January"`) |
| `total_bookings` | Count of all bookings that month |
| `confirmed_bookings` | Count of bookings where `status = 'confirmed'` |
| `total_revenue` | Sum of `amount` where `status = 'paid'` (0 if none) |
| `top_destination` | The trip destination with the most bookings that month |
| `avg_booking_value` | Average `amount` across all bookings that month |

---

## Starter Code

```php
class ReportController extends Controller
{
    public function monthlyRevenue()
    {
        // TODO: Build the monthly revenue report query
        // Return JSON with monthly breakdown

        return response()->json([]);
    }
}
```

---

## Requirements

1. Use Eloquent or Query Builder — no raw SQL strings passed directly to `DB::statement()`.
2. Handle months with no bookings — they must still appear in the result with zeros/nulls.
3. Results must be ordered January → December.
4. Avoid N+1: must be a single query or a fixed small number of queries (no looping queries).
5. The `top_destination` field requires a subquery — do not compute it in PHP after the fact.

---

## Expected Output Shape

```json
[
  {
    "month": "January",
    "total_bookings": 42,
    "confirmed_bookings": 30,
    "total_revenue": 12500.00,
    "top_destination": "Paris",
    "avg_booking_value": 297.62
  },
  {
    "month": "February",
    "total_bookings": 0,
    "confirmed_bookings": 0,
    "total_revenue": 0,
    "top_destination": null,
    "avg_booking_value": 0
  }
]
```

---

## Hints

- `MONTHNAME()` and `MONTH()` are valid MySQL functions inside `selectRaw` / `groupByRaw`.
- A correlated subquery inside `selectRaw` can find the top destination per month.
- `COALESCE(SUM(amount), 0)` prevents nulls when there are no paid bookings.
- To guarantee all 12 months appear, think about how to generate a months scaffold — either with a `Collection::times(12, ...)` approach in PHP after the query, or by joining against a months reference.
