# Events, Listeners & Queued Jobs

Decouple your application with events and process heavy work asynchronously with queued jobs.

| Topic            | Details                              |
|------------------|--------------------------------------|
| Events           | Decouple triggers from actions       |
| Queued Jobs      | Async background processing          |
| Event-Driven     | Booking lifecycle events             |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Event System (Medium)

### Scenario

When a booking is created, multiple things should happen: 
- send confirmation email
- notify school admin
- log activity
- update analytics
Implement this using Laravel's Event/Listener system with proper queuing.

### Requirements

1. `BookingCreated` event carrying the `Booking` model
2. `SendBookingConfirmation` listener (queued, `ShouldQueue`)
3. `NotifySchoolAdmin` listener (queued)
4. `LogBookingActivity` listener (sync — not queued)
5. Register events in `EventServiceProvider` or auto-discovery
6. Dispatch event from the `BookingService`
7. Use `ShouldQueue` with specific queue names and retry logic
8. Handle listener failures with `failed()` method

### Expected Code

```php
// Dispatching
event(new BookingCreated($booking));

// Or using the model event
class Booking extends Model
{
    protected $dispatchesEvents = [
        'created' => BookingCreated::class,
    ];
}

// Listener runs on 'notifications' queue
// Retries 3 times with backoff
// Has a failed() method for error handling
```

### What We're Evaluating

- Event class with model data
- `ShouldQueue` listeners
- Queue configuration per listener
- Failed job handling
- Event registration

---

## Problem 02 — Queued Jobs with Chains & Batches (Hard)

### Scenario

Build a complex booking processing pipeline using Job Chains (sequential) and Batches (parallel) — 
process payment → generate PDF → send email in sequence, 
while processing multiple bookings in parallel.

### Requirements

1. `ProcessPaymentJob` that charges the payment gateway
2. `GenerateBookingPdfJob` that creates a PDF receipt
3. `SendConfirmationEmailJob` that sends the email with PDF
4. Chain these 3 jobs in sequence (each depends on the previous)
5. Use `Bus::batch()` to process multiple booking chains in parallel
6. Handle partial batch failures (some bookings fail, others succeed)
7. Add a `then` / `catch` / `finally` callback on the batch
8. Use `$this->release()` for temporary failures vs `$this->fail()`

### Expected Code

```php
// Sequential chain for one booking
Bus::chain([
    new ProcessPaymentJob($booking),
    new GenerateBookingPdfJob($booking),
    new SendConfirmationEmailJob($booking),
])->onQueue('bookings')->dispatch();

// Parallel batch for multiple bookings
Bus::batch([
    [new ProcessPaymentJob($booking1), new GenerateBookingPdfJob($booking1)],
    [new ProcessPaymentJob($booking2), new GenerateBookingPdfJob($booking2)],
])->then(function (Batch $batch) {
    Log::info("Batch {$batch->id} completed!");
})->catch(function (Batch $batch, Throwable $e) {
    Log::error("Batch failure: {$e->getMessage()}");
})->onQueue('bookings')
  ->allowFailures()
  ->dispatch();
```

### What We're Evaluating

- Job class structure with `handle()`
- `Bus::chain()` for sequential jobs
- `Bus::batch()` for parallel processing
- Failure handling: `release` vs `fail`
- Batch callbacks
