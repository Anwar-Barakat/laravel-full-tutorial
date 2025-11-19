<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $viewProducts = Permission::firstOrCreate(['name' => 'view products']);
        $createProducts = Permission::firstOrCreate(['name' => 'create products']);
        $editProducts = Permission::firstOrCreate(['name' => 'edit products']);
        $deleteProducts = Permission::firstOrCreate(['name' => 'delete products']);

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo([$viewProducts, $createProducts, $editProducts, $deleteProducts]);

        $userRole = Role::firstOrCreate(['name' => 'user']);
        $userRole->givePermissionTo($viewProducts);

        $adminUser = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password')
            ]
        );
        $adminUser->assignRole($adminRole);

        $regularUser = User::firstOrCreate(
            ['email' => 'user@example.com'],
            [
                'name' => 'Regular User',
                'password' => bcrypt('password')
            ]
        );
        $regularUser->assignRole($userRole);
    }
}
