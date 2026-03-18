# Mamo Pay Integration (UAE)

Integrate Mamo Pay for AED payments — create payment links via the API, verify webhooks using plain `Authorization` header comparison (not HMAC), and build a daily reconciliation command that detects discrepancies between Mamo Pay records and your database.

| Topic              | Details                                                          |
|--------------------|------------------------------------------------------------------|
| Payment Links      | POST to Mamo Pay API, store link ID + URL on booking             |
| Webhook Verification | Authorization header string match — NOT HMAC like Stripe       |
| Reconciliation     | Fetch transactions from API, diff with local DB, alert on mismatch |

> **vs TEST_10 (Stripe):** Stripe uses `Stripe-Signature` HMAC-SHA256. Mamo Pay uses a plain `Authorization` header value — you just compare it to your configured secret with `===`.

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Mamo Pay Service & Webhook Handler (Medium)

### Scenario

Wire up Mamo Pay for the Tripz booking platform: register an `Http::mamoPay()` macro, build `MamoPayService` to create payment links, verify incoming webhooks by comparing the `Authorization` header to a secret, and update booking status when `payment.captured` or `payment.failed` events arrive.

### Requirements

1. `config/services.php` — `mamopay.key`, `mamopay.base_url`, `mamopay.webhook_secret`
2. `Http::mamoPay()` macro in `AppServiceProvider::boot()` — pre-configured with `baseUrl`, `withToken`, `timeout(30)`, `retry(2, 500)`
3. `MamoPayService::createPaymentLink(Booking)` — POST `/manager/api/v1/links`; include `title`, `amount`, `currency: AED`, `custom_id` (booking ID), `webhook_url`; call `->throw()`; return the JSON array
4. `VerifyMamoWebhook` middleware — compare `$request->header('Authorization')` to `config('services.mamopay.webhook_secret')` with `===`; abort 401 on mismatch
5. `MamoWebhookController@handle` — idempotency check on `webhook_events.gateway_event_id`; route `payment.captured` and `payment.failed` via `match($type)`
6. `handleCaptured()` — inside `DB::transaction()`: create `Payment` record, update `Booking` status to `PAID`; dispatch `SendPaymentConfirmation` job after commit
7. `handleFailed()` — update booking status, log warning with gateway reason

### Expected Code

```php
// config/services.php
'mamopay' => [
    'key'            => env('MAMOPAY_API_KEY'),
    'base_url'       => env('MAMOPAY_BASE_URL', 'https://api.mamopay.com'),
    'webhook_secret' => env('MAMOPAY_WEBHOOK_SECRET'),
],
```

```php
// app/Providers/AppServiceProvider.php  (Http macro)
Http::macro('mamoPay', function () {
    return Http::baseUrl(config('services.mamopay.base_url'))
        ->withToken(config('services.mamopay.key'))
        ->acceptJson()
        ->timeout(30)
        ->retry(2, 500);
});
```

```php
// app/Services/MamoPayService.php
class MamoPayService
{
    public function createPaymentLink(Booking $booking): array
    {
        $response = Http::mamoPay()->post('/manager/api/v1/links', [
            'title'                => "Booking #{$booking->reference}",
            'amount'               => $booking->amount,
            'currency'             => 'AED',
            'description'          => "Trip for {$booking->school->name}",
            'success_redirect_url' => route('bookings.payment.success', $booking),
            'failure_redirect_url' => route('bookings.payment.failed', $booking),
            'custom_id'            => (string) $booking->id,
            'webhook_url'          => route('api.mamo.webhook'),
        ]);

        $response->throw(); // throws ConnectionException or RequestException on failure

        return $response->json();
        // returns: ['id' => 'lnk_xxx', 'payment_url' => 'https://pay.mamopay.com/...', 'status' => 'active']
    }
}
```

