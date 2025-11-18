# Product CRUD with Spatie Media Library

## Topic: Advanced Image Handling with Spatie Media Library

This assignment focuses on enhancing the Product CRUD API by integrating the `spatie/laravel-medialibrary` package. This powerful package simplifies handling file uploads, associating them with Eloquent models, and managing conversions (e.g., thumbnails, resized images). You will implement support for a single main product image and a gallery of additional images.

## Tasks

1.  **Install and Configure Spatie Media Library:**
    *   Install the `spatie/laravel-medialibrary` package using Composer.
    *   Publish its migrations and configuration file.
    *   Run the migrations to set up the necessary database tables.

2.  **Prepare the `Product` Model:**
    *   Make your `Product` model "media-aware" by implementing the `HasMedia` interface and using the `InteractsWithMedia` trait.
    *   Define media collections for a single main image and a product gallery. Consider using `withResponsiveImages()` for the main image.

3.  **Update the `ProductController`:**
    *   Modify the `store` and `update` methods in your `ProductController` to handle file uploads using the Media Library.
    *   For the main image:
        *   How would you add a single main image to the 'main_image' collection?
        *   How would you replace an existing main image?
    *   For the image gallery:
        *   How would you add multiple images to the 'gallery' collection?
        *   How would you handle deleting specific images from the gallery during an update?

4.  **Display Media in `ProductResource`:**
    *   Update your `ProductResource` to include the URLs of the main image and gallery images in the API response.
    *   How would you get the URL for different conversions (e.g., a thumbnail)?

5.  **Validation:**
    *   Add appropriate validation rules for image uploads (e.g., file type, size).

6.  **API Endpoints:**
    *   Ensure your CRUD endpoints correctly handle requests that include image uploads for both the main image and the gallery.
