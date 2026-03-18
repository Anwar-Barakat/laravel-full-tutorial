# Route Model Binding, Global Scopes & Enum Casting

Master implicit/explicit binding, auto-filter queries with global scopes, and use PHP 8.1 enums with Eloquent.

| Topic              | Details                          |
|--------------------|----------------------------------|
| Route Model Binding| Implicit, explicit, scoped       |
| Global Scopes      | Auto-apply filters               |
| Enum Casting       | PHP 8.1 enums in Eloquent        |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Multi-Tenant Scoping & Enum Status (Medium)

### Scenario

Implement multi-tenancy using Global Scopes, custom route model binding, and PHP 8.1 enum casting for booking status.

### Requirements

1. `BookingStatus` enum with `label()`, `color()`, `canTransitionTo()` methods
2. Cast `status` to enum in `$casts`
3. `SchoolScope` global scope — auto-filter bookings by current school
4. Custom route binding: resolve booking by `reference` instead of `id`
5. Scoped binding: `/schools/{school}/bookings/{booking}` — booking must belong to school
6. `withoutGlobalScope()` for admin queries that need all records

### Expected Code

```php
// Enum usage
$booking->status = BookingStatus::PAID;
$booking->status->label();  // "Paid"
$booking->status->color();  // "green"
$booking->status->canTransitionTo(BookingStatus::REFUNDED); // true

// Global scope auto-filters
Booking::all(); // → only bookings for current school (non-admin)
Booking::withoutGlobalScope(SchoolScope::class)->all(); // → all bookings (admin)

// Custom route binding by reference
// GET /api/bookings/BK-202603-0001
// → resolves Booking where reference = BK-202603-0001

// Scoped binding
// GET /api/schools/5/bookings/42
// → 404 if booking 42 doesn't belong to school 5
```

### What We're Evaluating

- `BackedEnum` with helper methods
- Enum casting in `$casts`
- Global scope with `apply()` method
- Custom route binding via `RouteServiceProvider` or `resolveRouteBinding()`
- Scoped route binding

---

## Problem 02 — Soft Deletes & Auto-Pruning (Hard)

### Scenario

Implement soft deletes with trash/restore API, automatic pruning of old records, and force delete with cascade cleanup.

### Requirements

1. `SoftDeletes` trait on `Booking` and `Payment`
2. Trash API: `GET /api/bookings/trashed` — list soft-deleted bookings
3. Restore endpoint: `POST /api/bookings/{booking}/restore`
4. `withTrashed()` and `onlyTrashed()` query usage
5. `Prunable` trait — auto-delete bookings soft-deleted more than 90 days ago
6. `forceDelete()` with cascade: also hard-delete related payments + clear cache
7. Schedule `model:prune` daily in `routes/console.php`

### Expected Code

```php
// Soft delete
$booking->delete();                          // sets deleted_at, not removed from DB

// Trash queries
Booking::onlyTrashed()->paginate();          // only deleted
Booking::withTrashed()->find($id);           // include deleted in lookup

// Restore
$booking->restore();                         // clears deleted_at

// Prunable — define which records to prune
public function prunable(): Builder
{
    return static::onlyTrashed()
        ->where('deleted_at', '<=', now()->subDays(90));
}

// Force delete with cascade
public function forceDeleteWithCascade(): void
{
    DB::transaction(function () {
        $this->payments()->forceDelete();
        Cache::tags(['school:'.$this->school_id])->flush();
        $this->forceDelete();
    });
}

// Scheduled cleanup
Schedule::command('model:prune')->daily()->at('03:00');
```

### What We're Evaluating

- `SoftDeletes` trait and query methods
- Trash / restore API endpoints
- `Prunable` trait with custom `prunable()` query
- `forceDelete()` with cascade in a transaction
- Scheduled `model:prune`
