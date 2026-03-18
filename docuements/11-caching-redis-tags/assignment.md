# Laravel Caching & Redis

Master Cache::remember, tagged caches, and Redis for sessions, queues, and real-time features.

| Topic            | Details                          |
|------------------|----------------------------------|
| Cache Strategies | remember, forever, tags, flush   |
| Redis            | Sessions, cache, queues, pub/sub |
| TTL & Invalidation| Smart cache expiry              |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Cache-Aside & Tagged Caching (Medium)

### Scenario

Implement caching for the booking API: cache individual bookings, school listings, and dashboard stats with proper invalidation when data changes.

### Requirements

1. Use `Cache::remember()` for booking lookups
2. Use `Cache::tags()` to group related caches
3. Invalidate cache on booking create/update/delete using Model Observer
4. Cache dashboard stats with 5-min TTL
5. Use `Cache::lock()` to prevent race conditions on booking creation
6. Configure Redis as cache and session driver in `.env` / `config/cache.php`

### Expected Code

```php
// Cache a single booking
$booking = Cache::remember("booking:{$id}", 300, fn() =>
    Booking::with('school')->find($id)
);

// Tagged cache for a school's bookings
Cache::tags(['school:1', 'bookings'])->remember('school:1:bookings', 600, fn() =>
    Booking::where('school_id', 1)->get()
);

// Flush all caches for a school when booking changes
Cache::tags(['school:1'])->flush();

// Atomic lock — prevent double-booking race condition
$lock = Cache::lock("booking:create:{$schoolId}", 10);
if ($lock->get()) {
    // create booking
    $lock->release();
}
```

### What We're Evaluating

- `Cache::remember` pattern
- Tagged cache groups
- Cache invalidation via Observer
- Redis lock for concurrency

---

## Problem 02 — Advanced Caching Patterns (Hard)

### Scenario

Build a production-grade caching layer: cache warming on deploy, write-through invalidation, preventing cache stampede, and a Redis-backed rate limiter for the booking API.

### Requirements

1. `BookingCacheService` that wraps all cache logic
2. Cache warming command: `php artisan cache:warm` — preloads frequently accessed data on deploy
3. Write-through pattern: update cache immediately on model change (don't wait for miss)
4. Prevent cache stampede with `Cache::lock()` + `remember()` combination
5. Build a Redis-backed sliding window rate limiter (separate from Laravel's throttle)
6. Use `Cache::forever()` for reference data (destinations list) + manual bust on change
7. Use `Cache::flexible()` for stale-while-revalidate pattern (serve stale, refresh in background)

### Expected Code

```php
// Cache warming command
php artisan cache:warm
// → preloads: all schools, all destinations, dashboard stats

// Write-through: update cache on save, don't wait for expiry
public function updating(Booking $booking): void
{
    Cache::put("booking:{$booking->id}", $booking->fresh(), 300);
    Cache::tags(['school:'.$booking->school_id])->flush();
}

// Stampede prevention — only ONE process fetches, others wait
$booking = Cache::lock("fetch:booking:{$id}", 5)
    ->block(3, fn() => Cache::remember("booking:{$id}", 300, fn() =>
        Booking::find($id)
    ));

// Cache::flexible — serve stale data, refresh in background
$stats = Cache::flexible('dashboard:stats', [300, 600], fn() =>
    $this->computeStats()
);
```

### What We're Evaluating

- Cache warming strategy
- Write-through vs cache-aside
- Stampede prevention
- `Cache::flexible` for stale-while-revalidate
- Redis sliding window rate limiter