```php
// app/Http/Middleware/VerifyMamoWebhook.php
class VerifyMamoWebhook
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.mamopay.webhook_secret');
        $header = $request->header('Authorization');

        // Mamo Pay: plain string comparison — NOT HMAC
        if (!$header || $header !== $secret) {
            Log::warning('Mamo Pay webhook: invalid Authorization header', [
                'ip' => $request->ip(),
            ]);
            abort(401, 'Unauthorized webhook.');
        }

        return $next($request);
    }
}
```

```php
// app/Http/Controllers/MamoWebhookController.php
class MamoWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $eventId = $request->input('id');
        $type    = $request->input('type');
        $data    = $request->input('data', []);

        // Idempotency guard — skip if already processed
        if (WebhookEvent::where('gateway_event_id', $eventId)->exists()) {
            return response()->json(['message' => 'Already processed.']);
        }

        $event = WebhookEvent::create([
            'gateway'          => 'mamopay',
            'gateway_event_id' => $eventId,
            'type'             => $type,
            'payload'          => $request->all(),
        ]);

        match($type) {
            'payment.captured' => $this->handleCaptured($data),
            'payment.failed'   => $this->handleFailed($data),
            default            => null,
        };

        $event->update(['processed_at' => now()]);

        return response()->json(['message' => 'Processed.']);
    }

    private function handleCaptured(array $data): void
    {
        $booking = Booking::findOrFail($data['custom_id']);

        DB::transaction(function () use ($data, $booking) {
            // Inner idempotency — guard against duplicate payment rows
            if (Payment::where('gateway_reference', $data['id'])->exists()) {
                return;
            }

            Payment::create([
                'booking_id'        => $booking->id,
                'amount'            => $data['amount'],
                'currency'          => $data['currency'],
                'gateway'           => 'mamopay',
                'gateway_reference' => $data['id'],
                'method'            => $data['payment_method'] ?? 'card',
                'paid_at'           => now(),
            ]);

            $booking->update(['status' => BookingStatus::PAID, 'paid_at' => now()]);
        });

        dispatch(new SendPaymentConfirmation($booking->fresh()));
    }

    private function handleFailed(array $data): void
    {
        $booking = Booking::find($data['custom_id']);
        $booking?->update(['status' => BookingStatus::PAYMENT_FAILED]);

        Log::warning('Mamo Pay payment failed', [
            'booking_id' => $booking?->id,
            'gateway_id' => $data['id'],
            'reason'     => $data['failure_reason'] ?? 'unknown',
        ]);
    }
}
```

```php
// routes/api.php
Route::post('mamo/webhook', [MamoWebhookController::class, 'handle'])
    ->middleware(VerifyMamoWebhook::class)
    ->name('api.mamo.webhook');

// Exclude from CSRF (already in api middleware group)
```

### Authorization Header vs HMAC Comparison

| Gateway    | Verification method                                 | Header name          |
|------------|-----------------------------------------------------|----------------------|
| Stripe     | HMAC-SHA256 of raw body                             | `Stripe-Signature`   |
| Mamo Pay   | Plain string: `header === secret`                   | `Authorization`      |
| Generic    | HMAC-SHA256 of payload                              | `X-Webhook-Signature`|

### What We're Evaluating

- `Http::mamoPay()` macro — pre-configured base URL + Bearer token
- `->throw()` on HTTP response — throws on 4xx/5xx instead of checking `->failed()`
- `VerifyMamoWebhook` plain `===` comparison (not `hash_equals`, not HMAC)
- `WebhookEvent` table as outer idempotency + `Payment::where(gateway_reference)` as inner
- `match($type)` for event routing — concise, exhaustive
- `dispatch()` **after** `DB::transaction()` closes — job only fires on commit

---

## Problem 02 — Payment Reconciliation & Artisan Command (Hard)

### Scenario

Build a daily reconciliation system: `ReconciliationService` fetches Mamo Pay transactions for a given date, diffs them against local `payments` records, and produces a report with three discrepancy types. An Artisan command runs it with `--date` option and sends a notification if anything is off.

### Requirements

