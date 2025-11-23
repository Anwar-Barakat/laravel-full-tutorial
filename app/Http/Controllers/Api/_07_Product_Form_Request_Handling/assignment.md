# Assignment 07: Form Request Handling for Product CRUD

## Objective

This assignment focuses on refactoring the product creation and update validation logic from inline `$request->validate()` calls within the `ProductController` into dedicated Form Request classes. This improves code organization, reusability, and separation of concerns.

## Tasks

1.  **Create `StoreProductRequest`:**
    *   Create a new Form Request class named `StoreProductRequest` in `app/Http/Requests/Api/Product`.
    *   Move the validation rules for product creation (from the `store` method) into this new class.
    *   Ensure the `authorize()` method returns `true` for now (or implement appropriate authorization logic if required).

2.  **Create `UpdateProductRequest`:**
    *   Create a new Form Request class named `UpdateProductRequest` in `app/Http/Requests/Api/Product`.
    *   Move the validation rules for product updates (from the `update` method) into this new class. Remember to use `sometimes|required` for fields that are not always present in an update request but should be validated if provided.
    *   Ensure the `authorize()` method returns `true` for now.

3.  **Integrate Form Requests into `ProductController`:**
    *   Modify the `store` method in `app/Http/Controllers/Api/_07_Product_Form_Request_Handling/ProductController.php` to type-hint `StoreProductRequest` instead of `Illuminate\Http\Request`. Remove the inline `$request->validate()` call.
    *   Modify the `update` method in `app/Http/Controllers/Api/_07_Product_Form_Request_Handling/ProductController.php` to type-hint `UpdateProductRequest` instead of `Illuminate\Http\Request`. Remove the inline `$request->validate()` call.

## Verification

After completing these tasks, the product creation and update endpoints should function identically, but with the validation logic now residing in the dedicated Form Request classes. Invalid requests should still return appropriate validation error responses.
