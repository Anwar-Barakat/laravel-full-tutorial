# LARAVEL_TEST_41 — SOLID Principles in Laravel

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — SOLID with Laravel Examples (Medium)

Show each of the 5 SOLID principles with before/after code from the Tripz booking platform.

---

### S — Single Responsibility Principle

> A class should have only ONE reason to change.

**BEFORE — Fat controller (violates SRP):**

```php
// BEFORE: BookingController does everything
class BookingController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validation — reason to change: validation rules change
        $request->validate([
            'school_name'   => 'required|string|max:255',
            'student_count' => 'required|integer|min:1',
            'trip_date'     => 'required|date|after:today',
            'amount'        => 'required|numeric|min:0',
        ]);

        // 2. Business logic — reason to change: fee calculation changes
        $amount = $request->amount;
        if ($request->student_count > 50)  $amount *= 0.9;   // discount
        if ($request->student_count > 100) $amount *= 0.85;

        // 3. Database — reason to change: storage strategy changes
        $booking = Booking::create([
            'school_name'   => $request->school_name,
            'student_count' => $request->student_count,
            'trip_date'     => $request->trip_date,
            'amount'        => $amount,
            'status'        => 'pending',
        ]);

        // 4. Payment — reason to change: payment provider changes
        $stripe = new \Stripe\StripeClient(config('services.stripe.secret'));
        $stripe->paymentIntents->create(['amount' => $amount * 100, 'currency' => 'gbp']);

        // 5. Email — reason to change: email template changes
        Mail::to($request->contact_email)->send(new BookingConfirmation($booking));

        // 6. Logging — reason to change: log format changes
        Log::info('Booking created', ['id' => $booking->id, 'amount' => $amount]);

        return response()->json($booking, 201);
    }
}
```

**AFTER — Each class has ONE reason to change:**

```php
// app/Http/Requests/StoreBookingRequest.php — responsibility: validation rules
class StoreBookingRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'school_name'    => 'required|string|max:255',
            'contact_email'  => 'required|email',
            'student_count'  => 'required|integer|min:1',
            'trip_date'      => 'required|date|after:today',
            'amount'         => 'required|numeric|min:0',
        ];
    }
}

// app/Repositories/BookingRepository.php — responsibility: data persistence
class BookingRepository
{
    public function create(array $data): Booking
    {
        return Booking::create($data);
    }

    public function findOrFail(int $id): Booking
    {
        return Booking::findOrFail($id);
    }
}

// app/Services/BookingService.php — responsibility: business logic
class BookingService
{
    public function __construct(
        private BookingRepository $repository,
    ) {}

    public function create(array $data): Booking
    {
        $data['amount'] = $this->applyGroupDiscount($data['amount'], $data['student_count']);
        $data['status'] = 'pending';

        $booking = $this->repository->create($data);

        event(new BookingCreated($booking));   // delegates email, payment notification etc.

        return $booking;
    }

    private function applyGroupDiscount(float $amount, int $count): float
    {
        if ($count > 100) return $amount * 0.85;
        if ($count > 50)  return $amount * 0.90;
        return $amount;
    }
}

// app/Http/Controllers/BookingController.php — responsibility: HTTP layer only
class BookingController extends Controller
{
    public function __construct(private BookingService $service) {}

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->service->create($request->validated());
        return response()->json(new BookingResource($booking), 201);
    }
}
```

---

### O — Open/Closed Principle

> Open for extension, closed for modification.
> Add new behaviour by adding new code — not by changing existing code.

**BEFORE — Violates OCP (add gateway = modify existing code):**

```php
class PaymentService
{
    public function charge(float $amount, string $gateway): array
    {
        // Every new gateway requires modifying THIS method — violates OCP
        if ($gateway === 'stripe') {
            $client = new \Stripe\StripeClient(config('services.stripe.secret'));
            $intent = $client->paymentIntents->create(['amount' => $amount * 100, 'currency' => 'gbp']);
            return ['id' => $intent->id, 'status' => $intent->status];
        }

        if ($gateway === 'mamopay') {
            $response = Http::withToken(config('services.mamopay.key'))
                ->post('https://b.mamopay.com/manage/api/v1/charges', ['amount' => $amount]);
            return $response->json();
        }

        // Adding Tap Payments? Modify here. PayPal? Modify here. — always editing
        throw new \InvalidArgumentException("Unknown gateway: {$gateway}");
    }
}
```

**AFTER — OCP: new gateway = new class, zero existing code changes:**

