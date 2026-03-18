# Eloquent Relationships & Eager Loading

Define all relationship types and solve the N+1 query problem — the most common Laravel interview topic.

| Topic          | Details                                     |
|----------------|---------------------------------------------|
| Relationships  | HasMany, BelongsTo, ManyToMany, Polymorphic |
| Eager Loading  | with(), load(), withCount()                 |
| N+1 Prevention | Detect and fix N+1 queries                  |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — School-Booking Relationship System (Medium)

### Scenario

Build the complete relationship system for a school trip booking platform from scratch. You will create all models, migrations, and relationships needed.

### Database Tables to Create

| Table                | Key Columns                                                              |
|----------------------|--------------------------------------------------------------------------|
| `schools`            | `id`, `name`, `email`, `timestamps`                                      |
| `destinations`       | `id`, `name`, `timestamps`                                               |
| `school_destination` | `school_id`, `destination_id`, `price_per_student`, `timestamps`         |
| `bookings`           | `id`, `school_id`, `destination`, `student_count`, `amount`, `trip_date`, `status`, `timestamps`, `softDeletes` |
| `payments`           | `id`, `booking_id`, `amount`, `status`, `timestamps`                     |

### Models to Create

| Model         | File                          |
|---------------|-------------------------------|
| `School`      | `app/Models/School.php`       |
| `Destination` | `app/Models/Destination.php`  |
| `Booking`     | `app/Models/Booking.php`      |
| `Payment`     | `app/Models/Payment.php`      |

### Controller to Create

| File                                              | Methods        |
|---------------------------------------------------|----------------|
| `app/Http/Controllers/Api/SchoolController.php`   | `index`, `show` |

### Requirements

1. `School` **hasMany** `Booking`
2. `School` **hasOne** `latestBooking` → most recent booking
3. `School` **hasManyThrough** `Payment` through `Booking`
4. `School` **belongsToMany** `Destination` via `school_destination` pivot with `price_per_student`
5. `Booking` **belongsTo** `School`, **hasMany** `Payment`
6. `Destination` **belongsToMany** `School` via `school_destination` pivot with `price_per_student`
7. `Payment` **belongsTo** `Booking`
8. `index()` — eager load `bookings.payments` and `destinations` to prevent N+1, paginate results
9. `show()` — return a single school with all relationships loaded
10. Use `withCount` and `withSum` for aggregates in `index()`

### Expected Usage

```php
// GET /api/schools
// SchoolController@index
$schools = School::with(['bookings.payments', 'destinations'])
    ->withCount('bookings')
    ->withSum('bookings', 'amount')
    ->paginate(15);

// GET /api/schools/1
// SchoolController@show
$school = School::with(['bookings.payments', 'destinations'])->findOrFail($id);

$school->bookings;                                          // Collection of Booking models
$school->bookings->first()->payments;                      // Already loaded — no extra query
$school->latestBooking;                                     // Most recent booking
$school->destinations;                                      // Many-to-many with pivot data
$school->destinations->first()->pivot->price_per_student;  // Pivot column
// → each school has bookings_count and bookings_sum_amount
```

### What We're Evaluating

- Migrations with correct foreign keys and indexes
- All relationship types defined correctly
- Eager loading with nested relationships
- Pivot table with extra columns
- Aggregate queries (`withCount`, `withSum`)

---

## Problem 02 — Polymorphic Relationships & Advanced Queries (Hard)

### Scenario

Extend the platform from Problem 01. Add a comments system and an activity log where any model (Booking, Payment, School) can have comments and logged activity — without separate tables per model.

### Database Tables to Create

| Table           | Key Columns                                                                      |
|-----------------|----------------------------------------------------------------------------------|
| `comments`      | `id`, `commentable_type`, `commentable_id`, `body`, `user_id`, `timestamps`      |
| `activity_logs` | `id`, `loggable_type`, `loggable_id`, `event`, `payload` (json), `timestamps`    |

### Models & Files to Create

| File                                  | Purpose                              |
|---------------------------------------|--------------------------------------|
| `app/Models/Comment.php`              | morphTo commentable                  |
| `app/Models/ActivityLog.php`          | morphTo loggable + scope             |
| `app/Traits/HasActivityLog.php`       | reusable trait for all models        |
| `app/Providers/AppServiceProvider.php`| register morphMap                    |

### Requirements

1. `Comment` model with `morphTo('commentable')` — `commentable_type`, `commentable_id`
2. `ActivityLog` model with `morphTo('loggable')` — `loggable_type`, `loggable_id`
3. Add `morphMany` `comments()` and `morphMany` `activityLogs()` on `Booking`, `Payment`, `School`
4. Create `HasActivityLog` trait with a `logActivity(string $event, array $payload)` method
5. Add `scopeForModel($query, Model $model)` on `ActivityLog`
6. Register `morphMap` in `AppServiceProvider` using short names: `booking`, `payment`, `school`
7. Eager load polymorphic relationships efficiently

### Expected Usage

```php
// Any model can have comments
$booking->comments()->create(['body' => 'Trip confirmed!', 'user_id' => 1]);
$payment->comments()->create(['body' => 'Refund processed']);

// Activity logging via trait
$booking->logActivity('created', ['amount' => 5000]);
$booking->logActivity('status_changed', ['from' => 'pending', 'to' => 'paid']);

// Query across all types
Comment::with('commentable')->latest()->get();
ActivityLog::forModel($booking)->get();

// Morph map (in AppServiceProvider)
Relation::enforceMorphMap([
    'booking' => Booking::class,
    'payment' => Payment::class,
    'school'  => School::class,
]);
```

### What We're Evaluating

- Migrations with correct morph columns
- `MorphMany` / `MorphTo` setup on all models
- Morph map registered for clean DB values
- Reusable `HasActivityLog` trait
- Querying across polymorphic types
