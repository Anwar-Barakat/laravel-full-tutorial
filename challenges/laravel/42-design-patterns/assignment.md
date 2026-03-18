# LARAVEL_TEST_42 — Design Patterns · Strategy · Observer · Factory

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Core Design Patterns (Medium)

Implement 6 essential design patterns with Tripz booking code.

---

### Strategy Pattern — swap pricing algorithms at runtime

```php
// app/Contracts/PricingStrategyInterface.php
interface PricingStrategyInterface
{
    public function calculate(float $baseAmount, int $studentCount): float;
    public function label(): string;
}

// app/Services/Pricing/StandardPricing.php
class StandardPricing implements PricingStrategyInterface
{
    public function calculate(float $baseAmount, int $studentCount): float
    {
        return $baseAmount * $studentCount;
    }

    public function label(): string { return 'standard'; }
}

// app/Services/Pricing/EarlyBirdPricing.php
class EarlyBirdPricing implements PricingStrategyInterface
{
    public function calculate(float $baseAmount, int $studentCount): float
    {
        return $baseAmount * $studentCount * 0.85;  // 15% early-bird discount
    }

    public function label(): string { return 'early_bird'; }
}

// app/Services/Pricing/BulkDiscountPricing.php
class BulkDiscountPricing implements PricingStrategyInterface
{
    public function calculate(float $baseAmount, int $studentCount): float
    {
        $multiplier = match(true) {
            $studentCount >= 100 => 0.75,
            $studentCount >= 50  => 0.85,
            $studentCount >= 20  => 0.90,
            default              => 1.00,
        };
        return $baseAmount * $studentCount * $multiplier;
    }

    public function label(): string { return 'bulk'; }
}

// app/Services/BookingPricingService.php — context class
class BookingPricingService
{
    private PricingStrategyInterface $strategy;

    public function setStrategy(PricingStrategyInterface $strategy): static
    {
        $this->strategy = $strategy;
        return $this;
    }

    public function calculatePrice(float $baseAmount, int $studentCount): array
    {
        $total = $this->strategy->calculate($baseAmount, $studentCount);
        return [
            'strategy'      => $this->strategy->label(),
            'base_amount'   => $baseAmount,
            'student_count' => $studentCount,
            'total'         => round($total, 2),
        ];
    }
}

// Usage: swap strategy at runtime — no if/else in caller
$pricer = new BookingPricingService();
$pricer->setStrategy(new StandardPricing())->calculatePrice(50.00, 30);
$pricer->setStrategy(new EarlyBirdPricing())->calculatePrice(50.00, 30);
$pricer->setStrategy(new BulkDiscountPricing())->calculatePrice(50.00, 80);

// Resolve from IoC (strategy selected by trip configuration):
$strategy = app()->makeWith(PricingStrategyInterface::class, [
    'type' => $booking->pricing_type,  // 'early_bird', 'bulk', 'standard'
]);
```

---

### Observer Pattern — booking events trigger multiple listeners

```php
// app/Events/BookingCreated.php
class BookingCreated
{
    public function __construct(public readonly Booking $booking) {}
}

// app/Listeners/SendBookingConfirmationEmail.php
class SendBookingConfirmationEmail
{
    public function handle(BookingCreated $event): void
    {
        Mail::to($event->booking->contact_email)
            ->send(new BookingConfirmation($event->booking));
    }
}

// app/Listeners/LogBookingActivity.php
class LogBookingActivity
{
    public function handle(BookingCreated $event): void
    {
        activity('booking')
            ->performedOn($event->booking)
            ->log('Booking created');
    }
}

// app/Listeners/UpdateSchoolStats.php
class UpdateSchoolStats
{
    public function handle(BookingCreated $event): void
    {
        Cache::increment("school:{$event->booking->school_id}:booking_count");
    }
}

// app/Listeners/ClearBookingCache.php
class ClearBookingCache
{
    public function handle(BookingCreated $event): void
    {
        Cache::tags(['bookings'])->flush();
    }
}

// app/Providers/EventServiceProvider.php
protected $listen = [
    BookingCreated::class => [
        SendBookingConfirmationEmail::class,
        LogBookingActivity::class,
        UpdateSchoolStats::class,
        ClearBookingCache::class,
    ],
    BookingCancelled::class => [
        SendCancellationEmail::class,
        ProcessRefund::class,
        RestoreCapacity::class,
    ],
];

// Dispatch from service — no knowledge of listeners
event(new BookingCreated($booking));
// All 4 listeners fire automatically — Open/Closed Principle respected
```

---

### Factory Pattern — create notification objects from a type string

