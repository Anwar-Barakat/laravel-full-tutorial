# Assignment for \_22_Product_Job_Queue

This directory is part of the API layer and is dedicated to demonstrating the integration of product management with Laravel's Job and Queue system for asynchronous notifications.

## Key Components:

-   **`ProductController.php`** (located at `app/Http/Controllers/Api/_22_Product_Job_Queue/ProductController.php`): This controller handles API requests related to product resources and is intended to be used under the `v22` API prefix when registered in routes.
    -   **Endpoint**: `POST /api/v22/products` (ensure this controller is registered under the `/api/v22` prefix in your route definitions; otherwise adjust the endpoint shown here to match your routing configuration).
    -   **Functionality**: Its `store` method is responsible for creating new products. It leverages the `App\Actions\Product\CreateProductAction` to perform the core product creation logic. **After successfully creating a product, it dispatches the `SendNewProductNotification` job to the queue (via `SendNewProductNotification::dispatch($product)`).**
    -   **Queue note:** Ensure the `SendNewProductNotification` job implements `Illuminate\Contracts\Queue\ShouldQueue` (or otherwise is configured to be queued) so notifications are processed asynchronously.
-   **`App\Jobs\SendNewProductNotification.php`**: (Located in `app/Jobs/`) This job is dispatched to the queue by `ProductControllerV22` whenever a new product is successfully created. Its responsibility is to fetch all subscribing users and send them a new product notification.
-   **`App\Notifications\NewProductNotification.php`**: (Located in `app/Notifications/`) This notification defines the content and channels (mail, database, broadcast) for the new product alert.

## Purpose:

The primary purpose of this assignment is to showcase how to asynchronously send notifications upon resource creation using Laravel's robust Job and Queue system, while adhering to architectural patterns like Action layers and the Single Responsibility Principle. It ensures that the product creation process remains fast and responsive, offloading time-consuming tasks like sending multiple emails to a background queue.
