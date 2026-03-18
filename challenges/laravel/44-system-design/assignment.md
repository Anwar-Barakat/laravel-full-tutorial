# LARAVEL_TEST_44 — System Design · Booking Platform

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — System Design Interview (Medium)

Design the Tripz school trip booking platform from scratch.

---

### Requirements clarification (always ask first)

```
Functional requirements:
  - Schools browse trips and create bookings
  - Admin manages trips, pricing, capacity
  - Payments via MamoPay (UAE) and Stripe (UK)
  - Email + SMS notifications on booking events
  - Export reports (PDF/CSV)

Non-functional requirements:
  - 1,000 concurrent users (peak: end of school year)
  - 99.9% uptime (3 schools per second at peak)
  - Read:write ratio = 10:1 (browsing >> booking)
  - GDPR / UAE PDPL data residency requirements

Out of scope:
  - Video streaming, real-time chat, custom trip building
```

---

### High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Client Layer                                                │
│  React SPA (Vite + Inertia)  │  Mobile App (React Native)   │
└───────────────────┬──────────────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼──────────────────────────────────────────┐
│  CDN + Load Balancer                                         │
│  Cloudflare (static assets, DDoS)  │  AWS ALB               │
└───────────────────┬──────────────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────────────┐
│  Application Tier  (Laravel 11 + Octane/FrankenPHP)          │
│  Instance 1  │  Instance 2  │  Instance 3   (auto-scale)     │
└──┬────────────┬─────────────────────────────────────────────┘
   │            │
   ▼            ▼
┌──────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐
│MySQL │  │  Redis   │  │  Queue   │  │  Object Storage (S3) │
│(RDS) │  │(ElastiC) │  │(SQS)     │  │  PDFs, attachments   │
└──────┘  └──────────┘  └──────────┘  └──────────────────────┘
```

---

### Data model — core tables and relationships

```php
// migrations/

// schools
Schema::create('schools', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('emirate');           // UAE: Dubai, Abu Dhabi, Sharjah
    $table->string('contact_email');
    $table->string('phone')->nullable();
    $table->timestamps();
    $table->index('emirate');
});

// trips
Schema::create('trips', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->string('destination');
    $table->text('description')->nullable();
    $table->decimal('price_per_student', 8, 2);
    $table->integer('min_students')->default(10);
    $table->integer('max_students');
    $table->integer('capacity_remaining');  // denormalized — updated on booking
    $table->date('available_from');
    $table->date('available_to');
    $table->string('status')->default('active'); // active, full, archived
    $table->timestamps();
    $table->index(['status', 'available_from', 'available_to']);
});

// bookings
Schema::create('bookings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('school_id')->constrained()->cascadeOnDelete();
    $table->foreignId('trip_id')->constrained();
    $table->string('contact_name');
    $table->string('contact_email');
    $table->string('contact_phone')->nullable();
    $table->integer('student_count');
    $table->date('trip_date');
    $table->decimal('amount', 10, 2);
    $table->string('status')->default('pending');  // pending, paid, confirmed, cancelled
    $table->string('payment_id')->nullable();      // gateway transaction ID
    $table->string('payment_gateway')->nullable(); // stripe, mamopay
    $table->string('pricing_type')->default('standard'); // strategy used
    $table->softDeletes();
    $table->timestamps();

    $table->index(['school_id', 'status']);
    $table->index(['trip_id', 'trip_date']);
    $table->index('status');
    $table->index('created_at');
});

// payments (audit trail — never delete)
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('booking_id')->constrained();
    $table->string('gateway_transaction_id');
    $table->decimal('amount', 10, 2);
    $table->string('currency', 3);
    $table->string('status');       // pending, captured, refunded, failed
    $table->string('gateway');      // stripe, mamopay
    $table->json('gateway_response')->nullable();  // raw response for debugging
    $table->timestamps();
    $table->index(['booking_id', 'status']);
    $table->index('gateway_transaction_id');
});
```

---

### Caching strategy

```php
// Layer 1: Route-level response cache (read-heavy endpoints)
// app/Http/Middleware/CacheResponse.php
Route::get('/trips', [TripController::class, 'index'])
    ->middleware('cache.response:3600');  // cache full HTTP response 1 hour

// Layer 2: Query result cache (repository layer)
class CachedTripRepository implements TripRepositoryInterface
{
    public function getActive(): Collection
    {
        return Cache::tags(['trips'])->remember(
            'trips:active',
            now()->addHour(),
            fn () => $this->inner->getActive()
        );
    }

