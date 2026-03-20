# Challenge 15: Security Audit Review

**Format:** REVIEW
**Topic:** Security audit — find all vulnerabilities in a PR
**App:** Tripz — Laravel school booking platform

---

## Problem

A junior developer submitted this pull request yesterday. The code review was approved by mistake and it is currently sitting on the `staging` branch. Before it merges to `main`, you have been asked to do a security audit.

Find every security vulnerability. There are **at least 8**. For each one:
1. Name the vulnerability (use the standard term, e.g. "SQL Injection", "IDOR")
2. Identify the exact line or method where it occurs
3. Explain the risk — what can an attacker actually do?
4. Show what the fix looks like (as a description, not necessarily working code)

---

## Code to Audit

```php
<?php

// app/Http/Controllers/SchoolController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\School;
use App\Models\Booking;

class SchoolController extends Controller
{
    // Endpoint: GET /schools/search?name=Oakwood
    public function search(Request $request)
    {
        $results = DB::select(
            "SELECT * FROM schools WHERE name LIKE '%" . $request->name . "%'"
        );

        return response()->json($results);
    }

    // Endpoint: PUT /schools/{school}
    public function update(Request $request, School $school)
    {
        $school->update($request->all());
        return response()->json($school);
    }

    // Endpoint: POST /schools/{school}/logo
    public function uploadLogo(Request $request, School $school)
    {
        $file = $request->file('logo');
        $filename = $file->getClientOriginalName();
        $file->move(public_path('uploads'), $filename);

        $school->update(['logo_path' => 'uploads/' . $filename]);
        return response()->json(['path' => asset('uploads/' . $filename)]);
    }

    // Endpoint: GET /schools/{school_id}/bookings
    public function getBookings(Request $request, $school_id)
    {
        $bookings = Booking::where('school_id', $school_id)->get();
        return response()->json($bookings);
    }

    // Endpoint: GET /admin/export?file=reports/january.csv
    public function exportData(Request $request)
    {
        $file = $request->get('file');
        return response()->download(storage_path($file));
    }
}
```

---

## Route Definitions (for context)

```php
// routes/api.php

Route::get('/schools/search', [SchoolController::class, 'search']);
Route::put('/schools/{school}', [SchoolController::class, 'update']);
Route::post('/schools/{school}/logo', [SchoolController::class, 'uploadLogo']);
Route::get('/schools/{school_id}/bookings', [SchoolController::class, 'getBookings']);
Route::get('/admin/export', [SchoolController::class, 'exportData']);
```

---

## What the Routes Should Do (intended behaviour)

- `search` — unauthenticated public search, returns school name and city only (not all columns)
- `update` — only a school's own admin can update their school's profile
- `uploadLogo` — authenticated school admin, logo image only, max 2MB
- `getBookings` — authenticated, school admin sees their own bookings, Tripz admin sees all
- `exportData` — Tripz super-admin only, downloads a pre-defined report file

---

## Your Tasks

### Task 1 — Vulnerability List

Create a numbered list of every vulnerability you find. Use this format for each:

```
Vulnerability N — [Name]
Location: method name / line description
Risk: [what an attacker can do]
Fix: [what needs to change]
```

### Task 2 — Priority Ranking

Rank the vulnerabilities you found from most critical to least critical. Explain your ranking briefly.

### Task 3 — Fixed Routes

Describe what the corrected route file should look like to address the authentication and authorisation gaps.

---

## Hints (without giving away the answers)

- Think about what happens if `$request->name` contains a single quote
- Think about what `$request->all()` includes that it probably should not
- Think about where uploaded files end up and who can execute them
- Think about who is allowed to call `getBookings` right now
- Think about what `storage_path($file)` would return if `$file` was `../../.env`
- Think about what columns `SELECT *` returns and whether all of them should be public
