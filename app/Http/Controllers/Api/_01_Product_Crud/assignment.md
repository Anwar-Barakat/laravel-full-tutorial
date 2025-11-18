# Basic CRUD API

## Topic: Building a Foundational API

This assignment focuses on creating a fundamental API for managing products. You will implement the core CRUD (Create, Read, Update, Delete) operations using a Laravel controller.

## Tasks

1.  **Create a `ProductController`:**
    *   Generate a new controller to handle API requests for products.

2.  **Implement the `index` method:**
    *   This method should retrieve all products from the database and return them as a JSON response.
    *   Consider using pagination to handle large datasets.

3.  **Implement the `store` method:**
    *   This method should validate the incoming request data for creating a new product.
    *   If validation passes, create a new product record in the database.
    *   Return the newly created product with a `201` status code.

4.  **Implement the `show` method:**
    *   This method should find a product by its ID and return it as a JSON response.
    *   What should happen if the product is not found?

5.  **Implement the `update` method:**
    *   This method should validate and update an existing product's information.
    *   Return the updated product.

6.  **Implement the `destroy` method:**
    *   This method should delete a product by its ID.
    *   Return an appropriate response with a `204` status code on successful deletion.

7.  **Define API Routes:**
    *   In `routes/api.php`, create an `apiResource` route for `products` that maps to your `ProductController`.