1. `MamoPayService::getTransactions(Carbon $date)` — GET `/manager/api/v1/payments` with `from`/`to` ISO8601 params; return `data` array
2. `ReconciliationService::reconcile(Carbon $date): ReconciliationReport` — fetch both sides, `keyBy()` on reference, detect three discrepancy types
3. Three discrepancy types: `missing_locally` (in Mamo, not in DB), `missing_on_mamo` (in DB, not in Mamo), `amount_mismatch` (same reference, different amount)
4. `ReconciliationReport` value object — `hasDiscrepancies()`, `toArray()`, `summary()` methods
5. `ReconcilePaymentsCommand` — signature `payments:reconcile {--date=}` (defaults to yesterday); outputs `$this->table()` summary; returns `self::FAILURE` if discrepancies found
6. Notify `config('finance.alert_email')` via `Notification::route('mail', ...)` on discrepancies
7. Feature test: `Http::fake()` both local DB and Mamo response — assert correct discrepancy counts

### Expected Code

```php
// app/Services/MamoPayService.php  (getTransactions)
public function getTransactions(Carbon $date): array
{
    $response = Http::mamoPay()->get('/manager/api/v1/payments', [
        'from'  => $date->copy()->startOfDay()->toIso8601String(),
        'to'    => $date->copy()->endOfDay()->toIso8601String(),
        'limit' => 200,
    ]);

    $response->throw();

    return $response->json('data', []);
}
```

```php
// app/Services/ReconciliationService.php
class ReconciliationService
{
    public function __construct(private MamoPayService $mamoPay) {}

    public function reconcile(Carbon $date): ReconciliationReport
    {
        $mamoTransactions = collect($this->mamoPay->getTransactions($date))
            ->keyBy('id');

        $localPayments = Payment::query()
            ->where('gateway', 'mamopay')
            ->whereBetween('paid_at', [$date->copy()->startOfDay(), $date->copy()->endOfDay()])
            ->get()
            ->keyBy('gateway_reference');

        $missingLocally = $mamoTransactions->filter(
            fn($t) => !$localPayments->has($t['id'])
        );

        $missingOnMamo = $localPayments->filter(
            fn($p) => !$mamoTransactions->has($p->gateway_reference)
        );

        $amountMismatches = $localPayments->filter(function ($p) use ($mamoTransactions) {
            $mamo = $mamoTransactions->get($p->gateway_reference);
            return $mamo && (float) $mamo['amount'] !== (float) $p->amount;
        });

        return new ReconciliationReport(
            date:             $date,
            totalMamo:        $mamoTransactions->count(),
            totalLocal:       $localPayments->count(),
            missingLocally:   $missingLocally,
            missingOnMamo:    $missingOnMamo,
            amountMismatches: $amountMismatches,
        );
    }
}
```

```php
// app/Console/Commands/ReconcilePaymentsCommand.php
class ReconcilePaymentsCommand extends Command
{
    protected $signature   = 'payments:reconcile {--date= : Date to reconcile (YYYY-MM-DD), defaults to yesterday}';
    protected $description = 'Reconcile Mamo Pay transactions with local payment records';

    public function handle(ReconciliationService $reconciliation): int
    {
        $date = Carbon::parse($this->option('date') ?? now()->subDay()->toDateString());

        $this->info("Reconciling Mamo Pay payments for {$date->toDateString()}...");

        $report = $reconciliation->reconcile($date);

        $this->table(
            ['Metric', 'Count'],
            [
                ['Mamo Pay transactions',  $report->totalMamo],
                ['Local payment records',  $report->totalLocal],
                ['Missing locally',        $report->missingLocally->count()],
                ['Missing on Mamo Pay',    $report->missingOnMamo->count()],
                ['Amount mismatches',      $report->amountMismatches->count()],
            ]
        );

        if ($report->hasDiscrepancies()) {
            $this->warn('Discrepancies detected — sending alert.');

            Notification::route('mail', config('finance.alert_email'))
                ->notify(new PaymentDiscrepancyAlert($report));

            Log::error('Payment reconciliation discrepancies found', $report->toArray());

            return self::FAILURE;
        }

        $this->info('Reconciliation complete — no discrepancies.');

        return self::SUCCESS;
    }
}
```

