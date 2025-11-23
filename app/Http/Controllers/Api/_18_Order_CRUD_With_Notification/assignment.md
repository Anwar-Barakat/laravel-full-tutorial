# Assignment 18: Order CRUD with Notifications

## Objective

This assignment combines the core CRUD operations for orders with the implementation of various notification mechanisms. When an order is created, notifications will be dispatched via database, broadcast, and Markdown-styled email channels. This showcases a complete lifecycle of an order creation, including its persistence and user communication.

## Key Concepts Covered

*   **Order CRUD Operations**: Reusing the robust "Controller + Action + DTO" pattern for order management.
*   **Laravel Notifications**: Creating and dispatching notification classes.
*   **Notification Channels**: Using `database`, `broadcast`, and `mail` channels.
*   **Broadcasting**: Sending real-time updates (requires a broadcasting driver like Pusher/Redis and Laravel Echo setup).
*   **Database Notifications**: Storing notifications persistently in the database.
*   **Mail Notifications**: Sending emails, specifically using Markdown for templates.
*   **Markdown Mailables**: Customizing email content and appearance with Markdown and Blade views.

## Tasks

1.  **Notification Class (`app/Notifications/OrderCreatedNotification.php`)**
    *   (Already created in a previous step) This class defines how notifications are sent across `mail`, `database`, and `broadcast` channels when an order is created.
    *   The `toMail()` method uses a Markdown view (`mail.orders.created`).

2.  **Markdown Mail Template (`resources/views/mail/orders/created.blade.php`)**
    *   (Already created in a previous step) This Blade view defines the content and styling for the email notification.

3.  **Update Order Model (`app/Models/Order.php`)**
    *   (Already completed in a previous step) The `Illuminate\Notifications\Notifiable` trait has been added to the `Order` model.

4.  **Create `OrderNotificationController` (`app/Http/Controllers/Api/_18_Order_CRUD_With_Notification/OrderNotificationController.php`)**
    *   This controller implements full CRUD operations for orders, mirroring the structure of `_14_Order_CRUD`.
    *   **Crucially**, in the `store()` method, after a new order is successfully created, the `OrderCreatedNotification` is dispatched to the newly created `$order` instance (`$order->notify(new OrderCreatedNotification($order));`).

5.  **Update API Routes (`routes/api.php`)**
    *   Add API resource routes for this new controller, using a new endpoint (e.g., `apiResource('orders-with-notifications', OrderNotificationController::class)`).

## Verification

*   **API Functionality**: Test all CRUD endpoints (`index`, `store`, `show`, `update`, `destroy`) for `orders-with-notifications` to ensure basic order management works.
*   **Database Notification:** After creating an order via the API, check the `notifications` table in your database to ensure a new entry exists.
*   **Email Notification:** Verify that an email is sent to the relevant user with the correct Markdown styling and order details. (Ensure your `.env` mail settings are configured and Mailhog/Mailtrap is running for local development).
*   **Broadcast Notification (Conceptual):** If you have a broadcasting driver and Laravel Echo configured, you would listen for real-time events on the frontend. For this assignment, simply knowing the notification is prepared for broadcast is sufficient.
*   **Permissions:** Ensure the user attempting actions has the necessary permissions (e.g., `create-order`).
