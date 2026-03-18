# Database Transactions & Locking

Use DB::transaction(), lockForUpdate(), and sharedLock() to handle concurrent operations safely — critical for payment processing.

| Topic               | Details                               |
|---------------------|---------------------------------------|
| Transactions        | DB::transaction, savepoints, rollback |
| Pessimistic Locking | lockForUpdate, sharedLock             |
| Race Conditions     | Prevent double-booking, double-payment|

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Atomic Booking Operations (Medium)

### Scenario

Build booking operations that are atomic: payment + status update must both succeed or both fail. Prevent double-booking the same spot and double-payment for the same booking.

### Requirements

1. Use `DB::transaction()` for multi-step operations
2. Use `lockForUpdate()` to prevent concurrent modifications
3. Prevent double-booking: check availability **inside** the transaction with lock
4. Prevent double-payment: lock booking row before charging
5. Handle deadlocks with retry: `DB::transaction($callback, 3)`
6. Use `sharedLock()` for read-only consistency checks
7. Demonstrate savepoints for nested transactions

### Expected Code

```php
// Atomic booking creation
DB::transaction(function () use ($data) {
    $destination = Destination::lockForUpdate()->find($data['destination_id']);
    // Check availability INSIDE the lock
    if ($destination->available_spots < $data['student_count']) {
        throw new InsufficientSpotsException();
    }
    // Create booking + deduct spots atomically
}, 3); // Retry up to 3 times on deadlock

// Prevent double-payment
DB::transaction(function () use ($booking) {
    $booking = Booking::lockForUpdate()->find($booking->id);
    if ($booking->status === 'paid') {
        throw new AlreadyPaidException();
    }
    // Charge via gateway
    // Update status to paid
});
```

### What We're Evaluating

- `DB::transaction()` usage
- `lockForUpdate()` for concurrent writes
- `sharedLock()` for consistent reads
- Deadlock retry
- Race condition prevention

---

## Problem 02 — Testing Concurrent Operations (Hard)

### Scenario

Write tests that verify your locking and transaction logic actually prevents race conditions — test double-booking and double-payment scenarios.

### Requirements

1. Test that concurrent booking requests don't exceed destination capacity
2. Test that double-payment is prevented (second charge throws `AlreadyPaidException`)
3. Test transaction rollback: if payment gateway fails, booking is not created
4. Test deadlock retry: operation succeeds after transient failure
5. Use `RefreshDatabase` trait
6. Simulate race condition by calling the service twice in the same test

### Expected Code

```php
// Test double-booking prevention
public function test_concurrent_bookings_respect_capacity(): void
{
    // Destination has 50 spots
    // Two requests try to book 30 each (total 60 > 50)
    // Only one should succeed, one should throw InsufficientSpotsException
}

// Test rollback
public function test_booking_not_created_if_payment_fails(): void
{
    // Mock gateway to throw exception
    // Assert booking does NOT exist in DB after failure
    $this->assertDatabaseMissing('bookings', [...]);
}

// Test double-payment guard
public function test_booking_cannot_be_paid_twice(): void
{
    $booking = Booking::factory()->paid()->create();
    $this->expectException(AlreadyPaidException::class);
    $this->service->processPayment($booking);
}
```

### What We're Evaluating

- Race condition test design
- `assertDatabaseMissing` / `assertDatabaseHas` for rollback verification
- `expectException` for guard clauses
- Concurrent operation simulation in tests
- Mock gateway for controlled failure scenarios
