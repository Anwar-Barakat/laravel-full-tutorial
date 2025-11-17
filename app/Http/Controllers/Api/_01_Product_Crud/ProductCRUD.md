# Product CRUD API Design (v1 - Basic)

This document outlines the design and implementation of the basic Product CRUD (Create, Read, Update, Delete) API. For an advanced version with filtering, refer to the v2 API documentation.

## Controller (`app/Http/Controllers/Api/_01_Product_Crud/ProductController.php`):

The `ProductController` handles product management via RESTful API endpoints, including image uploads. It uses Laravel Eloquent for database operations, includes request validation, and returns JSON responses with appropriate HTTP status codes.

**Implemented Methods:**
*   `index()`: List all products.
*   `store()`: Create a new product, handling image upload.
*   `show()`: Retrieve a single product.
*   `update()`: Update an existing product, handling image upload.
*   `destroy()`: Delete a product.

## API Routes:

Defined using `Route::apiResource('products', ProductController::class);`

*   `GET /products`
*   `POST /products`
*   `GET /products/{product}`
*   `PUT/PATCH /products/{product}`
*   `DELETE /products/{product}`

## Setup:

Run `php artisan migrate:fresh --seed` to set up the database and seed sample data.