# LARAVEL_TEST_46 — Clean Architecture · Hexagonal

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Clean Architecture (Medium)

Demonstrate clean architecture applied to the Tripz booking platform.

---

### The Dependency Rule

```
┌─────────────────────────────────────────────────────────────────┐
│  Infrastructure (outermost)                                     │
│  Eloquent, MySQL, Redis, HTTP clients, SQS, S3                  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Interface Adapters                                     │   │
│   │  Controllers, Repositories, Gateways, Presenters        │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │  Application (Use Cases)                        │   │   │
│   │   │  BookingService, CreateBookingUseCase            │   │   │
│   │   │                                                 │   │   │
│   │   │   ┌─────────────────────────────────────────┐   │   │   │
│   │   │   │  Domain (innermost — pure PHP)          │   │   │   │
│   │   │   │  Entities, Value Objects, Interfaces    │   │   │   │
│   │   │   │  NO Laravel dependencies allowed here   │   │   │   │
│   │   │   └─────────────────────────────────────────┘   │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

DEPENDENCY RULE: dependencies point INWARD only
  Infrastructure → Adapters → Application → Domain
  Domain NEVER imports from Infrastructure or Laravel
```

---

### Domain Layer — pure PHP, zero framework dependencies

```php
// app/Domain/Booking/Entities/Booking.php
// Pure PHP entity — NO Eloquent, NO Laravel imports
namespace App\Domain\Booking\Entities;

class Booking
{
    private BookingId     $id;
    private SchoolId      $schoolId;
    private TripId        $tripId;
    private Money         $amount;
    private StudentCount  $studentCount;
    private TripDate      $tripDate;
    private BookingStatus $status;

    private array $domainEvents = [];

    public function __construct(
        BookingId    $id,
        SchoolId     $schoolId,
        TripId       $tripId,
        Money        $amount,
        StudentCount $studentCount,
        TripDate     $tripDate,
    ) {
        $this->id           = $id;
        $this->schoolId     = $schoolId;
        $this->tripId       = $tripId;
        $this->amount       = $amount;
        $this->studentCount = $studentCount;
        $this->tripDate     = $tripDate;
        $this->status       = BookingStatus::Pending;

        $this->domainEvents[] = new BookingCreated($this);
    }

    public function confirm(PaymentResult $payment): void
    {
        if ($this->status !== BookingStatus::Pending) {
            throw new InvalidBookingStateException(
                "Cannot confirm booking in {$this->status->value} state"
            );
        }

        $this->status = BookingStatus::Confirmed;
        $this->domainEvents[] = new BookingConfirmed($this, $payment);
    }

    public function cancel(string $reason): void
    {
        if (!$this->isCancellable()) {
            throw new InvalidBookingStateException('Booking cannot be cancelled');
        }

        $this->status = BookingStatus::Cancelled;
        $this->domainEvents[] = new BookingCancelled($this, $reason);
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [BookingStatus::Pending, BookingStatus::Confirmed])
            && $this->tripDate->isAfter(TripDate::now()->addDays(7));
    }

    public function releaseEvents(): array
    {
        $events = $this->domainEvents;
        $this->domainEvents = [];
        return $events;
    }

    // Getters (no setters — immutable except via domain methods):
    public function id(): BookingId          { return $this->id; }
    public function schoolId(): SchoolId     { return $this->schoolId; }
    public function amount(): Money          { return $this->amount; }
    public function status(): BookingStatus  { return $this->status; }
}
```

