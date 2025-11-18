
# Product CRUD with Resource

This is the third version of the Product CRUD API. It uses Laravel's API Resources to format the JSON response.

## API Endpoints

### 1. Get all products

-   **Endpoint:** `/api/products`
-   **Method:** `GET`
-   **Description:** Get all products with filtering, sorting, and pagination.
-   **Query Parameters:**
    -   `filter[name]`: Filter by product name (exact match).
    -   `filter[name]`: Filter by product name (partial match).
    -   `filter[description]`: Filter by product description (exact match).
    -   `filter[description]`: Filter by product description (partial match).
    -   `filter[tags.name]`: Filter by tag name (exact match).
    -   `filter[tags.name]`: Filter by tag name (partial match).
    -   `sort`: Sort by `name`, `price`, `created_at`.
    -   `include`: Include `category`, `tags`.
    -   `page`: Page number.
-   **Response:**

    ```json
    {
        "data": [
            {
                "id": 1,
                "name": "Product 1",
                "description": "This is product 1",
                "price": "10.00",
                "image": "products/image.jpg",
                "category": {

                    ## Product CRUD — v3 (Resources & Pagination)

                    Overview
                    ---
                    This version is the most production-ready example in the folder set. It uses Laravel API Resources to provide a stable JSON contract, adds pagination to the index, supports Query Builder filters/includes, and synchronizes tags on create/update.

                    Key endpoints & behavior
                    ---
                    - GET /api/products
                        - Returns a paginated collection (default 10 per page) wrapped by `ProductResource`.
                        - Supports filtering, sorting, and `include` for related `category` and `tags`.
                        - Example query: `?include=category,tags&sort=-created_at&filter[name]=phone&page=2`.
                    - POST /api/products
                        - Validates input, stores uploaded image (public disk), creates product, syncs provided `tags`, and returns the created resource with HTTP 201.
                    - GET /api/products/{id}
                        - Returns a single resource; controller loads `category` and `tags` relationships.
                    - PUT/PATCH /api/products/{id}
                        - Updates attributes, replaces image (deleting old file), and syncs tags.
                    - DELETE /api/products/{id}
                        - Deletes the product and returns 204. (Consider deleting stored images as well — see notes.)

                    Implementation notes & best practices
                    ---
                    - Uses `ProductResource` to shape responses and expose relations consistently.
                    - Uses `Spatie\QueryBuilder` with `allowedFilters`, `allowedSorts`, and `allowedIncludes` and returns `->paginate(10)`.
                    - Syncs tags via `$product->tags()->sync(...)` on create and update.

                    Recommendations / caveats
                    ---
                    - Wrap multi-step operations (create + file store + tag sync) in a DB transaction to avoid partial state on failure.
                    - On delete, remove the product image from storage to avoid orphaned files: `Storage::disk('public')->delete($product->image)`.
                    - Use route model binding (`Product $product`) to simplify code and enable implicit authorization policies.
                    - Preserve query parameters on pagination links if exposing links back to clients (e.g., `->appends(request()->query())`).

                    Setup / verification
                    ---
                    Ensure `ProductResource` exists under `App\Http\Resources`. Install and configure Spatie Query Builder. Add feature tests to verify pagination, includes, filters, file handling, and tag sync behavior.

                    Notes: designed to return resource-wrapped data and support client-friendly pagination metadata.
                        "id": 1,
