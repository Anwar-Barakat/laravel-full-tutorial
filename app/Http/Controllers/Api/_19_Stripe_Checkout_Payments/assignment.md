# Assignment 19: Implementing Stripe Checkout for Payments

## Objective

This assignment focuses on integrating Stripe Checkout into the application for handling order payments. You will implement the API endpoints for creating Stripe Checkout sessions and processing webhooks to update payment and order statuses, following best practices for secure and robust payment flows.

## Key Concepts Covered

*   **Stripe API Integration**: Using the `stripe/stripe-php` library to interact with Stripe.
*   **Stripe Checkout Sessions**: Creating hosted checkout pages for secure payment collection.
*   **Stripe Webhooks**: Receiving asynchronous notifications from Stripe about payment events.
*   **Payment & Order Status Management**: Updating the application's database based on payment events.
*   **Environment Variables**: Securely configuring Stripe API keys and webhook secrets.
*   **Frontend Integration (Conceptual)**: Understanding how a frontend application would initiate and respond to the checkout process.

## Prerequisites

*   `composer require stripe/stripe-php` is installed.
*   Stripe API keys (`STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`) are configured in your `.env` file.
*   Your Stripe webhook endpoint is set up in your Stripe Dashboard, pointing to your application's webhook URL.

## Tasks

1.  **Database Migration & Model (`database/migrations/xxxx_xx_xx_xxxxxx_create_payments_table.php`, `app/Models/Payment.php`)**
    *   Create a `payments` table to store payment-related information (`order_id`, `stripe_checkout_session_id`, `amount`, `currency`, `status`, `payment_method`, `metadata`).
    *   Create a `Payment` Eloquent model with appropriate `$fillable` fields, `$casts`, and a `belongsTo` relationship to the `Order` model.
    *   **Update `Order` Model (`app/Models/Order.php`)**: Add a `hasOne` relationship to the `Payment` model.

2.  **OrderPaymentController (`app/Http/Controllers/Api/_19_Stripe_Checkout_Payments/OrderPaymentController.php`)**
    *   Implement a `createOrder(OrderData $orderData, CreateOrderAction $createOrderAction)` method:
        *   **Authorizes order creation** using `this->authorize('create', Order::class);`.
        *   **Creates the `Order`** and its `OrderItems` using `CreateOrderAction`.
        *   Returns an `OrderResource` of the created order. This endpoint provides the `order_id` needed for the next step.

3.  **StripeCheckoutController (`app/Http/Controllers/Api/_19_Stripe_Checkout_Payments/StripeCheckoutController.php`)**
    *   Implement a `createCheckoutSession(Request $request)` method:
        *   **Validates `order_id`** from the request (must be an existing order).
        *   Fetches the `Order` and its `OrderItems` (with products).
        *   Performs checks (e.g., order not already paid/cancelled).
        *   Creates or updates a `Payment` record with a `PaymentStatusEnum::PENDING()` status for the new order.
        *   Constructs Stripe `line_items` from the `OrderItems` of the fetched order.
        *   Creates a Stripe Checkout `Session` using `\Stripe\Checkout\Session::create()`.
        *   Updates the `Payment` record with the `stripe_checkout_session_id`.
        *   Returns the `checkout_url` to the frontend.
        *   Includes comprehensive error handling and logging.

4.  **StripeWebhookController (`app/Http/Controllers/Api/_19_Stripe_Checkout_Payments/StripeWebhookController.php`)**
    *   Implement a `handleWebhook(Request $request)` method:
        *   Verifies the Stripe webhook signature using `\Stripe\Webhook::constructEvent()`.
        *   Handles `checkout.session.completed` event:
            *   Retrieves `order_id` from the session's metadata.
            *   Finds the corresponding `Payment` record.
            *   Updates the `Payment` status to `PaymentStatusEnum::PAID()` and `payment_method`.
            *   Updates the `Order` status (e.g., to `OrderStatusEnum::PROCESSING()`).
        *   Handles `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` events.
        *   Includes logging for errors and unhandled event types.

5.  **Update API Routes (`routes/api.php`)**
    *   Add a `POST` route for `/api/v19/orders` pointing to `OrderPaymentController@createOrder`.
    *   Add a `POST` route for `/api/v19/stripe/checkout-session` pointing to `StripeCheckoutController@createCheckoutSession`.
    *   Add a `POST` route for `/api/stripe/webhook` pointing to `StripeWebhookController@handleWebhook`. **Crucially, this webhook route should be excluded from CSRF protection and other session middleware.**

## Verification

*   **Configuration**: Ensure Stripe API keys and webhook secret are correctly set in `.env`.
*   **Webhook Setup**: Verify your Stripe Dashboard webhook endpoint is correctly configured.
*   **Order Creation**: Send a `POST` request to `/api/v19/orders` with order details. You should receive the created `OrderResource` including its `id`.
*   **Checkout Session**: Use the `order_id` from the previous step and send a `POST` request to `/api/v19/stripe/checkout-session`. You should receive a `checkout_url`.
*   **Payment Process**: Navigate to the `checkout_url`, complete a test payment.
*   **Webhook Processing**: After a successful test payment, check your application's logs for webhook processing. Verify that the `payments` table and `orders` table (status) are updated correctly.
*   **Error Handling**: Test with invalid scenarios.
