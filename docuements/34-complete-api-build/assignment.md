# Complete API Build — Final Simulation

This is the capstone test. Build the full payment processing flow for Tripz end-to-end, combining every pattern from the series: service layer, Result pattern, transactions, broadcasting, caching, jobs, policies, and a full feature test suite.

| Topic            | Skills Combined                                                  |
|------------------|------------------------------------------------------------------|
| Core Build       | Service layer, Form Request, Resource, DB::transaction           |
| Production Layer | Result pattern, Cache tags, Broadcasting, Rate limiting          |
| Test Suite       | Event::fake, Queue::fake, Http::fake, assertDatabaseMissing      |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — End-to-End Payment Flow (Medium)

### Scenario

A school admin pays for a pending booking. The system validates authorization, charges a payment gateway, records the payment in a transaction, marks the booking as paid, and dispatches a confirmation job. Build every layer: Form Request, Service, Controller, Resource.

### Requirements

1. `ProcessPaymentRequest` — `authorize()` via Policy (`$user->can('pay', $booking)`); rules: `payment_method` (required, in:card,bank_transfer), `token` (required_if:card)
2. `BookingPolicy@pay` — school admin can only pay bookings belonging to their school
3. `PaymentService::process(Booking, array): Payment` — wraps everything in `DB::transaction()`; calls `GatewayService::charge()`, creates `Payment`, calls `BookingService::markAsPaid()`
4. `BookingService::markAsPaid(Booking, Payment)` — updates `status = PAID`, `paid_at = now()`, `payment_id`
5. `BookingService::ensurePayable(Booking)` — throws `\LogicException` if already PAID or CANCELLED
6. `dispatch(new SendPaymentConfirmation($payment))` — non-blocking, queued job after the transaction
7. `PaymentController@store` — thin: one service call, return `PaymentResource` with 201

### Expected Code

```php
// app/Http/Requests/ProcessPaymentRequest.php
class ProcessPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('pay', $this->route('booking'));
    }

    public function rules(): array
    {
        return [
            'payment_method' => ['required', 'string', Rule::in(['card', 'bank_transfer'])],
            'token'          => ['required_if:payment_method,card', 'string'],
        ];
    }
}
```

```php
// app/Policies/BookingPolicy.php  (pay method)
public function pay(User $user, Booking $booking): bool
{
    return $user->hasAnyRole(['school_admin', 'super_admin'])
        && $user->school_id === $booking->school_id
        && $booking->status === BookingStatus::PENDING;
}
```

```php
// app/Services/PaymentService.php
class PaymentService
{
    public function __construct(
        private BookingServiceInterface  $bookingService,
        private PaymentGatewayInterface  $gateway,
    ) {}

    public function process(Booking $booking, array $data): Payment
    {
        $this->bookingService->ensurePayable($booking);

        return DB::transaction(function () use ($booking, $data) {
            $charge = $this->gateway->charge(
                amount:   $booking->amount,
                currency: 'AED',
                token:    $data['token'] ?? null,
            );

            $payment = Payment::create([
                'booking_id'        => $booking->id,
                'amount'            => $booking->amount,
                'method'            => $data['payment_method'],
                'gateway_reference' => $charge->reference(),
            ]);

            $this->bookingService->markAsPaid($booking, $payment);

            return $payment;
        });
    }
}
```

```php
// app/Services/BookingService.php
public function ensurePayable(Booking $booking): void
{
    if ($booking->status === BookingStatus::PAID) {
        throw new \LogicException('Booking is already paid.');
    }
    if ($booking->status === BookingStatus::CANCELLED) {
        throw new \LogicException('Cannot pay for a cancelled booking.');
    }
}

public function markAsPaid(Booking $booking, Payment $payment): void
{
    $booking->update([
        'status'     => BookingStatus::PAID,
        'paid_at'    => now(),
        'payment_id' => $payment->id,
    ]);
}
```

```php
// app/Http/Controllers/PaymentController.php
class PaymentController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    public function store(ProcessPaymentRequest $request, Booking $booking): JsonResponse
    {
        $payment = $this->paymentService->process($booking, $request->validated());

        dispatch(new SendPaymentConfirmation($payment));

        return PaymentResource::make($payment->load('booking'))
            ->response()
            ->setStatusCode(201);
    }
}
```

