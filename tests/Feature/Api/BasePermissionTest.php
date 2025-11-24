<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class BasePermissionTest extends BaseProductApiTest
{
    protected function setUp(): void
    {
        parent::setUp();

        // Ensure roles and permissions tables are set up for testing
        // This might need to be run only once, or with RefreshDatabase
        // For testing, Spatie needs to know about the permissions.
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create some default permissions if they don't exist
        Permission::findOrCreate('view products');
        Permission::findOrCreate('create products');
        Permission::findOrCreate('edit products');
        Permission::findOrCreate('delete products');
    }

    protected function createAdminUser(): User
    {
        $user = $this->createAuthenticatedUser(); // Create a regular authenticated user
        $role = Role::findOrCreate('admin');
        $role->givePermissionTo(Permission::all()); // Give admin all permissions
        $user->assignRole($role);
        return $user;
    }

    protected function createUserWithPermission(string $permissionName): User
    {
        $user = $this->createAuthenticatedUser();
        $user->givePermissionTo($permissionName);
        return $user;
    }

    protected function createUserWithoutPermission(string $permissionName): User
    {
        $user = $this->createAuthenticatedUser();
        // Ensure the user does NOT have the specified permission, and potentially other permissions not relevant to the test
        // This implicitly assumes the user is created without the permission if it's not explicitly given.
        return $user;
    }
}