```php
// app/Notifications/BookingNotificationFactory.php
class NotificationFactory
{
    private static array $map = [
        'booking_confirmed' => BookingConfirmedNotification::class,
        'booking_cancelled' => BookingCancelledNotification::class,
        'payment_received'  => PaymentReceivedNotification::class,
        'trip_reminder'     => TripReminderNotification::class,
    ];

    public static function create(string $type, mixed $data): Notification
    {
        if (!isset(self::$map[$type])) {
            throw new \InvalidArgumentException("Unknown notification type: {$type}");
        }

        return new self::$map[$type]($data);
    }

    // Extend: add to $map — no modification to factory logic
}

// Concrete notifications:
class BookingConfirmedNotification extends Notification
{
    public function __construct(private Booking $booking) {}

    public function via($notifiable): array { return ['mail', 'database']; }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Booking #{$this->booking->id} confirmed")
            ->line("Your trip to {$this->booking->trip->destination} is confirmed.");
    }

    public function toArray($notifiable): array
    {
        return ['booking_id' => $this->booking->id, 'type' => 'confirmed'];
    }
}

// Usage:
$notification = NotificationFactory::create('booking_confirmed', $booking);
$booking->school->notify($notification);

// Factory from webhook payload:
$notification = NotificationFactory::create($webhookPayload['event'], $booking);
```

---

### Decorator Pattern — add caching around repository without changing it

```php
// app/Contracts/BookingRepositoryInterface.php
interface BookingRepositoryInterface
{
    public function findById(int $id): ?Booking;
    public function findBySchool(int $schoolId): Collection;
    public function create(array $data): Booking;
    public function update(int $id, array $data): Booking;
}

// app/Repositories/EloquentBookingRepository.php — base implementation
class EloquentBookingRepository implements BookingRepositoryInterface
{
    public function findById(int $id): ?Booking
    {
        return Booking::find($id);
    }

    public function findBySchool(int $schoolId): Collection
    {
        return Booking::where('school_id', $schoolId)->get();
    }

    public function create(array $data): Booking
    {
        return Booking::create($data);
    }

    public function update(int $id, array $data): Booking
    {
        $booking = Booking::findOrFail($id);
        $booking->update($data);
        return $booking;
    }
}

// app/Repositories/CachedBookingRepository.php — decorator: wraps without changing
class CachedBookingRepository implements BookingRepositoryInterface
{
    public function __construct(
        private BookingRepositoryInterface $inner,
        private int $ttl = 3600,
    ) {}

    public function findById(int $id): ?Booking
    {
        return Cache::tags(['bookings'])->remember(
            "booking:{$id}",
            $this->ttl,
            fn () => $this->inner->findById($id)
        );
    }

    public function findBySchool(int $schoolId): Collection
    {
        return Cache::tags(['bookings', "school:{$schoolId}"])->remember(
            "bookings:school:{$schoolId}",
            $this->ttl,
            fn () => $this->inner->findBySchool($schoolId)
        );
    }

    public function create(array $data): Booking
    {
        $booking = $this->inner->create($data);
        Cache::tags(['bookings'])->flush();  // invalidate on write
        return $booking;
    }

    public function update(int $id, array $data): Booking
    {
        $booking = $this->inner->update($id, $data);
        Cache::tags(['bookings'])->forget("booking:{$id}");
        return $booking;
    }
}

// Wire in AppServiceProvider — swap decorator on/off via config:
$this->app->bind(BookingRepositoryInterface::class, function () {
    $eloquent = new EloquentBookingRepository();
    return config('cache.bookings_enabled')
        ? new CachedBookingRepository($eloquent)
        : $eloquent;
});

// Usage — caller never knows if caching is active:
$repo = app(BookingRepositoryInterface::class);
$booking = $repo->findById(42);
```

---

### Repository Pattern — already covered above. Key points:

```php
// Repository: abstract data access — callers don't know if data comes from
//   Eloquent, Redis, flat file, or an in-memory stub in tests

// Test: swap real repository for in-memory double:
class InMemoryBookingRepository implements BookingRepositoryInterface
{
    private array $store = [];
    private int $nextId = 1;

    public function findById(int $id): ?Booking
    {
        return $this->store[$id] ?? null;
    }

    public function create(array $data): Booking
    {
        $booking = new Booking([...$data, 'id' => $this->nextId++]);
        $this->store[$booking->id] = $booking;
        return $booking;
    }
    // ...
}

// In test:
$this->app->bind(BookingRepositoryInterface::class, InMemoryBookingRepository::class);
// → no database hits, tests run 10× faster
```

---

### Singleton Pattern — Laravel's IoC and when NOT to use your own

