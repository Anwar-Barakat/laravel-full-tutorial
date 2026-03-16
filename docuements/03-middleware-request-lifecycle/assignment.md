# Middleware & Request Lifecycle

Build custom middleware for auth checks, rate limiting, and request transformation — control what happens before/after your controllers.

| Topic              | Details                                    |
|--------------------|--------------------------------------------|
| Custom Middleware  | Before/after logic, terminate              |
| Auth Guards        | Custom authentication logic                |
| Request Transform  | Modify requests and responses              |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Custom API Middleware Stack (Medium)

### Scenario

Build a set of middleware for a booking API: verify API key, enforce JSON responses, 
log API requests with timing, and check subscription status.

### Files to Create

| File                                                   | Purpose                                      |
|--------------------------------------------------------|----------------------------------------------|
| `app/Http/Middleware/VerifyApiKey.php`                 | Check `X-API-Key` header against database    |
| `app/Http/Middleware/ForceJsonResponse.php`            | Ensure `Accept: application/json`            |
| `app/Http/Middleware/ApiRequestLogger.php`             | Log request/response with execution time     |
| `app/Http/Middleware/CheckSubscription.php`            | Verify user has active subscription          |
| `bootstrap/app.php`                                    | Register middleware (Laravel 11 style)       |
| `routes/api.php`                                       | Assign middleware to routes                  |

### Requirements

1. `VerifyApiKey` — read `X-API-Key` header, look up in `api_keys` table, return `401` if missing or invalid
2. `ForceJsonResponse` — set `Accept: application/json` on request before passing to controller
3. `ApiRequestLogger` — record start time before request, log method + URL + duration after response using `terminate()`
4. `CheckSubscription` — check authenticated user has `subscription_status = active`, return `403` if not
5. Register `VerifyApiKey` and `CheckSubscription` as aliases in `bootstrap/app.php`
6. Append `ForceJsonResponse` and `ApiRequestLogger` to the `api` middleware group
7. Apply `api.key` and `subscription` middleware to the bookings resource route

### Expected Usage

```php
// bootstrap/app.php (Laravel 11)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'api.key'      => VerifyApiKey::class,
        'subscription' => CheckSubscription::class,
    ]);
    $middleware->api(append: [
        ForceJsonResponse::class,
        ApiRequestLogger::class,
    ]);
})

// routes/api.php
Route::middleware(['api.key', 'subscription'])->group(function () {
    Route::apiResource('bookings', BookingController::class);
});
```

### What We're Evaluating

- Before/after middleware patterns
- `terminate()` middleware for post-response logging
- Middleware registration in Laravel 11 (`bootstrap/app.php`)
- Proper HTTP error responses (`401`, `403`)

---

## Problem 02 — Rate Limiting & Throttle (Hard)

### Scenario

Implement custom rate limiting for your API using Laravel's `RateLimiter` — different limits for authenticated vs guest users, per-endpoint limits, and a custom response when throttled.

### Files to Create / Modify

| File                                          | Purpose                                          |
|-----------------------------------------------|--------------------------------------------------|
| `app/Providers/AppServiceProvider.php`        | Configure all rate limiters in `boot()`          |
| `app/Http/Middleware/AddRateLimitHeaders.php` | Attach `X-RateLimit-*` headers to responses |
| `routes/api.php`                              | Apply per-endpoint throttle middleware           |

### Requirements

1. Configure a global `api` rate limiter in `AppServiceProvider`:
   - Authenticated users: `60/min` keyed by user ID
   - Guest users: `10/min` keyed by IP
2. Configure a `booking-create` rate limiter: `5/min` per user/IP
3. Configure a `by-plan` rate limiter: `basic` plan = `30/min`, `pro` plan = `100/min`
4. Apply `throttle:api` to all API routes globally
5. Apply `throttle:booking-create` only to `POST /bookings`
6. Custom throttle response: `429 Too Many Requests` with `Retry-After` header
7. Add `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers to every response

### Expected Usage

```php
// AppServiceProvider::boot()
RateLimiter::for('api', function (Request $request) {
    return $request->user()
        ? Limit::perMinute(60)->by($request->user()->id)
        : Limit::perMinute(10)->by($request->ip());
});

RateLimiter::for('booking-create', function (Request $request) {
    return Limit::perMinute(5)
        ->by($request->user()?->id ?? $request->ip());
});

RateLimiter::for('by-plan', function (Request $request) {
    return match($request->user()?->plan) {
        'pro'   => Limit::perMinute(100)->by($request->user()->id),
        default => Limit::perMinute(30)->by($request->user()?->id ?? $request->ip()),
    };
});

// routes/api.php
Route::post('/bookings', [BookingController::class, 'store'])
    ->middleware('throttle:booking-create');

// Throttled response → 429
// Headers: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining
```

### What We're Evaluating

- `RateLimiter::for()` configuration in `AppServiceProvider`
- Dynamic limits by user authentication and plan
- Custom throttle response with correct headers
- Per-endpoint vs global rate limiting
