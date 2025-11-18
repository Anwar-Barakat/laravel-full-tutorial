# Assignment 4: Standardizing API Responses

## Topic: Refactoring for Consistency and Clarity

This final assignment focuses on improving the maintainability and consistency of your API. You will create a reusable `ApiResponseTrait` to standardize the JSON response format across all your controller's methods, ensuring predictable output for both successful and failed requests.

## Tasks

1.  **Create an `ApiResponseTrait`:**
    *   Create a new trait in the `app/Http/Traits` directory.

2.  **Implement a `successResponse` Method:**
    *   In the trait, create a protected method named `successResponse`.
    *   This method should accept data, an optional message string, and an optional status code.
    *   It should return a `JsonResponse` with a consistent structure, like:
        ```json
        {
          "success": true,
          "message": "Your message here",
          "data": { ... }
        }
        ```

3.  **Implement an `errorResponse` Method:**
    *   Create a protected `errorResponse` method in the trait.
    *   It should accept an optional message and a status code.
    *   It should return a `JsonResponse` with a structure like:
        ```json
        {
          "success": false,
          "message": "Your error message here"
        }
        ```
    *   Create a `notFoundResponse` that utilizes the `errorResponse` method with a `404` status code.

4.  **Refactor the `ProductController`:**
    *   Use the `ApiResponseTrait` in your `ProductController`.
    *   Update all methods (`index`, `store`, `show`, `update`, `destroy`) to use your new `successResponse` and `errorResponse` methods.
    *   Instead of using `findOrFail`, how can you use `find` and then call your `notFoundResponse` if the model is not found?

5.  **Test Your Refactored API:**
    *   Verify that all endpoints return the new, standardized JSON structure for both successful responses and errors (e.g., trying to fetch a product that doesn't exist).
