# Feature & Unit Testing in Laravel

Write tests that actually test your API — HTTP tests, database assertions, mocking services, and factory usage.

| Topic         | Details                          |
|---------------|----------------------------------|
| Feature Tests | HTTP tests with assertions       |
| Factories     | Generate test data               |
| Mocking       | Fake services and facades        |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking API Feature Tests (Medium)

### Scenario

Write comprehensive feature tests for the Booking API: test CRUD operations, validation errors, authentication, authorization, and edge cases.

### Requirements

1. Test booking creation with valid data (`201` response)
2. Test validation errors return `422` with correct structure
3. Test unauthenticated access returns `401`
4. Test unauthorized access returns `403` (wrong school)
5. Use `BookingFactory` for test data
6. Use `RefreshDatabase` trait
7. Assert database has/missing records
8. Test pagination response structure

### Expected Code

```php
// Run tests
php artisan test --filter=BookingTest

// Feature test structure
$this->actingAs($user)
    ->postJson('/api/bookings', $data)
    ->assertCreated()
    ->assertJsonStructure([...]);
```

### What We're Evaluating

- Feature test with HTTP assertions
- Factory usage for test data
- Authentication in tests (`actingAs`)
- Database assertions
- JSON structure assertions

---

## Problem 02 — Mocking Services & Testing Jobs (Hard)

### Scenario

Test components in isolation by mocking external services (payment gateway, email), faking queues, and testing job behavior.

### Requirements

1. Mock `PaymentGatewayInterface` in service tests
2. Use `Mail::fake()` to test emails without sending
3. Use `Queue::fake()` to test job dispatching
4. Use `Notification::fake()` to test notifications
5. Test that events dispatch correctly with `Event::fake()`
6. Test a specific Job's `handle()` method in isolation
7. Use `Bus::fake()` to test job chains and batches

### Expected Code

```php
Mail::fake();
// ... trigger action ...
Mail::assertSent(BookingConfirmationMail::class, fn ($mail) =>
    $mail->hasTo('admin@ssi.ae') && $mail->booking->id === 1
);

Queue::fake();
// ... trigger action ...
Queue::assertPushed(ProcessPaymentJob::class, fn ($job) =>
    $job->booking->id === $booking->id
);
```

### What We're Evaluating

- Facade faking (`Mail`, `Queue`, `Event`, `Notification`)
- Service mocking with `bind()`
- Job testing in isolation
- Assertion callbacks for specific checks
