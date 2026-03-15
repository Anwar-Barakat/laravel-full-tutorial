# Eloquent Models & CRUD Operations

Build Eloquent models with proper fillable, casts, relationships, and CRUD operations — Laravel's bread and butter.

| Topic             | Details                              |
|-------------------|--------------------------------------|
| Eloquent Models   | Fillable, casts, hidden, appends     |
| CRUD Operations   | Create, read, update, delete patterns|
| Mass Assignment   | Guarded vs fillable protection       |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Model & Migration (Medium)

### Scenario

Create an Eloquent model and migration for a school trip booking system. The model needs proper configuration: 
fillable fields, casts, accessors, and scopes.

### Requirements

1. Write the **Booking migration** with proper column types and indexes
2. Create the **Booking model** with `$fillable`, `$casts`, `$hidden`
3. Add **accessor**: `amount_formatted` → `"AED 5,000.00"`
4. Add **scope**: `scopePaid($query)` → where status = `paid`
5. Add **scope**: `scopeUpcoming($query)` → where `trip_date > now`
6. Add **mutator**: `school_name` → auto-trim and title-case on set
7. Add `$appends` for computed fields in JSON output

### Expected Code

```php
// Migration
Schema::create('bookings', function (Blueprint $table) {
    // Define columns here...
});

// Model usage
$booking = Booking::create([
    'school_name' => 'ssi school',
    'destination' => 'Dubai Aquarium',
    'student_count' => 45,
    'amount' => 5000,
    'trip_date' => '2026-06-15',
    'status' => 'pending',
]);

$booking->amount_formatted; // "AED 5,000.00"

Booking::paid()->upcoming()->get();
// → paid bookings with future trip dates
```

### What We're Evaluating

- Migration with proper types and indexes
- Model configuration (`$fillable`, `$casts`)
- Accessors and mutators (Laravel 11 syntax)
- Query scopes

---

## Problem 02 — Eloquent CRUD Controller (Hard)

### Scenario

Build a complete REST API controller for bookings with proper Laravel patterns: Form Request validation, API Resource responses, pagination, and error handling.

### Requirements

1. `BookingController` with `index`, `store`, `show`, `update`, `destroy`
2. `StoreBookingRequest` with validation rules and messages
3. `BookingResource` for consistent API response shaping
4. `index()` supports: filtering by status, search, pagination
5. `store()` validates, creates, and returns `201`
6. `update()` uses route model binding + Form Request
7. `destroy()` soft-deletes and returns `204`
8. Proper HTTP status codes throughout

### Expected Code

```php
// routes/api.php
Route::apiResource('bookings', BookingController::class);

// GET /api/bookings?status=paid&search=dubai&per_page=15
// POST /api/bookings { school_name, destination, ... }
// GET /api/bookings/42
// PUT /api/bookings/42 { ... }
// DELETE /api/bookings/42
```

### What We're Evaluating

- Form Request validation
- API Resource transformation
- Route model binding
- Pagination and filtering
- Proper status codes
