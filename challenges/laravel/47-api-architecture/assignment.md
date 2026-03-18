# LARAVEL_TEST_47 — API Architecture · REST · GraphQL

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — API Architecture Decisions (Medium)

---

### REST Design — Resources, verbs, status codes

```php
// routes/api.php — RESTful resource design
Route::prefix('v1')->middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Bookings resource — standard CRUD
    Route::apiResource('bookings', BookingController::class);
    // GET    /v1/bookings           → index  (list with filters)
    // POST   /v1/bookings           → store  (create)
    // GET    /v1/bookings/{booking} → show   (single)
    // PUT    /v1/bookings/{booking} → update (full replace)
    // PATCH  /v1/bookings/{booking} → update (partial)
    // DELETE /v1/bookings/{booking} → destroy

    // Sub-resources (nested routes for relationships)
    Route::apiResource('bookings.payments', BookingPaymentController::class)
        ->only(['index', 'store']);
    // GET  /v1/bookings/{booking}/payments     → list payments for booking
    // POST /v1/bookings/{booking}/payments     → add payment to booking

    // Actions that don't map to CRUD — use POST to a sub-resource noun
    Route::post('bookings/{booking}/cancel',  [BookingController::class, 'cancel']);
    Route::post('bookings/{booking}/confirm', [BookingController::class, 'confirm']);
    Route::post('bookings/{booking}/refund',  [BookingController::class, 'refund']);
    // ← NOT: DELETE /bookings/{booking} for cancel (delete = remove record, not state change)
    // ← POST to action sub-resource = RESTful way to model state transitions

    // Schools + Trips
    Route::apiResource('schools', SchoolController::class);
    Route::apiResource('trips', TripController::class)->only(['index', 'show']);

    // Reports — non-resource endpoints
    Route::get('reports/revenue',  [ReportController::class, 'revenue']);
    Route::get('reports/bookings', [ReportController::class, 'bookings']);
});
```

```php
// HTTP status codes — use the right one
class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bookings = $this->service->paginate($request->validated());
        return response()->json(BookingResource::collection($bookings), 200);
        // 200 OK: successful GET
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->service->create($request->validated());
        return response()->json(new BookingResource($booking), 201);
        // 201 Created: resource created — include Location header ideally
    }

    public function update(UpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        $booking = $this->service->update($booking, $request->validated());
        return response()->json(new BookingResource($booking), 200);
        // 200 OK: successful update
    }

    public function destroy(Booking $booking): JsonResponse
    {
        $this->service->delete($booking);
        return response()->json(null, 204);
        // 204 No Content: deleted, no body
    }

    public function cancel(Booking $booking): JsonResponse
    {
        try {
            $this->service->cancel($booking);
            return response()->json(['message' => 'Booking cancelled'], 200);
        } catch (BookingNotCancellableException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
            // 422 Unprocessable Entity: valid JSON but business rule failed
        }
    }
}

// Status code cheat sheet:
// 200 OK:                 successful GET, PUT, PATCH
// 201 Created:            successful POST that creates a resource
// 204 No Content:         successful DELETE, or PUT/PATCH with no body returned
// 400 Bad Request:        malformed JSON, missing required fields
// 401 Unauthorized:       not authenticated (no token)
// 403 Forbidden:          authenticated but not authorized (wrong role)
// 404 Not Found:          resource doesn't exist
// 405 Method Not Allowed: wrong HTTP verb
// 409 Conflict:           duplicate creation, version conflict
// 422 Unprocessable:      valid format, fails business/validation rules
// 429 Too Many Requests:  rate limit exceeded
// 500 Internal Server Error: unexpected server error
```

---

### API Versioning strategies

