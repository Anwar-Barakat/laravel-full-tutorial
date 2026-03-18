# LARAVEL_TEST_43 — MVC · Fat Model · Thin Controller

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Laravel MVC Architecture (Medium)

Demonstrate Laravel MVC using the Tripz booking platform.

---

### The Three Layers

```php
// ============================================================
// MODEL LAYER — Eloquent + business rules + relationships
// app/Models/Booking.php
// ============================================================
class Booking extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'school_id', 'trip_id', 'contact_name', 'contact_email',
        'student_count', 'trip_date', 'amount', 'status', 'payment_id',
    ];

    protected $casts = [
        'trip_date'  => 'date',
        'amount'     => 'decimal:2',
        'status'     => BookingStatus::class,  // PHP 8.1 enum cast
        'created_at' => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    // ── Business rules on the model (fat model) ────────────────
    public function isPaid(): bool
    {
        return $this->status === BookingStatus::Paid;
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [BookingStatus::Pending, BookingStatus::Confirmed])
            && $this->trip_date->isAfter(now()->addDays(7));
    }

    public function totalPaid(): float
    {
        return (float) $this->payments()->where('status', 'captured')->sum('amount');
    }

    public function outstandingBalance(): float
    {
        return max(0, $this->amount - $this->totalPaid());
    }

    // ── Scopes ────────────────────────────────────────────────
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', BookingStatus::Pending);
    }

    public function scopeForSchool(Builder $query, int $schoolId): Builder
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('trip_date', '>=', now());
    }

    // ── Accessors ────────────────────────────────────────────
    protected function formattedAmount(): Attribute
    {
        return Attribute::get(fn () => '£' . number_format($this->amount, 2));
    }
}
```

```php
// ============================================================
// VIEW LAYER — API Resource (JSON response shape)
// app/Http/Resources/BookingResource.php
// ============================================================
class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'status'         => $this->status->value,
            'trip_date'      => $this->trip_date->toDateString(),
            'student_count'  => $this->student_count,
            'amount'         => $this->amount,
            'formatted_amount' => $this->formatted_amount,
            'is_paid'        => $this->isPaid(),
            'is_cancellable' => $this->isCancellable(),
            'school'         => new SchoolResource($this->whenLoaded('school')),
            'trip'           => new TripResource($this->whenLoaded('trip')),
            'links' => [
                'self'   => route('bookings.show', $this->id),
                'cancel' => $this->isCancellable() ? route('bookings.cancel', $this->id) : null,
            ],
        ];
    }
}

// Collection resource with metadata:
class BookingCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'meta' => [
                'total_bookings' => $this->collection->count(),
                'total_revenue'  => $this->collection->sum('amount'),
            ],
        ];
    }
}
```

```php
// ============================================================
// CONTROLLER LAYER — HTTP glue only (thin controller)
// app/Http/Controllers/BookingController.php
// ============================================================
class BookingController extends Controller
{
    public function __construct(
        private BookingService $service,
        private BookingRepository $repository,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $bookings = $this->repository->paginate(
            filters: $request->only(['status', 'school_id', 'date_from', 'date_to']),
            perPage: $request->integer('per_page', 15),
        );

        return BookingResource::collection($bookings)->response();
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        // Controller: receive, delegate, respond — nothing else
        $booking = $this->service->create($request->validated());
        return (new BookingResource($booking))->response()->setStatusCode(201);
    }

    public function show(Booking $booking): JsonResponse
    {
        $booking->load(['school', 'trip', 'payments']);
        return new JsonResponse(new BookingResource($booking));
    }

    public function destroy(Booking $booking): JsonResponse
    {
        $this->service->cancel($booking);
        return response()->json(['message' => 'Booking cancelled'], 200);
    }
}
```

---

### Thin Controller, Fat Model — comparison

