# Assignment 13: Implementing Caching for Product API

## Objective

This assignment focuses on improving the performance of the Product API by implementing a caching mechanism. This will reduce the load on the database for frequently accessed data. While the folder name also suggests "RateLimit", this assignment specifically focuses on caching.

## Tasks

1.  **Understand Laravel Caching:**
    *   Familiarize yourself with Laravel's caching capabilities, particularly the `Cache` facade and methods like `Cache::remember()` and `Cache::forget()`.

2.  **Integrate Caching in `ProductController`:**
    *   **For `index()` method:**
        *   Implement `Cache::remember()` to cache the results of the `GetAllProductsAction`.
        *   Generate a unique cache key based on the request parameters to ensure different queries (filters, sorts, includes) are cached separately.
        *   Set an appropriate cache duration (e.g., 60 seconds).
    *   **For `show()` method:**
        *   Implement `Cache::remember()` to cache individual product retrievals from the `FindProductAction`.
        *   Generate a unique cache key using the product's ID.
        *   Set an appropriate cache duration.

3.  **Implement Cache Invalidation:**
    *   **For `store()`, `update()`, and `destroy()` methods:**
        *   After a product is created, updated, or deleted, use `Cache::forget()` to invalidate the relevant cache entries.
        *   Invalidate the cache for the specific product (if updated or deleted).
        *   Invalidate the cache for the `index()` method's results, as the list of products will have changed. (A more granular invalidation strategy could be explored as a future enhancement).

## Verification

*   Test the `index` and `show` endpoints multiple times and observe if the data is served from the cache (e.g., by monitoring database queries or using a debugbar).
*   Perform `store`, `update`, and `delete` operations and verify that subsequent `index` and `show` requests reflect the changes, indicating successful cache invalidation.
*   Consider implementing rate limiting as a separate enhancement, possibly via Laravel middleware.
