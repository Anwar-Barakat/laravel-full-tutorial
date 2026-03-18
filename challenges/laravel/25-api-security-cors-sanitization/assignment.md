# API Security Best Practices

Harden your Laravel API against common attack vectors — CORS, input sanitization, mass assignment, enumeration, and security headers.

| Topic          | Details                                    |
|----------------|--------------------------------------------|
| CORS           | Cross-origin policy configuration          |
| Sanitization   | XSS prevention, input cleaning             |
| Security       | Headers, rate limiting, enumeration guards |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Input Sanitization & CORS (Medium)

### Scenario

Harden the booking API against XSS, mass assignment, and cross-origin attacks. Configure CORS properly and sanitize all user input before it reaches the database.

### Requirements

1. Configure CORS in `config/cors.php` — allow only known frontend origins, disallow `*` in production
2. `SanitizeInputMiddleware` — strip HTML tags from all string inputs using `strip_tags()` before validation runs
3. Protect against mass assignment: verify `$fillable` on all models — `$guarded = []` is forbidden
4. Add `$hidden` to `User` model — ensure `password`, `remember_token` never appear in API responses
5. Prevent user enumeration in login: return identical response for wrong email AND wrong password
6. Consistent timing on auth endpoints: use `Hash::check()` even when user not found (prevent timing attacks)
7. Never expose internal IDs in public endpoints — use `uuid` or `ulid` as the public identifier

### Expected Code

```php
// CORS — restrict to known origins
'allowed_origins' => [
    env('FRONTEND_URL', 'https://app.tripz.ae'),
],

// Sanitize middleware
class SanitizeInputMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $input = array_map(fn($v) => is_string($v) ? strip_tags(trim($v)) : $v, $request->all());
        $request->merge($input);
        return $next($request);
    }
}

// Prevent enumeration — identical response for wrong email OR wrong password
if (!$user || !Hash::check($request->password, $user->password ?? Hash::make('dummy'))) {
    throw ValidationException::withMessages(['email' => ['These credentials do not match our records.']]);
}

// Hide sensitive fields
protected $hidden = ['password', 'remember_token', 'two_factor_secret'];
```

### What We're Evaluating

- CORS origin whitelisting
- Input sanitization middleware
- Mass assignment protection
- Enumeration prevention with constant-time response
- `$hidden` on sensitive model attributes

---

## Problem 02 — Security Headers, HMAC Webhooks & Audit Logging (Hard)

### Scenario

Add production-grade security: inject security headers on every response, verify incoming webhook signatures using HMAC, log all security events, and implement IP-based blocking for repeated failed attempts.

### Requirements

1. `SecurityHeadersMiddleware` — add `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy` to every response
2. `VerifyWebhookSignature` middleware — validate `X-Signature-256` HMAC-SHA256 header for incoming webhooks (Stripe-style)
3. `SecurityAuditLog` — log every failed login, unauthorized access `403`, and token revocation with IP, user agent, timestamp
4. IP blocking: after 5 failed logins from same IP in 10 minutes, block IP for 30 minutes using `Cache`
5. Sanitize error responses — never expose stack traces, file paths, or SQL errors to API consumers in production
6. Add `Sec-Fetch-*` header checks to reject non-browser requests on web-only routes
7. Test that security headers are present on every response

### Expected Code

```php
// Security headers middleware
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
$response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
$response->headers->set('Content-Security-Policy', "default-src 'self'");

// HMAC webhook verification
$signature = 'sha256=' . hash_hmac('sha256', $request->getContent(), config('services.webhook_secret'));
if (!hash_equals($signature, $request->header('X-Signature-256'))) {
    abort(401, 'Invalid webhook signature.');
}

// IP blocking after repeated failures
$key = "login_failures:{$request->ip()}";
$failures = Cache::increment($key);
Cache::expire($key, 600); // 10 min window
if ($failures >= 5) {
    Cache::put("ip_blocked:{$request->ip()}", true, 1800); // block 30 min
    abort(429, 'Too many failed attempts. Try again later.');
}

// Sanitized error handler — no stack traces in production
if (!config('app.debug')) {
    return response()->json(['error' => ['code' => 'SERVER_ERROR', 'message' => 'An unexpected error occurred.']], 500);
}
```

### What We're Evaluating

- Security response headers
- HMAC signature verification (`hash_equals` for timing-safe compare)
- IP-based brute force blocking with `Cache`
- `SecurityAuditLog` for failed auth events
- Production error response sanitization (no leaking internals)
- Testing headers presence on responses
