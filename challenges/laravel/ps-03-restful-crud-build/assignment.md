# Challenge 03 — RESTful CRUD Build

**Format:** BUILD
**Topic:** Build a complete RESTful CRUD API endpoint
**App:** Tripz — Laravel school booking platform

---

## Problem

Build a complete **Trip resource API** for Tripz. The API will be consumed by a React frontend and a mobile app, so it must return consistent JSON and proper HTTP status codes.

---

## Data Model

A `Trip` has the following fields:

| Column | Type | Rules |
|--------|------|-------|
| `destination` | string | required, max 255 |
| `departure_date` | date | required, must be a future date |
| `return_date` | date | required, must be after `departure_date` |
| `price_per_student` | decimal(8,2) | required, min 0 |
| `max_capacity` | integer | required, min 1 |
| `status` | enum | `draft` / `published` / `cancelled`, default `draft` |
| `school_id` | foreign key | required, must exist in `schools` table |
| `deleted_at` | timestamp | soft delete |

---

## What to Build

You must build **all six pieces**:

### 1. Migration
Create the `trips` table migration. Add indexes on `status`, `school_id`, and `departure_date` — these columns are used in frequent filters.

### 2. Trip Model
- `$fillable` for all user-assignable columns.
- `$casts` for `departure_date`, `return_date` (Carbon), `price_per_student` (decimal string), `status` (string or enum-backed).
- Relationships: `belongsTo School`, `hasMany Booking`.
- Two local scopes: `scopePublished()` and `scopeUpcoming()` (departure_date in the future).

### 3. TripRequest Form Request
- All validation rules matching the data model above.
- `after_or_equal:today` for departure_date.
- `after:departure_date` for return_date.
- `exists:schools,id` for school_id.
- Authorisation: return `true` for now (auth will be added later).

### 4. TripResource API Resource
- Expose all trip fields.
- Include `booking_count` **only when** it has been loaded (use `whenLoaded` or `whenCounted`).
- Include `school` **only when** it has been eager-loaded.
- Format dates as `Y-m-d`.
- Format `price_per_student` as a float.

### 5. TripController
- `index()` — paginated list (15 per page). Support filters: `?status=published`, `?school_id=3`, `?include=school,bookings_count`.
- `store()` — validate with TripRequest, create, return 201.
- `show()` — single resource. Respect `?include=` param.
- `update()` — validate with TripRequest, update, return 200.
- `destroy()` — soft delete, return 204 no content.

### 6. Routes
Register `apiResource` route for trips. Place it inside the `api.php` routes file, under an `auth:sanctum` middleware group.

---

## Expected API Responses

**GET /api/trips?status=published&include=school**
```json
{
  "data": [
    {
      "id": 1,
      "destination": "Rome",
      "departure_date": "2026-06-15",
      "return_date": "2026-06-22",
      "price_per_student": 349.99,
      "max_capacity": 40,
      "status": "published",
      "school": { "id": 3, "name": "Greenfield Academy" },
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "links": { ... },
  "meta": { "current_page": 1, "total": 14 }
}
```

**POST /api/trips** → `201 Created` with the created resource.

**DELETE /api/trips/1** → `204 No Content`, empty body.

---

## Starter Code

```php
// TripController.php — fill this in

class TripController extends Controller
{
    public function index(Request $request)
    {
        // TODO
    }

    public function store(TripRequest $request)
    {
        // TODO
    }

    public function show(Trip $trip)
    {
        // TODO
    }

    public function update(TripRequest $request, Trip $trip)
    {
        // TODO
    }

    public function destroy(Trip $trip)
    {
        // TODO
    }
}
```

---

## Requirements

1. No raw SQL — use Eloquent throughout.
2. Form validation must be in TripRequest, not in the controller.
3. Responses must use TripResource — do not return `$trip->toArray()` directly.
4. Soft deletes must be implemented (deleted rows must not appear in index).
5. The `?include=` parameter must not cause N+1 queries.
6. All route model binding must respect soft deletes (use `withTrashed` only in a dedicated restore endpoint if needed).
