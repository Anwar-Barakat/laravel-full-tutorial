# LARAVEL_TEST_49 — Microservices vs Monolith

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Microservices vs Monolith (Medium)

---

### Monolith — when it's the right choice

```
Tripz is a monolith. That's the correct decision.

Arguments FOR monolith:
  1. Team size: 3 developers → microservices require DevOps overhead per service
  2. Domain complexity: well understood → premature decomposition splits wrong boundaries
  3. Deployment: single Laravel app on a VPS/ECS → simple CI/CD
  4. Data: most queries JOIN bookings + schools + trips → splitting = distributed joins
  5. Transactions: booking + payment + capacity = single DB transaction (free in monolith)
  6. Testing: one test suite, one database, one deploy
  7. Performance: in-process function calls are 1000× faster than HTTP between services

Arguments AGAINST monolith (when true at scale):
  ❌ Team of 50+ stepping on each other's changes constantly
  ❌ Different scaling needs: trip catalogue reads 100× more than payments
  ❌ Different deployment cadences: payment compliance team deploys weekly, others daily
  ❌ Technology requirements: payments needs HSM, AI needs GPU — different infrastructure

Tripz answer: monolith until proven otherwise. Start simple.
```

---

### Modular Monolith — structure for future extraction

```
app/
├── Modules/
│   ├── Booking/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Events/
│   │   ├── Repositories/
│   │   ├── Contracts/
│   │   └── BookingServiceProvider.php
│   ├── Payment/
│   │   ├── Http/Controllers/
│   │   ├── Gateways/
│   │   ├── Services/
│   │   ├── Contracts/
│   │   └── PaymentServiceProvider.php
│   ├── Notification/
│   │   ├── Services/
│   │   ├── Channels/
│   │   └── NotificationServiceProvider.php
│   └── School/
│       ├── Models/
│       ├── Services/
│       └── SchoolServiceProvider.php
```

```php
// app/Modules/Booking/BookingServiceProvider.php
class BookingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BookingRepositoryInterface::class, EloquentBookingRepository::class);
        $this->app->bind(BookingCreatorInterface::class,    BookingService::class);
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/routes.php');
        $this->loadMigrationsFrom(__DIR__ . '/database/migrations');
    }
}

// bootstrap/providers.php — register each module:
return [
    App\Modules\Booking\BookingServiceProvider::class,
    App\Modules\Payment\PaymentServiceProvider::class,
    App\Modules\Notification\NotificationServiceProvider::class,
    App\Modules\School\SchoolServiceProvider::class,
];
```

```php
// Module boundaries — enforced by interface-only cross-module communication
// ✅ Booking module MAY call Payment via interface:
use App\Modules\Payment\Contracts\PaymentGatewayInterface;

class BookingService
{
    public function __construct(private PaymentGatewayInterface $payment) {}
    // ← depends on interface, not on PaymentService directly
}

// ❌ Booking module must NOT import Payment internals:
// use App\Modules\Payment\Services\StripeGateway;   ← violation — direct coupling
// use App\Modules\Payment\Models\Transaction;       ← violation — cross-module model

// ✅ Cross-module communication via events (fully decoupled):
// Booking fires BookingCreated — Notification module listens
// ← Booking has zero knowledge of Notification module
class BookingService
{
    public function create(array $data): Booking
    {
        $booking = $this->repository->create($data);
        event(new BookingCreated($booking));  // Notification module listens to this
        return $booking;
        // ← Booking + Notification modules: zero direct coupling
    }
}

// ✅ Database: modules own their tables, avoid cross-module JOINs
// bookings table: owned by Booking module
// payments table: owned by Payment module
// If Booking needs payment data → query via PaymentRepositoryInterface, not JOIN
// ← when extracted to microservice, this boundary is already clean
```

---

### Service layer as preparation for extraction