```php
// ============================================================
// Strategy 1: URL versioning — /v1/bookings, /v2/bookings (RECOMMENDED)
// ============================================================
Route::prefix('v1')->group(function () {
    Route::apiResource('bookings', V1\BookingController::class);
});

Route::prefix('v2')->group(function () {
    Route::apiResource('bookings', V2\BookingController::class);
    // V2 adds: student manifest, pricing breakdown, webhook URLs
});

// ✅ Explicit, cacheable by CDN (URL is unique per version)
// ✅ Easy to test: open v1 and v2 in separate browser tabs
// ✅ Clients can adopt new version at their own pace
// ❌ URL "should" be stable (REST purists argue version != resource)

// ============================================================
// Strategy 2: Accept header versioning
// ============================================================
// GET /bookings
// Accept: application/vnd.tripz.v2+json

class VersionMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $accept = $request->header('Accept', '');
        preg_match('/application\/vnd\.tripz\.v(\d+)\+json/', $accept, $m);
        $request->attributes->set('api_version', $m[1] ?? '1');
        return $next($request);
    }
}

// ✅ Clean URLs
// ❌ Not cacheable by CDN (same URL, different response)
// ❌ Harder to test (must set headers)
// ❌ Easy to miss in client code — silent fallback to wrong version

// ============================================================
// Strategy 3: Query parameter versioning
// ============================================================
// GET /bookings?version=2
// ✅ Easy to test in browser
// ❌ Not cacheable (query params vary cache keys inconsistently)
// ❌ Easily forgotten — not part of URL structure

// Tripz decision: URL versioning (/v1/, /v2/)
// Reason: cacheable, explicit, easy for mobile app to adopt

// Version evolution strategy:
// - Never remove fields in same major version — only add (backwards-compatible)
// - Deprecate with Deprecation header and Sunset header:
//   Deprecation: true
//   Sunset: Sat, 01 Jan 2027 00:00:00 GMT
//   ← give clients 12 months notice before removing v1
```

---

### Pagination strategies

```php
// ============================================================
// Page-based pagination (default) — good for UI with page numbers
// ============================================================
public function index(Request $request): JsonResponse
{
    $bookings = Booking::with(['school', 'trip'])
        ->filter($request->validated())
        ->paginate($request->integer('per_page', 15));

    return response()->json([
        'data' => BookingResource::collection($bookings),
        'meta' => [
            'current_page' => $bookings->currentPage(),
            'last_page'    => $bookings->lastPage(),
            'per_page'     => $bookings->perPage(),
            'total'        => $bookings->total(),
            'from'         => $bookings->firstItem(),
            'to'           => $bookings->lastItem(),
        ],
        'links' => [
            'first' => $bookings->url(1),
            'last'  => $bookings->url($bookings->lastPage()),
            'prev'  => $bookings->previousPageUrl(),
            'next'  => $bookings->nextPageUrl(),
        ],
    ]);
}
// GET /v1/bookings?page=2&per_page=20

// ============================================================
// Cursor-based pagination — for infinite scroll, live feeds
// ============================================================
$bookings = Booking::orderBy('id')->cursorPaginate(15);
// Returns: data, next_cursor, prev_cursor
// GET /v1/bookings?cursor=eyJpZCI6MTAwfQ

// ✅ No page drift (new records added while paginating don't shift pages)
// ✅ Consistent performance regardless of offset (O(log n) vs O(n+offset))
// ❌ Cannot jump to page 10 — sequential only
// Use for: notifications, activity feeds, any infinite scroll
// Use page-based for: admin tables, exports, reports

// ============================================================
// Keyset pagination — custom, high-performance variant
// ============================================================
// GET /v1/bookings?after_id=1000&per_page=15
$bookings = Booking::where('id', '>', $request->integer('after_id', 0))
    ->orderBy('id')
    ->limit($request->integer('per_page', 15))
    ->get();
// ✅ No OFFSET — always O(log n) via primary key index
// Use for: large datasets, reporting exports
```

---

### API Resources — consistent response shape

