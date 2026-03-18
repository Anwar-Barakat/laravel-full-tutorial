# Authentication & API Tokens (Sanctum)

Implement API authentication with Sanctum — token generation, abilities/scopes, and multi-guard setup.

| Topic          | Details                          |
|----------------|----------------------------------|
| Sanctum Tokens | API token auth, abilities        |
| Guards         | Custom guards, multi-auth        |
| User Auth      | Login, register, logout flow     |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Sanctum API Auth System (Medium)

### Scenario

Build a complete API authentication system with Sanctum: registration, login, token generation with abilities, and protected routes.

### Requirements

1. `AuthController` with `register()`, `login()`, `logout()`, `me()`
2. Generate Sanctum tokens with abilities: `['booking:create', 'booking:read']`
3. `CheckTokenAbility` middleware
4. Revoke tokens on logout (current vs all devices)
5. Rate limit login attempts
6. Return user with token in login response

### Expected Code

```php
// POST /api/register  { name, email, password, password_confirmation }
// POST /api/login     { email, password, device_name }
// → { user: {...}, token: "1|abc...", abilities: [...] }

// GET  /api/me               (Authorization: Bearer token)
// POST /api/logout           (revokes current token)
// DELETE /api/logout-all     (revokes all tokens)
```

### What We're Evaluating

- Sanctum token generation
- Token abilities/scopes
- Route protection
- Login rate limiting

---

## Problem 02 — Policies & Gates Authorization (Hard)

### Scenario

Implement authorization using Laravel Policies: who can view, create, update, and delete bookings? Implement role-based AND resource-based authorization.

### Requirements

1. `BookingPolicy` with `viewAny`, `view`, `create`, `update`, `delete`, `restore`
2. Admin can do everything
3. School admin can only manage their school's bookings
4. Regular user can only view their own bookings
5. Use `$this->authorize()` in controllers
6. Register policy in `AuthServiceProvider`
7. Handle `before()` for super-admin bypass
8. Return proper `403` responses with messages

### Expected Code

```php
// In controller
$this->authorize('update', $booking);

// Gate check
Gate::allows('create', Booking::class);

// Policy
$user->can('update', $booking); // true/false

// before() — super-admin bypasses all checks
public function before(User $user, string $ability): bool|null
{
    return $user->role === 'super_admin' ? true : null;
}
```

### What We're Evaluating

- Policy class with all CRUD methods
- Role-based authorization
- Resource ownership checks
- `before()` for admin bypass
- Controller authorization