    // Invalidate on write:
    public function create(array $data): Trip
    {
        $trip = $this->inner->create($data);
        Cache::tags(['trips'])->flush();
        return $trip;
    }
}

// Layer 3: Session / user-specific cache
Cache::remember("user:{$userId}:bookings:recent", 300, fn () =>
    Booking::forSchool($schoolId)->latest()->limit(5)->get()
);

// Cache hit rate target: 80%+ for trip listings (high read, low write)
// Redis: use tagged caches to invalidate by entity type

// What NOT to cache:
//   Payment status — must be real-time
//   Booking availability — race conditions if stale
//   User session data — security risk if shared
```

---

### Queue strategy — offload slow work

```php
// config/queue.php — SQS in production, database locally
'default' => env('QUEUE_CONNECTION', 'sqs'),

// Jobs that MUST be queued (never block HTTP response):
class SendBookingConfirmationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;  // retry after 60 seconds

    public function handle(Mailer $mailer): void
    {
        $mailer->send(new BookingConfirmation($this->booking));
    }
}

class GenerateBookingPdf implements ShouldQueue
{
    public string $queue = 'reports';  // separate queue for heavy jobs

    public function handle(PdfGenerator $pdf): void
    {
        $path = $pdf->generateBookingReport($this->booking);
        Storage::disk('s3')->put("reports/{$this->booking->id}.pdf", $path);
        $this->booking->update(['report_path' => $path]);
    }
}

// Dispatch from event listener:
class BookingCreatedListener
{
    public function handle(BookingCreated $event): void
    {
        SendBookingConfirmationEmail::dispatch($event->booking);
        GenerateBookingPdf::dispatch($event->booking)->onQueue('reports');
    }
}

// Queue workers: 3 workers for 'default', 1 worker for 'reports'
// Supervisor config: restart on failure, memory limit 128M
```

---

### Scaling decisions

```php
// Read replicas — separate read vs write traffic
// config/database.php
'mysql' => [
    'read' => [
        'host' => [env('DB_READ_HOST_1'), env('DB_READ_HOST_2')],
    ],
    'write' => [
        'host' => env('DB_WRITE_HOST'),
    ],
    'sticky' => true,  // after write, use write connection for remainder of request
]

// Octane (FrankenPHP / Swoole) — keep process warm between requests
// Eliminates framework bootstrap overhead (~10ms per request)
// WARNING: singletons persist between requests — be careful with state

// Horizontal scaling: stateless Laravel + shared Redis session store
// All instances share same Redis — no sticky sessions needed
// Session driver: redis (not file, not cookie)

// CDN: Cloudflare caches static assets (JS/CSS/images)
// Cache-Control: public, max-age=31536000 (1 year) for versioned assets
// Cloudflare R2 or AWS S3 for uploaded PDFs/documents

// Database indexing — most critical queries:
// 1. Get bookings by school + status (dashboard):
//    index('school_id', 'status')
// 2. Get bookings by trip + date (capacity check):
//    index('trip_id', 'trip_date')
// 3. Payment lookup by gateway ID (webhook handler):
//    index('gateway_transaction_id')
```

---

### Security decisions

```php
// Sanctum for API tokens (not Passport — simpler, no OAuth overhead)
// Token rotation: expire after 30 days, refresh on use

// Rate limiting:
Route::middleware(['throttle:api'])->group(function () {
    Route::apiResource('bookings', BookingController::class);
});

// config/rate_limiting.php:
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('payments', function (Request $request) {
    return Limit::perMinute(5)->by($request->user()?->id);  // stricter for payments
});

