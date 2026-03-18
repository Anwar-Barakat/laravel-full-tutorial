# Laravel Collections Mastery

Go beyond `map` and `filter` — master higher-order messages, custom macros, lazy collections, and collection pipelines for real dashboard features.

| Topic               | Details                                  |
|---------------------|------------------------------------------|
| Advanced Methods    | reduce, flatMap, mapToGroups, partition  |
| Custom Macros       | Extend Collection with your own methods  |
| LazyCollection      | Memory-efficient streaming pipelines     |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Advanced Collection Transformations (Medium)

### Scenario

Build the data layer for a Tripz analytics dashboard using only Laravel Collections — no raw SQL aggregations. Transform booking data into grouped stats, ranked destinations, and revenue breakdowns.

### Requirements

1. Use `groupBy` + `map` to build revenue-per-school breakdown
2. Use `flatMap` to flatten nested payment collections across bookings
3. Use `mapToGroups` to group bookings by status into a keyed array
4. Use `partition` to split bookings into paid vs unpaid in one pass
5. Use `reduce` to calculate a weighted average trip cost
6. Use `zip` + `combine` to merge two separate data arrays into key-value pairs
7. Use higher-order messages (`->map->status`, `->filter->isPaid()`) for cleaner chains

### Expected Code

```php
// Revenue per school using groupBy + map
$revenueBySchool = $bookings
    ->groupBy('school_id')
    ->map(fn($group) => [
        'school'  => $group->first()->school->name,
        'total'   => $group->sum('amount'),
        'count'   => $group->count(),
        'average' => $group->avg('amount'),
    ])
    ->sortByDesc('total')
    ->values();

// Flatten nested payments across all bookings
$allPayments = $bookings->flatMap->payments;

// Group by status in one pass
$byStatus = $bookings->mapToGroups(fn($b) => [$b->status->value => $b]);

// Split paid vs unpaid
[$paid, $unpaid] = $bookings->partition(fn($b) => $b->status === BookingStatus::PAID);

// Higher-order messages
$statuses  = $bookings->map->status;          // calls ->status on each model
$paidCount = $bookings->filter->isPaid()->count(); // calls ->isPaid() on each model

// Weighted average using reduce
$weightedAvg = $bookings->reduce(function ($carry, $booking) {
    return $carry + ($booking->amount * $booking->student_count);
}, 0) / max($bookings->sum('student_count'), 1);
```

### What We're Evaluating

- `groupBy` + `map` for aggregations
- `flatMap` for nested flattening
- `mapToGroups` for multi-key grouping
- `partition` for one-pass splitting
- `reduce` for complex accumulations
- Higher-order messages for clean chains

---

## Problem 02 — Custom Macros & LazyCollection Pipelines (Hard)

### Scenario

Extend Laravel Collections with custom macros for your domain, then build a memory-efficient `LazyCollection` pipeline that streams and processes thousands of bookings without loading them all into memory.

### Requirements

1. Register a `Collection::macro('totalRevenue')` — returns sum of `amount` formatted as `"AED 45,000"`
2. Register `Collection::macro('topN', $n)` — returns the top N items by `amount`
3. Register `Collection::macro('toBookingStats')` — returns `{ count, total, avg, max, min }` in one call
4. `LazyCollection` from a cursor — stream all bookings through a pipeline: filter expired → map to report row → chunk into CSV batches
5. `LazyCollection::make()` with a generator function — yield rows from a large CSV import without memory spike
6. Use `tap()` on a collection pipeline to log intermediate state without breaking the chain
7. Build a `BookingCollection` custom class extending `Collection` with domain methods

### Expected Code

```php
// Macros registered in AppServiceProvider::boot()
Collection::macro('totalRevenue', function () {
    return 'AED ' . number_format($this->sum('amount'), 2);
});

Collection::macro('topN', function (int $n) {
    return $this->sortByDesc('amount')->take($n)->values();
});

Collection::macro('toBookingStats', function () {
    return [
        'count' => $this->count(),
        'total' => $this->sum('amount'),
        'avg'   => round($this->avg('amount'), 2),
        'max'   => $this->max('amount'),
        'min'   => $this->min('amount'),
    ];
});

// LazyCollection pipeline — streams DB rows, never all in memory
LazyCollection::make(function () {
    foreach (Booking::cursor() as $booking) {
        yield $booking;
    }
})
->filter(fn($b) => $b->status === BookingStatus::PAID)
->map(fn($b) => ['ref' => $b->reference, 'amount' => $b->amount])
->tap(fn($chunk) => Log::info('Processing chunk...'))
->chunk(100)
->each(fn($chunk) => CsvExporter::write($chunk));

// Custom Collection class
class BookingCollection extends Collection
{
    public function paid(): static           { return $this->filter->isPaid(); }
    public function upcoming(): static       { return $this->filter->isUpcoming(); }
    public function totalRevenue(): string   { return 'AED ' . number_format($this->sum('amount'), 2); }
}

// Return custom collection from model
public function newCollection(array $models = []): BookingCollection
{
    return new BookingCollection($models);
}
```

### What We're Evaluating

- `Collection::macro()` registration in `AppServiceProvider`
- Custom macros for domain-specific operations
- `LazyCollection` with generator + cursor for memory efficiency
- `tap()` for non-destructive debugging in chains
- Custom `Collection` subclass with domain methods
- `newCollection()` on the model to return typed collection
