# Database Design & Migrations

Design database schemas with migrations, seeders, and factories — the foundation of every Laravel app.

| Topic      | Details                               |
|------------|---------------------------------------|
| Migrations | Schema design, indexes, foreign keys  |
| Seeders    | Test data, DatabaseSeeder             |
| Factories  | Realistic fake data for testing       |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Complete Database Schema (Medium)

### Scenario

Design and implement the complete database schema for the school trip booking platform: schools, bookings, payments, destinations, users, and pivot tables with proper indexes and constraints.

### Requirements

1. Migration for `schools` table with proper columns
2. Migration for `bookings` with foreign keys and compound indexes
3. Migration for `payments` with status and soft deletes
4. Pivot table `school_destination` with `price_per_student` extra column
5. Add compound indexes for common query patterns
6. Use `softDeletes()` and `timestamps()` where appropriate
7. `DatabaseSeeder` that seeds realistic test data using factories

### Expected Code

```php
// Run everything
php artisan migrate
php artisan db:seed

// Seeder creates:
// 10 schools, each with 5–15 bookings
// Each booking has 1–3 payments
// Realistic amounts, dates, statuses

// Factory states
BookingFactory::new()->paid()->upcoming()->create();
BookingFactory::new()->cancelled()->create();
```

### What We're Evaluating

- Migration column types and constraints
- Foreign key `constrained()->cascadeOnDelete()`
- Compound indexes for query performance
- Factory relationships and states

---

## Problem 02 — Advanced Schema Patterns (Hard)

### Scenario

Build production-grade schema design: zero-downtime migrations, schema changes on live tables, generated columns, full-text indexes, and factory sequences for predictable test data.

### Requirements

1. Add a `reference` column to `bookings` without downtime — use `nullable()` first, backfill, then `change()` to `not null`
2. Add a **generated/virtual column** `amount_with_vat` = `amount * 1.05` (stored in DB, no code needed)
3. Add a **full-text index** on `school_name` + `destination` for search
4. Factory **sequences** — generate predictable reference numbers: `BK-202603-0001`, `BK-202603-0002`
5. Factory **states**: `->paid()`, `->cancelled()`, `->upcoming()`, `->past()`
6. Factory **relationships**: `BookingFactory` auto-creates a `School` unless one is passed
7. `after()` column placement — add new columns after a specific column (MySQL)

### Expected Code

```php
// Zero-downtime column add (3-step)
// Step 1: add nullable
$table->string('reference')->nullable()->after('id');
// Step 2: backfill via seeder/job
// Step 3: make not null
$table->string('reference')->nullable(false)->change();

// Generated column (computed in DB)
$table->decimal('amount_with_vat', 10, 2)
    ->storedAs('amount * 1.05');

// Full-text index
$table->fullText(['school_name', 'destination']);

// Factory sequence
BookingFactory::new()->sequence(
    fn($seq) => ['reference' => 'BK-202603-' . str_pad($seq->index + 1, 4, '0', STR_PAD_LEFT)]
)->count(10)->create();

// Factory state
public function paid(): static
{
    return $this->state(['status' => 'paid', 'paid_at' => now()]);
}

// Querying generated column — no PHP overhead
Booking::where('amount_with_vat', '>', 5000)->get();
```

### What We're Evaluating

- Zero-downtime migration strategy
- Generated/stored columns
- Full-text indexes
- Factory sequences for predictable data
- Factory states and relationship creation
- `after()` column placement
