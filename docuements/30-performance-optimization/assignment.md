# Performance Optimization & Debugging

Eliminate N+1 queries, use `withCount`/`withSum`, optimize with `toBase()` and `chunkById()`, cache aggregations with tags, and write tests that assert query counts.

| Topic              | Details                                                    |
|--------------------|------------------------------------------------------------|
| Query Optimization | N+1 fix, eager loading, withCount, withSum, select()       |
| Bulk & Reports     | toBase(), chunkById(), cursor(), selectRaw aggregations    |
| Caching & Profiling| Cache::tags(), Cache::flexible(), DB::listen(), Octane     |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Query Optimization & N+1 Detection (Medium)

### Scenario

The Tripz booking dashboard is slow. Profile it, identify N+1 queries, fix them with eager loading and aggregate columns, rewrite the revenue report using `toBase()` to skip model hydration, and add a bulk expiry command using `chunkById()`.

### Requirements

1. Fix N+1 on `BookingController@index` — add eager loading for `school` and `trip` with column constraints (`with('school:id,name')`)
2. Replace `$booking->payments->count()` (lazy) with `withCount('payments')` — access via `$booking->payments_count`
3. Replace `$booking->payments->sum('amount')` (lazy) with `withSum('payments', 'amount')` — access via `$booking->payments_sum_amount`
4. Add `select(['id', 'reference', 'status', 'amount', 'school_id', 'trip_id', 'created_at'])` to limit columns pulled from DB
5. Rewrite `RevenueReportController@index` using `toBase()` + `selectRaw` + `groupBy` — returns `stdClass` collection, no Eloquent hydration
6. Add `ExpireStaleBookingsCommand` that uses `chunkById(500)` to bulk-expire pending bookings older than 30 days
7. Use `DB::enableQueryLog()` + `DB::getQueryLog()` in a local debug route to inspect fired queries

### Expected Code

```php
// BEFORE — N+1 (bad, generates 1+N+N queries)
$bookings = Booking::paginate(15);
// In view: $booking->school->name        ← 1 query per booking
//           $booking->payments->count()  ← 1 query per booking

// AFTER — eager loading + aggregate columns
$bookings = Booking::query()
    ->with(['school:id,name', 'trip:id,name,destination'])
    ->withCount('payments')
    ->withSum('payments', 'amount')
    ->select(['id', 'reference', 'status', 'amount', 'school_id', 'trip_id', 'created_at'])
    ->paginate(15)
    ->withQueryString();

// Access — zero extra queries
// $booking->school->name
// $booking->payments_count
// $booking->payments_sum_amount
```

```php
// toBase() — read-only revenue report, skips model hydration entirely
$report = Booking::query()
    ->join('schools', 'bookings.school_id', '=', 'schools.id')
    ->selectRaw('schools.name, COUNT(*) as booking_count, SUM(bookings.amount) as revenue, AVG(bookings.amount) as avg_amount')
    ->groupBy('schools.name')
    ->orderByDesc('revenue')
    ->toBase()   // returns Collection<stdClass> — lighter than Eloquent models
    ->get();

// $row->name, $row->booking_count, $row->revenue
```

```php
// chunkById — bulk expire stale bookings without loading all into memory
Booking::query()
    ->where('status', BookingStatus::PENDING)
    ->where('created_at', '<', now()->subDays(30))
    ->chunkById(500, function (Collection $bookings) {
        Booking::whereIn('id', $bookings->pluck('id'))
            ->update(['status' => BookingStatus::EXPIRED]);

        $this->info("Expired {$bookings->count()} bookings.");
    });
```

```php
// DB::getQueryLog() — debug route (local only)
Route::get('/debug/queries', function () {
    DB::enableQueryLog();

    Booking::with('school')->paginate(15);

    return response()->json([
        'count'   => count(DB::getQueryLog()),
        'queries' => DB::getQueryLog(),
    ]);
})->middleware('auth');
```

### What We're Evaluating

- `with('relation:id,col')` — constrained eager loading (limits selected columns on join)
- `withCount()` / `withSum()` — aggregate subqueries, not lazy collection methods
- `select([...])` — reducing columns returned from the main table
- `toBase()` — skips Eloquent model instantiation for read-only aggregations
- `chunkById()` — memory-safe bulk processing (uses primary key, avoids offset drift)
- `DB::enableQueryLog()` + `DB::getQueryLog()` — query introspection tool

---

## Problem 02 — Caching, Slow Query Logging & Octane Safety (Hard)

### Scenario

Add a caching layer to the dashboard aggregations, wire up slow-query logging in `AppServiceProvider`, use `Cache::flexible()` for stale-while-revalidate on trip listings, and write feature tests that assert the query count stays bounded.