```php
// app/Http/Resources/BookingResource.php
class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'type'           => 'booking',          // JSON:API style type hint
            'status'         => $this->status->value,
            'trip_date'      => $this->trip_date->toIso8601String(),
            'student_count'  => $this->student_count,
            'amount' => [
                'value'     => $this->amount,
                'currency'  => 'GBP',
                'formatted' => $this->formatted_amount,
            ],
            'is_paid'        => $this->isPaid(),
            'is_cancellable' => $this->isCancellable(),

            // Conditional includes — only when loaded
            'school' => new SchoolResource($this->whenLoaded('school')),
            'trip'   => new TripResource($this->whenLoaded('trip')),

            // Conditional fields — only for admin
            'payment_id' => $this->when(
                $request->user()?->isAdmin(),
                $this->payment_id
            ),

            '_links' => [
                'self'   => route('api.v1.bookings.show', $this->id),
                'cancel' => $this->isCancellable()
                    ? route('api.v1.bookings.cancel', $this->id)
                    : null,
            ],
            '_meta' => [
                'created_at' => $this->created_at->toIso8601String(),
                'updated_at' => $this->updated_at->toIso8601String(),
            ],
        ];
    }
}

// Global error response format — consistent across all endpoints:
class ApiErrorResponse
{
    public static function make(string $message, int $status, array $errors = []): JsonResponse
    {
        return response()->json([
            'error' => [
                'message' => $message,
                'status'  => $status,
                'errors'  => $errors,  // field-level validation errors
                'trace_id' => request()->header('X-Request-ID'),
            ],
        ], $status);
    }
}

// In Handler:
public function render(Request $request, Throwable $e): Response
{
    if ($request->expectsJson()) {
        if ($e instanceof ValidationException) {
            return ApiErrorResponse::make('Validation failed', 422, $e->errors());
        }
        if ($e instanceof ModelNotFoundException) {
            return ApiErrorResponse::make('Resource not found', 404);
        }
        if ($e instanceof AuthorizationException) {
            return ApiErrorResponse::make('Forbidden', 403);
        }
    }
    return parent::render($request, $e);
}
```

---

## Problem 02 — Advanced API Architecture (Hard)

---

### GraphQL with Lighthouse — when REST isn't enough

```php
// When to use GraphQL:
//   Multiple clients (mobile, web, 3rd party) needing different field sets
//   Under-fetching: mobile needs trip.name only, web needs 20 fields
//   Over-fetching: REST returns 50 fields, client needs 3
//   Rapid product iteration: add fields without new endpoints
//
// When to stay with REST:
//   Simple CRUD API
//   CDN caching needed (GraphQL POST requests aren't cached)
//   Team unfamiliar with GraphQL — learning curve is real
//   Tripz: stay REST (simple enough, CDN caching needed)

// composer require nuwave/lighthouse

// graphql/schema.graphql
// type Query {
//   booking(id: ID! @find): Booking
//   bookings(
//     school_id: ID @where(operator: "=")
//     status: String @where(operator: "=")
//   ): [Booking!]! @paginate
//
//   trips(status: String @where): [Trip!]! @paginate
// }
//
// type Mutation {
//   createBooking(input: CreateBookingInput! @spread): Booking @create
//   cancelBooking(id: ID!): Booking @update
// }
//
// type Booking {
//   id: ID!
//   status: String!
//   amount: Float!
//   tripDate: String!
//   studentCount: Int!
//   school: School! @belongsTo
//   trip: Trip! @belongsTo
//   payments: [Payment!]! @hasMany
// }
//
// type School { id: ID! name: String! emirate: String! }
// type Trip   { id: ID! title: String! destination: String! pricePerStudent: Float! }
// type Payment { id: ID! amount: Float! status: String! gateway: String! }

// Client query — fetch only what's needed (no over-fetching):
// query GetBookingDashboard($schoolId: ID!) {
//   bookings(school_id: $schoolId, status: "paid") {
//     data {
//       id
//       tripDate
//       studentCount
//       trip { title destination }  ← only title+destination, not all trip fields
//     }
//   }
// }

// N+1 protection — Lighthouse auto-batches with DataLoader:
// Multiple bookings → trips: single SELECT WHERE id IN (...) per type
// No N+1 by default in Lighthouse ← key advantage over naive REST

// Custom resolver for complex queries:
// #[Attribute]
// class BookingRevenueResolver
// {
//     public function __invoke($root, array $args): float
//     {
//         return Booking::where('status', 'paid')->sum('amount');
//     }
// }
```

---

### Rate limiting — per endpoint, per user

