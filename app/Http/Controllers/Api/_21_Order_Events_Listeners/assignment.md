# Assignment 21: Implementing Events, Listeners, and Notifications for Order Lifecycle

## Objective

This assignment focuses on demonstrating Laravel's event, listener, and notification systems by integrating them into the order creation process. When an order is successfully created, an `OrderCreated` event will be dispatched, triggering various listeners. One listener will now dispatch a comprehensive `OrderConfirmation` notification via mail, database, and broadcast channels, alongside logging and (conceptually) inventory updates. The file structure for events and listeners will also be organized into subfolders.

## Key Concepts Covered

*   **Laravel Events**: Creating custom event classes to encapsulate specific occurrences.
*   **Laravel Listeners**: Creating classes that "listen" for dispatched events.
*   **Laravel Notifications**: Utilizing the Notification system for multi-channel delivery (mail, database, broadcast).
*   **Notification Channels**: Implementing `toMail()`, `toDatabase()`, `toBroadcast()` methods.
*   **ShouldQueue**: Making listeners and notifications asynchronous.
*   **Event Service Provider**: Registering events and their corresponding listeners.
*   **Event Dispatching**: Using `event(new EventClass(...))` to trigger events.
*   **Decoupling Concerns**: Separating responsibilities to improve maintainability and scalability.
*   **Action Classes**: Reusing existing action classes for core business logic.
*   **Organized File Structure**: Using subfolders for Events and Listeners.
*   **Notifiable Trait**: Ensuring the `User` model uses `Illuminate\Notifications\Notifiable`.

## Prerequisites

*   Familiarity with Laravel's basic routing, controllers, and models.
*   Mail, Queue, and Broadcasting configurations (e.g., Mailhog, Redis, Pusher) in `.env` for full functionality testing.
*   `php artisan notifications:table` and `php artisan migrate` run to create the `notifications` table.

## Tasks

1.  **Organize Event Files (`app/Events/Order/`)**
    *   Move `app/Events/OrderCreated.php` to `app/Events/Order/OrderCreated.php`.
    *   Update the namespace inside `OrderCreated.php` to `App\Events\Order`.

2.  **Organize Listener Files (`app/Listeners/Order/`)**
    *   Move `app/Listeners/SendOrderConfirmationEmail.php` to `app/Listeners/Order/SendOrderConfirmationEmail.php`.
    *   Move `app/Listeners/LogOrderCreation.php` to `app/Listeners/Order/LogOrderCreation.php`.
    *   Move `app/Listeners/UpdateInventory.php` to `app/Listeners/Order/UpdateInventory.php`.
    *   Update the namespace inside each moved listener file to `App\Listeners\Order`.
    *   Update the `use` statement for `OrderCreated` event in each listener to `App\Events\Order\OrderCreated`.

3.  **Create `OrderConfirmation` Notification (`app/Notifications/OrderConfirmation.php`)**
    *   Generate a new notification class using `php artisan make:notification OrderConfirmation`.
    *   The notification class should accept an `Order` model instance in its constructor and store it.
    *   Define `via()` to return `['mail', 'database', 'broadcast']`.
    *   Implement `toMail()` to return a descriptive `MailMessage`.
    *   Implement `toDatabase()` to return an array containing `order_id`, `total_amount`, and a message.
    *   Implement `toBroadcast()` to return a `BroadcastMessage` with relevant order details.
    *   Implement `ShouldQueue` on the notification.

4.  **Modify `SendOrderConfirmationEmail` Listener (`app/Listeners/Order/SendOrderConfirmationEmail.php`)**
    *   Remove the direct `Mail::raw` logic.
    *   Instead, dispatch the new `OrderConfirmation` notification to the user: `Notification::send($user, new OrderConfirmation($order));`.
    *   Ensure the `User` model uses the `Illuminate\Notifications\Notifiable` trait.

5.  **Modify `LogOrderCreation` Listener (`app/Listeners/Order/LogOrderCreation.php`)**
    *   Ensure it correctly logs the `OrderCreated` event details.

6.  **Modify `UpdateInventory` Listener (`app/Listeners/Order/UpdateInventory.php`)**
    *   Ensure it correctly contains placeholder logic for inventory updates.

7.  **Register Events and Listeners (`app/Providers/EventServiceProvider.php`)**
    *   In the `listen` array, map `App\Events\Order\OrderCreated::class` to its listeners: `App\Listeners\Order\SendOrderConfirmationEmail::class`, `App\Listeners\Order\LogOrderCreation::class`, `App\Listeners\Order\UpdateInventory::class`.
    *   Run `php artisan event:cache` after making changes (or `php artisan optimize:clear`).

8.  **Update `OrderEventController` (`app/Http/Controllers/Api/_21_Order_Events_Listeners/OrderEventController.php`)**
    *   Ensure it dispatches `App\Events\Order\OrderCreated` after order creation.
    *   Ensure the `User` model (`$order->user`) is `Notifiable`.

9.  **Define API Route (`routes/api.php`)**
    *   Add a `POST` route for `/api/v21/orders` pointing to `OrderEventController@store`.

## Verification

*   **Order Creation**: Send a `POST` request to `/api/v21/orders` with valid order data.
*   **Database Check**: Verify that a new order is created in the database and a new entry appears in the `notifications` table.
*   **Log Files**: Check your Laravel log file (`storage/logs/laravel.log`) for messages from `LogOrderCreation` and `UpdateInventory` listeners.
*   **Email Delivery**: If mail is configured, verify that an order confirmation email is sent.
*   **Broadcast Event**: If broadcasting is configured, verify a broadcast event is triggered (e.g., using `laravel-echo-server` or Pusher debug console).
*   **Error Handling**: Test edge cases and ensure proper API error responses.