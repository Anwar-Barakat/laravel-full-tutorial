# Role-Based Access Control (RBAC)

Build a custom RBAC system for Tripz — roles as enums, permission gates, scoped policies, role middleware, and caching — without reaching for a third-party package.

| Topic            | Details                                                       |
|------------------|---------------------------------------------------------------|
| Roles & Enum     | UserRole enum, hasRole(), hasAnyRole() on User model          |
| Gates & Policies | Gate::before() super-admin, Gate::define(), BookingPolicy     |
| Middleware & Cache | RequireRole middleware, permission caching per user          |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Custom RBAC: Roles, Gates & Policies (Medium)

### Scenario

Tripz has four roles: `super_admin`, `school_admin`, `teacher`, `student`. Build a custom RBAC layer: a `UserRole` enum that carries permission lists, a `HasRoles` trait on `User`, `Gate::before()` for super-admin bypass, a scoped `BookingPolicy`, and a `RequireRole` middleware used in routes.

### Requirements

1. `UserRole` enum — four cases (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`), with a `permissions()` method returning an array of ability strings per role
2. `HasRoles` trait — `hasRole()`, `hasAnyRole()`, `hasPermission()` methods on `User`
3. `AppServiceProvider::boot()` — `Gate::before()` returns `true` for super admin (bypasses all gates); `Gate::define()` for `view-bookings`, `create-bookings`, `manage-schools`
4. Scoped gate `manage-booking` — school admin can manage only bookings belonging to their own school
5. `BookingPolicy` — `before()` for super admin bypass; `view()`, `create()`, `update()`, `delete()` each checking role + school scope
6. `RequireRole` middleware — rejects with 403 if user lacks any of the listed roles; registered as alias `role`
7. Routes use `middleware('role:school_admin,super_admin')` to guard booking mutation endpoints

### Expected Code

```php
// app/Enums/UserRole.php
enum UserRole: string
{
    case SUPER_ADMIN  = 'super_admin';
    case SCHOOL_ADMIN = 'school_admin';
    case TEACHER      = 'teacher';
    case STUDENT      = 'student';

    public function label(): string
    {
        return match($this) {
            self::SUPER_ADMIN  => 'Super Admin',
            self::SCHOOL_ADMIN => 'School Admin',
            self::TEACHER      => 'Teacher',
            self::STUDENT      => 'Student',
        };
    }

    public function permissions(): array
    {
        return match($this) {
            self::SUPER_ADMIN  => ['view-bookings', 'create-bookings', 'edit-bookings', 'delete-bookings', 'manage-schools', 'view-reports'],
            self::SCHOOL_ADMIN => ['view-bookings', 'create-bookings', 'edit-bookings', 'view-reports'],
            self::TEACHER      => ['view-bookings', 'create-bookings'],
            self::STUDENT      => ['view-bookings'],
        };
    }
}
```

```php
// app/Traits/HasRoles.php
trait HasRoles
{
    public function hasRole(UserRole|string $role): bool
    {
        $value = $role instanceof UserRole ? $role->value : $role;
        return $this->role === $value;
    }

    public function hasAnyRole(array $roles): bool
    {
        $values = array_map(fn($r) => $r instanceof UserRole ? $r->value : $r, $roles);
        return in_array($this->role, $values);
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, UserRole::from($this->role)->permissions());
    }
}
```

```php
// app/Providers/AppServiceProvider.php  (gates in boot())
Gate::before(fn(User $user) => $user->hasRole(UserRole::SUPER_ADMIN) ? true : null);

Gate::define('view-bookings',   fn(User $u) => $u->hasPermission('view-bookings'));
Gate::define('create-bookings', fn(User $u) => $u->hasPermission('create-bookings'));
Gate::define('manage-schools',  fn(User $u) => $u->hasRole(UserRole::SUPER_ADMIN));

// Scoped: school admin may only manage their own school's bookings
Gate::define('manage-booking', fn(User $u, Booking $b) =>
    $u->hasRole(UserRole::SCHOOL_ADMIN) && $u->school_id === $b->school_id
);
```

```php
// app/Policies/BookingPolicy.php
class BookingPolicy
{
    public function before(User $user): ?bool
    {
        return $user->hasRole(UserRole::SUPER_ADMIN) ? true : null;
    }

    public function viewAny(User $user): bool       { return $user->hasPermission('view-bookings'); }
    public function view(User $user, Booking $b): bool  { return $user->school_id === $b->school_id; }
    public function create(User $user): bool        { return $user->hasPermission('create-bookings'); }
    public function update(User $user, Booking $b): bool
    {
        return $user->hasPermission('edit-bookings') && $user->school_id === $b->school_id;
    }
    public function delete(User $user, Booking $b): bool { return false; } // super_admin via before()
}
```

```php
// app/Http/Middleware/RequireRole.php
class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()?->hasAnyRole($roles)) {
            abort(403, 'Insufficient permissions.');
        }

        return $next($request);
    }
}

// bootstrap/app.php  (register alias)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['role' => RequireRole::class]);
})