```php
// app/Contracts/PaymentGatewayInterface.php
interface PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult;
    public function refund(string $chargeId, ?float $amount = null): RefundResult;
}

// app/Services/Payment/StripeGateway.php — new class, no changes to anything else
class StripeGateway implements PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult
    {
        $intent = $this->client()->paymentIntents->create([
            'amount'   => (int) ($amount * 100),
            'currency' => $currency,
        ]);
        return new PaymentResult($intent->id, $intent->status);
    }

    public function refund(string $chargeId, ?float $amount = null): RefundResult
    {
        $params = ['payment_intent' => $chargeId];
        if ($amount) $params['amount'] = (int) ($amount * 100);
        $refund = $this->client()->refunds->create($params);
        return new RefundResult($refund->id, $refund->status);
    }
}

// app/Services/Payment/MamoPayGateway.php — adding a gateway = adding a class ONLY
class MamoPayGateway implements PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult
    {
        $response = Http::withToken(config('services.mamopay.key'))
            ->post('https://b.mamopay.com/manage/api/v1/charges', [
                'amount' => $amount, 'currency' => $currency,
            ]);
        return new PaymentResult($response['id'], $response['status']);
    }

    public function refund(string $chargeId, ?float $amount = null): RefundResult
    {
        $response = Http::withToken(config('services.mamopay.key'))
            ->post("https://b.mamopay.com/manage/api/v1/charges/{$chargeId}/refund");
        return new RefundResult($response['id'], $response['status']);
    }
}

// app/Providers/PaymentServiceProvider.php — binding logic in ONE place
class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PaymentGatewayInterface::class, function () {
            return match(config('payment.default')) {
                'mamopay' => new MamoPayGateway(),
                default   => new StripeGateway(),
            };
        });
    }
}
// Adding Tap Payments: create TapGateway.php, add 'tap' case — NOTHING else changes
```

---

### L — Liskov Substitution Principle

> Subtypes must be substitutable for their base types without breaking the program.
> You must be able to swap `StripeGateway` for `MamoPayGateway` and everything still works.

**BEFORE — Violates LSP (MamoPay throws on refund):**

```php
class MamoPayGateway implements PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult
    {
        // works fine
    }

    public function refund(string $chargeId, ?float $amount = null): RefundResult
    {
        // VIOLATION: throws instead of honouring the contract
        throw new \RuntimeException("MamoPay does not support refunds via API");
        // Now callers must know WHICH gateway they have — defeats the interface purpose
    }
}
```

**AFTER — LSP: all implementations honour the full contract:**

```php
// app/Contracts/PaymentGatewayInterface.php — contract includes refund capability
interface PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult;
    public function refund(string $chargeId, ?float $amount = null): RefundResult;
    public function supportsRefunds(): bool;  // ← make capability explicit in contract
}

// MamoPayGateway honours the contract without throwing:
class MamoPayGateway implements PaymentGatewayInterface
{
    public function supportsRefunds(): bool { return false; }

    public function refund(string $chargeId, ?float $amount = null): RefundResult
    {
        // Returns a result object (not throws) — callers can handle gracefully
        return RefundResult::unsupported('MamoPay refunds must be processed manually');
    }
}

// StripeGateway:
class StripeGateway implements PaymentGatewayInterface
{
    public function supportsRefunds(): bool { return true; }

    public function refund(string $chargeId, ?float $amount = null): RefundResult
    {
        $refund = $this->client()->refunds->create(['payment_intent' => $chargeId]);
        return new RefundResult($refund->id, $refund->status);
    }
}

// Caller — works with ANY gateway, no instanceof check needed:
class RefundService
{
    public function __construct(private PaymentGatewayInterface $gateway) {}

    public function refund(Booking $booking): RefundResult
    {
        $result = $this->gateway->refund($booking->payment_id);

        if (!$result->succeeded) {
            // Handle gracefully — no knowledge of which gateway
            Log::warning('Refund not processed automatically', ['booking' => $booking->id]);
        }

        return $result;
    }
}
// Works identically whether injected with StripeGateway or MamoPayGateway
```

---

### I — Interface Segregation Principle

> Clients should not be forced to depend on interfaces they do not use.
> Prefer many small, focused interfaces over one large general-purpose interface.

**BEFORE — Fat interface forces all implementors to implement everything:**