```php
// ❌ FAT CONTROLLER — all logic in controller (wrong)
class BadBookingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // Validation in controller
        $request->validate(['school_name' => 'required', 'amount' => 'required|numeric']);

        // Business logic in controller
        $discount = $request->student_count > 50 ? 0.9 : 1.0;
        $amount = $request->amount * $discount;

        // DB in controller
        $booking = Booking::create([...$request->all(), 'amount' => $amount]);

        // Email in controller
        Mail::to($request->email)->send(new BookingConfirmation($booking));

        return response()->json($booking);
        // ← controller has 5 reasons to change — violates SRP
    }
}

// ✅ THIN CONTROLLER — controller does HTTP only
class GoodBookingController extends Controller
{
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->service->create($request->validated());
        return (new BookingResource($booking))->response()->setStatusCode(201);
        // ← 3 lines. One responsibility: receive HTTP → delegate → return HTTP
    }
}
```

---

### When to extract a Service layer (Model too fat)

```php
// Fat Model: OK for simple rules (isCancellable, scopes, relationships)
// TOO fat: model handles payment, email, multi-model coordination

// ❌ Model doing too much:
class Booking extends Model
{
    public function confirm(): void
    {
        // Should NOT be here — model coordinates multiple external systems
        $stripe = new \Stripe\StripeClient(config('services.stripe.secret'));
        $stripe->paymentIntents->create(['amount' => $this->amount * 100]);
        Mail::to($this->contact_email)->send(new BookingConfirmation($this));
        $this->update(['status' => 'confirmed']);
        Log::info('Booking confirmed', ['id' => $this->id]);
    }
}

// ✅ Extract to Service when: cross-model coordination, external APIs, complex workflows
class BookingService
{
    public function confirm(Booking $booking): Booking
    {
        $payment = $this->gateway->charge($booking->amount, 'GBP');
        $booking->update(['status' => 'confirmed', 'payment_id' => $payment->id]);
        event(new BookingConfirmed($booking));  // email, log via listeners
        return $booking;
    }
}
// Model stays: data shape, relationships, simple derived values
// Service adds: multi-system orchestration
```

---

### Complete request lifecycle

```
HTTP Request
    │
    ▼
Route (routes/api.php)
    Route::post('/bookings', [BookingController::class, 'store'])
    │
    ▼
Middleware stack (app/Http/Kernel.php)
    EnsureJsonResponse → ApiAuthentication → ThrottleRequests
    │
    ▼
Form Request (StoreBookingRequest)
    authorize() → can user create bookings?
    rules()     → validate input
    │ 422 if invalid
    ▼
Controller (BookingController::store)
    receive $request->validated()
    delegate to $this->service->create()
    │
    ▼
Service (BookingService::create)
    apply discount logic
    call repository to persist
    fire BookingCreated event
    │
    ▼
Repository (BookingRepository::create)
    Booking::create($data) — Eloquent
    │
    ▼
Model (Booking)
    fillable, casts, observers
    │
    ▼
Event Listeners (async/sync)
    SendEmail, LogActivity, UpdateStats, ClearCache
    │
    ▼
API Resource (BookingResource)
    shape the JSON response
    │
    ▼
JsonResponse → HTTP 201
```

---

## Problem 02 — Architecture Decision Trade-offs (Hard)

---

### Where to put business logic — decision matrix

```php
// ============================================================
// Model — put HERE:
//   simple boolean flags (isPaid, isCancellable)
//   derived values (outstandingBalance, formattedAmount)
//   scopes (scopePending, scopeUpcoming)
//   relationships (school(), trip(), payments())
//   simple state transitions (markAsPaid — only updates own fields)
// ============================================================

// ============================================================
// Service — put HERE:
//   multi-model coordination (booking + payment + invoice)
//   external API calls (Stripe, MamoPay, SendGrid)
//   complex business workflows (confirm booking: charge → update → notify)
//   operations that fire events
//   anything requiring injected dependencies
// ============================================================

// ============================================================
// Controller — put HERE:
//   parse HTTP request
//   call service / repository
//   return HTTP response with correct status code
//   NOTHING else
// ============================================================

// ============================================================
// Repository — put HERE:
//   database queries (findById, findBySchool, paginate)
//   filter/sort/search logic
//   eager loading decisions
//   NOT business rules — those go in service
// ============================================================
```

