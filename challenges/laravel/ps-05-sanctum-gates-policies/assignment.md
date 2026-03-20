# Challenge 05 — Sanctum, Gates & Policies

**Format:** BUILD
**Topic:** Implement Sanctum authentication with Gates and Policies
**App:** Tripz — Laravel school booking platform

---

## Context

Tripz exposes a JSON API consumed by a React frontend. Every route needs proper authentication and authorization. Three roles exist in the system:

| Role | Permissions |
|---|---|
| `admin` | Full access to everything |
| `school_admin` | Can create/update bookings for **their own school only** |
| `parent` | Can view **their own bookings only** |
| Unauthenticated | Gets `401` on all protected routes |

---

## Your Task

Build complete authentication and authorization for the Tripz API by completing the starter code below.

### Requirements

1. **Sanctum token-based auth**
   - `POST /api/login` — validate credentials, return `{ token, user }`
   - `POST /api/logout` — revoke the current access token
   - All protected routes use the `auth:sanctum` middleware

2. **User model**
   - Has a `role` column (`admin`, `school_admin`, `parent`)
   - Has a `school_id` foreign key (nullable — only relevant for `school_admin`)

3. **BookingPolicy** — implement all five methods:
   - `viewAny` — any authenticated user can list bookings (filtered at query level elsewhere)
   - `view` — admin sees all; school_admin sees their school's; parent sees their own
   - `create` — admin or school_admin only
   - `update` — admin can update any; school_admin can only update their own school's booking
   - `delete` — admin only

4. **TripPolicy**
   - `create` — admin only
   - `delete` — admin only
   - Any authenticated user can view published trips (no policy check needed — handle at query scope)

5. **AuthServiceProvider**
   - Register both policies so Laravel can auto-authorize via `$this->authorize()`

6. **BookingController**
   - Use `$this->authorize()` before each action
   - Return `403` JSON response (not a redirect) when authorization fails

7. **AuthController**
   - Return `{ token, user }` on successful login
   - Return `401` with a clear message on failure

---

## Starter Code

```php
<?php
// app/Http/Controllers/AuthController.php

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // TODO: validate credentials (email, password required)
        // TODO: check credentials using Auth::attempt()
        // TODO: create and return Sanctum token
        // TODO: return { token, user } JSON response
        // TODO: return 401 on failure
    }

    public function logout(Request $request)
    {
        // TODO: revoke the current access token
        // TODO: return 204 No Content
    }
}
```

```php
<?php
// app/Policies/BookingPolicy.php

class BookingPolicy
{
    public function viewAny(User $user): bool
    {
        // TODO
    }

    public function view(User $user, Booking $booking): bool
    {
        // TODO
    }

    public function create(User $user): bool
    {
        // TODO
    }

    public function update(User $user, Booking $booking): bool
    {
        // TODO
    }

    public function delete(User $user, Booking $booking): bool
    {
        // TODO
    }
}
```

```php
<?php
// app/Policies/TripPolicy.php

class TripPolicy
{
    public function create(User $user): bool
    {
        // TODO
    }

    public function delete(User $user, Trip $trip): bool
    {
        // TODO
    }
}
```

```php
<?php
// app/Providers/AuthServiceProvider.php

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // TODO: register Booking and Trip policies here
    ];

    public function boot(): void
    {
        // TODO: register policies
    }
}
```

```php
<?php
// app/Http/Controllers/BookingController.php

class BookingController extends Controller
{
    public function index()
    {
        // TODO: authorize viewAny, return paginated bookings
    }

    public function show(Booking $booking)
    {
        // TODO: authorize view, return booking resource
    }

    public function store(Request $request)
    {
        // TODO: authorize create, validate, create booking
    }

    public function update(Request $request, Booking $booking)
    {
        // TODO: authorize update, validate, update booking
    }

    public function destroy(Booking $booking)
    {
        // TODO: authorize delete, soft-delete booking
    }
}
```

---

## Expected API Behaviour

```
POST /api/login
Body: { "email": "admin@tripz.com", "password": "secret" }
Response 200: { "token": "1|abc123...", "user": { "id": 1, "name": "Admin", "role": "admin" } }

POST /api/login (wrong password)
Response 401: { "message": "Invalid credentials" }

GET /api/bookings (no token)
Response 401: { "message": "Unauthenticated." }

DELETE /api/bookings/5 (authenticated as parent)
Response 403: { "message": "This action is unauthorized." }

DELETE /api/bookings/5 (authenticated as admin)
Response 200: { "message": "Booking deleted" }

POST /api/trips (authenticated as school_admin)
Response 403: { "message": "This action is unauthorized." }
```

---

## Constraints

- Do **not** use session-based auth — this is a stateless API
- Use `$this->authorize()` in controllers, not manual role checks
- Policies must use type-hinted models, not raw IDs
- The `before()` hook in a policy is allowed for the admin bypass
- Return JSON errors, not redirects (configure `app/Exceptions/Handler.php` if needed)