```php
// VIOLATION: 12-method interface — most implementors don't need half of these
interface BookingServiceInterface
{
    public function create(array $data): Booking;
    public function update(int $id, array $data): Booking;
    public function cancel(int $id): void;
    public function search(array $filters): Collection;
    public function findById(int $id): Booking;
    public function exportToCsv(Collection $bookings): string;
    public function exportToPdf(Collection $bookings): string;
    public function sendConfirmationEmail(Booking $booking): void;
    public function sendReminderSms(Booking $booking): void;
    public function generateInvoice(Booking $booking): string;
    public function archiveOldBookings(): void;
    public function calculateRevenue(Carbon $from, Carbon $to): float;
}

// ReadOnlyBookingService is forced to implement create/update/cancel/export... all throws
class ReadOnlyBookingService implements BookingServiceInterface
{
    public function create(array $data): Booking   { throw new \BadMethodCallException(); }
    public function update(int $id, array $data): Booking { throw new \BadMethodCallException(); }
    // ...forced to implement 10 methods it doesn't support
}
```

**AFTER — Segregated interfaces — each class implements only what it needs:**

```php
// app/Contracts/BookingCreatorInterface.php
interface BookingCreatorInterface
{
    public function create(array $data): Booking;
    public function update(int $id, array $data): Booking;
    public function cancel(int $id): void;
}

// app/Contracts/BookingSearchInterface.php
interface BookingSearchInterface
{
    public function search(array $filters): Collection;
    public function findById(int $id): Booking;
}

// app/Contracts/BookingExportInterface.php
interface BookingExportInterface
{
    public function exportToCsv(Collection $bookings): string;
    public function exportToPdf(Collection $bookings): string;
}

// app/Contracts/BookingNotificationInterface.php
interface BookingNotificationInterface
{
    public function sendConfirmationEmail(Booking $booking): void;
    public function sendReminderSms(Booking $booking): void;
}

// Full implementation: implement ALL relevant interfaces
class BookingService implements BookingCreatorInterface, BookingSearchInterface
{
    public function create(array $data): Booking  { /* ... */ }
    public function update(int $id, array $data): Booking { /* ... */ }
    public function cancel(int $id): void         { /* ... */ }
    public function search(array $filters): Collection { /* ... */ }
    public function findById(int $id): Booking    { /* ... */ }
}

// Read-only service: only implements what it actually does
class CachedBookingReadService implements BookingSearchInterface
{
    public function search(array $filters): Collection { /* cached search */ }
    public function findById(int $id): Booking         { /* cached lookup */ }
}

// Controllers depend only on what they need:
class BookingController extends Controller
{
    // Only needs creator — doesn't need to know about export or notifications
    public function __construct(private BookingCreatorInterface $bookings) {}
}

class BookingExportController extends Controller
{
    // Only needs exporter
    public function __construct(private BookingExportInterface $exporter) {}
}
```

---

### D — Dependency Inversion Principle

> High-level modules should not depend on low-level modules.
> Both should depend on abstractions (interfaces).
> Abstractions should not depend on details — details depend on abstractions.

**BEFORE — Violates DIP (high-level depends on concrete low-level):**

```php
class BookingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // VIOLATION: depends on concrete class directly
        $service = new BookingService(
            new BookingRepository(),        // concrete
            new StripeGateway(),            // concrete — can't swap without editing
            new BookingMailer(),            // concrete
        );

        $booking = $service->create($request->validated());
        return response()->json($booking, 201);
    }
}
```

**AFTER — DIP via Laravel's IoC container:**

```php
// app/Contracts/ — abstractions that both sides depend on
interface BookingRepositoryInterface
{
    public function create(array $data): Booking;
    public function findOrFail(int $id): Booking;
}

interface PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult;
}

// Concrete classes implement abstractions (details depend on abstractions):
class EloquentBookingRepository implements BookingRepositoryInterface { /* ... */ }
class StripeGateway implements PaymentGatewayInterface { /* ... */ }

// High-level module depends on abstractions ONLY:
class BookingService
{
    public function __construct(
        private BookingRepositoryInterface $repository,  // ← abstraction
        private PaymentGatewayInterface    $payment,     // ← abstraction
    ) {}
    // StripeGateway, MamoPayGateway, or MockGateway in tests — all work
}

// Controller depends on service abstraction:
class BookingController extends Controller
{
    public function __construct(
        private BookingCreatorInterface $bookings  // ← abstraction, not BookingService
    ) {}

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookings->create($request->validated());
        return response()->json(new BookingResource($booking), 201);
    }
}

// app/Providers/AppServiceProvider.php — bindings live here, NOT in business logic
public function register(): void
{
    $this->app->bind(BookingRepositoryInterface::class, EloquentBookingRepository::class);
    $this->app->bind(PaymentGatewayInterface::class,   StripeGateway::class);
    $this->app->bind(BookingCreatorInterface::class,   BookingService::class);
}

// Test: swap real implementations for test doubles — no production code changes:
// $this->app->bind(PaymentGatewayInterface::class, FakePaymentGateway::class);
// $this->app->bind(BookingRepositoryInterface::class, InMemoryBookingRepository::class);
```

