# Assignment 3: Transforming Data with API Resources

## Topic: Structuring API Responses

This assignment focuses on standardizing the structure of your API's output. Instead of returning raw Eloquent models, you will use Laravel's API Resources to create a transformation layer. This gives you full control over which data is sent and how it's formatted, decoupling your API's response from your database schema.

## Tasks

1.  **Create a `ProductResource`:**
    *   Generate a new API Resource for the `Product` model.

2.  **Define the Resource Structure:**
    *   In your `ProductResource`, define the `toArray` method to return the desired JSON structure for a product.
    *   Include `id`, `name`, `description`, `price`, and timestamps.
    *   For the `image` attribute, how can you ensure it always returns a full, publicly accessible URL?

3.  **Include Relationships:**
    *   Create resources for `Category` and `Tag`.
    *   In `ProductResource`, conditionally load the `category` and `tags` relationships only when they have been included in the request.
    *   How does the `whenLoaded` method help with this?

4.  **Refactor the `ProductController`:**
    *   Update the `index`, `store`, `show`, and `update` methods to return your new `ProductResource` instead of the raw model.
    *   For the `index` method, how do you return a collection of resources?

5.  **Adjust the `store` Response:**
    *   When a new product is created in the `store` method, ensure the response returns a `201 Created` status code along with the resource.
