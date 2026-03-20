# Challenge 06 — Auth Middleware Debug

**Format:** DEBUG
**Topic:** Find and fix broken authentication middleware
**App:** Tripz — Laravel school booking platform

---

## Context

The Tripz API has been deployed and users are filing bug reports:

- **Bug report A:** "I can access `/admin/dashboard` without logging in"
- **Bug report B:** "I'm logged in as a school_admin but I keep getting `401 Unauthorized` when I try to POST a booking"
- **Bug report C:** "I can log in with any random string as my password as long as my email exists"
- **Bug report D:** "The app crashes with a 500 error when I try to log in with an email that doesn't exist"

Your job is to audit the entire authentication and middleware setup, identify **at minimum 6 bugs**, and describe the correct fix for each one.

---

## Broken Code

```php
<?php
// app/Http/Middleware/CheckRole.php

class CheckRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        if (Auth::user()->role = $role) {
            return $next($request);
        }

        return response()->json(['error' => 'Forbidden'], 401);
    }
}
```

```php
<?php
// routes/api.php

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/admin/dashboard', [AdminController::class, 'index'])
        ->middleware('role:admin');
    Route::get('/bookings', [BookingController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'role:school_admin'])->group(function () {
    Route::post('/bookings', [BookingController::class, 'store']);
});
```

```php
<?php
// app/Http/Controllers/AuthController.php

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $user = User::where('email', $request->email)->first();

        if ($user->password === $request->password) {
            return response()->json([
                'token' => $user->createToken('api')->plainTextToken
            ]);
        }

        return response()->json(['error' => 'Invalid credentials'], 401);
    }
}
```

```php
<?php
// bootstrap/app.php  (or app/Http/Kernel.php depending on Laravel version)
// No middleware alias registered for 'role'
```

---

## Your Task

1. List every bug you find — there are at least 6. For each bug, state:
   - Where it is (file + line context)
   - What the bug is
   - What symptom it causes
   - How to fix it

2. Write the corrected version of each broken piece.

3. Are there any security vulnerabilities (not just functional bugs)? List those separately.

---

## Hint Grid

Use this grid to guide your analysis — each row represents a category of possible bugs:

| Category | Question to ask |
|---|---|
| Operator errors | Is the correct operator used in conditionals? |
| Null safety | What happens if a query returns null? |
| Password handling | Is the password being compared securely? |
| HTTP status codes | Are the correct codes used for each error type? |
| Middleware registration | Is every custom middleware registered and aliased? |
| Middleware ordering | Does middleware run in the correct sequence? |

---

## Expected Behaviour After Fix

```
POST /api/login
Body: { "email": "admin@tripz.com", "password": "wrongpassword" }
Response 401: { "error": "Invalid credentials" }

POST /api/login
Body: { "email": "nobody@tripz.com", "password": "anything" }
Response 401: { "error": "Invalid credentials" }    ← no 500 crash

GET /api/admin/dashboard  (no token)
Response 401: { "message": "Unauthenticated." }    ← Sanctum handles this

GET /api/admin/dashboard  (valid token, role = parent)
Response 403: { "error": "Forbidden" }             ← correct status code

POST /api/bookings  (valid token, role = school_admin)
Response 201: { ... booking data ... }             ← reaches controller

POST /api/bookings  (valid token, role = parent)
Response 403: { "error": "Forbidden" }
```

---

## Constraints

- Do not replace custom middleware with policy-based authorization — the `CheckRole` middleware should remain as a middleware solution
- Fix only what is broken — do not refactor unrelated code
- The fix for password comparison must use Laravel's built-in hashing helper
