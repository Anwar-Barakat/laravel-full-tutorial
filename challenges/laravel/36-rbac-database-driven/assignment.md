# Complete RBAC System — Database-Driven

Build a fully dynamic RBAC system backed by database tables: roles, permissions, pivots, gates registered from DB at boot, a `CheckPermission` middleware, permission caching, and a full admin API to manage roles/permissions at runtime.

| Topic              | Details                                                        |
|--------------------|----------------------------------------------------------------|
| Schema & Models    | roles, permissions, role_permission, role_user pivot tables    |
| Dynamic Gates      | Gate::define() in a loop from Permission::all() at boot        |
| Admin API          | CRUD roles, sync permissions, permission matrix, last-admin guard |

> **vs TEST_31:** TEST_31 uses a PHP enum with hardcoded permission lists. This test uses database tables so permissions can be managed without a code deploy.

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Database-Driven RBAC (Medium)

### Scenario

Build the data layer and authorization layer for Tripz RBAC: four tables, `Role`/`Permission` models, a `HasRoles` trait on `User`, gates registered dynamically from the database at boot, and a `CheckPermission` middleware consumable as `middleware('permission:booking.create')`.

### Requirements

1. Migrations — `roles`, `permissions` (with `group` column), `role_permission`, `role_user` pivot tables
2. `Role` + `Permission` Eloquent models with `belongsToMany` relationships between each other and `User`
3. `HasRoles` trait on `User` — `roles()` relation, `hasRole()`, `hasPermission()` (cached per user), `assignRole()`, `removeRole()`
4. `hasPermission()` uses `Cache::remember("user:{id}:permissions", ...)` — flattens all role permissions into one unique array
5. `AppServiceProvider::boot()` — `Gate::before()` for admin bypass; loop `Permission::all()` to register each as a `Gate::define()`; wrap in `try/catch` to survive migrations not yet run
6. `CheckPermission` middleware — `middleware('permission:booking.create')` syntax; 403 if user lacks the permission
7. `RoleSeeder` — seeds `admin`, `school_admin`, `teacher`, `parent` roles with their permission sets

### Expected Code

```php
// database/migrations/create_rbac_tables.php
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();        // 'admin', 'school_admin'
    $table->string('display_name');
    $table->timestamps();
});

Schema::create('permissions', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();        // 'booking.create', 'booking.delete'
    $table->string('display_name');
    $table->string('group')->default('general'); // 'bookings', 'schools', 'reports'
    $table->timestamps();
});

Schema::create('role_permission', function (Blueprint $table) {
    $table->foreignId('role_id')->constrained()->cascadeOnDelete();
    $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
    $table->primary(['role_id', 'permission_id']);
});

Schema::create('role_user', function (Blueprint $table) {
    $table->foreignId('role_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->primary(['role_id', 'user_id']);
});
```

```php
// app/Traits/HasRoles.php
trait HasRoles
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->roles->pluck('name')->contains($role);
    }

    public function hasPermission(string $permission): bool
    {
        $permissions = Cache::remember(
            "user:{$this->id}:permissions",
            now()->addMinutes(15),
            fn() => $this->roles()
                ->with('permissions:id,name')
                ->get()
                ->flatMap->permissions
                ->pluck('name')
                ->unique()
                ->all()
        );

        return in_array($permission, $permissions);
    }

    public function assignRole(string|Role $role): void
    {
        $role = is_string($role) ? Role::where('name', $role)->firstOrFail() : $role;
        $this->roles()->syncWithoutDetaching([$role->id]);
        Cache::forget("user:{$this->id}:permissions");
    }

    public function removeRole(string|Role $role): void
    {
        $role = is_string($role) ? Role::where('name', $role)->firstOrFail() : $role;
        $this->roles()->detach($role);
        Cache::forget("user:{$this->id}:permissions");
    }
}
```

```php
// app/Providers/AppServiceProvider.php  (boot — dynamic gate registration)
public function boot(): void
{
    // Super admin bypasses all gates
    Gate::before(fn(User $user) => $user->hasRole('admin') ? true : null);

    // Register every permission row as a Gate — dynamic at runtime
    try {
        Permission::all()->each(function (Permission $permission) {
            Gate::define($permission->name, fn(User $user) =>
                $user->hasPermission($permission->name)
            );
        });
    } catch (\Exception) {
        // Silently skip if DB/table not ready (e.g. during migration)
    }
}
```

