# LARAVEL_TEST_50 — Event-Driven · CQRS · Event Sourcing

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Event-Driven Architecture (Medium)

---

### Laravel Events — publish/subscribe within a monolith

```php
// ============================================================
// Domain events — facts that happened in the business domain
// ============================================================

// app/Events/BookingCreated.php
class BookingCreated
{
    public function __construct(
        public readonly Booking $booking,
        public readonly \DateTimeImmutable $occurredAt = new \DateTimeImmutable(),
    ) {}
}

class BookingCancelled
{
    public function __construct(
        public readonly Booking $booking,
        public readonly string $reason,
        public readonly \DateTimeImmutable $occurredAt = new \DateTimeImmutable(),
    ) {}
}

class PaymentReceived
{
    public function __construct(
        public readonly Booking $booking,
        public readonly float   $amount,
        public readonly string  $gateway,
    ) {}
}

// app/Providers/EventServiceProvider.php
protected $listen = [
    BookingCreated::class => [
        SendBookingConfirmationEmail::class,      // → mail channel
        SendSmsNotification::class,               // → SMS channel
        UpdateSchoolBookingStats::class,          // → cache increment
        GenerateBookingPdf::class,                // → S3 upload (queued)
        NotifyAdminDashboard::class,              // → Reverb broadcast
    ],
    BookingCancelled::class => [
        SendCancellationEmail::class,
        ProcessRefundJob::class,
        RestoreTripCapacity::class,
        ClearBookingCache::class,
    ],
    PaymentReceived::class => [
        UpdateBookingStatus::class,
        SendPaymentReceipt::class,
        UpdateRevenueStats::class,
    ],
];

// Dispatch event from service:
public function create(array $data): Booking
{
    $booking = $this->repository->create($data);
    event(new BookingCreated($booking));  // ← all registered listeners fire
    return $booking;
    // BookingService has zero knowledge of: email, SMS, cache, PDF, dashboard
}
```

---

### Queued listeners — async side effects

```php
// Listener implements ShouldQueue → runs in background worker
class GenerateBookingPdf implements ShouldQueue
{
    use InteractsWithQueue, Queueable;

    public string $queue    = 'pdfs';       // dedicated PDF queue
    public int    $tries    = 3;
    public int    $backoff  = 60;           // retry after 60s, 120s, 240s
    public int    $timeout  = 120;          // max 2 minutes per job

    public function handle(BookingCreated $event): void
    {
        $pdf  = PDF::loadView('pdfs.booking-confirmation', ['booking' => $event->booking]);
        $path = "bookings/{$event->booking->id}/confirmation.pdf";
        Storage::disk('s3')->put($path, $pdf->output());
        $event->booking->update(['pdf_path' => $path]);
    }

    public function failed(BookingCreated $event, \Throwable $e): void
    {
        Log::error('PDF generation failed', [
            'booking_id' => $event->booking->id,
            'error'      => $e->getMessage(),
        ]);
        // Notify admin: PDF needs manual generation
    }
}

// SendBookingConfirmationEmail → mail queue (fast workers)
// GenerateBookingPdf          → pdfs queue  (heavy workers, more memory)
// NotifyAdminDashboard        → realtime queue (no delay acceptable)

// Supervisor: separate workers per queue type
// [program:laravel-worker-mail]  command="php artisan queue:work --queue=mail"
// [program:laravel-worker-pdfs]  command="php artisan queue:work --queue=pdfs --memory=256"
// [program:laravel-worker-rt]    command="php artisan queue:work --queue=realtime"
```

---

### Broadcasting — real-time events to frontend

```php
// app/Events/BookingStatusChanged.php
class BookingStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Booking $booking) {}

    // Which channel to broadcast on:
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("school.{$this->booking->school_id}"),
            new PrivateChannel("booking.{$this->booking->id}"),
        ];
    }

    // What data to send (NOT the full model — whitelist):
    public function broadcastWith(): array
    {
        return [
            'booking_id' => $this->booking->id,
            'status'     => $this->booking->status->value,
            'updated_at' => $this->booking->updated_at->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'booking.status.changed';  // event name on frontend
    }
}

// routes/channels.php — authorize private channels:
Broadcast::channel('school.{schoolId}', function (User $user, int $schoolId) {
    return $user->school_id === $schoolId;  // only school's own users
});

Broadcast::channel('booking.{bookingId}', function (User $user, int $bookingId) {
    $booking = Booking::find($bookingId);
    return $booking && $user->school_id === $booking->school_id;
});

// Frontend (React + Echo):
// useEffect(() => {
//   window.Echo.private(`booking.${bookingId}`)
//     .listen('.booking.status.changed', (data) => {
//       setStatus(data.status)
//     })
// }, [bookingId])
```

