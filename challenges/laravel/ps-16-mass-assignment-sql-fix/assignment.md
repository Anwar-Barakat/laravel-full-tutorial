# Challenge 16: Mass Assignment and SQL Injection Fix

**Format:** REFACTOR
**Topic:** Fix mass assignment and SQL injection vulnerabilities
**App:** Tripz — Laravel school booking platform

---

## Problem

A security scan run against the staging branch has flagged three files with critical vulnerabilities. The fixes must not break the existing functionality — the endpoints must still accept the same inputs and return the same outputs. Your job is to refactor the vulnerable code so it is secure while remaining functionally identical.

---

## Files to Fix

### File 1 — BookingController (Mass Assignment)

```php
<?php

// app/Http/Controllers/BookingController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;

class BookingController extends Controller
{
    public function store(Request $request)
    {
        $booking = new Booking();
        $booking->fill($request->all());  // ← security issue
        $booking->save();

        return response()->json($booking, 201);
    }

    public function update(Request $request, Booking $booking)
    {
        $booking->update($request->all());  // ← security issue

        return response()->json($booking);
    }
}
```

**What the endpoint accepts (intended fields only):**
- `store`: school_id, trip_id, student_count, special_requirements, contact_name, contact_email
- `update`: student_count, special_requirements, contact_name, contact_email
  - Note: school_id and trip_id must NOT be changeable after creation

---

### File 2 — ReportController (SQL Injection)

```php
<?php

// app/Http/Controllers/ReportController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function byDateRange(Request $request)
    {
        $from = $request->from;
        $to   = $request->to;

        $results = DB::statement("
            SELECT school_id, COUNT(*) as count, SUM(amount) as total
            FROM bookings
            WHERE created_at BETWEEN '$from' AND '$to'
            GROUP BY school_id
        ");

        return response()->json($results);
    }
}
```

**What the endpoint accepts:** `from` and `to` as date strings (e.g. `2024-01-01`)

---

### File 3 — SearchController (Input Reflection / XSS Risk)

```php
<?php

// app/Http/Controllers/SearchController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Trip;

class SearchController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->q;

        return response()->json([
            'query'   => $query,           // ← reflects raw user input
            'results' => Trip::where('destination', 'like', "%$query%")->get(),
        ]);
    }
}
```

**What the endpoint accepts:** `q` as a search string

---

## Your Tasks

### Task 1 — Fix BookingController

Rewrite `store()` and `update()` so that:
- Only the intended fields are accepted (no extra columns can be written)
- Input is validated before the model is touched
- The response returns only safe, expected data

Explain which Laravel features you are using and why each one is important.

### Task 2 — Fix ReportController

Rewrite `byDateRange()` so that:
- The query cannot be injected via the `from` or `to` parameters
- Both dates are validated as proper dates before the query runs
- Invalid date formats return a 422 response, not a 500 error
- The fix uses the cleanest available Laravel/Eloquent approach

Explain the difference between `DB::statement()`, `DB::select()` with bindings, and `Eloquent whereBetween()`.

### Task 3 — Fix SearchController

Rewrite `search()` so that:
- The raw query input is not reflected back without validation
- The database query is safe from injection
- The response is consistent (validated/sanitised query echoed back)

Explain whether JSON responses are inherently safe from XSS and under what conditions they are not.

### Task 4 — Model Hardening

Describe the changes needed to the `Booking` model itself to make it safe regardless of what the controller does. Specifically:

- What is the difference between `$fillable` and `$guarded`?
- Which fields should be in `$fillable` on the Booking model?
- Why is `$guarded = []` dangerous even if you use `$request->only()` in the controller?
- What is the `$hidden` property and which Booking fields should use it?

---

## Expected Behaviour After Fix

### store() — valid request
```json
POST /bookings
{
  "school_id": 5,
  "trip_id": 12,
  "student_count": 30,
  "special_requirements": "Wheelchair access required",
  "contact_name": "Mrs Ahmed",
  "contact_email": "ahmed@school.co.uk"
}

Response 201:
{
  "id": 441,
  "school_id": 5,
  "trip_id": 12,
  "student_count": 30,
  "special_requirements": "Wheelchair access required",
  "contact_name": "Mrs Ahmed",
  "contact_email": "ahmed@school.co.uk",
  "created_at": "2024-01-15T09:00:00Z"
}
```

### store() — injection attempt (must be rejected at validation)
```json
POST /bookings
{
  "school_id": 5,
  "trip_id": 12,
  "student_count": 30,
  "role": "admin",
  "is_paid": true,
  "amount": 0
}

Response 422:
{
  "message": "The role field is not allowed."
}
```

### byDateRange() — invalid date (must return 422, not 500)
```
GET /reports/bookings?from=2024-01-01&to=; DROP TABLE bookings;--

Response 422:
{
  "message": "The to field must be a valid date."
}
```

---

## Booking Model Reference

```php
// Current Booking model (incomplete — needs hardening):
class Booking extends Model
{
    // No $fillable or $guarded defined

    // Columns: id, school_id, trip_id, student_count, special_requirements,
    //          contact_name, contact_email, amount, status, is_paid,
    //          admin_notes, created_at, updated_at
}
```
