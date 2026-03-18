# LARAVEL_TEST_48 — Caching Architecture · Multi-Layer

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Caching Strategy (Medium)

---

### Cache layers — from browser to database

```
Layer 1: Browser cache
  Cache-Control: public, max-age=31536000 (versioned static assets)
  Cache-Control: private, max-age=300, must-revalidate (user-specific API responses)
  ETag / If-None-Match: conditional requests for unchanged data

Layer 2: CDN (Cloudflare)
  Caches: static assets (JS/CSS/images), public API responses (trip listings)
  TTL: 1 hour for trip listings, 1 year for immutable assets
  Invalidation: CF cache purge on trip update, cache tag purge

Layer 3: Application cache (Redis)
  Caches: query results, computed aggregates, sessions, rate limit counters
  TTL: 1 hour for trips, 5 minutes for user data, 24 hours for reports
  Invalidation: tags (Cache::tags), keys, flush

Layer 4: Database query cache
  MySQL query cache (deprecated in 8.0 — use Redis instead)
  Eloquent: chunk queries, select only needed columns
  Indexed queries hit buffer pool (in-memory B-tree nodes)
```

---

### Cache-aside pattern (lazy loading) — most common in Laravel

```php
// Pattern: check cache first → if miss → query DB → populate cache
// app/Repositories/CachedTripRepository.php

class CachedTripRepository implements TripRepositoryInterface
{
    private const TTL_TRIPS   = 3600;   // 1 hour
    private const TTL_SINGLE  = 1800;   // 30 min
    private const TAG_TRIPS   = 'trips';

    public function __construct(
        private TripRepositoryInterface $inner,
        private Repository $cache,
    ) {}

    // Cache-aside: read
    public function getActive(): Collection
    {
        return $this->cache->tags([self::TAG_TRIPS])->remember(
            'trips:active',
            self::TTL_TRIPS,
            fn () => $this->inner->getActive()
        );
    }

    public function findById(int $id): ?Trip
    {
        return $this->cache->tags([self::TAG_TRIPS])->remember(
            "trip:{$id}",
            self::TTL_SINGLE,
            fn () => $this->inner->findById($id)
        );
    }

    // Cache-aside: write — invalidate affected entries
    public function create(array $data): Trip
    {
        $trip = $this->inner->create($data);
        $this->cache->tags([self::TAG_TRIPS])->flush();  // nuke all trip caches
        return $trip;
    }

    public function update(int $id, array $data): Trip
    {
        $trip = $this->inner->update($id, $data);
        $this->cache->tags([self::TAG_TRIPS])->flush();  // or forget single key
        return $trip;
    }

    // Granular invalidation (less aggressive than flush):
    public function updateSingle(int $id, array $data): Trip
    {
        $trip = $this->inner->update($id, $data);
        $this->cache->tags([self::TAG_TRIPS])->forget("trip:{$id}");
        // ← only invalidate the specific trip, not the whole trips list
        // ← BUT: trips:active list now stale — may still contain old data
        // ← choose: full flush (simpler) vs granular (more complex, less invalidation)
        return $trip;
    }
}
```

---

### Cache key naming conventions

```php
// Pattern: {entity}:{id}:{variant}:{version}
// Examples:
//   'trip:42'                    ← single trip by ID
//   'trips:active'               ← all active trips
//   'trips:active:page:2'        ← paginated trips, page 2
//   'school:7:bookings:pending'  ← school 7's pending bookings
//   'report:revenue:2026:01'     ← monthly revenue report
//   'user:123:bookings:recent'   ← user-specific, short TTL

// Helper to generate consistent keys:
class CacheKey
{
    public static function trip(int $id): string
    {
        return "trip:{$id}";
    }

    public static function trips(string $variant = 'active', int $page = 1): string
    {
        return "trips:{$variant}:page:{$page}";
    }

    public static function schoolBookings(int $schoolId, string $status = 'all'): string
    {
        return "school:{$schoolId}:bookings:{$status}";
    }

    public static function report(string $type, string $period): string
    {
        return "report:{$type}:{$period}";
    }
}

// Tagged cache groups — flush related keys at once:
// Cache::tags(['trips']) — all trip-related keys
// Cache::tags(['trips', 'school:7']) — intersection: school 7's trips
// Cache::tags(['trips'])->flush() — invalidate ALL trip cache entries
// ← requires Redis or Memcached (file/database drivers don't support tags)
```