```php
// config/rate_limiting.php or bootstrap/app.php
RateLimiter::for('api', function (Request $request) {
    return $request->user()
        ? Limit::perMinute(120)->by($request->user()->id)       // authenticated: 120/min
        : Limit::perMinute(20)->by($request->ip());             // unauthenticated: 20/min
});

RateLimiter::for('booking-creation', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->user()?->id),          // 5 bookings/minute
        Limit::perDay(50)->by($request->user()?->id),            // 50 bookings/day
    ];
});

RateLimiter::for('payment', function (Request $request) {
    return Limit::perMinute(3)->by($request->user()?->id);       // 3 payment attempts/min
});

// Apply in routes:
Route::post('/bookings', ...)->middleware('throttle:booking-creation');
Route::post('/bookings/{booking}/pay', ...)->middleware('throttle:payment');

// Response headers (included automatically by Laravel):
// X-RateLimit-Limit:     120
// X-RateLimit-Remaining: 87
// Retry-After:           60   ← only on 429
```

---

### API authentication — Sanctum SPA + mobile

```php
// config/sanctum.php
// SPA (same-domain React): cookie-based sessions — no token management
// Mobile app: Bearer token — long-lived token with rotation

// SPA login (session cookie):
Route::post('/login', function (Request $request) {
    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }
    $request->session()->regenerate();
    return response()->json(['user' => new UserResource(Auth::user())]);
});

// Mobile token creation:
Route::post('/tokens/create', function (Request $request) {
    $request->validate(['email' => 'required|email', 'password' => 'required', 'device_name' => 'required']);

    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    $token = Auth::user()->createToken(
        $request->device_name,
        ['booking:create', 'booking:read'],  // abilities/scopes
        now()->addDays(30)                   // expiry
    );

    return response()->json(['token' => $token->plainTextToken]);
});

// Protected routes — check ability:
Route::post('/bookings', function () {
    abort_unless(request()->user()->tokenCan('booking:create'), 403, 'Token cannot create bookings');
    // ...
});

// Token refresh / rotation:
Route::post('/tokens/refresh', function (Request $request) {
    $request->user()->currentAccessToken()->delete();  // revoke old
    $token = $request->user()->createToken($request->device_name, ['*'], now()->addDays(30));
    return response()->json(['token' => $token->plainTextToken]);
})->middleware('auth:sanctum');
```

---

### OpenAPI / Swagger documentation

```php
// composer require dedoc/scramble  ← auto-generates OpenAPI from routes/resources/requests

// config/scramble.php
return [
    'api_path'  => 'api/v1',         // document this prefix only
    'api_domain' => null,            // or: 'api.tripz.com'
    'info' => [
        'title'   => 'Tripz Booking API',
        'version' => '1.0.0',
    ],
];

// Scramble reads:
//   Route definitions
//   FormRequest rules → request body schema
//   JsonResource toArray() → response schema
//   PHPDoc comments → descriptions

// Access docs: GET /docs/api  (Scalar UI)
// Access OpenAPI JSON: GET /docs/api.json

// Manually document non-obvious endpoints:
/**
 * @response 422 {
 *   "error": {
 *     "message": "Booking cannot be cancelled within 7 days of trip",
 *     "status": 422
 *   }
 * }
 */
public function cancel(Booking $booking): JsonResponse

// Versioning docs: separate scramble instance per API version
```

---

### Idempotency — safe retry on payment endpoints

```php
// Problem: mobile app retries payment due to network timeout
//   Was the first request processed? Did we double-charge?

// Solution: Idempotency-Key header
// Client: POST /bookings/{booking}/pay
//         Idempotency-Key: uuid-unique-per-attempt

class IdempotencyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (!$key) {
            return $next($request);  // not required for all endpoints
        }

        $cacheKey = "idempotency:{$request->user()->id}:{$key}";

        // Return cached response if this key was already processed:
        if ($cached = Cache::get($cacheKey)) {
            return response()->json($cached['body'], $cached['status'])
                ->header('X-Idempotent-Replayed', 'true');
        }

        $response = $next($request);

        // Cache response for 24 hours:
        if ($response->getStatusCode() < 500) {
            Cache::put($cacheKey, [
                'body'   => json_decode($response->getContent(), true),
                'status' => $response->getStatusCode(),
            ], now()->addDay());
        }

        return $response;
    }
}

Route::post('/bookings/{booking}/pay', ...)->middleware(IdempotencyMiddleware::class);
// Client retries with same Idempotency-Key → gets same response, no double charge
```