```php
// app/Domain/Booking/ValueObjects/Money.php
// Value Object: immutable, equality by value not identity
namespace App\Domain\Booking\ValueObjects;

final class Money
{
    public function __construct(
        private readonly int    $amount,   // stored in pence/fils (avoid float rounding)
        private readonly string $currency, // ISO 4217
    ) {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Money amount cannot be negative');
        }
    }

    public function add(Money $other): self
    {
        $this->assertSameCurrency($other);
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function multiply(float $factor): self
    {
        return new self((int) round($this->amount * $factor), $this->currency);
    }

    public function equals(Money $other): bool
    {
        return $this->amount === $other->amount && $this->currency === $other->currency;
    }

    public function toDecimal(): float
    {
        return $this->amount / 100;
    }

    public function formatted(): string
    {
        return match($this->currency) {
            'GBP' => '£' . number_format($this->toDecimal(), 2),
            'AED' => 'AED ' . number_format($this->toDecimal(), 2),
            default => $this->currency . ' ' . number_format($this->toDecimal(), 2),
        };
    }

    private function assertSameCurrency(Money $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new CurrencyMismatchException(
                "Cannot add {$this->currency} and {$other->currency}"
            );
        }
    }
}
```

```php
// app/Domain/Booking/Contracts/BookingRepositoryInterface.php
// Interface defined in domain — infrastructure implements it
namespace App\Domain\Booking\Contracts;

interface BookingRepositoryInterface
{
    public function findById(BookingId $id): ?Booking;
    public function findBySchool(SchoolId $schoolId): BookingCollection;
    public function save(Booking $booking): void;
    public function nextId(): BookingId;
}

// app/Domain/Payment/Contracts/PaymentGatewayInterface.php
interface PaymentGatewayInterface
{
    public function charge(Money $amount, string $currency): PaymentResult;
    public function refund(PaymentId $paymentId, ?Money $amount = null): RefundResult;
}
```

---

### Application Layer — use cases, orchestration

```php
// app/Application/Booking/CreateBookingUseCase.php
// Orchestrates: domain entities + repository + payment gateway + events
namespace App\Application\Booking;

class CreateBookingUseCase
{
    public function __construct(
        private BookingRepositoryInterface $bookings,
        private TripRepositoryInterface    $trips,
        private PaymentGatewayInterface    $payment,
        private EventDispatcherInterface   $dispatcher,
    ) {}

    public function execute(CreateBookingCommand $command): BookingId
    {
        // 1. Load trip (domain entity) and validate capacity
        $trip = $this->trips->findById($command->tripId);

        if (!$trip->hasCapacityFor($command->studentCount)) {
            throw new InsufficientCapacityException(
                "Trip {$command->tripId->value()} cannot accommodate {$command->studentCount->value()} students"
            );
        }

        // 2. Create booking entity (domain logic)
        $booking = new Booking(
            id:           $this->bookings->nextId(),
            schoolId:     $command->schoolId,
            tripId:       $command->tripId,
            amount:       $trip->priceFor($command->studentCount),
            studentCount: $command->studentCount,
            tripDate:     $command->tripDate,
        );

        // 3. Process payment via gateway abstraction
        $payment = $this->payment->charge($booking->amount(), 'AED');

        // 4. Confirm booking (domain state transition)
        $booking->confirm($payment);

        // 5. Reserve capacity on trip
        $trip->reserveCapacity($command->studentCount);

        // 6. Persist both entities
        $this->bookings->save($booking);
        $this->trips->save($trip);

        // 7. Dispatch domain events
        foreach ($booking->releaseEvents() as $event) {
            $this->dispatcher->dispatch($event);
        }

        return $booking->id();
    }
}

// Command (input DTO):
class CreateBookingCommand
{
    public function __construct(
        public readonly SchoolId     $schoolId,
        public readonly TripId       $tripId,
        public readonly StudentCount $studentCount,
        public readonly TripDate     $tripDate,
        public readonly string       $contactEmail,
    ) {}
}
```

---

### Infrastructure Layer — Laravel + Eloquent implement domain interfaces

