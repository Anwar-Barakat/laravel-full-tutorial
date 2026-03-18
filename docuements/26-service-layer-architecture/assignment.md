# Service Layer Architecture

Build a clean service layer — separating business logic from controllers, composing services together, and handling results explicitly.

| Topic              | Details                                   |
|--------------------|-------------------------------------------|
| Service Composition| Services calling other services           |
| Result Pattern     | Explicit success/failure return types     |
| Testing            | Mock dependencies, test in isolation      |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Service Composition & Boundaries (Medium)

### Scenario

Build the payment processing service layer for Tripz: `PaymentService` composes `BookingService` + `GatewayService` + `NotificationService`. Each service has a single responsibility and depends on interfaces, not concretions.

### Requirements

1. `GatewayService` — wraps the payment gateway (charge, refund), injectable via `PaymentGatewayInterface`
2. `PaymentService` — orchestrates: validates booking → charges gateway → records payment → updates status
3. `BookingService` — owns booking state transitions, called by `PaymentService`
4. `NotificationService` — sends confirmation after payment (called last, non-blocking)
5. All services type-hint **interfaces**, not concrete classes
6. `PaymentService::processPayment()` wraps everything in `DB::transaction()`
7. Thin controller — receives `PaymentService` via DI, calls one method, returns resource

### Expected Code

```php
// Controller — one line of business logic
public function pay(PayingBookingRequest $request, Booking $booking)
{
    $payment = $this->paymentService->processPayment($booking, $request->validated());
    return PaymentResource::make($payment);
}

// PaymentService orchestrates everything
public function processPayment(Booking $booking, array $data): Payment
{
    return DB::transaction(function () use ($booking, $data) {
        $this->bookingService->ensurePayable($booking);         // throws if not payable
        $charge = $this->gateway->charge($booking->amount, 'AED'); // external call
        $payment = Payment::create([...]);
        $this->bookingService->markAsPaid($booking, $payment);
        dispatch(new SendPaymentConfirmation($payment));        // non-blocking
        return $payment;
    });
}

// Service depends on interface, not concrete
public function __construct(
    private BookingServiceInterface  $bookingService,
    private PaymentGatewayInterface  $gateway,
) {}
```

### What We're Evaluating

- Service composition (services calling services)
- Interface dependency injection (not concrete classes)
- Single responsibility per service
- `DB::transaction()` at the orchestration layer
- Non-blocking side effects via dispatched jobs

---

## Problem 02 — Result Pattern & Service Testing (Hard)

### Scenario

Introduce explicit error handling using the Result pattern (no exceptions for expected failures), then test each service in complete isolation using mocks.

### Requirements

1. `Result` value object with `success()` / `failure()` static constructors and `isSuccess()`, `value()`, `error()` methods
2. `PaymentService::processPayment()` returns `Result<Payment>` instead of throwing exceptions for expected failures (gateway declined, booking already paid)
3. Controller reads the `Result` and returns appropriate HTTP response
4. Unit test `PaymentService` in isolation — mock `BookingServiceInterface`, `PaymentGatewayInterface`
5. Test the success path: gateway charges → payment created → booking marked paid
6. Test the failure path: gateway declined → `Result::failure('Card declined')` → no payment in DB
7. Test the idempotency guard: already-paid booking → `Result::failure('Already paid')` → gateway never called

### Expected Code

```php
// Result value object
class Result
{
    private function __construct(
        private readonly bool   $success,
        private readonly mixed  $value = null,
        private readonly string $error = '',
    ) {}

    public static function success(mixed $value): static { ... }
    public static function failure(string $error): static { ... }
    public function isSuccess(): bool  { return $this->success; }
    public function value(): mixed     { return $this->value; }
    public function error(): string    { return $this->error; }
}

// Service returns Result instead of throwing
public function processPayment(Booking $booking, array $data): Result
{
    if ($booking->status === BookingStatus::PAID) {
        return Result::failure('Booking is already paid.');
    }
    $charge = $this->gateway->charge($booking->amount, 'AED');
    if ($charge->failed()) {
        return Result::failure($charge->declineReason());
    }
    // create payment, update booking
    return Result::success($payment);
}

// Controller handles Result
$result = $this->paymentService->processPayment($booking, $data);
if (!$result->isSuccess()) {
    return response()->json(['error' => $result->error()], 422);
}
return PaymentResource::make($result->value());

// Unit test — mock both dependencies
$this->mock(PaymentGatewayInterface::class)
    ->shouldReceive('charge')->once()->andReturn(FakeCharge::declined());

$result = $this->app->make(PaymentService::class)->processPayment($booking, []);
$this->assertFalse($result->isSuccess());
$this->assertSame('Card declined', $result->error());
$this->assertDatabaseMissing('payments', ['booking_id' => $booking->id]);
```

### What We're Evaluating

- `Result` value object (explicit error handling without exceptions)
- Controller reading `Result` and mapping to HTTP responses
- Unit testing services with mocked dependencies
- Asserting gateway is **never called** in the idempotency test
- `assertDatabaseMissing` to verify rollback on failure