```php
// The same BookingService works in:
//   1. Monolith: called directly by controller
//   2. Modular monolith: same, but in a module
//   3. Microservice: same code, just in its own deployed app

// Key principle: Business logic in service ← no framework coupling
//   BookingService does NOT import Request or Response
//   BookingService does NOT know it's being called via HTTP
//   → can be called from: Controller, CLI command, queue job, or HTTP client

// app/Modules/Booking/Services/BookingService.php
class BookingService
{
    public function create(array $validated): Booking
    {
        // Pure business logic — same whether monolith or microservice
        $amount  = $this->pricing->calculate($validated);
        $booking = $this->repository->create([...$validated, 'amount' => $amount]);
        event(new BookingCreated($booking));
        return $booking;
    }
}

// Controller (HTTP adapter):
class BookingController extends Controller
{
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->service->create($request->validated());
        return response()->json(new BookingResource($booking), 201);
    }
}

// CLI adapter (same service, different entrypoint):
class CreateBookingCommand extends Command
{
    public function handle(BookingService $service): void
    {
        $booking = $service->create([
            'school_id'     => $this->argument('school_id'),
            'student_count' => $this->argument('count'),
            // ...
        ]);
        $this->info("Created booking {$booking->id}");
    }
}
// ← extract to microservice: same BookingService, new HTTP entrypoint
```

---

### When to split — signals that indicate extraction

```php
// Signal 1: Independent scaling needs
//   Trip catalogue: 10,000 reads/day
//   Payment processing: 100 writes/day
//   ← Different resources needed (cdn-optimized reads vs PCI-compliant payment infra)

// Signal 2: Independent deployment cadence
//   Payment team: weekly deployments (compliance review required)
//   Booking team: 5× per day
//   ← Payments block everyone in a monolith

// Signal 3: Technology mismatch
//   AI trip recommendations: Python/FastAPI
//   Core booking: PHP/Laravel
//   ← Can't coexist in one Laravel app

// Signal 4: Data ownership conflicts
//   School portal team owns school data
//   Booking team needs school data for every booking
//   ← Two teams modifying same models → merge conflicts, coupling

// Signal 5: Blast radius too large
//   PDF generation bug → takes down entire booking API
//   ← Isolate heavy/risky work in separate process

// NOT valid reasons to split:
//   "Microservices are modern"
//   "Netflix does it"
//   Team of 3
//   Performance (monolith is faster in-process)
//   Under 100k requests/day
```

---

## Problem 02 — Advanced Microservices vs Monolith (Hard)

---

### Microservices communication patterns

```php
// ============================================================
// Synchronous HTTP (REST) — request/response
// ============================================================

// BookingService calls PaymentService via HTTP:
class PaymentGatewayHttpAdapter implements PaymentGatewayInterface
{
    public function __construct(private Http $http) {}

    public function charge(float $amount, string $currency): PaymentResult
    {
        $response = Http::withToken(config('services.payment.token'))
            ->timeout(10)
            ->retry(3, 100, function ($exception) {
                return $exception instanceof ConnectionException;  // retry on network errors
            })
            ->post(config('services.payment.url') . '/charges', [
                'amount'   => $amount,
                'currency' => $currency,
            ]);

        if ($response->failed()) {
            throw new PaymentServiceException($response->json('error.message'));
        }

        return new PaymentResult($response->json('id'), $response->json('status'));
    }
}

// ✅ Simple, familiar, easy to debug (curl the endpoint)
// ❌ Latency: 10–50ms per HTTP call vs 0.01ms in-process
// ❌ Coupling: Booking service fails if Payment service is down
// ❌ Distributed transactions: payment succeeded but booking DB write failed?

// ============================================================
// Asynchronous messaging (queues) — fire and forget
// ============================================================

// BookingService publishes event to SQS/RabbitMQ:
class BookingCreatedPublisher
{
    public function publish(Booking $booking): void
    {
        // Publish to shared message bus
        Queue::connection('sqs')->pushRaw(json_encode([
            'type'      => 'booking.created',
            'booking_id' => $booking->id,
            'amount'     => $booking->amount,
            'school_id'  => $booking->school_id,
        ]), 'booking-events');
    }
}

// NotificationService subscribes and processes:
class BookingCreatedConsumer implements ShouldQueue
{
    public function handle(array $payload): void
    {
        // NotificationService processes independently
        Mail::to($payload['contact_email'])
            ->send(new BookingConfirmation($payload));
    }
}

// ✅ Decoupled: BookingService doesn't wait for Notification
// ✅ Resilient: if Notification is down, message sits in queue
// ✅ Independent scaling: each service scales its own consumers
// ❌ Eventual consistency: email may arrive after booking is visible
// ❌ Harder to debug: follow the message across services
```

---