### Requirements

1. `DashboardService::stats()` — `Cache::tags(['dashboard', 'bookings'])->remember(...)` for all aggregations; flush when any booking changes
2. `Cache::flexible('trips:featured', [60, 300], fn() => ...)` — serve stale for up to 5 min, regenerate in background after 1 min
3. `DB::listen()` in `AppServiceProvider::boot()` — log queries slower than 100 ms (only when `APP_DEBUG=true`)
4. Octane-safe service: explain why storing `$request->user()` in a singleton property is dangerous; show the correct pattern
5. `php artisan optimize` — list every command it runs and what each caches
6. Feature test: `DB::enableQueryLog()` before the request, assert `count($queries) <= 5` after `GET /bookings`
7. Feature test: assert that the second call to `DashboardService::stats()` hits the cache (spy on `Cache::store()` or assert DB query count drops to 0)

### Expected Code

```php
// app/Services/DashboardService.php
public function stats(): array
{
    return Cache::tags(['dashboard', 'bookings'])->remember(
        'dashboard:stats',
        now()->addMinutes(15),
        fn() => [
            'total_bookings' => Booking::count(),
            'total_revenue'  => Booking::sum('amount'),
            'pending_count'  => Booking::where('status', BookingStatus::PENDING)->count(),
            'schools_active' => Booking::distinct('school_id')->count('school_id'),
        ]
    );
}

// app/Observers/BookingObserver.php — invalidate on any change
public function saved(Booking $booking): void
{
    Cache::tags(['dashboard', 'bookings'])->flush();
}
```

```php
// Cache::flexible() — stale-while-revalidate for trip listing
public function featured(): Collection
{
    return Cache::flexible('trips:featured', [60, 300], fn() =>
        Trip::where('featured', true)
            ->with('destination')
            ->orderBy('departure_date')
            ->get()
    );
    // Serves stale response for up to 300s
    // Triggers background regeneration after 60s TTL expires
}
```

```php
// app/Providers/AppServiceProvider.php  (slow query listener)
public function boot(): void
{
    if (config('app.debug')) {
        DB::listen(function ($query) {
            if ($query->time > 100) {
                Log::warning('Slow query detected', [
                    'sql'      => $query->sql,
                    'bindings' => $query->bindings,
                    'time_ms'  => $query->time,
                    'caller'   => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5),
                ]);
            }
        });
    }
}
```

```php
// Octane-safe service — request state must NOT live on singleton

// BAD — singleton retains $this->user between Octane requests
class BookingService
{
    private User $user;

    public function __construct(private Request $request)
    {
        $this->user = $request->user(); // captured once, stale on next request!
    }
}

// GOOD — resolve per-call, never store request state
class BookingService
{
    public function forCurrentUser(): Collection
    {
        return Booking::where('user_id', auth()->id())->get(); // fresh every call
    }
}
```

```php
// php artisan optimize — what it does:
// config:cache   → serializes all config files into bootstrap/cache/config.php
// route:cache    → compiles all routes into bootstrap/cache/routes-v7.php
// view:cache     → pre-compiles all Blade templates
// event:cache    → caches event→listener map (if using discover)
//
// php artisan optimize:clear  → reverses all of the above
```

```php
// tests/Feature/BookingQueryCountTest.php
public function test_bookings_index_stays_within_query_budget(): void
{
    $user = User::factory()->create();
    Booking::factory(10)
        ->for($user->school)
        ->has(Payment::factory(2), 'payments')
        ->create();

    DB::enableQueryLog();

    $this->actingAs($user)
        ->get(route('bookings.index'))
        ->assertOk();

    $queries = DB::getQueryLog();
    $this->assertLessThanOrEqual(5, count($queries),
        'Expected at most 5 queries but got ' . count($queries)
    );
}

public function test_dashboard_stats_are_cached_on_second_call(): void
{
    Booking::factory(5)->create();

    $service = app(DashboardService::class);
    $service->stats(); // warms cache

    DB::enableQueryLog();
    $service->stats(); // should hit cache — zero DB queries
    $queries = DB::getQueryLog();

    $this->assertCount(0, $queries, 'Dashboard stats should be served from cache');
}
```

### What We're Evaluating

- `Cache::tags()` for grouped invalidation (requires Redis or Memcached driver)
- `Cache::flexible()` — stale-while-revalidate, avoids cache stampede
- `DB::listen()` — slow query logging gated on `APP_DEBUG`
- Octane singleton safety — no request state on long-lived objects
- `php artisan optimize` awareness — config, route, view, event caching
- Query count assertions in feature tests