---

## Problem 02 — SOLID Refactoring Exercise (Hard)

Identify all 5 violations in `BookingManager`, then refactor step by step to the clean architecture.

---

### BEFORE — One class violating all 5 principles

```php
// app/Services/BookingManager.php — VIOLATES ALL 5 SOLID PRINCIPLES
class BookingManager
{
    // DIP violation: depends on concrete Stripe class directly
    private \Stripe\StripeClient $stripe;

    public function __construct()
    {
        // DIP violation: creates its own dependency
        $this->stripe = new \Stripe\StripeClient(config('services.stripe.secret'));
    }

    // SRP violation: one method does: validate + calculate + persist + pay + email + log
    public function createBooking(array $data): Booking
    {
        // Validation (SRP: should be in FormRequest or dedicated validator)
        if (empty($data['school_name'])) throw new \InvalidArgumentException('School name required');
        if ($data['student_count'] < 1)  throw new \InvalidArgumentException('Invalid student count');

        // Business logic: discount calculation (SRP: should be in a dedicated service)
        $amount = $data['amount'];
        if ($data['student_count'] > 50)  $amount *= 0.9;
        if ($data['student_count'] > 100) $amount *= 0.85;

        // Database (SRP: should be in a repository)
        $booking = Booking::create([...$data, 'amount' => $amount, 'status' => 'pending']);

        // Payment (SRP: should delegate to PaymentGateway, DIP: shouldn't use Stripe directly)
        $this->stripe->paymentIntents->create(['amount' => (int)($amount * 100), 'currency' => 'gbp']);

        // Email (SRP: should be in a listener/notification)
        Mail::to($data['contact_email'])->send(new BookingConfirmation($booking));

        // SMS (SRP: should be in a listener/notification)
        $this->sendSmsReminder($booking);

        Log::info('Booking created', ['id' => $booking->id]);

        return $booking;
    }

    // SRP + ISP violation: PDF generation doesn't belong in booking business logic
    public function generatePdfReport(Collection $bookings): string
    {
        $pdf = \PDF::loadView('reports.bookings', compact('bookings'));
        return $pdf->output();
    }

    // SRP + ISP violation: SMS doesn't belong in booking creation service
    public function sendSmsReminder(Booking $booking): void
    {
        Http::post('https://api.sms-provider.com/send', [
            'to'      => $booking->contact_phone,
            'message' => "Reminder: your trip is on {$booking->trip_date}",
        ]);
    }

    // OCP violation: adding a gateway requires modifying this class
    public function refundBooking(int $bookingId, string $gateway = 'stripe'): void
    {
        $booking = Booking::findOrFail($bookingId);

        if ($gateway === 'stripe') {
            $this->stripe->refunds->create(['payment_intent' => $booking->payment_id]);
        } elseif ($gateway === 'mamopay') {
            Http::withToken(config('services.mamopay.key'))
                ->post("https://b.mamopay.com/manage/api/v1/charges/{$booking->payment_id}/refund");
        }
        // LSP violation: no consistent return type / contract between gateways

        $booking->update(['status' => 'refunded']);
    }
}
```

---

### AFTER — Clean architecture, all 5 principles applied