```php
// app/Infrastructure/Persistence/EloquentBookingRepository.php
// Implements domain interface using Eloquent — domain doesn't know Eloquent exists
namespace App\Infrastructure\Persistence;

class EloquentBookingRepository implements BookingRepositoryInterface
{
    public function findById(BookingId $id): ?Booking
    {
        $model = BookingModel::find($id->value());
        return $model ? $this->toDomain($model) : null;
    }

    public function save(Booking $booking): void
    {
        BookingModel::updateOrCreate(
            ['id' => $booking->id()->value()],
            $this->toArray($booking)
        );
    }

    public function nextId(): BookingId
    {
        return BookingId::generate();
    }

    private function toDomain(BookingModel $model): Booking
    {
        // Reconstruct domain entity from Eloquent model
        // Uses reconstitute() factory method to bypass constructor invariants
        return Booking::reconstitute(
            id:           new BookingId($model->id),
            schoolId:     new SchoolId($model->school_id),
            tripId:       new TripId($model->trip_id),
            amount:       new Money((int)($model->amount * 100), $model->currency),
            studentCount: new StudentCount($model->student_count),
            tripDate:     TripDate::fromString($model->trip_date),
            status:       BookingStatus::from($model->status),
        );
    }

    private function toArray(Booking $booking): array
    {
        return [
            'school_id'     => $booking->schoolId()->value(),
            'trip_id'       => $booking->tripId()->value(),
            'amount'        => $booking->amount()->toDecimal(),
            'student_count' => $booking->studentCount()->value(),
            'trip_date'     => $booking->tripDate()->toDateString(),
            'status'        => $booking->status()->value,
        ];
    }
}
```

```php
// app/Infrastructure/Payment/StripeGateway.php
// Implements domain interface using real Stripe SDK
namespace App\Infrastructure\Payment;

class StripeGateway implements PaymentGatewayInterface
{
    private \Stripe\StripeClient $client;

    public function __construct()
    {
        $this->client = new \Stripe\StripeClient(config('services.stripe.secret'));
    }

    public function charge(Money $amount, string $currency): PaymentResult
    {
        $intent = $this->client->paymentIntents->create([
            'amount'   => $amount->toInt(),  // in pence
            'currency' => strtolower($currency),
        ]);

        return new PaymentResult(
            new PaymentId($intent->id),
            PaymentStatus::from($intent->status),
            $amount,
        );
    }

    public function refund(PaymentId $paymentId, ?Money $amount = null): RefundResult
    {
        $params = ['payment_intent' => $paymentId->value()];
        if ($amount) $params['amount'] = $amount->toInt();

        $refund = $this->client->refunds->create($params);

        return new RefundResult(
            new RefundId($refund->id),
            $refund->status === 'succeeded',
        );
    }
}
```

---

### Interface Adapters — controllers translate HTTP to use case commands

```php
// app/Http/Controllers/BookingController.php
// Adapter: translates HTTP request → use case command → HTTP response
namespace App\Http\Controllers;

class BookingController extends Controller
{
    public function __construct(
        private CreateBookingUseCase $createBooking,
        private GetBookingUseCase    $getBooking,
    ) {}

    public function store(StoreBookingRequest $request): JsonResponse
    {
        // Translate HTTP input → command (application layer input)
        $command = new CreateBookingCommand(
            schoolId:     new SchoolId($request->validated('school_id')),
            tripId:       new TripId($request->validated('trip_id')),
            studentCount: new StudentCount($request->validated('student_count')),
            tripDate:     TripDate::fromString($request->validated('trip_date')),
            contactEmail: $request->validated('contact_email'),
        );

        try {
            $bookingId = $this->createBooking->execute($command);
        } catch (InsufficientCapacityException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (PaymentFailedException $e) {
            return response()->json(['error' => 'Payment could not be processed'], 402);
        }

        return response()->json(['booking_id' => $bookingId->value()], 201);
    }
}
```

---

### Wiring — service provider binds interfaces to implementations

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    // Domain interface → Infrastructure implementation
    $this->app->bind(BookingRepositoryInterface::class, EloquentBookingRepository::class);
    $this->app->bind(TripRepositoryInterface::class,    EloquentTripRepository::class);
    $this->app->bind(PaymentGatewayInterface::class,    StripeGateway::class);
    $this->app->bind(EventDispatcherInterface::class,   LaravelEventDispatcher::class);

    // Use cases — resolved with injected dependencies automatically
    $this->app->bind(CreateBookingUseCase::class);
    $this->app->bind(GetBookingUseCase::class);
}

