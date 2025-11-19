# Assignment 11: Service Layer with Spatie Data Objects (DTOs)

## Objective

This assignment focuses on integrating `spatie/laravel-data` objects (DTOs) into the service layer to streamline data transfer and validation. This approach centralizes validation logic within DTOs, simplifies controller and service method signatures, and improves type safety and readability.

## Tasks

1.  **Create `app/Data` Directory:**
    *   If it doesn't already exist, create a new directory `app/Data` to house your Spatie Data Objects.

2.  **Create `ProductData.php`:**
    *   Create a new Spatie Data Object named `ProductData.php` within the `app/Data` directory.
    *   This DTO will serve as a single source for product creation and update data.
    *   Define properties for all relevant product attributes, including: `name`, `description`, `price`, `category_id`, and `tags`.
    *   For file uploads, leverage Spatie Data's file handling capabilities by defining properties as `File` objects for `image`, `main_image`, and `gallery_images` (array of `File` objects).
    *   Include a property for `delete_gallery_images` (array of `int`).
    *   Implement validation rules directly within the `ProductData` class using Spatie Data's `rules()` method. These rules will replace the validation logic currently in `StoreProductRequest` and `UpdateProductRequest`.

3.  **Modify `ProductServiceV11.php`:**
    *   Create a new service class, `ProductServiceV11.php`, by copying and adapting `app/Services/ProductService.php`.
    *   Adjust the `createProduct` and `updateProduct` method signatures to accept an instance of `ProductData` as their primary data argument, instead of raw arrays and `UploadedFile` instances.
    *   Modify the method implementations to extract data and files directly from the `ProductData` object.

4.  **Create `ProductController` for Spatie Data:**
    *   Copy the `ProductController.php` from `_09_Product_Spatie_Role_Permission_With_Policy` (or `_10_Product_Service_Layer`, but use `_09` for base policy for now to avoid re-implementing service injection as a new feature) to this new directory: `app/Http/Controllers/Api/_11_Product_Service_Spatie_Data`.
    *   Inject `ProductServiceV11` into its constructor.
    *   Replace `StoreProductRequest` and `UpdateProductRequest` type-hints in the `store` and `update` methods with the new `ProductData` DTO. Spatie Data will automatically handle the request data parsing and validation.
    *   Pass the `ProductData` object directly to the `ProductServiceV11` methods.
    *   Authorization (`$this->authorize()`) and API response handling (`ApiResponseTrait`) will remain in the controller.

5.  **Update `routes/api.php`:**
    *   Update `routes/api.php` to use the `ProductController` from this new `_11` directory, commenting out the previous `_10` version.

## Verification

*   Ensure all product CRUD operations (with authorization and validation) function correctly.
*   Verify that validation errors are returned correctly via the `ProductData` object.
*   Confirm that file uploads and deletions are handled as expected through the DTO.
