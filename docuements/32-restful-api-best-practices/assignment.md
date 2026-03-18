# RESTful API Best Practices

Design a clean, versioned REST API for Tripz — correct HTTP verbs, status codes, Location headers, shallow nested routes, consistent error envelopes, rate limiting, and feature tests that assert status + structure.

| Topic            | Details                                                         |
|------------------|-----------------------------------------------------------------|
| REST Conventions | HTTP verbs, status codes, Location header, 204 on delete        |
| Versioning       | URL prefix (v1/v2), controller inheritance, route files         |
| Error & Rate     | JSON error envelope, RateLimiter::for(), sparse fieldsets       |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — REST Conventions & Resource Design (Medium)

### Scenario

Wire up the Tripz bookings API with proper REST conventions: `Route::apiResource()` with shallow nesting for payments, correct status codes on every response, a `Location` header on 201 Created, `response()->noContent()` on delete, and a `BookingResource` with conditional relationships and HATEOAS links.

### Requirements

1. `Route::apiResource('bookings', ...)` + shallow nested `Route::apiResource('bookings.payments', ...)->shallow()` for payment sub-resources
2. Non-CRUD actions (`cancel`, `approve`) registered as POST sub-resources: `POST /bookings/{booking}/cancel`
3. `BookingController@store` — returns `201 Created` with `Location: /api/v1/bookings/{id}` header
4. `BookingController@destroy` — returns `204 No Content` via `response()->noContent()`
5. `BookingResource` — includes `whenLoaded()` for `school`, `trip`, `payments`; includes `links` array with `self` + `cancel` URLs
6. `BookingController@update` uses `PATCH` semantics — only updates fields present in request (`$request->validated()` with optional fields)
7. All controller actions call `$this->authorize()` before acting

### Expected Code

```php
// routes/api.php
Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::apiResource('bookings', BookingController::class);

    // Shallow nesting — /bookings/{booking}/payments (index, store)
    //                    /payments/{payment}         (show, update, destroy)
    Route::apiResource('bookings.payments', BookingPaymentController::class)
        ->shallow()
        ->only(['index', 'store', 'show']);

    // Non-CRUD: sub-resource actions as POST
    Route::post('bookings/{booking}/cancel',  [BookingController::class, 'cancel']);
    Route::post('bookings/{booking}/approve', [BookingController::class, 'approve']);
});
```

```php
// app/Http/Controllers/Api/V1/BookingController.php
class BookingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Booking::class);

        $bookings = Booking::query()
            ->with(['school:id,name', 'trip:id,name,destination'])
            ->withCount('payments')
            ->filter($request)
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return BookingResource::collection($bookings);
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $this->authorize('create', Booking::class);

        $booking = DB::transaction(fn() => Booking::create($request->validated()));

        return BookingResource::make($booking->load('school', 'trip'))
            ->response()
            ->setStatusCode(201)
            ->header('Location', route('api.v1.bookings.show', $booking));
    }

    public function show(Booking $booking): BookingResource
    {
        $this->authorize('view', $booking);

        return BookingResource::make($booking->load(['school', 'trip', 'payments']));
    }

    public function update(UpdateBookingRequest $request, Booking $booking): BookingResource
    {
        $this->authorize('update', $booking);

        $booking->update($request->validated());

        return BookingResource::make($booking->fresh(['school', 'trip']));
    }

    public function destroy(Booking $booking): \Illuminate\Http\Response
    {
        $this->authorize('delete', $booking);

        $booking->delete();

        return response()->noContent(); // 204
    }

    public function cancel(CancelBookingRequest $request, Booking $booking): BookingResource
    {
        $this->authorize('update', $booking);

        $booking->cancel($request->validated('reason'));

        return BookingResource::make($booking->fresh());
    }
}
```

```php
// app/Http/Resources/BookingResource.php
class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'reference'      => $this->reference,
            'status'         => $this->status->value,
            'amount'         => $this->amount,
            'student_count'  => $this->student_count,
            'created_at'     => $this->created_at->toIso8601String(),

            // Conditional relationships — only present when loaded
            'school'   => SchoolResource::make($this->whenLoaded('school')),
            'trip'     => TripResource::make($this->whenLoaded('trip')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),

            // Computed — only when withCount() was called
            'payments_count' => $this->whenNotNull($this->payments_count ?? null),

            // HATEOAS links
            'links' => [
                'self'   => route('api.v1.bookings.show', $this->id),
                'cancel' => route('api.v1.bookings.cancel', $this->id),
            ],
        ];
    }
}
```