```php
// app/Support/ReconciliationReport.php
class ReconciliationReport
{
    public function __construct(
        public readonly Carbon     $date,
        public readonly int        $totalMamo,
        public readonly int        $totalLocal,
        public readonly Collection $missingLocally,
        public readonly Collection $missingOnMamo,
        public readonly Collection $amountMismatches,
    ) {}

    public function hasDiscrepancies(): bool
    {
        return $this->missingLocally->isNotEmpty()
            || $this->missingOnMamo->isNotEmpty()
            || $this->amountMismatches->isNotEmpty();
    }

    public function toArray(): array
    {
        return [
            'date'              => $this->date->toDateString(),
            'total_mamo'        => $this->totalMamo,
            'total_local'       => $this->totalLocal,
            'missing_locally'   => $this->missingLocally->count(),
            'missing_on_mamo'   => $this->missingOnMamo->count(),
            'amount_mismatches' => $this->amountMismatches->count(),
        ];
    }
}
```

```php
// tests/Feature/MamoPayTest.php
public function test_webhook_rejects_invalid_authorization_header(): void
{
    $this->postJson(route('api.mamo.webhook'), [], [
        'Authorization' => 'wrong_secret',
    ])->assertUnauthorized();
}

public function test_payment_captured_webhook_marks_booking_paid(): void
{
    config(['services.mamopay.webhook_secret' => 'test_secret']);

    $booking = Booking::factory()->pending()->create(['id' => 99]);

    $this->postJson(route('api.mamo.webhook'), [
        'id'   => 'evt_001',
        'type' => 'payment.captured',
        'data' => [
            'id'             => 'pay_001',
            'custom_id'      => '99',
            'amount'         => $booking->amount,
            'currency'       => 'AED',
            'payment_method' => 'card',
        ],
    ], ['Authorization' => 'test_secret'])
        ->assertOk();

    $this->assertEquals(BookingStatus::PAID, $booking->fresh()->status);
    $this->assertDatabaseHas('payments', ['gateway_reference' => 'pay_001']);
}

public function test_duplicate_webhook_event_is_skipped(): void
{
    config(['services.mamopay.webhook_secret' => 'test_secret']);
    WebhookEvent::factory()->create(['gateway_event_id' => 'evt_dup']);

    $this->postJson(route('api.mamo.webhook'), [
        'id'   => 'evt_dup',
        'type' => 'payment.captured',
        'data' => [],
    ], ['Authorization' => 'test_secret'])
        ->assertOk()
        ->assertJsonPath('message', 'Already processed.');

    $this->assertDatabaseCount('payments', 0);
}

public function test_reconciliation_detects_missing_local_payment(): void
{
    Http::fake([
        'api.mamopay.com/*' => Http::response([
            'data' => [
                ['id' => 'pay_mamo_only', 'amount' => 5000, 'currency' => 'AED'],
            ],
        ], 200),
    ]);

    // No matching local payment exists
    $date   = now()->subDay();
    $report = app(ReconciliationService::class)->reconcile($date);

    $this->assertCount(1, $report->missingLocally);
    $this->assertTrue($report->hasDiscrepancies());
}
```

### What We're Evaluating

- `getTransactions()` using `Http::mamoPay()` macro with date range params
- `keyBy()` on both collections for O(1) diff lookups
- Three-way diff: missing locally, missing on Mamo, amount mismatch
- `ReconciliationReport` value object with `hasDiscrepancies()`
- Artisan command `--date=` option, `self::FAILURE` return code, `$this->table()`
- `Notification::route('mail', ...)` on-demand notification without a User model
- `Http::fake()` in reconciliation test to mock the Mamo API response