```php
// app/Http/Middleware/CheckPermission.php
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (!$request->user()?->can($permission)) {
            abort(403, "Missing permission: {$permission}");
        }

        return $next($request);
    }
}

// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['permission' => CheckPermission::class]);
})

// routes/api.php
Route::middleware(['auth:sanctum', 'permission:booking.create'])->group(function () {
    Route::post('bookings', [BookingController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'permission:booking.delete'])->group(function () {
    Route::delete('bookings/{booking}', [BookingController::class, 'destroy']);
});
```

```php
// database/seeders/RoleSeeder.php
public function run(): void
{
    $permissions = [
        // bookings group
        ['name' => 'booking.view',   'display_name' => 'View Bookings',   'group' => 'bookings'],
        ['name' => 'booking.create', 'display_name' => 'Create Bookings', 'group' => 'bookings'],
        ['name' => 'booking.edit',   'display_name' => 'Edit Bookings',   'group' => 'bookings'],
        ['name' => 'booking.delete', 'display_name' => 'Delete Bookings', 'group' => 'bookings'],
        // reports group
        ['name' => 'report.view',    'display_name' => 'View Reports',    'group' => 'reports'],
    ];

    foreach ($permissions as $p) {
        Permission::firstOrCreate(['name' => $p['name']], $p);
    }

    $roles = [
        'admin'        => Permission::pluck('name')->all(),
        'school_admin' => ['booking.view', 'booking.create', 'booking.edit', 'report.view'],
        'teacher'      => ['booking.view', 'booking.create'],
        'parent'       => ['booking.view'],
    ];

    foreach ($roles as $roleName => $permNames) {
        $role = Role::firstOrCreate(['name' => $roleName], ['display_name' => ucfirst(str_replace('_', ' ', $roleName))]);
        $role->permissions()->sync(
            Permission::whereIn('name', $permNames)->pluck('id')
        );
    }
}
```

### What We're Evaluating

- Four-table RBAC schema with composite primary keys on pivot tables
- `flatMap->permissions` — flatten nested collection in one chain
- `Cache::remember()` with `syncWithoutDetaching()` + `Cache::forget()` pair
- `Permission::all()` loop at boot — gates are dynamic, not hardcoded
- `try/catch` guard in `boot()` — app stays bootable before migrations run
- `middleware('permission:booking.create')` — colon-separated argument syntax

---

## Problem 02 — Permission Management API (Hard)

### Scenario

Build the admin API for managing roles and permissions at runtime: create roles with permission assignments, sync/revoke permissions, assign roles to users, return a permission matrix, and protect against removing the last admin.

### Requirements

1. `POST /api/admin/roles` — create role + optionally assign permissions in one request (wrapped in `DB::transaction()`)
2. `PUT /api/admin/roles/{role}/permissions` — `sync()` permissions array to a role; flush cache for all affected users
3. `POST /api/admin/users/{user}/roles` — `syncWithoutDetaching()` roles to user; flush user's permission cache
4. `DELETE /api/admin/users/{user}/roles/{role}` — remove role; block if it would leave zero admins
5. `GET /api/admin/permission-matrix` — return grid of `role × permission` booleans
6. `AuditLog` entry on every role/permission change: `actor_id`, `action`, `target_type`, `target_id`, `changes`
7. Feature tests: sync permissions → cache flushed; remove last admin → 422; matrix shape correct

### Expected Code

```php
// app/Http/Controllers/Admin/RoleController.php
public function store(StoreRoleRequest $request): JsonResponse
{
    $role = DB::transaction(function () use ($request) {
        $role = Role::create($request->only('name', 'display_name'));

        if ($request->has('permissions')) {
            $role->permissions()->sync($request->input('permissions'));
        }

        AuditLog::record(
            action:     'role.created',
            target:     $role,
            changes:    $role->toArray(),
        );

        return $role;
    });

    return RoleResource::make($role->load('permissions'))
        ->response()
        ->setStatusCode(201);
}

public function syncPermissions(SyncPermissionsRequest $request, Role $role): JsonResponse
{
    $before = $role->permissions->pluck('name')->all();

    $role->permissions()->sync($request->validated('permissions'));

    // Flush cache for every user who has this role
    $role->users()->each(fn($user) => Cache::forget("user:{$user->id}:permissions"));

    AuditLog::record(
        action:  'role.permissions.synced',
        target:  $role,
        changes: ['before' => $before, 'after' => $request->validated('permissions')],
    );

    return response()->json(['message' => 'Permissions updated.']);
}
```