### HTTP Status Code Reference

| Code | Meaning              | When to use                                          |
|------|----------------------|------------------------------------------------------|
| 200  | OK                   | GET, PATCH success                                   |
| 201  | Created              | POST success — include `Location` header             |
| 204  | No Content           | DELETE success — no body                             |
| 400  | Bad Request          | Malformed JSON / missing Content-Type                |
| 401  | Unauthorized         | Missing or invalid token                             |
| 403  | Forbidden            | Authenticated but not allowed                        |
| 404  | Not Found            | Model not found (route model binding)                |
| 409  | Conflict             | Duplicate / already-paid booking                     |
| 422  | Unprocessable        | Validation failed — include `errors` object          |
| 429  | Too Many Requests    | Rate limit hit — include `Retry-After` header        |

### What We're Evaluating

- `Route::apiResource()` with `->shallow()` for nested payment routes
- Non-CRUD actions as POST sub-resources (`/bookings/{id}/cancel`)
- `201 Created` + `Location` header from `store()`
- `204 No Content` via `response()->noContent()` from `destroy()`
- `whenLoaded()` — relationships only appear when explicitly eager-loaded
- HATEOAS `links` array inside the resource
- `$this->authorize()` on every action

---

## Problem 02 — Versioning, Error Envelope & Rate Limiting (Hard)

### Scenario

Add API versioning (v1 → v2 with cursor pagination), a global JSON error envelope in the exception handler, rate limiting per user/IP, sparse fieldsets via `?fields=`, and feature tests that verify status codes, headers, and response structure.

### Requirements

1. API versioning with URL prefix — `routes/api_v1.php` and `routes/api_v2.php` included from `routes/api.php`
2. `V2/BookingController` extends `V1/BookingController` and overrides only `index()` to use `cursorPaginate()` instead of `paginate()`
3. Global exception handler (`app/Exceptions/Handler.php`) — when `$request->expectsJson()`, return consistent `{ message, errors? }` envelope for `ValidationException`, `AuthorizationException`, `ModelNotFoundException`, and fallback 500
4. `RateLimiter::for('api', ...)` in `AppServiceProvider` — 60/min for authenticated users, 10/min by IP for guests
5. `RateLimiter::for('booking-creation', ...)` — 5/hour per user to prevent booking spam
6. Sparse fieldsets: `BookingResource` reads `?fields=id,reference,status` and filters `toArray()` output to only those keys
7. Feature tests: 201 + Location, 204, 422 envelope, 401 unauthenticated, 409 conflict on duplicate

### Expected Code

```php
// routes/api.php  (versioned route files)
Route::prefix('v1')->name('api.v1.')->middleware('throttle:api')
    ->group(base_path('routes/api_v1.php'));

Route::prefix('v2')->name('api.v2.')->middleware('throttle:api')
    ->group(base_path('routes/api_v2.php'));
```

```php
// app/Http/Controllers/Api/V2/BookingController.php  (override index only)
class BookingController extends V1BookingController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Booking::class);

        $bookings = Booking::query()
            ->with(['school:id,name', 'trip:id,name'])
            ->filter($request)
            ->cursorPaginate(15);  // V2: cursor instead of offset pagination

        return BookingResource::collection($bookings);
    }
}
```

```php
// app/Exceptions/Handler.php  (JSON error envelope)
public function render($request, Throwable $e): Response
{
    if ($request->expectsJson()) {
        return match(true) {
            $e instanceof ValidationException     => response()->json([
                'message' => 'The given data was invalid.',
                'errors'  => $e->errors(),
            ], 422),

            $e instanceof AuthorizationException  => response()->json([
                'message' => 'This action is unauthorized.',
            ], 403),

            $e instanceof ModelNotFoundException  => response()->json([
                'message' => class_basename($e->getModel()) . ' not found.',
            ], 404),

            $e instanceof ConflictException       => response()->json([
                'message' => $e->getMessage(),
            ], 409),

            default => response()->json([
                'message' => app()->isProduction() ? 'Server error.' : $e->getMessage(),
            ], 500),
        };
    }

    return parent::render($request, $e);
}
```