```php
// ============================================================
// Step 1 — SRP: split BookingManager into focused classes
// ============================================================

// app/Http/Requests/StoreBookingRequest.php — owns: validation rules
class StoreBookingRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'school_name'   => 'required|string|max:255',
            'contact_email' => 'required|email',
            'contact_phone' => 'nullable|string',
            'student_count' => 'required|integer|min:1',
            'trip_date'     => 'required|date|after:today',
            'amount'        => 'required|numeric|min:0',
        ];
    }
}

// app/Repositories/BookingRepository.php — owns: data persistence
class BookingRepository implements BookingRepositoryInterface
{
    public function create(array $data): Booking  { return Booking::create($data); }
    public function findOrFail(int $id): Booking  { return Booking::findOrFail($id); }
    public function update(int $id, array $data): Booking
    {
        $booking = $this->findOrFail($id);
        $booking->update($data);
        return $booking;
    }
}

// app/Services/DiscountCalculator.php — owns: pricing rules (single reason to change)
class DiscountCalculator
{
    public function apply(float $amount, int $studentCount): float
    {
        if ($studentCount > 100) return $amount * 0.85;
        if ($studentCount > 50)  return $amount * 0.90;
        return $amount;
    }
}

// app/Services/BookingService.php — owns: booking business logic only
class BookingService implements BookingCreatorInterface
{
    public function __construct(
        private BookingRepositoryInterface $repository,
        private PaymentGatewayInterface    $payment,
        private DiscountCalculator         $calculator,
    ) {}

    public function create(array $data): Booking
    {
        $data['amount'] = $this->calculator->apply($data['amount'], $data['student_count']);
        $data['status'] = 'pending';

        $booking = $this->repository->create($data);
        $this->payment->charge($data['amount'], 'GBP');

        event(new BookingCreated($booking));   // SRP: email + SMS handled by listeners
        return $booking;
    }

    public function refund(int $id): RefundResult
    {
        $booking = $this->repository->findOrFail($id);
        $result  = $this->payment->refund($booking->payment_id);   // DIP + OCP

        if ($result->succeeded) {
            $this->repository->update($id, ['status' => 'refunded']);
        }

        return $result;
    }
}

// ============================================================
// Step 2 — OCP + DIP: payment gateway as interface
// ============================================================

// app/Contracts/PaymentGatewayInterface.php
interface PaymentGatewayInterface
{
    public function charge(float $amount, string $currency): PaymentResult;
    public function refund(string $chargeId, ?float $amount = null): RefundResult;
    public function supportsRefunds(): bool;
}

class StripeGateway implements PaymentGatewayInterface   { /* full implementation */ }
class MamoPayGateway implements PaymentGatewayInterface  { /* full implementation */ }
// Adding TapPaymentsGateway: new file only — BookingService never changes

// ============================================================
// Step 3 — ISP: split the fat service interface
// ============================================================

interface BookingCreatorInterface
{
    public function create(array $data): Booking;
    public function refund(int $id): RefundResult;
}

interface BookingSearchInterface
{
    public function search(array $filters): Collection;
    public function findById(int $id): Booking;
}

interface BookingExportInterface
{
    public function exportToPdf(Collection $bookings): string;
    public function exportToCsv(Collection $bookings): string;
}

// ============================================================
// Step 4 — SRP: move PDF + SMS to dedicated classes
// ============================================================

// app/Services/BookingExporter.php — owns: export format logic
class BookingExporter implements BookingExportInterface
{
    public function exportToPdf(Collection $bookings): string
    {
        return \PDF::loadView('reports.bookings', compact('bookings'))->output();
    }

    public function exportToCsv(Collection $bookings): string
    {
        // CSV generation logic
    }
}

// app/Listeners/SendBookingConfirmation.php — owns: email notification
class SendBookingConfirmation
{
    public function handle(BookingCreated $event): void
    {
        Mail::to($event->booking->contact_email)
            ->send(new BookingConfirmation($event->booking));
    }
}

// app/Listeners/SendBookingSms.php — owns: SMS notification
class SendBookingSms
{
    public function handle(BookingCreated $event): void
    {
        if (!$event->booking->contact_phone) return;
        // SMS send logic
    }
}

// ============================================================
// Step 5 — DIP: bindings in service provider
// ============================================================

// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->bind(BookingRepositoryInterface::class, EloquentBookingRepository::class);
    $this->app->bind(BookingCreatorInterface::class,    BookingService::class);
    $this->app->bind(BookingExportInterface::class,     BookingExporter::class);

    $this->app->bind(PaymentGatewayInterface::class, function () {
        return match (config('payment.default')) {
            'mamopay' => app(MamoPayGateway::class),
            default   => app(StripeGateway::class),
        };
    });
}

// ============================================================
// Clean controller — depends only on abstractions
// ============================================================

class BookingController extends Controller
{
    public function __construct(private BookingCreatorInterface $bookings) {}

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookings->create($request->validated());
        return response()->json(new BookingResource($booking), 201);
    }

    public function refund(int $id): JsonResponse
    {
        $result = $this->bookings->refund($id);
        return response()->json(['success' => $result->succeeded, 'message' => $result->message]);
    }
}
```

---

### Benefits summary

| Principle | Before | After |
|---|---|---|
| SRP | One class changes for 6 reasons | Each class changes for 1 reason |
| OCP | Adding gateway = edit PaymentService | Adding gateway = new class only |
| LSP | MamoPayGateway throws on refund | All gateways honour full contract |
| ISP | One 12-method interface | 4 focused interfaces |
| DIP | Controller creates `new StripeGateway()` | Controller injects `PaymentGatewayInterface` |
