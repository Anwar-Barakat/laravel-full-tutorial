# Challenge 11 — Slow Query Cache Refactor (REFACTOR)

**App:** Tripz — Laravel school booking platform
**Format:** REFACTOR
**Topic:** Identify slow queries and add a caching layer to the admin dashboard

---

## Background

The Tripz admin dashboard is taking 8–12 seconds to load. Every page visit hits the database with 8 separate queries, some of which scan large tables and perform aggregations. Users are complaining. Add caching with appropriate TTLs and a clear invalidation strategy.

---

## The Slow Controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Trip;
use App\Models\School;

class DashboardController extends Controller
{
    public function index()
    {
        // This runs on EVERY page load — no caching whatsoever
        $stats = [
            'total_bookings'      => Booking::count(),
            'pending_bookings'    => Booking::where('status', 'pending')->count(),
            'confirmed_bookings'  => Booking::where('status', 'confirmed')->count(),
            'total_revenue'       => Booking::where('status', 'paid')->sum('amount'),
            'bookings_this_month' => Booking::whereMonth('created_at', now()->month)->count(),
            'top_destinations'    => Trip::withCount('bookings')
                                         ->orderBy('bookings_count', 'desc')
                                         ->limit(5)
                                         ->get(),
            'monthly_chart'       => Booking::selectRaw(
                                         'MONTH(created_at) as month,
                                          COUNT(*) as count,
                                          SUM(amount) as revenue'
                                     )
                                     ->whereYear('created_at', now()->year)
                                     ->groupBy('month')
                                     ->get(),
            'schools_by_bookings' => School::withCount('bookings')
                                           ->orderBy('bookings_count', 'desc')
                                           ->get(),
        ];

        return response()->json($stats);
    }
}
```

---

## Requirements

Refactor `DashboardController::index()` so that:

### 1. Caching is applied with appropriate TTLs

| Stat | Suggested TTL | Reason |
|------|--------------|--------|
| `pending_bookings` | 5 minutes | Changes frequently as bookings arrive |
| `confirmed_bookings` | 5 minutes | Changes frequently |
| `total_revenue` | 5 minutes | Financial — can tolerate slight delay |
| `total_bookings` | 5 minutes | Counts change often |
| `bookings_this_month` | 5 minutes | Current-month data still being written |
| `top_destinations` | 1 hour | Ranking shifts slowly |
| `monthly_chart` | 1 hour | Historical data — past months never change |
| `schools_by_bookings` | 1 hour | School activity changes slowly |

### 2. Cache keys are descriptive and namespaced

Use a consistent naming scheme, for example:

```
tripz:dashboard:pending_bookings
tripz:dashboard:monthly_chart:2024
tripz:dashboard:top_destinations
```

### 3. Cache is invalidated when bookings change

When a booking is created, updated, or deleted, the relevant cached values must be cleared. Implement this via a `BookingObserver` or by listening to model events.

### 4. At least one stat is explicitly excluded from caching

Identify which stat (if any) should never be cached and explain why in a comment.

---

## Expected Behaviour

**Before refactor:** 8 database queries on every request, 8–12 second load time.

**After refactor:**
- First request: 8 queries, results stored in cache
- Subsequent requests (within TTL): 0 database queries, response in < 50ms
- After a booking is created/updated/deleted: relevant cache entries are cleared, next request re-warms the cache

---

## Constraints

- Use Laravel's `Cache` facade (`Cache::remember()`)
- Do not use `Cache::forever()` — all entries must expire
- Cache keys must not collide between environments — consider using a prefix from `config('app.name')`
- The refactored controller must remain readable — consider extracting cache logic to a service class
- Write a brief inline comment above each cached stat explaining the TTL choice
