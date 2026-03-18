# API Resources & Response Formatting

Shape API responses with Resources, conditional fields, nested includes, and cursor pagination.

| Topic            | Details                               |
|------------------|---------------------------------------|
| API Resources    | JsonResource, ResourceCollection      |
| Conditional Fields | when, whenLoaded, mergeWhen         |
| Pagination       | cursor vs offset, meta links          |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking API Resource (Medium)

### Scenario

Build a comprehensive API Resource for bookings: conditional relationship loading, computed fields, nested resources, and different formats for list vs detail views.

### Requirements

1. `BookingResource` extending `JsonResource`
2. Use `$this->when()` for conditional fields
3. Use `$this->whenLoaded()` for optional relationships
4. `BookingCollection` with additional meta data
5. Support sparse fieldsets: `?fields=id,school,amount`
6. Different output for list (compact) vs detail (full)
7. Use `cursorPaginate()` for infinite scroll endpoint

### Expected Code

```php
// Detail view
// GET /api/bookings/42
// → { data: { id, school_name, destination, amount, amount_formatted,
//      school: { id, name, email }, payments: [...], is_upcoming } }

// List view (compact)
// GET /api/bookings?fields=id,school_name,amount,status
// → { data: [{ id, school_name, amount, status }], meta: { ... } }

// Cursor pagination
// GET /api/bookings?cursor=eyJpZCI6MTB9
// → { data: [...], meta: { next_cursor, prev_cursor, per_page } }
```

### What We're Evaluating

- `JsonResource` with conditional fields
- `whenLoaded` for eager-loaded relations
- Cursor vs offset pagination
- Sparse fieldsets

---

## Problem 02 — Advanced API Resource Patterns (Hard)

### Scenario

Extend Problem 01 with advanced patterns: dynamic relationship includes via `?include=` query param, HATEOAS-style links, API versioning via resources, and a consistent error response envelope.

### Requirements

1. Dynamic `?include=school,payments,destination` — only eager-load and return what the client requests
2. Add HATEOAS `links` to each resource: `self`, `school`, `payments`
3. `BookingCollection` custom `with()` meta: total revenue, pagination links, applied filters
4. API versioning: `V1\BookingResource` vs `V2\BookingResource` (V2 adds `amount_formatted`, removes raw `amount`)
5. Consistent error envelope: all `422`, `403`, `404` responses return `{ error: { code, message, errors } }`
6. Use `JsonResource::withoutWrapping()` selectively per endpoint

### Expected Code

```php
// Dynamic include
// GET /api/bookings?include=school,payments
// → eager loads only school + payments, not destination

// HATEOAS links in resource
'links' => [
    'self'     => route('bookings.show', $this->id),
    'school'   => route('schools.show', $this->school_id),
    'payments' => route('bookings.payments.index', $this->id),
],

// V2 resource — amount_formatted replaces amount
// GET /api/v2/bookings/42
// → { data: { id, amount_formatted: "AED 5,000.00", ... } }   // no raw amount

// Consistent error envelope
// 422 →  { error: { code: "VALIDATION_FAILED", message: "...", errors: { field: [...] } } }
// 404 →  { error: { code: "NOT_FOUND",         message: "Booking not found" } }
// 403 →  { error: { code: "FORBIDDEN",         message: "You cannot modify this booking" } }
```

### What We're Evaluating

- Dynamic `?include=` with conditional eager loading
- HATEOAS `links` in resource
- `BookingCollection::with()` for custom meta
- API versioning through resource classes
- Consistent error envelope via `Handler.php`
- `withoutWrapping()` usage