```php
// Laravel uses Singleton internally for:
//   App container itself: app() always returns same instance
//   DB connections: one connection per request (pooled across requests)
//   Cache, Config, Log: resolved once, reused everywhere

// Register your own singleton in AppServiceProvider:
$this->app->singleton(BookingStatsService::class, function () {
    return new BookingStatsService();
});
// → same instance returned every time app(BookingStatsService::class) is called

// When to use Singleton:
//   Expensive to instantiate (DB connections, HTTP clients)
//   Stateless services (configuration readers, formatters)
//   Shared mutable state intentionally (rate limiter counters — but prefer Redis)

// When NOT to use Singleton:
//   Stateful objects: same instance across requests in Octane = data leaks between users
//   Objects that hold user-specific data
//   Anything that must differ per request

// Octane / Swoole risk:
class BookingContext  // BAD as singleton in Octane
{
    private ?int $currentUserId = null;

    public function setUser(int $id): void { $this->currentUserId = $id; }
    // ← $currentUserId persists across HTTP requests — security vulnerability
}

// Safe: make it request-scoped (bind, not singleton) in Octane
$this->app->bind(BookingContext::class);  // new instance per resolve
```

---

## Problem 02 — Advanced Patterns: Builder · Adapter · Chain (Hard)

---

### Builder Pattern — fluent API for complex query construction

```php
// app/Builders/BookingQueryBuilder.php
class BookingQueryBuilder
{
    private Builder $query;
    private int $perPage = 15;

    private function __construct()
    {
        $this->query = Booking::query();
    }

    public static function create(): static
    {
        return new static();
    }

    public function forSchool(int $schoolId): static
    {
        $this->query->where('school_id', $schoolId);
        return $this;
    }

    public function withStatus(string|array $status): static
    {
        $this->query->whereIn('status', (array) $status);
        return $this;
    }

    public function dateRange(string $from, string $to): static
    {
        $this->query->whereBetween('trip_date', [$from, $to]);
        return $this;
    }

    public function withPayments(): static
    {
        $this->query->with('payments');
        return $this;
    }

    public function withSchool(): static
    {
        $this->query->with('school');
        return $this;
    }

    public function minAmount(float $amount): static
    {
        $this->query->where('amount', '>=', $amount);
        return $this;
    }

    public function paginate(int $perPage): LengthAwarePaginator
    {
        return $this->query->paginate($perPage);
    }

    public function get(): Collection
    {
        return $this->query->get();
    }

    public function first(): ?Booking
    {
        return $this->query->first();
    }
}

// Usage — readable fluent chains:
$bookings = BookingQueryBuilder::create()
    ->forSchool(1)
    ->withStatus('paid')
    ->dateRange('2026-01-01', '2026-06-30')
    ->withPayments()
    ->paginate(15);

$pending = BookingQueryBuilder::create()
    ->withStatus(['pending', 'processing'])
    ->minAmount(1000)
    ->withSchool()
    ->get();
```

---

### Adapter Pattern — wrap MamoPay API to match your interface

```php
// app/Contracts/PaymentGatewayInterface.php — your interface
interface PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult;
    public function refund(string $transactionId, ?float $amount = null): RefundResult;
    public function getTransaction(string $transactionId): TransactionResult;
}

// Third-party: MamoPay SDK — incompatible interface
// MamoPayClient::createCharge(array $params): array
// MamoPayClient::voidCharge(string $chargeId): array
// MamoPayClient::fetchCharge(string $chargeId): array
// ← completely different method names and signatures

// app/Services/Payment/MamoPayAdapter.php — Adapter: maps MamoPay to your interface
class MamoPayAdapter implements PaymentGatewayInterface
{
    public function __construct(private MamoPayClient $client) {}

    public function charge(float $amount, string $currency): PaymentResult
    {
        // Translate: your interface → MamoPay API format
        $response = $this->client->createCharge([
            'amount'   => $amount,              // MamoPay uses decimal, not pence
            'currency' => strtoupper($currency),
            'capture'  => true,
        ]);

        // Translate: MamoPay response → your standard PaymentResult
        return new PaymentResult(
            id:       $response['charge_id'],
            status:   $this->mapStatus($response['state']),
            amount:   $response['amount'],
            currency: $response['currency'],
        );
    }

    public function refund(string $transactionId, ?float $amount = null): RefundResult
    {
        $response = $this->client->voidCharge($transactionId);  // MamoPay calls it "void"

        return new RefundResult(
            id:        $response['void_id'],
            succeeded: $response['state'] === 'voided',
            message:   $response['description'] ?? null,
        );
    }

    public function getTransaction(string $transactionId): TransactionResult
    {
        $response = $this->client->fetchCharge($transactionId);  // MamoPay calls it "fetchCharge"

        return new TransactionResult(
            id:        $response['charge_id'],
            status:    $this->mapStatus($response['state']),
            amount:    $response['amount'],
            createdAt: Carbon::parse($response['created_at']),
        );
    }

    private function mapStatus(string $mamoState): string
    {
        return match($mamoState) {
            'captured'  => 'succeeded',
            'voided'    => 'refunded',
            'pending'   => 'pending',
            'failed'    => 'failed',
            default     => 'unknown',
        };
    }
}

// Wire:
$this->app->bind(PaymentGatewayInterface::class, function () {
    return new MamoPayAdapter(new MamoPayClient(config('services.mamopay.key')));
});

// Usage — caller uses your interface, oblivious to MamoPay:
$result = app(PaymentGatewayInterface::class)->charge(5000, 'AED');
```

