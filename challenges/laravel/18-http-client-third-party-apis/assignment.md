# Laravel HTTP Client & API Integration

Use Laravel's HTTP Client to consume third-party APIs — retry logic, faking for tests, connection pooling, and error handling.

| Topic        | Details                          |
|--------------|----------------------------------|
| HTTP Client  | Http::get, post, withToken       |
| Retry & Timeout | Automatic retries with backoff|
| Http::fake   | Mock external APIs in tests      |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Third-Party API Service (Medium)

### Scenario

Build a service that integrates with a destinations API and a geocoding API using Laravel's HTTP Client. Handle retries, timeouts, error responses, and test with `Http::fake()`.

### Requirements

1. `DestinationApiService` using `Http::` facade
2. Use `Http::withToken()` for Bearer auth
3. Use `->retry(3, 100)` for automatic retries with backoff
4. Use `->timeout(10)` to prevent hanging requests
5. Handle non-200 responses with `->throw()` or `->failed()`
6. Use `Http::pool()` to fetch multiple endpoints concurrently
7. Add `Http::fake()` tests for the service

### Expected Code

```php
// Service usage
$service = app(DestinationApiService::class);
$destinations = $service->getAll();
$details      = $service->getById(42);

// Concurrent requests with pool
$results = $service->getMultiple([1, 2, 3, 4, 5]);

// In tests
Http::fake([
    'api.destinations.com/*' => Http::response(['data' => [...]], 200),
]);
```

### What We're Evaluating

- `Http` facade usage
- Retry and timeout configuration
- Error handling for API failures
- `Http::fake()` for testing
- Concurrent requests with `Http::pool()`

---

## Problem 02 — Macros & Middleware for HTTP Client (Hard)

### Scenario

Build reusable HTTP Client macros and a middleware that adds consistent behavior across all API integrations — logging, timing, and a simple circuit breaker pattern.

### Requirements

1. Register `Http` macros in `AppServiceProvider` for common API patterns
2. `Http::mamoPay()` macro — pre-configured with base URL + auth from `config/services.php`
3. `Http::stripe()` macro — pre-configured with API version header
4. Add request/response logging middleware via `Http::globalMiddleware()`
5. Track API call timing for performance monitoring
6. Implement a simple circuit breaker using `Cache` — skip calls if API failed 3 times in 1 min
7. Test macros with `Http::fake()`

### Expected Code

```php
// Macros — pre-configured clients
Http::mamoPay()->post('/links', ['amount' => 5000, 'title' => 'Booking #42']);
Http::stripe()->post('/v1/payment_intents', ['amount' => 500000, 'currency' => 'aed']);

// Global middleware logs every outgoing request
// → [API] POST api.mamopay.com/links → 201 (234ms)
// → [API] POST api.stripe.com/v1/payment_intents → 200 (312ms)

// Circuit breaker
// After 3 failures in 60s → throw CircuitOpenException instead of calling API
Cache::get("circuit:mamopay:failures"); // 0, 1, 2 → open at 3
```

### What We're Evaluating

- `Http` macros for reusable pre-configured clients
- `Http::globalMiddleware()` for request/response logging
- Circuit breaker using `Cache`
- Performance timing per API call
- Testing macros with `Http::fake()`
