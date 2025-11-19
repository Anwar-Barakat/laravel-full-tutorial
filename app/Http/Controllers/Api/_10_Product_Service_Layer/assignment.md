# Assignment 10: Introducing a Service Layer for Products

## Objective

This assignment focuses on refactoring the `ProductController` by extracting its business logic into a dedicated `ProductService` layer. This adheres to the "thin controller, fat service" principle, enhancing separation of concerns, improving testability, and making the codebase more modular and maintainable.

## Tasks

1.  **Create `app/Services` Directory:**
    *   If it doesn't already exist, create a new directory `app/Services` to house your application's service classes.

2.  **Create `ProductService.php`:**
    *   Create a new class `ProductService.php` within the `app/Services` directory.
    *   Move all core business logic related to product management (CRUD operations, image handling with Spatie Media Library, tag syncing, database transactions, `QueryBuilder` logic) from the `ProductController` (from `_09_Product_Spatie_Role_Permission_With_Policy` version) into appropriate methods within this `ProductService` (e.g., `getAllProducts`, `createProduct`, `findProductById`, `updateProduct`, `deleteProduct`).
    *   The service methods should operate on `Product` models and should *not* directly handle HTTP requests or responses. They should receive validated data and return model instances or collections.

3.  **Create `ProductController` for Service Layer:**
    *   Copy the `ProductController.php` from `_09_Product_Spatie_Role_Permission_With_Policy` to this new directory: `app/Http/Controllers/Api/_10_Product_Service_Layer`.
    *   Refactor the new `ProductController` to be "thin":
        *   Inject an instance of `ProductService` into its constructor.
        *   Each controller method should primarily delegate its logic to the corresponding `ProductService` method.
        *   Authorization using Policies (`$this->authorize()`) should remain in the controller.
        *   API response handling using `ApiResponseTrait` should remain in the controller.
        *   Form Request validation should remain in the controller.

4.  **Update `routes/api.php`:**
    *   Update `routes/api.php` to use the `ProductController` from this new directory, commenting out the previous `_09` version.

## Verification

*   Ensure all product CRUD operations (with authorization and validation) function correctly.
*   The `ProductController` should now contain minimal logic, mainly handling HTTP request/response flow and authorization, while the `ProductService` contains the bulk of the business logic.
