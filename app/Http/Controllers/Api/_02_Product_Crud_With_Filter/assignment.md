# Advanced Filtering and Sorting

## Topic: Enhancing Your API with Query Parameters

This assignment builds on your basic CRUD API by adding powerful filtering, sorting, and relationship-loading capabilities. You will use the `spatie/laravel-query-builder` package to allow users to refine their search results dynamically via URL parameters.

## Tasks

1.  **Install `spatie/laravel-query-builder`:**
    *   Add the required package to your project using Composer.

2.  **Update the `index` method:**
    *   Refactor the `index` method in your `ProductController` to use `QueryBuilder` for the `Product` model.

3.  **Allow Filtering:**
    *   Configure the `QueryBuilder` to allow filtering by `name` and `description`.
    *   How can you allow for both exact and partial matches?
    *   Enable filtering based on the `name` of a product's tags.

4.  **Allow Sorting:**
    *   Configure the `QueryBuilder` to allow sorting products by `name`, `price`, and `created_at`.

5.  **Allow Including Relationships:**
    *   Configure the `QueryBuilder` to allow the inclusion of the `category` and `tags` relationships in the response.
    *   How would a user request these relationships in the URL?

6.  **Test Your Implementation:**
    *   Use a tool like Postman or your browser to test the new functionalities. Try different combinations of filters, sorts, and includes.
    *   Example URL to test: `/api/products?filter[name]=Laptop&sort=-price&include=category`
