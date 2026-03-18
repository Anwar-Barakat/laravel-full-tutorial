# Advanced Eloquent & Query Optimization

Master N+1 detection, eager loading strategies, subqueries, and memory-efficient processing — core skills tested in every Laravel interview.

| Topic          | Details                                    |
|----------------|--------------------------------------------|
| N+1 Prevention | Detect and fix with eager loading          |
| Aggregates     | withCount, withSum, subquery selects       |
| Performance    | chunk, cursor, lazy, select columns        |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Fixing N+1 & Aggregate Queries (Medium)

### Scenario

You inherit a slow dashboard endpoint. Profile the queries, identify N+1 problems, and rewrite them using eager loading, `withCount`, `withSum`, and subquery selects.

### Requirements

1. Identify the N+1 in the given code and fix it with `with()`
2. Replace in-PHP aggregation with `withCount()` and `withSum()`
3. Add a subquery select for `latest_booking_date` on the `School` model
4. Use `select()` to avoid fetching unused columns
5. Use `DB::listen()` or `\Debugbar` to count queries before/after
6. Use `loadMissing()` to conditionally eager-load only if not already loaded
7. Use `load()` on an already-fetched collection to add relations without re-querying

### Broken Code to Fix

```php
// ❌ N+1 — fires 1 + N queries
$schools = School::all();
foreach ($schools as $school) {
    echo $school->bookings->count();          // N queries
    echo $school->bookings->sum('amount');    // N more queries
    echo $school->bookings->last()->trip_date; // N more queries
}

// ❌ loading all columns — wasteful
$bookings = Booking::with('school', 'destination', 'payments')->get();
```

### Expected Fix

```php
// ✅ 1 query with aggregates
$schools = School::select('id', 'name', 'email')
    ->withCount('bookings')
    ->withSum('bookings', 'amount')
    ->addSelect([
        'latest_booking_date' => Booking::select('trip_date')
            ->whereColumn('school_id', 'schools.id')
            ->latest()->limit(1),
    ])
    ->get();

// ✅ select only needed columns
$bookings = Booking::select('id', 'school_id', 'amount', 'status', 'trip_date')
    ->with(['school:id,name', 'destination:id,name'])
    ->get();
```

### What We're Evaluating

- N+1 identification and fix
- `withCount` / `withSum` vs in-PHP aggregation
- Subquery `addSelect` for computed columns
- Constrained eager loading (`with('school:id,name')`)
- `loadMissing()` vs `load()` vs `with()`

---

## Problem 02 — Memory-Efficient Bulk Processing & Scopes (Hard)

### Scenario

Process large datasets without running out of memory, build reusable query scopes, and write a reporting query using raw expressions and grouping.

### Requirements

1. Process all pending bookings older than 30 days using `chunkById()` — mark as `expired`
2. Same task with `cursor()` — explain when to use `cursor` vs `chunk`
3. `LazyCollection` with `cursor()` — pipe through filter and map without loading all into memory
4. Build local scopes: `scopePaid`, `scopeUpcoming`, `scopeBySchool($schoolId)`, `scopeThisMonth`
5. Monthly revenue report using `groupBy`, `selectRaw`, and `DB::raw`
6. Use `tap()` on a query to log it before execution
7. `Booking::toBase()` — when to use query builder instead of Eloquent

### Expected Code

```php
// Chunk — processes in batches, re-queries DB each batch (safe for updates)
Booking::where('status', 'pending')
    ->where('created_at', '<', now()->subDays(30))
    ->chunkById(200, function ($bookings) {
        $bookings->each->update(['status' => 'expired']);
    });

// Cursor — single query, streams rows one at a time (memory-efficient reads)
foreach (Booking::cursor() as $booking) {
    // only one Booking model in memory at a time
}

// Monthly revenue report
$report = Booking::selectRaw('YEAR(trip_date) as year, MONTH(trip_date) as month, SUM(amount) as revenue, COUNT(*) as total')
    ->where('status', 'paid')
    ->groupByRaw('YEAR(trip_date), MONTH(trip_date)')
    ->orderByRaw('YEAR(trip_date) DESC, MONTH(trip_date) DESC')
    ->get();

// Scope chaining
Booking::paid()->upcoming()->bySchool(3)->thisMonth()->get();

// toBase() — returns stdClass objects, not Eloquent models (faster for read-only)
Booking::select('id', 'amount', 'status')->toBase()->get();
```

### What We're Evaluating

- `chunkById` vs `cursor` — when to use each
- `LazyCollection` pipeline
- Local query scopes
- `selectRaw` + `groupByRaw` for reports
- `toBase()` for read-only performance
- `tap()` for query debugging
