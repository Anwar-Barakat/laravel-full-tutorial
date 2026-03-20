# Challenge 09 — Feature Test Suite (BUILD)

**App:** Tripz — Laravel school booking platform
**Format:** BUILD
**Topic:** Write a complete PHPUnit feature test suite for a booking API

---

## Background

Tripz exposes a booking API used by school administrators and platform admins. You have been asked to write a comprehensive PHPUnit feature test suite that covers all endpoints, all HTTP status codes, and all business rules. No tests exist yet — build them from scratch.

---

## The API Contract

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/bookings` | Required | `school_admin` or `admin` |
| GET | `/api/bookings` | Required | filtered by role |
| GET | `/api/bookings/{id}` | Required | own booking or `admin` |
| PATCH | `/api/bookings/{id}` | Required | `admin` only |
| DELETE | `/api/bookings/{id}` | Required | `admin` only |

**Booking payload (POST):**

```json
{
    "trip_id": 1,
    "school_id": 1,
    "student_count": 25,
    "contact_email": "teacher@school.com",
    "notes": "Dietary requirements submitted separately"
}
```

**Booking response shape:**

```json
{
    "data": {
        "id": 1,
        "trip_id": 1,
        "school_id": 1,
        "student_count": 25,
        "status": "pending",
        "total_price": 1250.00,
        "contact_email": "teacher@school.com",
        "created_at": "2024-01-15T10:00:00Z"
    }
}
```

---

## Starter Code

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Trip;
use App\Models\School;
use App\Models\Booking;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    // TODO: Write tests for all scenarios

    // Hint: you need to test:
    // - happy path (201, 200, 204)
    // - validation errors (422)
    // - auth required (401)
    // - authorization (403 for wrong role)
    // - not found (404)
    // - business rules (capacity exceeded)
}
```

---

## Requirements

Write **at minimum 12 test methods** in `BookingApiTest`. Your test suite must cover:

### POST /api/bookings
1. A `school_admin` can create a booking — returns `201` with correct JSON structure
2. An unauthenticated user cannot create a booking — returns `401`
3. A `student` role cannot create a booking — returns `403`
4. Missing required fields return `422` with validation errors
5. Booking fails when trip capacity is already exceeded — returns `422`

### GET /api/bookings
6. A `school_admin` only sees bookings belonging to their own school
7. An `admin` sees all bookings across all schools
8. An unauthenticated user cannot list bookings — returns `401`

### GET /api/bookings/{id}
9. A `school_admin` can view their own booking — returns `200`
10. A `school_admin` cannot view another school's booking — returns `403`

### PATCH /api/bookings/{id}
11. An `admin` can update booking status — returns `200`
12. A `school_admin` cannot update booking status — returns `403`

### DELETE /api/bookings/{id}
13. An `admin` can delete a booking — returns `204` and record is removed
14. Deleting a non-existent booking returns `404`

---

## Expected Output

Each test should pass with clear assertion messages. Your test class should produce output similar to:

```
PASS  Tests\Feature\BookingApiTest
✓ school admin can create a booking
✓ unauthenticated user cannot create booking
✓ student role cannot create booking
✓ missing fields returns validation error
✓ booking fails when capacity exceeded
✓ school admin only sees own school bookings
✓ admin sees all bookings
✓ unauthenticated user cannot list bookings
✓ school admin can view own booking
✓ school admin cannot view other school booking
✓ admin can update booking status
✓ school admin cannot update booking status
✓ admin can delete booking
✓ deleting nonexistent booking returns 404

Tests: 14 passed
```

---

## Constraints

- Use `RefreshDatabase` — every test starts with a clean database
- Use factories to create all test data — no hardcoded IDs
- Use `actingAs($user, 'sanctum')` for authentication
- Do **not** mock the database — test against a real SQLite test database
- Use `postJson`, `getJson`, `patchJson`, `deleteJson` helpers
- Assert both HTTP status codes **and** response body structure
