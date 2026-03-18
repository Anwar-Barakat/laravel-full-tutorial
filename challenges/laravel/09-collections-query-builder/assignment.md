# Collections & Advanced Query Builder

Master Laravel Collections and Eloquent query builder — transform data elegantly and write efficient queries.

| Topic        | Details                              |
|--------------|--------------------------------------|
| Collections  | map, filter, reduce, groupBy, pipe   |
| Query Builder| Complex queries, subqueries, raw     |
| Performance  | Chunking, cursor, lazy collections   |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Collection Data Processing (Medium)

### Scenario

Process booking data using Laravel Collections — aggregate, transform, group, and format data for a dashboard API endpoint that returns booking statistics.

### Requirements

1. Group bookings by school and calculate totals per school
2. Get top 5 destinations by booking count
3. Calculate monthly revenue trend (last 6 months)
4. Use `mapToGroups`, `flatMap`, `pipe`
5. Chain: `filter → map → sortByDesc → take → values`
6. Create a `BookingStatsService` using collections
7. Use `reduce` for complex accumulation

### Expected Code

```php
$stats = $service->getDashboardStats();
// → {
//   revenue_by_school:  [{school: 'SSI', total: 45000, count: 12}, ...],
//   top_destinations:   [{name: 'Dubai Aquarium', bookings: 28}, ...],
//   monthly_trend:      [{month: '2026-01', revenue: 15000}, ...],
//   summary:            {total_revenue: 125000, avg_booking: 3200, ...}
// }
```

### What We're Evaluating

- Collection method chaining
- `groupBy` with aggregation
- `pipe` for complex transformations
- Performance-aware collection usage

---

## Problem 02 — Advanced Eloquent Queries (Hard)

### Scenario

Write complex Eloquent queries: subqueries, conditional relationships, raw expressions, and performance optimization with chunking and cursor pagination.

### Requirements

1. Subquery: get schools with their latest booking date
2. Conditional eager loading based on request parameters
3. Use `whereHas` with count constraints
4. Raw expression for calculating complex math
5. `chunk()` for processing large datasets
6. `cursor()` for memory-efficient iteration
7. Query scope combining multiple conditions
8. Use `when()` for dynamic query building

### Expected Code

```php
// Subquery for latest booking date
School::addSelect([
    'latest_booking_at' => Booking::select('created_at')
        ->whereColumn('school_id', 'schools.id')
        ->latest()->limit(1)
]);

// Schools with at least 5 paid bookings
School::whereHas('bookings', fn($q) => $q->paid(), '>=', 5);

// Chunk for bulk processing
Booking::where('status', 'pending')
    ->chunkById(100, fn($bookings) => ...);
```

### What We're Evaluating

- Subquery selects
- `whereHas` with count
- Raw expressions
- Chunking vs cursor
- Dynamic query building with `when()`
