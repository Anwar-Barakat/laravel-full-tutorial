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

        // Product Permissions
        $viewProducts = Permission::firstOrCreate(['name' => 'view products']);
        $createProducts = Permission::firstOrCreate(['name' => 'create products']);
        $editProducts = Permission::firstOrCreate(['name' => 'edit products']);
        $deleteProducts = Permission::firstOrCreate(['name' => 'delete products']);

        // Order Permissions
        $viewAnyOrder = Permission::firstOrCreate(['name' => 'view-any-order']);
        $viewOrder = Permission::firstOrCreate(['name' => 'view-order']);
        $createOrder = Permission::firstOrCreate(['name' => 'create-order']);
        $updateOrder = Permission::firstOrCreate(['name' => 'update-order']);
        $deleteOrder = Permission::firstOrCreate(['name' => 'delete-order']);
        $exportOrders = Permission::firstOrCreate(['name' => 'export orders']);
        $importOrders = Permission::firstOrCreate(['name' => 'import orders']);


        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo([
            $viewProducts,
            $createProducts,
            $editProducts,
            $deleteProducts,
            $viewAnyOrder,
            $viewOrder,
            $createOrder,
            $updateOrder,
            $deleteOrder,
            $exportOrders, // Assign export permission
            $importOrders  // Assign import permission
        ]);

        $userRole = Role::firstOrCreate(['name' => 'user']);
        $userRole->givePermissionTo($viewProducts); // Regular users can only view products for now

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