---

### TTL strategy — how long to cache what

```php
// config/cache_ttl.php (or constants in repositories)

// Long TTL (hours–days) — infrequently changing, shared across all users:
//   trip listings:        3600  (1 hour)
//   trip details:         1800  (30 min)
//   school list (admin):  3600  (1 hour)
//   static config:        86400 (24 hours)
//   generated PDF reports: 3600 (1 hour — regenerate on demand if stale)

// Short TTL (seconds–minutes) — user-specific or frequently changing:
//   user's own bookings:  300   (5 minutes)
//   dashboard stats:      60    (1 minute — near real-time)
//   availability count:   30    (30 seconds — booking pressure visible quickly)

// Never cache:
//   payment status         (must be real-time)
//   auth tokens            (security)
//   CSRF tokens            (security)
//   current booking state  (race conditions)

// remember() vs rememberForever():
Cache::remember('key', 3600, fn () => expensiveQuery());          // expires after 1 hour
Cache::rememberForever('key', fn () => staticConfig());           // never expires
// Prefer TTL over forever — gives auto-healing when data changes

// Cache::flexible() — Laravel 11: serve stale while refreshing in background
Cache::flexible('trips:active', [30, 300], fn () => Trip::active()->get());
// [30, 300]: serve cached for up to 30s, then refresh if > 30s old
//            expire completely after 300s
// ← eliminates cache-stampede for high-traffic keys
```

---

### HTTP cache headers — browser + CDN layer

```php
// app/Http/Middleware/ApiCacheHeaders.php
class ApiCacheHeaders
{
    public function handle(Request $request, Closure $next, string $visibility = 'private', int $maxAge = 300): Response
    {
        $response = $next($request);

        $response->headers->set('Cache-Control', "{$visibility}, max-age={$maxAge}");
        $response->headers->set('Vary', 'Authorization, Accept');
        // ← Vary tells CDN: different Authorization = different cached response
        // ← prevents serving User A's response to User B

        // ETag for conditional requests:
        $etag = md5($response->getContent());
        $response->headers->set('ETag', "\"{$etag}\"");

        if ($request->header('If-None-Match') === "\"{$etag}\"") {
            return response(null, 304);  // Not Modified — client uses its cache
        }

        return $response;
    }
}

// Apply selectively:
Route::get('/trips', [TripController::class, 'index'])
    ->middleware('cache.headers:public,3600');   // public = CDN can cache

Route::get('/bookings', [BookingController::class, 'index'])
    ->middleware('cache.headers:private,300');   // private = browser only, not CDN

// Static assets — versioned forever:
// mix.js('resources/js/app.js', 'public/js').version()
// URL: /js/app.js?id=abc123 — unique per build
// Response: Cache-Control: public, max-age=31536000, immutable
```

---

### Redis data structures — beyond simple key/value

```php
// String: basic key/value, most cache entries
Cache::put('trip:42', $tripData, 3600);

// Hash: group related fields — avoid deserializing full object for single field
Redis::hset('trip:42:meta', 'capacity_remaining', 45);
Redis::hset('trip:42:meta', 'booking_count', 12);
$remaining = Redis::hget('trip:42:meta', 'capacity_remaining');
// ← update one field without fetching + re-serializing entire object

// Set: unique members — track who's viewed what
Redis::sadd("trip:42:viewers", $userId);
Redis::scard("trip:42:viewers");  // unique viewer count

// Sorted Set: leaderboard, recent activity
Redis::zadd('popular:trips', ['trip:42' => $viewCount, 'trip:43' => $viewCount2]);
Redis::zrevrange('popular:trips', 0, 9);  // top 10 trips

// List: recent activity feed (bounded)
Redis::lpush("school:{$schoolId}:activity", json_encode($activityData));
Redis::ltrim("school:{$schoolId}:activity", 0, 99);  // keep last 100 items
Redis::lrange("school:{$schoolId}:activity", 0, 19); // get latest 20
```