---

### CQRS — Command Query Responsibility Segregation

```php
// ============================================================
// CQRS: write path (commands) goes through full domain
//       read path (queries) goes direct to DB for performance
// ============================================================

// COMMAND side — full validation, domain logic, events:
class CreateBookingCommand
{
    public function __construct(
        public readonly int    $schoolId,
        public readonly int    $tripId,
        public readonly int    $studentCount,
        public readonly string $tripDate,
        public readonly string $contactEmail,
    ) {}
}

class CreateBookingHandler
{
    public function __construct(
        private BookingRepository  $bookings,
        private BookingService     $service,
    ) {}

    public function handle(CreateBookingCommand $command): int  // returns booking ID
    {
        $booking = $this->service->create([
            'school_id'     => $command->schoolId,
            'trip_id'       => $command->tripId,
            'student_count' => $command->studentCount,
            'trip_date'     => $command->tripDate,
            'contact_email' => $command->contactEmail,
        ]);

        return $booking->id;
    }
}

// QUERY side — optimized reads, no domain overhead:
class GetBookingDashboardQuery
{
    public function __construct(
        public readonly int    $schoolId,
        public readonly string $status = 'all',
        public readonly int    $perPage = 15,
    ) {}
}

class GetBookingDashboardHandler
{
    public function handle(GetBookingDashboardQuery $query): array
    {
        // Direct DB query — no Eloquent model, no domain entities
        $rows = DB::table('bookings')
            ->join('trips', 'bookings.trip_id', '=', 'trips.id')
            ->select(
                'bookings.id',
                'bookings.status',
                'bookings.amount',
                'bookings.trip_date',
                'bookings.student_count',
                'trips.title as trip_title',
                'trips.destination',
            )
            ->where('bookings.school_id', $query->schoolId)
            ->when($query->status !== 'all', fn ($q) => $q->where('bookings.status', $query->status))
            ->orderByDesc('bookings.created_at')
            ->paginate($query->perPage);

        return [
            'bookings' => $rows->items(),
            'total'    => $rows->total(),
            'pages'    => $rows->lastPage(),
        ];
        // ✅ No model instantiation, no collection building, no ORM overhead
        // ✅ Single optimized JOIN query
        // ✅ Returns plain array — easy to cache, serialise, test
    }
}

// Controller uses both:
class BookingController extends Controller
{
    public function store(StoreBookingRequest $request): JsonResponse
    {
        // WRITE path — command handler
        $id = app(CreateBookingHandler::class)->handle(
            new CreateBookingCommand(...$request->validated())
        );
        return response()->json(['id' => $id], 201);
    }

    public function index(Request $request): JsonResponse
    {
        // READ path — query handler (no domain overhead)
        $result = app(GetBookingDashboardHandler::class)->handle(
            new GetBookingDashboardQuery(
                schoolId: $request->user()->school_id,
                status:   $request->input('status', 'all'),
            )
        );
        return response()->json($result);
    }
}
```

---

### Eventual consistency — accepting brief inconsistency

```php
// Eventual consistency: system will become consistent, but not instantly
//
// Example:
//   1. Booking created (BookingCreated event fired)
//   2. HTTP response: 201 Created returned immediately
//   3. Email listener processes in background queue: ~2 seconds later
//   4. PDF generated: ~5 seconds later
//   5. Dashboard stats updated: ~3 seconds later
//
// All consistent eventually — but never all at once
//
// Implication for API design:
public function store(StoreBookingRequest $request): JsonResponse
{
    $booking = $this->service->create($request->validated());

    return response()->json([
        'id'     => $booking->id,
        'status' => $booking->status->value,
        // ← don't include email_sent or pdf_url — not ready yet
        '_processing' => [
            'confirmation_email' => 'queued',  // be honest about async
            'pdf_receipt'        => 'generating',
        ],
    ], 201);
}

// Frontend polls for PDF:
// GET /bookings/42  → { pdf_url: null }  (still generating)
// GET /bookings/42  → { pdf_url: "https://s3..." }  (done)
// Or: use WebSocket push when PDF ready
```