// routes/api.php
Route::middleware(['auth:sanctum', 'role:school_admin,super_admin'])->group(function () {
    Route::post('bookings', [BookingController::class, 'store']);
    Route::put('bookings/{booking}', [BookingController::class, 'update']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('bookings', [BookingController::class, 'index']); // all roles
});
```

### What We're Evaluating

- `UserRole` enum with `permissions()` — centralised permission lists per role
- `HasRoles` trait — `hasRole()`, `hasAnyRole()`, `hasPermission()` on `User`
- `Gate::before()` returning `true` for super admin (null = fall through to next check)
- Scoped `Gate::define('manage-booking', fn($u, $b) => ...)` — model-level check
- `BookingPolicy::before()` for super admin bypass at the policy level
- `RequireRole` middleware with variadic `...$roles` for multi-role routes

---

## Problem 02 — Permission Caching, Audit Log & Feature Tests (Hard)

### Scenario

Cache permissions per user in Redis (flush on role change), add an audit log every time a role is assigned, and write feature tests that verify each role's boundaries — school admin cannot see another school's bookings, teacher cannot delete, super admin bypasses everything.

### Requirements

1. `HasRoles::hasPermission()` — wrap in `Cache::remember("user:{id}:permissions", ...)` so permissions are not recalculated on every request
2. `User::assignRole(UserRole $role)` — updates the `role` column and calls `Cache::forget("user:{id}:permissions")` to invalidate
3. `RoleAssignedEvent` + `LogRoleAssignment` listener — writes to `audit_logs` table: `user_id`, `assigned_by`, `old_role`, `new_role`, `ip`, `timestamp`
4. Feature test: school admin GET `/bookings/{booking}` for another school's booking → 403
5. Feature test: teacher DELETE `/bookings/{id}` → 403
6. Feature test: super admin DELETE `/bookings/{id}` → 204 (Gate::before bypass works)
7. Feature test: second call to `hasPermission()` hits cache — assert DB query count drops to 0 after warm

### Expected Code

```php
// app/Traits/HasRoles.php  (cached permission check)
public function hasPermission(string $permission): bool
{
    $permissions = Cache::remember(
        "user:{$this->id}:permissions",
        now()->addMinutes(15),
        fn() => UserRole::from($this->role)->permissions()
    );

    return in_array($permission, $permissions);
}

public function assignRole(UserRole $role): void
{
    $old = $this->role;

    $this->update(['role' => $role->value]);
    Cache::forget("user:{$this->id}:permissions");

    event(new RoleAssigned($this, UserRole::from($old), $role));
}
```

```php
// app/Events/RoleAssigned.php
class RoleAssigned
{
    public function __construct(
        public readonly User     $user,
        public readonly UserRole $oldRole,
        public readonly UserRole $newRole,
    ) {}
}

// app/Listeners/LogRoleAssignment.php
class LogRoleAssignment implements ShouldQueue
{
    public function handle(RoleAssigned $event): void
    {
        AuditLog::create([
            'user_id'     => $event->user->id,
            'assigned_by' => auth()->id(),
            'old_role'    => $event->oldRole->value,
            'new_role'    => $event->newRole->value,
            'ip'          => request()->ip(),
        ]);

        Log::info('Role assigned', [
            'user'     => $event->user->email,
            'old_role' => $event->oldRole->value,
            'new_role' => $event->newRole->value,
        ]);
    }
}
```

```php
// tests/Feature/RbacTest.php
public function test_school_admin_cannot_view_another_schools_booking(): void
{
    $school1 = School::factory()->create();
    $school2 = School::factory()->create();
    $admin   = User::factory()->schoolAdmin()->for($school1)->create();
    $booking = Booking::factory()->for($school2)->create();

    $this->actingAs($admin)
        ->getJson(route('api.bookings.show', $booking))
        ->assertForbidden();
}

public function test_teacher_cannot_delete_bookings(): void
{
    $teacher = User::factory()->teacher()->create();
    $booking = Booking::factory()->for($teacher->school)->create();

    $this->actingAs($teacher)
        ->deleteJson(route('api.bookings.destroy', $booking))
        ->assertForbidden();
}

public function test_super_admin_can_delete_any_booking(): void
{
    $superAdmin = User::factory()->superAdmin()->create();
    $booking    = Booking::factory()->create();

    $this->actingAs($superAdmin)
        ->deleteJson(route('api.bookings.destroy', $booking))
        ->assertNoContent();

    $this->assertSoftDeleted('bookings', ['id' => $booking->id]);
}

public function test_permission_check_is_served_from_cache_on_second_call(): void
{
    $user = User::factory()->teacher()->create();

    $user->hasPermission('view-bookings'); // warms cache

    DB::enableQueryLog();
    $user->hasPermission('create-bookings'); // must hit cache — no DB query
    $queries = DB::getQueryLog();

    $this->assertCount(0, $queries, 'Permission check should be cached');
}

public function test_assign_role_flushes_permission_cache(): void
{
    $user = User::factory()->teacher()->create();
    $user->hasPermission('create-bookings'); // warms cache

    $user->assignRole(UserRole::SCHOOL_ADMIN); // flushes cache

    // After role change, school admin can edit bookings
    $this->assertTrue($user->fresh()->hasPermission('edit-bookings'));
}
```

### What We're Evaluating

- `Cache::remember()` keyed per user for permission resolution (no DB on repeat checks)
- `Cache::forget()` in `assignRole()` — cache must be invalidated on role change
- `RoleAssigned` event + queued `LogRoleAssignment` listener for audit trail
- Policy `before()` + `Gate::before()` — super admin bypass at both layers
- Role-scoped feature tests: per-school isolation, role boundaries, bypass confirmation
- Factory states (`->schoolAdmin()`, `->teacher()`, `->superAdmin()`) for readable tests
