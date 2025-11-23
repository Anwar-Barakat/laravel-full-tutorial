# Assignment 12: Action Layer with Spatie Data Objects (DTOs)

## Objective

This assignment focuses on adopting a "Controller + Action + DTO" architectural pattern. The business logic, previously residing in the Service Layer, will now be encapsulated within dedicated Laravel Actions. This further refines the Single Responsibility Principle, making controllers even thinner and business operations more explicit, testable, and reusable.

## Tasks

1.  **Create `app/Actions` Directory:**
    *   If it doesn't already exist, create a new directory `app/Actions` to house your Laravel Action classes.

2.  **Create `app/Actions/Product` Directory:**
    *   Create a subdirectory `app/Actions/Product` to organize product-related actions.

3.  **Create Product Actions:**
    *   For each major CRUD operation, create a dedicated Action class within `app/Actions/Product`:
        *   `GetAllProductsAction.php`
        *   `FindProductAction.php`
        *   `CreateProductAction.php`
        *   `UpdateProductAction.php`
        *   `DeleteProductAction.php`
    *   Move the corresponding business logic (data fetching, creation, update, deletion, Spatie Media Library handling, tag syncing, database transactions, `QueryBuilder` logic) from `app/Services/_11_Product_Service_Layer_With_Spatie_DTO/ProductService.php` into the `execute()` method of these new Action classes.
    *   Actions should accept necessary parameters (e.g., `ProductData` DTO, product ID, query parameters) and return model instances or collections.

4.  **Create `ProductController` for Action Layer:**
    *   Copy the `ProductController.php` from `app/Http/Controllers/Api/_11_Product_Service_Layer_With_Spatie_DTO` to this new directory: `app/Http/Controllers/Api/_12_Product_Action_Layer_With_Spatie_DTO`.
    *   Refactor the new `ProductController` to be "ultra-thin":
        *   Inject the appropriate Action(s) directly into the controller methods or constructor.
        *   Each controller method should primarily delegate its logic to the `execute()` method of the injected Action.
        *   Policy authorization (`$this->authorize()`) and API response handling (`ApiResponseTrait`) will remain in the controller.
        *   Spatie Data DTOs (`ProductData`) will continue to handle validation and input.

5.  **Remove `app/Services/_11_Product_Service_Layer_With_Spatie_DTO` Directory:**
    *   Once all logic is moved to Actions, remove the entire `app/Services/_11_Product_Service_Layer_With_Spatie_DTO` directory as it is no longer used by the `_12` implementation.

6.  **Update `routes/api.php`:**
    *   Update `routes/api.php` to use the `ProductController` from this new directory, commenting out the previous `_11` version.

## Verification

*   Ensure all product CRUD operations (with authorization and validation) function correctly.
*   The `ProductController` should now contain minimal logic, mainly handling HTTP request/response flow and authorization, while the Actions encapsulate the business logic.
*   Confirm that validation errors are returned correctly via the `ProductData` object and that file uploads/deletions are handled as expected.