```php
// app/Providers/AppServiceProvider.php  (rate limiters)
public function boot(): void
{
    RateLimiter::for('api', function (Request $request) {
        return $request->user()
            ? Limit::perMinute(60)->by($request->user()->id)
            : Limit::perMinute(10)->by($request->ip());
    });

    RateLimiter::for('booking-creation', function (Request $request) {
        return Limit::perHour(5)
            ->by($request->user()?->id . '|' . $request->ip())
            ->response(fn() => response()->json(
                ['message' => 'Too many bookings. Try again later.'], 429
            ));
    });
}
```

```php
// app/Http/Resources/BookingResource.php  (sparse fieldsets)
public function toArray(Request $request): array
{
    $all = [
        'id'           => $this->id,
        'reference'    => $this->reference,
        'status'       => $this->status->value,
        'amount'       => $this->amount,
        'student_count'=> $this->student_count,
        'created_at'   => $this->created_at->toIso8601String(),
        'school'       => SchoolResource::make($this->whenLoaded('school')),
        'trip'         => TripResource::make($this->whenLoaded('trip')),
        'links'        => ['self' => route('api.v1.bookings.show', $this->id)],
    ];

    if ($fields = $request->query('fields')) {
        $allowed = explode(',', $fields);
        return array_intersect_key($all, array_flip($allowed));
    }

    return $all;
}
```

```php
// tests/Feature/BookingApiTest.php
public function test_store_returns_201_with_location_header(): void
{
    $user = User::factory()->schoolAdmin()->create();
    $trip = Trip::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.v1.bookings.store'), [
            'trip_id'       => $trip->id,
            'school_id'     => $user->school_id,
            'student_count' => 10,
        ])
        ->assertCreated()
        ->assertHeader('Location')
        ->assertJsonStructure(['data' => ['id', 'reference', 'status', 'links']]);
}

public function test_destroy_returns_204_no_content(): void
{
    $user    = User::factory()->superAdmin()->create();
    $booking = Booking::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->deleteJson(route('api.v1.bookings.destroy', $booking))
        ->assertNoContent();
}

public function test_validation_error_returns_422_with_error_envelope(): void
{
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.v1.bookings.store'), [])
        ->assertUnprocessable()
        ->assertJsonStructure(['message', 'errors'])
        ->assertJsonPath('message', 'The given data was invalid.');
}

public function test_unauthenticated_request_returns_401(): void
{
    $this->getJson(route('api.v1.bookings.index'))
        ->assertUnauthorized();
}

public function test_duplicate_booking_returns_409_conflict(): void
{
    $user    = User::factory()->schoolAdmin()->create();
    $booking = Booking::factory()->paid()->for($user->school)->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.v1.bookings.store'), [
            'trip_id'       => $booking->trip_id,
            'school_id'     => $booking->school_id,
            'student_count' => $booking->student_count,
        ])
        ->assertStatus(409)
        ->assertJsonPath('message', 'A booking for this trip already exists.');
}

public function test_sparse_fieldsets_limit_response_keys(): void
{
    $user    = User::factory()->create();
    $booking = Booking::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->getJson(route('api.v1.bookings.show', $booking) . '?fields=id,reference')
        ->assertOk()
        ->assertJsonStructure(['data' => ['id', 'reference']])
        ->assertJsonMissingPath('data.amount');
}
```

### What We're Evaluating

- Versioned route files included via `base_path('routes/api_v1.php')`
- V2 controller inherits V1 and overrides only `index()` for cursor pagination
- Global JSON envelope in `Handler::render()` for all expected exception types
- `RateLimiter::for()` — per-user vs per-IP, plus domain-specific limiter for booking creation
- Sparse fieldsets with `?fields=` query parameter filtering `toArray()` output
- Feature tests covering 201, 204, 401, 409, 422, and sparse fieldsets