### Data ownership and distributed transactions

```php
// Microservices rule: each service owns its own database
// No cross-service JOINs — query via API

// Booking Service DB: bookings, booking_items
// Payment Service DB: payments, refunds, transactions
// School Service DB:  schools, users, contacts

// Problem: Create booking (write to Booking DB) + charge payment (write to Payment DB)
//   Both must succeed or both must fail — distributed transaction needed

// ============================================================
// Saga pattern — compensating transactions
// ============================================================
class BookingCreationSaga
{
    private array $compensations = [];

    public function execute(array $data): Booking
    {
        try {
            // Step 1: Create booking (status = 'reserving')
            $booking = $this->bookingService->reserve($data);
            $this->compensations[] = fn () => $this->bookingService->cancel($booking->id);

            // Step 2: Process payment
            $payment = $this->paymentService->charge($booking->amount, 'AED');
            $this->compensations[] = fn () => $this->paymentService->refund($payment->id);

            // Step 3: Confirm booking (status = 'confirmed')
            $this->bookingService->confirm($booking->id, $payment->id);

            return $booking;

        } catch (\Exception $e) {
            // Rollback: run compensations in reverse order
            foreach (array_reverse($this->compensations) as $compensate) {
                try {
                    $compensate();
                } catch (\Exception $compensateError) {
                    // Log compensation failure — manual intervention needed
                    Log::critical('Saga compensation failed', [
                        'error' => $compensateError->getMessage(),
                    ]);
                }
            }
            throw $e;
        }
    }
}
// ✅ No distributed lock needed — each step is atomic in its own service
// ❌ Complex: compensation logic for every step
// ❌ Temporary inconsistency: booking exists but payment not yet processed
```

---

### Modular monolith boundary enforcement — tools

```php
// Option 1: Deptrac — static analysis to enforce module boundaries
// deptrac.yaml:
// paths:
//   - ./app/Modules
// layers:
//   - name: Booking
//     collectors:
//       - type: className
//         regex: App\\Modules\\Booking\\.*
//   - name: Payment
//     collectors:
//       - type: className
//         regex: App\\Modules\\Payment\\.*
// ruleset:
//   Booking:
//     - Payment   ← Booking MAY import from Payment interfaces only
//   Payment: []   ← Payment module has no dependencies on other modules

// Run: php vendor/bin/deptrac analyze
// Fails CI if Booking imports from Payment internals

// Option 2: Namespace conventions + code review
// app/Modules/Payment/Contracts/ → public API (importable by other modules)
// app/Modules/Payment/Internal/  → private implementation (never import from outside)

// Option 3: PHP scoper or separate composer packages (strongest isolation)
// Each module is a separate composer package
// Only exposes what's in its public API
// ← overkill for most teams; microservices are simpler than this
```

---

### Observability in distributed systems

```php
// Distributed tracing — follow request across services
// Each service adds X-Correlation-ID header:
class CorrelationIdMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = $request->header('X-Correlation-ID', Str::uuid()->toString());
        $request->headers->set('X-Correlation-ID', $correlationId);

        // Pass to all outgoing HTTP calls:
        Http::withHeaders(['X-Correlation-ID' => $correlationId]);

        // Log with correlation ID in all log entries:
        Log::withContext(['correlation_id' => $correlationId]);

        $response = $next($request);
        $response->headers->set('X-Correlation-ID', $correlationId);
        return $response;
    }
}

// Structured log across all services:
// BookingService: {"correlation_id": "abc-123", "event": "booking.created", "booking_id": 42}
// PaymentService: {"correlation_id": "abc-123", "event": "payment.charged", "booking_id": 42}
// NotifyService:  {"correlation_id": "abc-123", "event": "email.sent", "booking_id": 42}
// ← search Datadog/ELK by correlation_id: see full request flow across services

// Health checks for each service:
Route::get('/health', function () {
    return response()->json([
        'status'      => 'ok',
        'service'     => 'booking-service',
        'version'     => config('app.version'),
        'db'          => checkDatabase(),
        'dependencies' => [
            'payment-service' => checkPaymentService(),  // HTTP ping
            'redis'           => checkRedis(),
        ],
    ]);
});
// Service mesh (Kubernetes) or AWS ECS health check hits this every 30s
// Unhealthy pod removed from load balancer automatically
```