---

## Problem 02 — Advanced Event-Driven (Hard)

---

### Event Sourcing — store events, derive state

```php
// Traditional persistence: store CURRENT state
// bookings table: { id: 42, status: 'confirmed', amount: 500 }
// ← history is gone, can't answer "what was the status yesterday?"

// Event Sourcing: store EVENTS that caused state changes
// booking_events table: { booking_id: 42, event: 'BookingCreated', payload: {...}, occurred_at }
//                       { booking_id: 42, event: 'BookingConfirmed', payload: {...}, occurred_at }
//                       { booking_id: 42, event: 'BookingCancelled', payload: {...}, occurred_at }
// Current state = replay all events

// Event store migration:
Schema::create('booking_events', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('booking_id');
    $table->string('event_type');           // 'BookingCreated', 'BookingConfirmed', etc.
    $table->json('payload');                // all data at time of event
    $table->unsignedInteger('version');     // 1, 2, 3... for optimistic concurrency
    $table->string('correlation_id')->nullable();
    $table->timestamp('occurred_at');

    $table->index(['booking_id', 'version']);
    $table->index('event_type');
    $table->index('occurred_at');
});

// Event store — append only (NEVER update or delete)
class BookingEventStore
{
    public function append(int $bookingId, string $eventType, array $payload, int $expectedVersion): void
    {
        $lastVersion = BookingEvent::where('booking_id', $bookingId)->max('version') ?? 0;

        if ($lastVersion !== $expectedVersion) {
            throw new ConcurrencyException("Expected version {$expectedVersion}, got {$lastVersion}");
        }

        BookingEvent::create([
            'booking_id'  => $bookingId,
            'event_type'  => $eventType,
            'payload'     => $payload,
            'version'     => $expectedVersion + 1,
            'occurred_at' => now(),
        ]);
    }

    public function getEvents(int $bookingId): Collection
    {
        return BookingEvent::where('booking_id', $bookingId)
            ->orderBy('version')
            ->get();
    }
}
```

```php
// Aggregate: reconstruct from events (replay)
class BookingAggregate
{
    public int     $id;
    public string  $status    = 'pending';
    public float   $amount    = 0;
    public ?string $paymentId = null;
    public int     $version   = 0;

    public static function reconstruct(int $id, Collection $events): static
    {
        $aggregate = new static();
        $aggregate->id = $id;

        foreach ($events as $event) {
            $aggregate->apply($event->event_type, $event->payload);
            $aggregate->version = $event->version;
        }

        return $aggregate;
    }

    private function apply(string $type, array $payload): void
    {
        match($type) {
            'BookingCreated'   => $this->applyCreated($payload),
            'BookingConfirmed' => $this->applyConfirmed($payload),
            'BookingCancelled' => $this->applyCancelled($payload),
            default            => null,
        };
    }

    private function applyCreated(array $p): void
    {
        $this->status = 'pending';
        $this->amount = $p['amount'];
    }

    private function applyConfirmed(array $p): void
    {
        $this->status    = 'confirmed';
        $this->paymentId = $p['payment_id'];
    }

    private function applyCancelled(array $p): void
    {
        $this->status = 'cancelled';
    }
}

// Usage:
$events    = $eventStore->getEvents($bookingId);
$booking   = BookingAggregate::reconstruct($bookingId, $events);
echo $booking->status;  // derived from replaying all events
```

---

### Projections — materialised read models from events