// Test: swap infrastructure without touching domain or application:
// $this->app->bind(PaymentGatewayInterface::class, FakePaymentGateway::class);
// $this->app->bind(BookingRepositoryInterface::class, InMemoryBookingRepository::class);
// → Domain + application code is 100% testable without DB or payment APIs
```

---

## Problem 02 — Advanced Clean Architecture (Hard)

---

### Domain events — vs application events

```php
// Domain events: something happened in the domain
// Raised BY the entity, dispatched AFTER persistence
namespace App\Domain\Booking\Events;

final class BookingConfirmed
{
    public function __construct(
        public readonly BookingId    $bookingId,
        public readonly SchoolId     $schoolId,
        public readonly Money        $amount,
        public readonly \DateTimeImmutable $occurredAt,
    ) {}
}

// Application event dispatcher wraps Laravel's:
class LaravelEventDispatcher implements EventDispatcherInterface
{
    public function dispatch(object $event): void
    {
        event($event);  // delegates to Laravel — domain stays clean
    }
}

// Difference from Laravel application events:
//   Domain events: raised in entity, describe business fact ("BookingConfirmed")
//   Application events: raised in service, describe technical event ("BookingEmailQueued")
//   Domain events: should be past-tense, immutable value objects
//   Application events: can be mutable, can carry infrastructure details
```

---

### CQRS — separate read and write models

```php
// ============================================================
// Command (write) side — goes through domain + use case
// ============================================================
// CreateBookingCommand → CreateBookingUseCase → Domain Entity → EloquentRepository
// Write path: full domain validation, value objects, domain events

// ============================================================
// Query (read) side — bypasses domain, goes direct to DB
// ============================================================
// GetBookingQuery → BookingReadModel → Eloquent/DB query → BookingDto

// app/Application/Booking/GetBookingUseCase.php
class GetBookingUseCase
{
    public function __construct(private BookingReadRepository $readRepo) {}

    public function execute(BookingId $id): BookingDto
    {
        return $this->readRepo->findWithDetails($id);
        // ← no domain entity, no value objects, just a flat DTO
    }
}

// app/Infrastructure/ReadModels/BookingReadRepository.php
class BookingReadRepository
{
    public function findWithDetails(BookingId $id): BookingDto
    {
        $row = DB::table('bookings')
            ->join('schools', 'bookings.school_id', '=', 'schools.id')
            ->join('trips', 'bookings.trip_id', '=', 'trips.id')
            ->select(
                'bookings.*',
                'schools.name as school_name',
                'trips.title as trip_title',
                'trips.destination',
            )
            ->where('bookings.id', $id->value())
            ->first();

        if (!$row) throw new BookingNotFoundException($id);

        return new BookingDto($row);
    }
}

// BookingDto: simple plain object, no domain logic, safe to serialise to JSON
class BookingDto
{
    public int    $id;
    public string $status;
    public string $schoolName;
    public string $tripTitle;
    public float  $amount;
    // ...
}

// Benefits:
//   Write path: rich domain, validation, events
//   Read path:  optimized JOINs, flat DTOs, no ORM overhead
//   Scale: read replica for queries, write to primary only
```

---

### Hexagonal Architecture (Ports & Adapters)

```php
// Hexagonal is same idea as Clean Architecture — different vocabulary:
//   Port   = interface defined in application/domain
//   Adapter = implementation in infrastructure

// Primary ports (driving): HTTP, CLI, tests → call use cases
//   BookingController (HTTP adapter)  → CreateBookingUseCase
//   BookingCommand (CLI adapter)      → CreateBookingUseCase
//   BookingTest (test adapter)        → CreateBookingUseCase

// Secondary ports (driven): use cases → infrastructure
//   BookingRepositoryInterface (port) ← EloquentBookingRepository (adapter)
//   PaymentGatewayInterface (port)    ← StripeGateway (adapter)
//   EventDispatcherInterface (port)   ← LaravelEventDispatcher (adapter)