### What We're Evaluating

- `authorize()` in Form Request delegates to Policy (not inline logic in controller)
- `BookingPolicy@pay` — role + school scope + status guard in one method
- `ensurePayable()` throws `\LogicException` — service layer uses exceptions, not `abort()`
- `DB::transaction()` at the orchestration layer — payment + booking update are atomic
- `dispatch()` called **after** the transaction closes — job only fires on commit
- Thin controller — no business logic, no try/catch, one call, one return

---

## Problem 02 — Result Pattern, Cache, Broadcasting & Full Test Suite (Hard)

### Scenario

Harden the payment flow: introduce the `Result` pattern so gateway failures return explicit values instead of exceptions, broadcast the status change to the booking's private channel, invalidate the booking cache, add rate limiting on the payment endpoint, and write a full feature test suite covering every path.

### Requirements

1. Refactor `PaymentService::process()` to return `Result<Payment>` — `Result::failure('...')` for already-paid, gateway decline; controller reads `$result->isSuccess()`
2. `BookingStatusChanged` event — `ShouldBroadcast` on `PrivateChannel('booking.{id}')` + `PrivateChannel('school.{id}')`; `broadcastAs('booking.status-changed')`
3. `BookingObserver::updated()` — `Cache::tags(['bookings', "booking:{$booking->id}"])->flush()` on every save
4. `RateLimiter::for('payment', ...)` in `AppServiceProvider` — 3 attempts per minute per booking ID
5. Structured logging in `PaymentService` on success: `Log::info('Payment processed', ['booking_id', 'payment_id', 'amount', 'user_id'])`
6. Feature test — success path: `Http::fake`, `Event::fake`, `Queue::fake`, assert DB, assert 201, assert job pushed, assert event dispatched
7. Feature test — gateway decline: assert 422, `assertDatabaseMissing('payments', ...)`, `assertSame(PENDING, $booking->fresh()->status)`
8. Feature test — already-paid idempotency: assert 422, `Http::assertNothingSent()` (gateway never called)
9. Feature test — unauthorized: different school → 403

### Expected Code

```php
// app/Services/PaymentService.php  (returns Result instead of throwing)
public function process(Booking $booking, array $data): Result
{
    if ($booking->status === BookingStatus::PAID) {
        return Result::failure('Booking is already paid.');
    }

    try {
        $payment = DB::transaction(function () use ($booking, $data) {
            $charge = $this->gateway->charge($booking->amount, 'AED', $data['token'] ?? null);

            if ($charge->failed()) {
                throw new PaymentDeclinedException($charge->declineReason());
            }

            $payment = Payment::create([
                'booking_id'        => $booking->id,
                'amount'            => $booking->amount,
                'method'            => $data['payment_method'],
                'gateway_reference' => $charge->reference(),
            ]);

            $this->bookingService->markAsPaid($booking, $payment);

            return $payment;
        });

        broadcast(new BookingStatusChanged($booking->fresh()))->toOthers();

        Log::info('Payment processed', [
            'booking_id' => $booking->id,
            'payment_id' => $payment->id,
            'amount'     => $payment->amount,
            'user_id'    => auth()->id(),
        ]);

        return Result::success($payment);

    } catch (PaymentDeclinedException $e) {
        return Result::failure($e->getMessage());
    }
}
```

```php
// app/Http/Controllers/PaymentController.php  (reads Result)
public function store(ProcessPaymentRequest $request, Booking $booking): JsonResponse
{
    $result = $this->paymentService->process($booking, $request->validated());

    if (!$result->isSuccess()) {
        return response()->json(['message' => $result->error()], 422);
    }

    dispatch(new SendPaymentConfirmation($result->value()));

    return PaymentResource::make($result->value()->load('booking'))
        ->response()
        ->setStatusCode(201);
}
```

```php
// app/Events/BookingStatusChanged.php
class BookingStatusChanged implements ShouldBroadcast
{
    use SerializesModels;

    public function __construct(public readonly Booking $booking) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('booking.'  . $this->booking->id),
            new PrivateChannel('school.'   . $this->booking->school_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id'      => $this->booking->id,
            'status'  => $this->booking->status->value,
            'paid_at' => $this->booking->paid_at?->toIso8601String(),
        ];
    }

    public function broadcastAs(): string { return 'booking.status-changed'; }
}
```

