# Challenge 12 — Caching Architecture Decision (ARCHITECTURE)

**App:** Tripz — Laravel school booking platform
**Format:** ARCHITECTURE
**Topic:** Design a comprehensive caching strategy for Tripz at scale

---

## Background

Tripz is growing. The platform now serves 50 schools, 500 trips, and processes 10,000 bookings per month. The engineering team needs to decide on a caching architecture before the next scaling phase. You must design and justify the full strategy.

---

## Current API Endpoints

| Endpoint | Visibility | Traffic | Query Cost |
|----------|-----------|---------|-----------|
| `GET /api/trips` | Public | ~1,000 req/day | Medium (joins, pagination) |
| `GET /api/trips/{id}` | Public | ~3,000 req/day | Low (single row + relations) |
| `GET /api/bookings` | Private (per user) | ~500 req/day | Medium (filtered by role/school) |
| `GET /api/dashboard/stats` | Admin only | ~200 req/day | Very high (30 sec without cache) |
| `POST /PATCH /DELETE` | Private | ~300 req/day | Write operations |

---

## Your Task

Design the caching strategy by answering all 6 questions below with working code examples.

---

### Question 1 — Cache Driver Selection

```php
// config/cache.php (partial)
'default' => env('CACHE_DRIVER', 'file'),

'stores' => [
    'file'      => ['driver' => 'file', 'path' => storage_path('framework/cache')],
    'redis'     => ['driver' => 'redis', 'connection' => 'cache'],
    'memcached' => ['driver' => 'memcached', 'servers' => [...]],
    'array'     => ['driver' => 'array'],  // tests only
],
```

Which driver should Tripz use in production and why? Consider: multiple web workers, cache tag support, atomic operations, memory management.

---

### Question 2 — TTL Strategy Per Endpoint

```php
// What TTL should each endpoint use?
// Fill in the values and explain each choice.

$ttls = [
    'trips_list'      => ?,   // GET /api/trips
    'trip_detail'     => ?,   // GET /api/trips/{id}
    'bookings_list'   => ?,   // GET /api/bookings
    'dashboard_stats' => ?,   // GET /api/dashboard/stats
];
```

---

### Question 3 — HTTP Cache Headers for Public Endpoints

```php
// How should these responses be sent for public endpoints?

return response()->json($trips)
    ->header('Cache-Control', ?)
    ->header('ETag', ?);

// And for private endpoints like /api/bookings?
return response()->json($bookings)
    ->header('Cache-Control', ?);
```

How does an ETag enable `304 Not Modified` responses? Show the flow.

---

### Question 4 — Cache Invalidation on Write Operations

```php
// When a Trip is updated, what cache must be cleared?
// When a Booking is created, what cache must be cleared?

// Show the observer or event listener that handles this.
class TripObserver
{
    public function saved(Trip $trip): void
    {
        // TODO: invalidate cache
    }
}
```

---

### Question 5 — Cache Stampede Prevention

```php
// The dashboard query takes 30 seconds.
// If 50 admin users hit the dashboard simultaneously when cache expires,
// all 50 will fire the expensive query at once.

// How do you prevent this?
// Show two approaches: Cache::flexible() and Cache::lock()

// Approach A:
$stats = Cache::flexible('dashboard:stats', [300, 600], function () {
    // TODO
});

// Approach B:
$stats = Cache::lock('dashboard:stats:lock', 10)->get(function () {
    // TODO
});
```

---

### Question 6 — Where Does Caching Live?

The team is debating where to put cache logic. Three options:

```php
// Option A: In the Controller
class TripController extends Controller
{
    public function index()
    {
        $trips = Cache::remember('trips', 3600, fn() => Trip::with('school')->paginate(20));
        return TripResource::collection($trips);
    }
}

// Option B: In a Service Class
class TripService
{
    public function getTrips(): LengthAwarePaginator
    {
        return Cache::remember('trips', 3600, fn() => Trip::with('school')->paginate(20));
    }
}

// Option C: In a Repository
class TripRepository
{
    public function findAll(): LengthAwarePaginator
    {
        return Cache::remember('trips', 3600, fn() => Trip::with('school')->paginate(20));
    }
}
```

Which approach is best for Tripz and why? Consider testability, separation of concerns, and future flexibility (e.g., swapping cache drivers or switching to an API data source).

---

## Deliverable

Write a `CachingStrategy` class or annotated config that captures your full architecture decision. It should serve as the reference document for the engineering team.

---

## Constraints

- Justify every decision — "use Redis" is not enough; explain why over alternatives
- Cover both application-level caching (Laravel Cache facade) and HTTP-level caching (response headers)
- Your invalidation strategy must handle all 5 write operations (POST/PATCH/DELETE for both trips and bookings)
- Address the stampede scenario — high-traffic apps cannot ignore this