---

## Problem 02 — Advanced Caching (Hard)

---

### Cache stampede — prevent dog-pile effect

```php
// Problem: Cache expires → 1000 concurrent requests all miss → 1000 DB queries
// This can crash the database

// Solution 1: Cache::lock() — only one process rebuilds cache
public function getActiveTrips(): Collection
{
    $key  = 'trips:active';
    $lock = Cache::lock("lock:{$key}", 10);  // 10 second lock

    if ($data = Cache::get($key)) {
        return $data;  // fast path: cache hit
    }

    try {
        $lock->block(5);  // wait up to 5s for lock
        // Double-check after acquiring lock — another process may have populated
        if ($data = Cache::get($key)) {
            return $data;
        }
        $data = $this->inner->getActive();
        Cache::put($key, $data, 3600);
        return $data;
    } finally {
        $lock->release();
    }
}

// Solution 2: Cache::flexible() — Laravel 11 (recommended for high traffic)
Cache::flexible('trips:active', [30, 300], fn () => Trip::active()->get());
// Serve stale for up to 30 seconds while background refresh happens
// After 300 seconds: hard expiry, rebuild synchronously
// ← no thundering herd, no lock contention

// Solution 3: Probabilistic early expiry (external cache stampede prevention)
// Before TTL expires, proactively refresh when cache is "near" expiry
// Less common in PHP — flexible() covers this case
```

---

### Write-through and write-behind patterns

```php
// ============================================================
// Write-through: write to cache AND database simultaneously
// ============================================================
class WriteThoughTripRepository implements TripRepositoryInterface
{
    public function update(int $id, array $data): Trip
    {
        // Write to DB first (source of truth)
        $trip = $this->inner->update($id, $data);

        // Immediately update cache (write-through)
        Cache::tags(['trips'])->put("trip:{$id}", $trip, 3600);
        Cache::tags(['trips'])->forget('trips:active');  // list stale — invalidate

        return $trip;
        // ✅ Cache always fresh after write
        // ❌ Write path slightly slower (extra cache write)
        // ❌ Cache may contain data that's never read (wasted memory)
    }
}

// ============================================================
// Write-behind (write-back): write to cache first, DB asynchronously
// ============================================================
// Only for non-critical data (view counts, analytics)
class WriteBehandCapacityTracker
{
    public function incrementViewCount(int $tripId): void
    {
        // Fast: increment in Redis immediately
        Redis::hincrby("trip:{$tripId}:stats", 'view_count', 1);

        // Slow: sync to DB every N views via scheduled job
    }
}

// Scheduled job: flush view counts to DB every 5 minutes
class SyncViewCountsJob implements ShouldQueue
{
    public function handle(): void
    {
        $keys = Redis::keys('trip:*:stats');
        foreach ($keys as $key) {
            preg_match('/trip:(\d+):stats/', $key, $m);
            $tripId = $m[1];
            $stats = Redis::hgetall($key);

            Trip::where('id', $tripId)
                ->increment('view_count', $stats['view_count'] ?? 0);

            Redis::del($key);
        }
    }
}
// ✅ Extremely fast writes (Redis only)
// ❌ Data loss risk if Redis crashes before DB sync
// Use only for: counters, analytics, non-critical metrics
```

---

### Cache invalidation strategies