// ┌──────────────────────────────────────────────────────────────┐
// │  HTTP → Controller → [PORT] Use Case [PORT] → Repository    │
// │  CLI  → Command   →        ↑  core  ↑       → PaymentGW     │
// │  Test → TestDouble→    Application+Domain    → EventBus      │
// └──────────────────────────────────────────────────────────────┘

// Any adapter can be swapped without touching the hexagon (core):
//   Swap MySQL for DynamoDB → write new EloquentBookingRepository
//   Swap Stripe for MamoPay → write new MamoPayGateway
//   Add GraphQL → write GraphQL adapter calling same use cases
```

---

### When to use Clean Architecture — and when not to

```php
// ✅ USE when:
//   Complex domain with many business rules (booking states, pricing strategies)
//   Large team: domain team and infra team work independently
//   Long-lived codebase: architecture pays off over 2+ years
//   Multiple delivery mechanisms: REST API + CLI + background jobs use same core
//   Extensive testing: domain logic testable without DB/HTTP

// ❌ DO NOT USE when:
//   CRUD-only app with no business logic (admin panel, simple forms)
//   Small team / prototype — overhead not justified
//   Deadline-driven MVP — add architecture incrementally
//   Simple Laravel projects: standard MVC + service layer is sufficient

// Pragmatic middle ground for Tripz:
//   Use Value Objects for Money (avoid float bugs)
//   Use Entities for Booking (encapsulate state transitions + events)
//   Keep repositories behind interfaces (testability)
//   Skip full CQRS — use Eloquent directly for reads
//   Add Clean Architecture incrementally as complexity grows

// Migration path:
//   Phase 1: Standard Laravel MVC (works fine for < 10k LOC)
//   Phase 2: Add Service layer + Repository interfaces
//   Phase 3: Extract Value Objects + Domain Events
//   Phase 4: Full Clean Architecture if team/domain warrants it
```

---

### Testing clean architecture

```php
// Domain layer: pure unit tests, no Laravel, no DB
class BookingTest extends TestCase
{
    public function test_booking_confirms_when_pending(): void
    {
        $booking = new Booking(
            id:           BookingId::generate(),
            schoolId:     new SchoolId(1),
            tripId:       new TripId(1),
            amount:       new Money(50000, 'AED'),  // AED 500
            studentCount: new StudentCount(30),
            tripDate:     TripDate::fromString('2027-03-01'),
        );

        $payment = new PaymentResult(new PaymentId('pi_test'), PaymentStatus::Succeeded, new Money(50000, 'AED'));
        $booking->confirm($payment);

        $this->assertEquals(BookingStatus::Confirmed, $booking->status());
        $this->assertCount(2, $booking->releaseEvents());  // BookingCreated + BookingConfirmed
    }

    public function test_booking_throws_when_confirming_cancelled_booking(): void
    {
        $this->expectException(InvalidBookingStateException::class);
        // ...
    }
}

// Application layer: test use case with in-memory adapters (no DB, no HTTP)
class CreateBookingUseCaseTest extends TestCase
{
    public function test_creates_booking_and_dispatches_events(): void
    {
        $bookings  = new InMemoryBookingRepository();
        $trips     = new InMemoryTripRepository();
        $payment   = new FakePaymentGateway();   // always succeeds
        $dispatcher = new CollectingEventDispatcher();  // captures events

        $useCase = new CreateBookingUseCase($bookings, $trips, $payment, $dispatcher);
        $id = $useCase->execute($this->makeCommand());

        $this->assertNotNull($bookings->findById($id));
        $this->assertCount(1, $dispatcher->dispatched(BookingConfirmed::class));
        // ← no database, no HTTP — runs in milliseconds
    }
}

// Integration test: full stack through HTTP
class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_bookings_creates_booking(): void
    {
        $this->actingAs(UserFactory::new()->create())
            ->postJson('/api/bookings', $this->validPayload())
            ->assertCreated()
            ->assertJsonStructure(['booking_id']);
    }
}
```