---

### Trade-off: Eloquent in Repository vs Query Builder

```php
// Option A: Eloquent in Repository (default in Laravel)
class EloquentBookingRepository
{
    public function findPaidForSchool(int $schoolId): Collection
    {
        return Booking::where('school_id', $schoolId)
            ->where('status', 'paid')
            ->with(['school', 'payments'])
            ->get();
    }
    // ✅ Easy, readable, full model features (events, scopes, casts)
    // ❌ Coupled to Eloquent — hard to swap DB without rewriting
}

// Option B: Query Builder (performance-sensitive paths)
class RawBookingRepository
{
    public function sumRevenueForPeriod(Carbon $from, Carbon $to): float
    {
        return DB::table('bookings')
            ->where('status', 'paid')
            ->whereBetween('trip_date', [$from, $to])
            ->sum('amount');
    }
    // ✅ Faster for aggregates — no model overhead, no collection building
    // ❌ No model features (casts, scopes, events)
    // Use for: reporting queries, large aggregates, performance-critical paths
}
```

---

### Trade-off: Events vs Direct calls for side effects

```php
// Direct call — explicit, traceable
class BookingService
{
    public function create(array $data): Booking
    {
        $booking = $this->repository->create($data);
        $this->mailer->sendConfirmation($booking);     // explicit — easy to trace
        $this->statsService->increment($booking);
        $this->cache->invalidate();
        return $booking;
        // ✅ Easy to read, easy to test each step
        // ❌ Adding a 4th side effect = modifying this method (violates OCP)
    }
}

// Events — decoupled, OCP-compliant
class BookingService
{
    public function create(array $data): Booking
    {
        $booking = $this->repository->create($data);
        event(new BookingCreated($booking));
        return $booking;
        // ✅ Adding listeners = zero changes to BookingService (OCP)
        // ✅ Listeners can be queued (async email doesn't slow HTTP response)
        // ❌ Harder to trace — need to check EventServiceProvider
        // ❌ Listener errors are hidden unless you configure onError
    }
}
// Use events: for side effects, notifications, cache invalidation, async work
// Use direct calls: for primary flow steps where order and error handling matter
```

---

### Architecture diagram (layers and dependencies)

```
┌─────────────────────────────────────────────────────────────────┐
│  HTTP Layer                                                     │
│  Routes → Middleware → Form Requests → Controllers              │
│                    ↓                                            │
├─────────────────────────────────────────────────────────────────┤
│  Application Layer                                              │
│  Services  (orchestrate)    Events / Listeners (side effects)   │
│                    ↓                                            │
├─────────────────────────────────────────────────────────────────┤
│  Domain Layer                                                   │
│  Models (Eloquent)          Repositories (data access)          │
│  Contracts/Interfaces                                           │
│                    ↓                                            │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                           │
│  Database (MySQL)  Cache (Redis)  External APIs  Queues         │
└─────────────────────────────────────────────────────────────────┘

Dependency direction: HTTP → Application → Domain → Infrastructure
NEVER: Infrastructure → Domain (domain stays pure, testable)
```

---

### Trade-off: Inertia.js vs API + React

```php
// Inertia.js (SSR-friendly, full-stack Laravel)
// routes/web.php:
Route::get('/bookings', function () {
    return Inertia::render('Bookings/Index', [
        'bookings' => BookingResource::collection(Booking::paginate()),
        'filters'  => request()->only(['status', 'school']),
    ]);
});
// ✅ Shared auth (Laravel session), SSR built-in, no API versioning needed
// ✅ No CORS, no JWT, less boilerplate
// ❌ Frontend tightly coupled to Laravel — hard to build mobile app later

// Separate API + React (Tripz architecture)
// routes/api.php:
Route::apiResource('bookings', BookingController::class);
// ✅ Mobile app + web use same API
// ✅ Frontend team works independently, deploys independently
// ✅ Easier to scale frontend and backend independently
// ❌ CORS setup, token management, API versioning overhead
// ❌ More moving parts (two deployments)

// Decision: Tripz uses API + React because mobile app is planned
```