```php
// Problem: replaying 1000 events on every read is slow
// Solution: projections — pre-computed read models kept in sync with events

// Projection: booking_summaries table (optimised for reading)
Schema::create('booking_summaries', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('booking_id')->unique();
    $table->string('school_name');
    $table->string('trip_title');
    $table->string('status');
    $table->decimal('amount', 10, 2);
    $table->date('trip_date');
    $table->integer('student_count');
    $table->timestamp('last_event_at');
    $table->timestamps();
    $table->index(['status', 'trip_date']);
});

// Projection updater — listens to events, keeps read model in sync:
class BookingProjector
{
    public function onBookingCreated(array $payload): void
    {
        BookingSummary::create([
            'booking_id'   => $payload['booking_id'],
            'school_name'  => $payload['school_name'],
            'trip_title'   => $payload['trip_title'],
            'status'       => 'pending',
            'amount'       => $payload['amount'],
            'trip_date'    => $payload['trip_date'],
            'student_count' => $payload['student_count'],
            'last_event_at' => now(),
        ]);
    }

    public function onBookingConfirmed(array $payload): void
    {
        BookingSummary::where('booking_id', $payload['booking_id'])
            ->update(['status' => 'confirmed', 'last_event_at' => now()]);
    }

    public function onBookingCancelled(array $payload): void
    {
        BookingSummary::where('booking_id', $payload['booking_id'])
            ->update(['status' => 'cancelled', 'last_event_at' => now()]);
    }

    // Rebuild entire projection from event log (after bug fix or schema change):
    public function rebuild(): void
    {
        BookingSummary::truncate();  // wipe read model
        BookingEvent::orderBy('occurred_at')->each(function (BookingEvent $event) {
            $method = 'on' . class_basename($event->event_type);
            if (method_exists($this, $method)) {
                $this->$method($event->payload);
            }
        });
    }
    // ← rebuild() is the key advantage: can rebuild any read model from event log
    // ← traditional DB: once you delete/update, history is gone forever
}
```

---

### Outbox pattern — reliable event publishing

```php
// Problem: save booking to DB + publish event — what if publisher crashes between?
// DB save succeeds, event never published → inconsistency

// Solution: Outbox table — save event in SAME DB transaction as entity
class BookingService
{
    public function create(array $data): Booking
    {
        return DB::transaction(function () use ($data) {
            $booking = Booking::create($data);

            // Write event to outbox IN SAME TRANSACTION
            OutboxEvent::create([
                'aggregate_type' => 'booking',
                'aggregate_id'   => $booking->id,
                'event_type'     => 'BookingCreated',
                'payload'        => json_encode([
                    'booking_id' => $booking->id,
                    'amount'     => $booking->amount,
                    'school_id'  => $booking->school_id,
                ]),
                'published'      => false,
            ]);

            return $booking;
            // ← if transaction rolls back, outbox entry also rolls back
            // ← event and booking always atomically consistent
        });
    }
}

// Outbox poller (scheduled job, every 5 seconds):
class PublishOutboxEventsJob implements ShouldQueue
{
    public function handle(): void
    {
        OutboxEvent::where('published', false)
            ->orderBy('created_at')
            ->limit(100)
            ->get()
            ->each(function (OutboxEvent $outbox) {
                try {
                    // Publish to message bus:
                    Queue::pushRaw($outbox->payload, $outbox->event_type);
                    $outbox->update(['published' => true, 'published_at' => now()]);
                } catch (\Exception $e) {
                    Log::error('Outbox publish failed', ['id' => $outbox->id]);
                    // Will retry on next poll
                }
            });
    }
}

// ✅ Atomicity: DB write + event publication always consistent
// ✅ At-least-once delivery: unpublished events retried automatically
// ❌ Slight delay: ~5s between DB write and event published
// ❌ Duplicate events possible (at-least-once) — consumers must be idempotent
```

---

### When to use Event Sourcing

```php
// ✅ USE Event Sourcing when:
//   Full audit trail required by law (financial, healthcare, legal)
//   Time-travel debugging needed ("what was the state on Jan 15?")
//   Complex domain with many state transitions needing history
//   Multiple read models needed from same events (different projections)
//   Rollback/undo is a first-class feature

// ❌ DO NOT USE when:
//   Simple CRUD — massive overhead for no benefit
//   Team unfamiliar — learning curve is steep
//   External systems need to update the record (syncing is hard)
//   High-frequency updates (e.g. GPS position every second = millions of events)

// Tripz decision:
//   Booking status changes: 5–10 events per booking lifetime → manageable
//   Payment audit trail: legal requirement → event sourcing a good fit
//   Trip catalogue updates: simple CRUD → traditional persistence
//
//   Pragmatic approach:
//   - Add booking_events table for audit trail (but keep bookings table as current state)
//   - This is NOT full event sourcing, but gives audit + debugging benefit
//   - Full event sourcing only if audit replay and projections are needed
```
