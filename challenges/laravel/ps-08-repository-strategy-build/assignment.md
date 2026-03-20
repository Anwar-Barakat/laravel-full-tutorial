# Challenge 08 — Repository Pattern + Strategy Pattern

**Format:** BUILD
**Topic:** Implement Repository Pattern and Strategy Pattern
**App:** Tripz — Laravel school booking platform

---

## Context

The Tripz team has two architectural needs:

1. **Testability problem:** `BookingController` queries Eloquent directly. Writing unit tests requires a real database — slow, brittle, hard to run in CI without migrations. The team wants to swap the real DB for a fake in-memory store during tests.

2. **Pricing problem:** Different schools get different pricing. A school booking 5 students pays standard price. 20+ students get a group discount. Booking 60+ days in advance gets an early bird discount. More pricing rules are expected as Tripz grows. Adding each one via `if/else` in a service method is getting unmanageable.

---

## Part A — Repository Pattern

### Interface (given — implement this)

```php
<?php
// app/Repositories/Contracts/BookingRepositoryInterface.php

interface BookingRepositoryInterface
{
    public function findById(int $id): ?Booking;

    public function findBySchool(int $schoolId, array $filters = []): Collection;

    public function create(array $data): Booking;

    public function update(int $id, array $data): Booking;

    public function delete(int $id): bool;

    public function getPaginatedWithFilters(array $filters, int $perPage = 15): LengthAwarePaginator;
}
```

### Your Tasks (Part A)

1. **`EloquentBookingRepository`**
   - Implement `BookingRepositoryInterface` using Eloquent
   - `findBySchool()` must support optional filters: `status`, `date_from`, `date_to`
   - `getPaginatedWithFilters()` must support: `school_id`, `trip_id`, `status`, `search` (contact_email LIKE)
   - `delete()` should perform a soft-delete (`Booking` uses `SoftDeletes`)

2. **Bind in `AppServiceProvider`**
   - Bind `BookingRepositoryInterface::class` to `EloquentBookingRepository::class`
   - Use constructor injection in `BookingController` — never instantiate the repository directly

3. **`InMemoryBookingRepository`** (bonus)
   - Implement the same interface using a plain PHP array
   - No Eloquent, no DB — used in unit tests

---

## Part B — Strategy Pattern

### Interface (given — implement this)

```php
<?php
// app/Pricing/Contracts/PricingStrategyInterface.php

interface PricingStrategyInterface
{
    public function calculate(Trip $trip, int $studentCount): float;
}
```

### Pricing Rules

| Strategy | Rule |
|---|---|
| `StandardPricing` | `trip->price_per_student * studentCount` |
| `GroupDiscountPricing` | 10% off when `studentCount >= 20` |
| `EarlyBirdPricing` | 15% off when booking date is 60+ days before `trip->departure_date` |

### Your Tasks (Part B)

1. **Implement all three strategies**
   - Each in its own class: `StandardPricing`, `GroupDiscountPricing`, `EarlyBirdPricing`
   - `GroupDiscountPricing`: fall back to standard price if `studentCount < 20`
   - `EarlyBirdPricing`: fall back to standard price if within 60 days of departure

2. **`PricingContext`**
   - Holds a reference to the current strategy
   - Has `setStrategy(PricingStrategyInterface $strategy): void`
   - Has `calculatePrice(Trip $trip, int $studentCount): float` that delegates to the strategy

3. **Strategy selection in `BookingService`**
   - Based on the booking data (student count, trip departure date), select the correct strategy
   - If both group discount and early bird apply, prefer group discount (document this decision)

---

## Starter Code

```php
<?php
// app/Repositories/EloquentBookingRepository.php

class EloquentBookingRepository implements BookingRepositoryInterface
{
    public function findById(int $id): ?Booking
    {
        // TODO
    }

    public function findBySchool(int $schoolId, array $filters = []): Collection
    {
        // TODO: apply optional filters: status, date_from, date_to
    }

    public function create(array $data): Booking
    {
        // TODO
    }

    public function update(int $id, array $data): Booking
    {
        // TODO: find or fail, update, return fresh model
    }

    public function delete(int $id): bool
    {
        // TODO: soft-delete
    }

    public function getPaginatedWithFilters(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        // TODO: apply filters conditionally, paginate
    }
}
```

```php
<?php
// app/Pricing/PricingContext.php

class PricingContext
{
    private PricingStrategyInterface $strategy;

    public function setStrategy(PricingStrategyInterface $strategy): void
    {
        // TODO
    }

    public function calculatePrice(Trip $trip, int $studentCount): float
    {
        // TODO: delegate to strategy
    }
}
```

---

## Expected Behaviour

```php
// Repository usage in controller
$bookings = $this->bookingRepository->getPaginatedWithFilters([
    'school_id' => 5,
    'status'    => 'confirmed',
], perPage: 20);

// Pricing strategy selection
$context = new PricingContext();
$context->setStrategy(new GroupDiscountPricing());
$price = $context->calculatePrice($trip, 25);
// $price = $trip->price_per_student * 25 * 0.90  (10% off)

$context->setStrategy(new EarlyBirdPricing());
$price = $context->calculatePrice($trip, 5);
// departure is 90 days away — $price = $trip->price_per_student * 5 * 0.85  (15% off)

$context->setStrategy(new StandardPricing());
$price = $context->calculatePrice($trip, 3);
// $price = $trip->price_per_student * 3
```

---

## Constraints

- `EloquentBookingRepository` must use Eloquent query builder — no raw SQL
- `InMemoryBookingRepository` must not import or use any Eloquent classes
- Pricing strategy classes must not query the database — receive data via parameters only
- Adding a fourth pricing strategy (`LoyaltyPricing`, etc.) must require zero changes to existing classes
- `PricingContext` must not contain any pricing logic — only delegation
