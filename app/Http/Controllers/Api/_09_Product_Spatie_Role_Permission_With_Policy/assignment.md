# Assignment 09: Spatie Role & Permissions with Policies

## Objective

This assignment focuses on refactoring the authorization logic from direct `Auth::user()->can()` checks in the `ProductController` into Laravel Authorization Policies. This approach provides a cleaner, more organized, and scalable way to manage permissions, aligning with Laravel's best practices.

## Tasks

1.  **Create `ProductPolicy`:**
    *   Generate a new Policy class for the `App\Models\Product` model (e.g., `php artisan make:policy ProductPolicy --model=Product`).
    *   Define methods within `ProductPolicy` corresponding to the CRUD operations: `viewAny`, `view`, `create`, `update`, `delete`.
    *   Inside each policy method, implement the authorization logic using the `Spatie\Permission` package's `can()` method on the `$user` object. For example, `return $user->can('view products');`.

2.  **Register `ProductPolicy`:**
    *   Register the `ProductPolicy` in `App\Providers\AuthServiceProvider.php` by mapping the `App\Models\Product` model to its `ProductPolicy`.

3.  **Create `ProductController` for Service Layer:**
    *   Copy the `ProductController.php` from `_08_Product_Spatie_Role_Permission` to this new directory: `app/Http/Controllers/Api/_09_Product_Spatie_Role_Permission_With_Policy`.
    *   Refactor the controller methods to use Laravel's authorization features (e.g., `$this->authorize()` helper or `Gate::authorize()`).
    *   For methods dealing with a specific `Product` instance (`view`, `update`, `delete`), pass the `Product` model to the `authorize` call (e.g., `$this->authorize('update', $product)`).
    *   For methods that don't operate on a specific instance (e.g., `viewAny`, `create`), call `authorize` with only the permission name (e.g., `$this->authorize('create', Product::class)`).
    *   Remove the manual `Auth::check()` and `Auth::user()->can()` checks.

4.  **Define API Routes:**
    *   Update `routes/api.php` to use the `ProductController` from this new directory, commenting out the previous `_08` version.

## Verification

*   Ensure all authorization checks function correctly through the new Policy system.
*   The `admin` user should still have full CRUD access.
*   The `user` user should only have `viewAny` and `view` access.
*   Unauthorized actions should result in `403 Forbidden` responses.
