# Product CRUD API Design (v2 - With Filtering)

## Controller (`app/Http/Controllers/Api/_02_Product_Crud_With_Filter/ProductController.php`):

This `ProductController` provides CRUD operations for products, including image uploads, tag assignments, category assignments, and advanced filtering, sorting, and inclusion capabilities using Spatie Query Builder. It adheres to RESTful principles, uses Laravel Eloquent for database interactions, includes robust request validation, and returns JSON responses with appropriate HTTP status codes.

**Implemented Methods:**
*   `index()`: List all products with advanced filtering, sorting, and inclusion capabilities.
*   `store()`: Create a new product, handling image upload, tag, and category assignment.
*   `show()`: Retrieve a single product.
*   `update()`: Update an existing product, handling image upload, tag, and category assignment.
*   `destroy()`: Delete a product.

## API Routes (Prefix: `/v2`):

Defined using `Route::apiResource('products', ProductController::class);` within the `/v2` prefix.

*   `GET /v2/products`
    *   **Filtering:** Supports filtering by:
        *   `whereName`: Filters products by name using a scope (e.g., `/v2/products?filter[whereName]=value`).
        *   `priceBetween`: Filters products by a price range using a scope (e.g., `/v2/products?filter[priceBetween]=10,100`).
        *   `price`: Exact matching (`filter[price]=value`).
        *   `category_id`: Exact matching (`filter[category_id]=value`).
        *   `tags.name`: Exact (`filter[tags.name]=value`) and partial (`filter[tags.name]=%value%`) matching.
    *   **Sorting:** Supports sorting by `name`, `price`, and `created_at` (e.g., `/v2/products?sort=name` for ascending, `/v2/products?sort=-price` for descending).
    *   **Includes:** Supports including related `category` and `tags` (e.g., `/v2/products?include=category,tags`).
*   `POST /v2/products`
*   `GET /v2/products/{product}`
*   `PUT/PATCH /v2/products/{product}`
*   `DELETE /v2/products/{product}`

## Setup:

Run `php artisan migrate:fresh --seed` to set up the database and seed sample data.