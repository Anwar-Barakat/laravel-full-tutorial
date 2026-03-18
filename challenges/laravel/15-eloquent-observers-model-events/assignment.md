# Observers & Model Events

Hook into Eloquent lifecycle events — auto-generate slugs, log changes, send notifications on model changes.

| Topic        | Details                              |
|--------------|--------------------------------------|
| Observers    | created, updated, deleted hooks      |
| Model Events | Boot methods, dispatches             |
| Auto-Actions | Slugs, audit trails, cache clearing  |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Lifecycle Observer (Medium)

### Scenario

Create observers that handle the complete booking lifecycle: auto-assign reference numbers, log status changes, clear caches, send notifications, and enforce business rules.

### Requirements

1. `BookingObserver` registered in `AppServiceProvider`
2. `creating()` — auto-generate reference number (`BK-YYYYMM-XXXX`)
3. `updating()` — log status changes, validate transitions
4. `deleted()` — clear caches, notify admin
5. `saving()` — auto-calculate total from `student_count × rate`
6. Use `$model->isDirty()` to check changed fields
7. Use `$model->getOriginal()` for pre-change values

### Expected Code

```php
// Observer auto-handles lifecycle
$booking = Booking::create([...]);
// → reference auto-generated: BK-202603-0001
// → total auto-calculated
// → activity logged

$booking->update(['status' => 'paid']);
// → status change logged
// → notification sent
// → cache cleared
```

### What We're Evaluating

- Observer methods for each lifecycle event
- `isDirty` / `getOriginal` for change detection
- Auto-generation of computed fields
- Business rule enforcement in observer

---

## Problem 02 — Advanced Observer Patterns (Hard)

### Scenario

Build production-grade observer patterns: audit trail with before/after snapshots, status transition validation, observer suppression for bulk operations, and model event listeners as an alternative to observers.

### Requirements

1. `AuditLog` model + `AuditObserver` — records before/after snapshots for every update on `Booking`, `Payment`, `School`
2. `HasAuditLog` trait — attach `AuditObserver` automatically via `booted()`
3. Status transition guard: define allowed transitions and throw `InvalidStatusTransitionException` on invalid ones
4. `Booking::withoutObserver(BookingObserver::class, fn() => ...)` — suppress observer during bulk imports / seeders
5. Use static model event listeners as alternative: `Booking::creating(fn($b) => ...)` in `AppServiceProvider`
6. Observer ordering: ensure `LogBookingActivity` runs before `SendBookingNotification`

### Expected Code

```php
// Allowed transitions
const TRANSITIONS = [
    'pending' => ['paid', 'cancelled'],
    'paid'    => ['refunded'],
    'cancelled' => [],
];

// Auto-attached via trait booted()
class Booking extends Model {
    use HasAuditLog;
}

// Suppress observer for bulk operations
Booking::withoutObserver(BookingObserver::class, function () {
    Booking::insert($rows); // no observer fires
});

// Static model event in AppServiceProvider
Booking::creating(function (Booking $booking) {
    $booking->reference = self::generateReference();
});

// Audit snapshot
// before: { status: 'pending', amount: 5000 }
// after:  { status: 'paid',    amount: 5000 }
```

### What We're Evaluating

- `HasAuditLog` reusable trait with `booted()`
- Before/after snapshot recording
- Status transition validation map
- `withoutObserver()` for bulk operations
- Static model events vs observer class
- Observer execution order