// Webhook security (MamoPay):
class WebhookController extends Controller
{
    public function mamopay(Request $request): JsonResponse
    {
        // Verify HMAC signature — reject unauthenticated webhooks
        $signature = $request->header('X-MamoPay-Signature');
        $expected  = hash_hmac('sha256', $request->getContent(), config('services.mamopay.webhook_secret'));

        if (!hash_equals($expected, $signature)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        ProcessMamoPayWebhook::dispatch($request->all());
        return response()->json(['received' => true]);
    }
}
```

---

## Problem 02 — Advanced System Design (Hard)

---

### Capacity estimation

```
Peak load calculation:
  1,000 schools × average 3 bookings during peak week
  = 3,000 bookings in 5 business days
  = 600/day = 75/hour = 1.25 bookings per second

Read traffic (10:1 read:write):
  12.5 reads/second at peak
  Each read ≈ 50ms DB + 10ms cache = 60ms avg response

Storage estimation:
  Each booking: ~1KB in DB
  1M bookings/year × 1KB = 1GB/year — trivial
  PDFs: 100KB each × 1M = 100GB/year → S3 (cheap at $2.30/month per 100GB)

DB sizing:
  5 years × 1M bookings/year = 5M rows in bookings table
  At 1KB/row → 5GB — fits in single MySQL instance with ease
  Conclusion: vertical scaling sufficient for 5+ years, no sharding needed
```

---

### Failure scenarios and handling

```php
// Scenario 1: Payment gateway down during booking
class ProcessPaymentHandler
{
    public function handle(Booking $booking, Closure $next): mixed
    {
        try {
            $payment = $this->gateway->charge($booking->amount, 'AED');
            $booking->update(['payment_id' => $payment->id, 'status' => 'paid']);
        } catch (PaymentGatewayException $e) {
            // Don't lose the booking — mark as payment_failed, retry via queue
            $booking->update(['status' => 'payment_failed']);
            RetryPaymentJob::dispatch($booking)->delay(now()->addMinutes(5));
            Log::error('Payment failed', ['booking' => $booking->id, 'error' => $e->getMessage()]);
            throw $e;  // propagate — response will be 422
        }

        return $next($booking);
    }
}

// Scenario 2: Double-booking race condition (two schools book last slot simultaneously)
public function createBooking(array $data): Booking
{
    return DB::transaction(function () use ($data) {
        // Pessimistic lock: SELECT ... FOR UPDATE
        $trip = Trip::lockForUpdate()->findOrFail($data['trip_id']);

        if ($trip->capacity_remaining < $data['student_count']) {
            throw new InsufficientCapacityException('Not enough capacity remaining');
        }

        $booking = Booking::create($data);
        $trip->decrement('capacity_remaining', $data['student_count']);

        return $booking;
    });
    // Transaction + row lock = only one booking succeeds, second gets exception
}

// Scenario 3: Queue worker crashes mid-job (email not sent)
class SendBookingConfirmationEmail implements ShouldQueue
{
    public int $tries = 3;
    public int $backoff = 60;  // exponential: 60s, 120s, 240s

    public function failed(Throwable $e): void
    {
        // After all retries exhausted: alert admin, mark booking for manual follow-up
        $this->booking->update(['email_failed' => true]);
        Notification::route('mail', config('admin.email'))
            ->notify(new EmailDeliveryFailed($this->booking));
    }
}
```

---

### Monitoring and observability

```php
// Laravel Telescope (local dev): query inspection, job tracking, mail preview
// Laravel Horizon (production): queue monitoring, throughput, failed job dashboard

// Structured logging — every booking event logged with context:
Log::channel('bookings')->info('Booking created', [
    'booking_id'  => $booking->id,
    'school_id'   => $booking->school_id,
    'amount'      => $booking->amount,
    'strategy'    => $booking->pricing_type,
    'duration_ms' => $duration,
    'request_id'  => request()->header('X-Request-ID'),
]);
// Ship logs to Datadog / Papertrail — searchable, alertable

// Health check endpoint:
Route::get('/health', function () {
    return response()->json([
        'status'   => 'ok',
        'db'       => DB::connection()->getPdo() ? 'ok' : 'error',
        'cache'    => Cache::store('redis')->ping() ? 'ok' : 'error',
        'queue'    => Queue::size('default') < 1000 ? 'ok' : 'backlogged',
        'version'  => config('app.version'),
    ]);
})->name('health');
// ALB / Cloudflare health checks hit this every 30s

// Metrics to alert on:
//   Response time p99 > 500ms → investigate slow queries
//   Queue depth > 500 → add worker instances
//   Error rate > 1% → page on-call
//   DB connections > 80% pool → scale read replicas

// APM: Laravel Octane + Sentry for distributed tracing
// Every request gets X-Request-ID header → trace through logs + queue jobs
```

---

### Scalability roadmap

```
Current (0–10k schools): Single MySQL + Redis + 2 app servers
  └── All fits on managed RDS db.t3.medium (~$50/month)

Growth (10k–100k): Add read replicas + Octane
  └── Read replica takes 80% of traffic, writes go to primary
  └── Octane removes 10–15ms bootstrap overhead per request

Scale (100k+): Consider:
  └── Separate reporting DB (Aurora read replica for heavy exports)
  └── Trip catalog in Elasticsearch (full-text search, faceted filters)
  └── Booking write path: Redis queue → MySQL via background worker (CQRS-lite)
  └── Multi-region if expanding to UK + UAE simultaneously

Never needed for Tripz:
  └── Microservices (overkill for this scale — team of 3)
  └── Kafka (SQS handles our throughput easily)
  └── Database sharding (5M rows/year fits one MySQL for 10+ years)
```