```php
// Strategy 1: TTL-based (simplest) — let it expire naturally
Cache::put('trip:42', $trip, 3600);
// ✅ Simple, no invalidation code
// ❌ Stale data for up to TTL period — acceptable for trip listings, not for payments

// Strategy 2: Tag-based invalidation — group related keys
Cache::tags(['trips', "trip:{$id}"])->put("trip:{$id}", $trip, 3600);
// On update:
Cache::tags(["trip:{$id}"])->flush();  // invalidate this trip everywhere
Cache::tags(['trips'])->flush();       // or: invalidate all trip caches

// Strategy 3: Event-driven invalidation — listener clears cache
class ClearTripCacheOnUpdate
{
    public function handle(TripUpdated $event): void
    {
        Cache::tags(['trips'])->forget("trip:{$event->trip->id}");
        Cache::tags(['trips'])->forget('trips:active');
        // CDN purge:
        Cloudflare::purgeCacheByTags(['trip-listing']);
    }
}
// ✅ Cache always consistent with DB
// ❌ More complex — listener must know all affected cache keys

// Strategy 4: Cache versioning — change the key on update
class VersionedCacheKey
{
    public static function trip(int $id): string
    {
        $version = Cache::get("trip:{$id}:version", 1);
        return "trip:{$id}:v{$version}";
    }

    public static function invalidate(int $id): void
    {
        Cache::increment("trip:{$id}:version");
        // Old key is orphaned (eventually evicted by Redis LRU)
        // ← no delete needed — just change the key
    }
}
// ✅ Atomic invalidation — no race condition between delete + set
// ❌ Orphaned keys accumulate — set maxmemory-policy = allkeys-lru in Redis
```

---

### Cache monitoring — hit rates and performance

```php
// Instrument cache operations:
class InstrumentedCache
{
    public function remember(string $key, int $ttl, Closure $callback): mixed
    {
        if ($value = Cache::get($key)) {
            metrics()->increment('cache.hit', ['key_prefix' => $this->prefix($key)]);
            return $value;
        }

        metrics()->increment('cache.miss', ['key_prefix' => $this->prefix($key)]);
        $start = microtime(true);
        $value = $callback();
        $duration = (microtime(true) - $start) * 1000;

        metrics()->timing('cache.rebuild_ms', $duration, ['key' => $key]);
        Cache::put($key, $value, $ttl);
        return $value;
    }
}

// Redis INFO command gives raw stats:
// redis-cli INFO stats
// keyspace_hits:    10000
// keyspace_misses:  500
// hit rate = 10000 / (10000 + 500) = 95.2%

// Alert thresholds:
//   Cache hit rate < 80%       → investigate key naming or TTL
//   Redis memory > 80% maxmem → increase or evict more aggressively
//   Evicted keys > 0/minute    → cache is too small, LRU evicting useful data
//   Connection errors          → Redis failover or pool exhaustion

// Laravel Horizon: monitors Redis queues + can expose cache metrics
// Datadog Redis integration: hit rate, latency, memory graphs out of the box

// Redis configuration for production:
// maxmemory 2gb
// maxmemory-policy allkeys-lru   ← evict least recently used when full
// save ""                        ← disable AOF persistence for pure cache Redis
//                                   (separate Redis instance for session/queue)
```

---

### Distributed cache — multiple app servers share Redis

```php
// config/cache.php
'default' => 'redis',
'stores' => [
    'redis' => [
        'driver'     => 'redis',
        'connection' => 'cache',
    ],
],

// config/database.php — Redis connections
'redis' => [
    'cache' => [
        'url'      => env('REDIS_CACHE_URL'),
        'database' => '1',  // separate DB from session Redis
    ],
    'session' => [
        'url'      => env('REDIS_SESSION_URL'),
        'database' => '2',
    ],
    'queue' => [
        'url'      => env('REDIS_QUEUE_URL'),
        'database' => '3',
    ],
],
// ← separate Redis databases (or instances) for cache/session/queue
//   prevents accidental FLUSHDB clearing the wrong data

// Redis Cluster for high availability:
// - Multiple Redis nodes with replication
// - Laravel Redis driver supports cluster mode
// - Data sharded across nodes by key slot
// - Failover: replica promoted automatically by Sentinel
// WARNING: Cache::tags() requires all tag keys on same node
//   → use Redis Cluster hash tags: {trips}:active → all {trips}:* keys on same node
```
