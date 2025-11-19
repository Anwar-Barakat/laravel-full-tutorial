# Assignment 08: Implementing Spatie Role & Permissions

## Objective

This assignment focuses on integrating the `spatie/laravel-permission` package into the Product API to implement role-based access control (RBAC). This will secure API endpoints by restricting access based on user roles and permissions.

## Tasks

1.  **Install Spatie Permission Package:**
    *   Ensure the `spatie/laravel-permission` package is installed via Composer.
    *   Publish its migrations and configuration files.
    *   Run migrations to create the necessary `roles` and `permissions` tables.

2.  **Integrate `HasRoles` Trait:**
    *   Add the `Spatie\Permission\Traits\HasRoles` trait to the `App\Models\User.php` model.

3.  **Create `ProductController` with Authorization:**
    *   Copy the `ProductController.php` from `_07_Product_Form_Request_Handling` to this new directory: `app/Http/Controllers/Api/_08_Product_Spatie_Role_Permission`.
    *   Modify each CRUD method (`index`, `store`, `show`, `update`, `destroy`) within the new `ProductController` to include authorization checks using Spatie's `can()` method.
    *   Define the following permissions for products:
        *   `view products`
        *   `create products`
        *   `edit products`
        *   `delete products`
    *   Return a `403 Forbidden` response using `ApiResponseTrait` if a user attempts an action without the required permission.

4.  **Create `RolePermissionSeeder`:**
    *   Create a new Seeder class (e.g., `RolePermissionSeeder.php`) in the `database/seeders` directory.
    *   Within this seeder:
        *   Clear cached permissions.
        *   Create the defined permissions (`view products`, `create products`, `edit products`, `delete products`).
        *   Create two roles: `admin` and `user`.
        *   Assign all product-related permissions to the `admin` role.
        *   Assign only the `view products` permission to the `user` role.
        *   Create a default "Admin User" (`admin@example.com`, password: `password`) and assign the `admin` role.
        *   Create a default "Regular User" (`user@example.com`, password: `password`) and assign the `user` role.

5.  **Update `DatabaseSeeder`:**
    *   Include the `RolePermissionSeeder` in the `DatabaseSeeder.php`'s `run()` method, ensuring it is called early in the seeding process (e.g., before other seeders that might rely on roles/permissions).

## Verification

*   After running `php artisan db:seed`, you should have roles, permissions, and two users (`admin@example.com` and `user@example.com`) set up.
*   Test API endpoints using authentication:
    *   The `admin` user should be able to perform all CRUD operations on products.
    *   The `user` user should only be able to view products (`index`, `show`). Attempts to `store`, `update`, or `delete` should result in a `403 Forbidden` response.
    *   Unauthenticated requests (if allowed) should behave as defined (e.g., public viewing or denied access).
