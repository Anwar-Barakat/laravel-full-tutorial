# Polymorphic Relationships for Reviews

## Topic: Flexible Data Associations with Polymorphic Relationships

This assignment introduces polymorphic relationships, a powerful feature in Laravel that allows a single model to belong to more than one other model on a single association. You will apply this concept to create a flexible review system where reviews can be associated with different types of entities (e.g., products, users, services).

## Tasks

1.  **Understand Polymorphic Relationships:**
    *   Research Laravel's documentation on "polymorphic relationships."
    *   Understand the `morphTo` and `morphMany` methods.

2.  **Define the `Review` Model:**
    *   Create a `Review` model that can be associated with multiple "reviewable" models (e.g., `Product`, `User`).
    *   Implement the `morphTo` relationship in the `Review` model.

3.  **Make `Product` Reviewable:**
    *   Add the `morphMany` relationship to the `Product` model, allowing it to have many reviews.

4.  **Create a `ReviewController`:**
    *   Generate a `ReviewController` to handle CRUD operations for reviews.
    *   Implement methods to create, retrieve, update, and delete reviews.

5.  **Implement Review Creation:**
    *   Design an API endpoint (e.g., `POST /products/{product}/reviews`) that allows creating a review for a specific product.
    *   Ensure the polymorphic relationship is correctly saved when a review is created.

6.  **Implement Review Retrieval:**
    *   Design an API endpoint (e.g., `GET /products/{product}/reviews`) to retrieve all reviews for a specific product.
    *   Design an endpoint (e.g., `GET /reviews/{review}`) to retrieve a single review, showing its associated reviewable entity.

7.  **Implement Review Update and Deletion:**
    *   Implement endpoints to update and delete a specific review.

8.  **Define API Routes:**
    *   Define appropriate API routes for your `ReviewController`, considering how you will nest reviews under their reviewable entities.