---

### Chain of Responsibility — booking processing pipeline

```php
// app/Contracts/BookingHandlerInterface.php
interface BookingHandlerInterface
{
    public function setNext(BookingHandlerInterface $handler): BookingHandlerInterface;
    public function handle(Booking $booking): BookingResult;
}

// app/Handlers/AbstractBookingHandler.php — base class handles chain wiring
abstract class AbstractBookingHandler implements BookingHandlerInterface
{
    private ?BookingHandlerInterface $next = null;

    public function setNext(BookingHandlerInterface $handler): BookingHandlerInterface
    {
        $this->next = $handler;
        return $handler;  // return $handler to allow fluent chaining
    }

    protected function passToNext(Booking $booking): BookingResult
    {
        if ($this->next) {
            return $this->next->handle($booking);
        }
        return BookingResult::success($booking);
    }
}

// app/Handlers/ValidateBookingHandler.php
class ValidateBookingHandler extends AbstractBookingHandler
{
    public function handle(Booking $booking): BookingResult
    {
        if ($booking->student_count < 1) {
            return BookingResult::failure('Student count must be at least 1');
        }

        if (Carbon::parse($booking->trip_date)->isPast()) {
            return BookingResult::failure('Trip date must be in the future');
        }

        return $this->passToNext($booking);  // pass to next handler
    }
}

// app/Handlers/CalculatePricingHandler.php
class CalculatePricingHandler extends AbstractBookingHandler
{
    public function __construct(private BookingPricingService $pricer) {}

    public function handle(Booking $booking): BookingResult
    {
        $result = $this->pricer
            ->setStrategy(PricingStrategyFactory::forBooking($booking))
            ->calculatePrice($booking->base_amount, $booking->student_count);

        $booking->amount = $result['total'];

        return $this->passToNext($booking);
    }
}

// app/Handlers/ProcessPaymentHandler.php
class ProcessPaymentHandler extends AbstractBookingHandler
{
    public function __construct(private PaymentGatewayInterface $gateway) {}

    public function handle(Booking $booking): BookingResult
    {
        $payment = $this->gateway->charge($booking->amount, 'AED');

        if (!$payment->succeeded()) {
            return BookingResult::failure("Payment failed: {$payment->errorMessage()}");
        }

        $booking->payment_id = $payment->id;
        $booking->status     = 'paid';

        return $this->passToNext($booking);
    }
}

// app/Handlers/SendNotificationHandler.php
class SendNotificationHandler extends AbstractBookingHandler
{
    public function handle(Booking $booking): BookingResult
    {
        event(new BookingCreated($booking));  // fires all listeners
        return $this->passToNext($booking);
    }
}

// app/Pipelines/BookingPipeline.php
class BookingPipeline
{
    public static function process(Booking $booking, array $handlers): BookingResult
    {
        if (empty($handlers)) {
            return BookingResult::success($booking);
        }

        // Wire handlers into a chain
        for ($i = 0; $i < count($handlers) - 1; $i++) {
            $handlers[$i]->setNext($handlers[$i + 1]);
        }

        return $handlers[0]->handle($booking);
    }
}

// Usage:
$result = BookingPipeline::process($booking, [
    app(ValidateBookingHandler::class),
    app(CalculatePricingHandler::class),
    app(ProcessPaymentHandler::class),
    app(SendNotificationHandler::class),
]);

if (!$result->succeeded) {
    return response()->json(['error' => $result->message], 422);
}

// Or use Laravel's built-in Pipeline (same pattern):
$result = Pipeline::send($booking)
    ->through([
        ValidateBookingHandler::class,
        CalculatePricingHandler::class,
        ProcessPaymentHandler::class,
        SendNotificationHandler::class,
    ])
    ->thenReturn();
```