```php
// app/Http/Controllers/Admin/UserRoleController.php
public function destroy(User $user, Role $role): JsonResponse
{
    // Last-admin protection
    if ($role->name === 'admin') {
        $remainingAdmins = $role->users()->where('users.id', '!=', $user->id)->count();

        if ($remainingAdmins === 0) {
            return response()->json(
                ['message' => 'Cannot remove the last admin from the system.'],
                422
            );
        }
    }

    $user->roles()->detach($role);
    Cache::forget("user:{$user->id}:permissions");

    AuditLog::record(action: 'user.role.removed', target: $user, changes: ['role' => $role->name]);

    return response()->noContent();
}
```

```php
// app/Http/Controllers/Admin/PermissionMatrixController.php
public function index(): JsonResponse
{
    $roles       = Role::with('permissions:id,name')->get();
    $permissions = Permission::orderBy('group')->orderBy('name')->get();

    $matrix = $roles->map(fn($role) => [
        'role'        => $role->name,
        'permissions' => $permissions->mapWithKeys(fn($perm) => [
            $perm->name => $role->permissions->contains('id', $perm->id),
        ]),
    ]);

    return response()->json([
        'roles'       => $roles->pluck('name'),
        'permissions' => $permissions->pluck('name'),
        'matrix'      => $matrix,
    ]);
}
```

```php
// tests/Feature/RbacAdminTest.php
public function test_sync_permissions_flushes_user_cache(): void
{
    $admin = User::factory()->create();
    $role  = Role::factory()->create(['name' => 'school_admin']);
    $admin->assignRole($role->name);

    $admin->hasPermission('booking.create'); // warm cache

    $perm = Permission::factory()->create(['name' => 'booking.create']);
    $this->actingAs(User::factory()->admin()->create(), 'sanctum')
        ->putJson(route('admin.roles.permissions', $role), [
            'permissions' => [$perm->id],
        ])
        ->assertOk();

    // Cache must have been flushed — fresh DB check
    $this->assertTrue($admin->fresh()->hasPermission('booking.create'));
}

public function test_cannot_remove_last_admin(): void
{
    $admin    = User::factory()->admin()->create(); // only admin
    $adminRole = Role::where('name', 'admin')->first();

    $this->actingAs(User::factory()->admin()->create(), 'sanctum')
        ->deleteJson(route('admin.users.roles.destroy', [$admin, $adminRole]))
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Cannot remove the last admin from the system.');
}

public function test_permission_matrix_returns_correct_shape(): void
{
    $this->actingAs(User::factory()->admin()->create(), 'sanctum')
        ->getJson(route('admin.permission-matrix'))
        ->assertOk()
        ->assertJsonStructure([
            'roles',
            'permissions',
            'matrix' => [['role', 'permissions']],
        ]);
}

public function test_gate_registered_from_database_permission(): void
{
    $perm = Permission::factory()->create(['name' => 'booking.view']);
    $role = Role::factory()->create();
    $role->permissions()->attach($perm);

    $user = User::factory()->create();
    $user->assignRole($role->name);

    // Re-register gates (simulates fresh request)
    app(\App\Providers\AppServiceProvider::class)->boot();

    $this->assertTrue($user->can('booking.view'));
}
```

### What We're Evaluating

- `DB::transaction()` wrapping role creation + permission sync
- `->sync()` vs `->syncWithoutDetaching()` — full replace vs additive
- Cache flush propagated to **all users** with the modified role
- Last-admin guard using a count query with exclusion
- Permission matrix using `->contains('id', $perm->id)` on loaded collection
- `AuditLog` on every mutation for compliance trail
- Gate registration test: attach permission in DB → `$user->can()` returns true