```php
// app/Observers/BookingObserver.php  (cache invalidation)
public function updated(Booking $booking): void
{
    Cache::tags(['bookings', "booking:{$booking->id}"])->flush();
}
```

```php
// app/Providers/AppServiceProvider.php  (rate limiter)
RateLimiter::for('payment', function (Request $request) {
    $booking = $request->route('booking');

    return Limit::perMinute(3)
        ->by('payment|' . $booking?->id . '|' . $request->user()?->id)
        ->response(fn() => response()->json(
            ['message' => 'Too many payment attempts. Please wait.'], 429
        ));
});

// routes/api.php
Route::post('bookings/{booking}/payments', [PaymentController::class, 'store'])
    ->middleware(['auth:sanctum', 'throttle:payment'])
    ->name('api.bookings.payments.store');
```

```php
// tests/Feature/PaymentFlowTest.php

public function test_successful_payment_returns_201_and_dispatches_job_and_event(): void
{
    Event::fake([BookingStatusChanged::class]);
    Queue::fake([SendPaymentConfirmation::class]);
    Http::fake(['gateway.api/*' => Http::response(['reference' => 'ch_123', 'status' => 'succeeded'], 200)]);

    $user    = User::factory()->schoolAdmin()->create();
    $booking = Booking::factory()->pending()->for($user->school)->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.bookings.payments.store', $booking), [
            'payment_method' => 'card',
            'token'          => 'tok_test',
        ])
        ->assertCreated()
        ->assertJsonPath('data.booking_id', $booking->id);

    $this->assertDatabaseHas('payments', ['booking_id' => $booking->id]);
    $this->assertEquals(BookingStatus::PAID, $booking->fresh()->status);

    Queue::assertPushed(SendPaymentConfirmation::class);
    Event::assertDispatched(BookingStatusChanged::class,
        fn($e) => $e->booking->id === $booking->id
    );
}

public function test_gateway_decline_returns_422_and_rolls_back(): void
{
    Http::fake(['gateway.api/*' => Http::response(['status' => 'declined', 'reason' => 'Insufficient funds'], 200)]);

    $user    = User::factory()->schoolAdmin()->create();
    $booking = Booking::factory()->pending()->for($user->school)->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.bookings.payments.store', $booking), [
            'payment_method' => 'card',
            'token'          => 'tok_fail',
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Insufficient funds');

    $this->assertDatabaseMissing('payments', ['booking_id' => $booking->id]);
    $this->assertEquals(BookingStatus::PENDING, $booking->fresh()->status);
}

public function test_already_paid_booking_returns_422_and_gateway_never_called(): void
{
    Http::fake(); // gateway must NOT be called

    $user    = User::factory()->schoolAdmin()->create();
    $booking = Booking::factory()->paid()->for($user->school)->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.bookings.payments.store', $booking), [
            'payment_method' => 'card',
            'token'          => 'tok_test',
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Booking is already paid.');

    Http::assertNothingSent();
}

public function test_school_admin_cannot_pay_for_another_schools_booking(): void
{
    $user    = User::factory()->schoolAdmin()->create();
    $booking = Booking::factory()->pending()->create(); // different school

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.bookings.payments.store', $booking), [
            'payment_method' => 'card',
            'token'          => 'tok_test',
        ])
        ->assertForbidden();
}
```

### Skills Checklist — What This Test Covers

| Skill                  | Applied Where                                          |
|------------------------|--------------------------------------------------------|
| Service Layer          | `PaymentService` orchestrates 3 services               |
| Result Pattern         | `process()` returns `Result<Payment>`                  |
| DB::transaction        | Payment + booking update are atomic                    |
| Form Request + Policy  | `authorize()` → `BookingPolicy@pay`                    |
| Events + Jobs          | `BookingStatusChanged` broadcast + `SendPaymentConfirmation` job |
| Broadcasting           | `ShouldBroadcast`, `PrivateChannel`, `broadcastAs()`   |
| Cache + Observer       | `BookingObserver::updated()` flushes tagged cache      |
| Rate Limiting          | `RateLimiter::for('payment')` — 3/min per booking      |
| Structured Logging     | `Log::info()` with context array on success            |
| Feature Tests          | `Http::fake`, `Event::fake`, `Queue::fake`, all 4 paths|
