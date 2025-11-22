# Assignment 20: Implementing Stripe Payment Intents with Advanced Tracking

## Objective

This assignment expands on the Stripe Payment Intents integration by incorporating detailed tracking of Stripe charges, balance transactions, and customer payment methods within the application's database. This provides a more comprehensive view of payment lifecycles, revenue, fees, and customer payment information.

## Key Concepts Covered

*   **Stripe API Integration**: Advanced usage of the `stripe/stripe-php` library for `PaymentIntent`, `Charge`, `BalanceTransaction`, `Customer`, and `PaymentMethod` objects.
*   **Stripe Payment Intents**: Core object for managing payments.
*   **Stripe Charges**: Understanding and tracking the actual financial transaction result of a Payment Intent.
*   **Stripe Balance Transactions**: Tracking the net amount received after Stripe fees and when funds become available.
*   **Stripe Customers**: Storing Stripe customer IDs directly on the application's `User` model.
*   **Stripe Payment Methods**: Storing reusable payment method details for users.
*   **Stripe Webhooks**: Handling additional webhook events related to customers and payment methods.
*   **Database Schema Extension**: Extending existing tables (`users`, `payments`) and creating a new table (`payment_methods`) to store related Stripe data.
*   **Environment Variables**: Securely configuring Stripe API keys and webhook secrets.

## Prerequisites

*   `composer require stripe/stripe-php` is installed.
*   Stripe API keys (`STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET_PAYMENT_INTENTS`) are configured in your `.env` file.
*   Your Stripe webhook endpoint for Payment Intents is set up in your Stripe Dashboard, pointing to your application's webhook URL.

## Tasks

1.  **Update `User` Model and Migration (`app/Models/User.php`, `database/migrations/0001_01_01_000000_create_users_table.php`)**
    *   Add `stripe_customer_id` (string, nullable, unique) to the `users` table.
    *   Update the `User` Eloquent model's `$fillable` fields to include `stripe_customer_id`, and add `hasMany` relationships for `payments` and `paymentMethods`.

2.  **Create `PaymentMethod` Model and Migration (`app/Models/PaymentMethod.php`, `database/migrations/xxxx_xx_xx_xxxxxx_create_payment_methods_table.php`)**
    *   Create a `payment_methods` table with `user_id` (foreign key to `users` table, cascade delete), `stripe_payment_method_id` (string, unique), `type` (string, e.g., 'card'), `card_brand` (string, nullable), `card_last_four` (string, nullable), `exp_month` (integer, nullable), `exp_year` (integer, nullable), `is_default` (boolean, default false).
    *   Create a `PaymentMethod` Eloquent model with appropriate `$fillable` fields and a `belongsTo` relationship to the `User` model.

3.  **Update `Payment` Model and Migration (`app/Models/Payment.php`, `database/migrations/2025_11_20_113341_create_payments_table.php`)**
    *   Add/Update `payments` table columns:
        *   `payment_intent_id` (string, nullable, unique) - already done.
        *   `user_id` (foreign key to `users` table, nullable, set null on delete) - to link a payment to a local user.
        *   `stripe_charge_id` (string, nullable, unique) - ID of the Stripe Charge.
        *   `amount_captured` (decimal, nullable) - actual amount captured by Stripe.
        *   `currency_captured` (string, nullable) - currency of captured amount.
        *   `payment_method_type` (string, nullable) - e.g., 'card', 'us_bank_account'.
        *   `card_brand` (string, nullable) - e.g., 'visa', 'mastercard'.
        *   `card_last_four` (string, nullable) - last four digits of the card.
        *   `stripe_balance_transaction_id` (string, nullable, unique) - ID of the Stripe Balance Transaction.
        *   `net_amount` (decimal, nullable) - amount after fees.
        *   `fees_amount` (decimal, nullable) - Stripe fees.
        *   `available_on` (timestamp, nullable) - when funds become available.
    *   Update the `Payment` model's `$fillable` and `$casts` properties to include these new fields and add `belongsTo` relationships to the `Order` and `User` models.

4.  **Update `StripePaymentIntentController` (`app/Http/Controllers/Api/_20_Order_With_Stripe_Payment_Intent/StripePaymentIntentController.php`)**
    *   **Customer Management**:
        *   Implement a `findOrCreateStripeCustomer(User $user)` helper method that:
            *   Checks if the `User` has a `stripe_customer_id`.
            *   If yes, retrieves the Stripe Customer.
            *   If no or retrieval fails, creates a new `Stripe Customer` (`\Stripe\Customer::create()`) using the user's details.
            *   Updates the `User` model with the `stripe_customer_id`.
            *   Returns the `Stripe\Customer` object.
        *   In `createPaymentIntent`, call this helper method and pass the obtained `stripe_customer_id` to `PaymentIntent::create()`.
        *   Ensure the `Payment` record saves the `user_id`.

5.  **Update `StripePaymentIntentWebhookController` (`app/Http/Controllers/Api/_20_Order_With_Stripe_Payment_Intent/StripePaymentIntentWebhookController.php`)**
    *   **`payment_intent.succeeded` event**:
        *   After updating `Payment` and `Order` status, retrieve the associated `Stripe Charge` (`\Stripe\Charge::retrieve($paymentIntent->latest_charge)`).
        *   Retrieve the `Stripe Balance Transaction` (`\Stripe\BalanceTransaction::retrieve($charge->balance_transaction)`).
        *   Update the local `Payment` record with data from the `Charge` and `BalanceTransaction` objects:
            *   `stripe_charge_id`, `amount_captured`, `currency_captured`, `payment_method_type`, `card_brand`, `card_last_four`.
            *   `stripe_balance_transaction_id`, `net_amount`, `fees_amount`, `available_on`.
    *   **New Webhook Events (for Payment Method Tracking - Optional)**:
        *   Consider handling `payment_method.attached` or `payment_method.automatically_updated` webhooks if you want to explicitly store customer payment methods for future use (e.g., one-click checkout) in your `payment_methods` table. For this assignment, we primarily focus on capturing payment method details on the `Payment` record for the specific transaction.

6.  **Update API Routes (`routes/api.php`)**
    *   Add a `POST` route for `/api/v20/orders` pointing to `OrderPaymentIntentController@createOrder`.
    *   Add a `POST` route for `/api/v20/stripe/payment-intents` pointing to `StripePaymentIntentController@createPaymentIntent`.
    *   Add a `GET` route for `/api/v20/stripe/payment-intents/{paymentIntentId}` pointing to `StripePaymentIntentController@retrievePaymentIntent`.
    *   Add a `POST` route for `/api/stripe/webhook/payment-intents` pointing to `StripePaymentIntentWebhookController@handleWebhook`. **Crucially, this webhook route should be excluded from CSRF protection and other session middleware.**

## Verification

*   **Database Schema**: Verify `users` table has `stripe_customer_id`. Verify `payment_methods` table and new columns in `payments` table.
*   **Stripe Customer Creation**: Create an order for a new user, verify `stripe_customer_id` is populated on the `User` record in your database.
*   **Payment Intent Creation**: Verify `PaymentIntent` is created with the `customer` ID.
*   **Webhook Processing (`payment_intent.succeeded`)**:
    *   After a successful test payment, verify the `payments` table is updated with `stripe_charge_id`, `amount_captured`, `net_amount`, `fees_amount`, payment method details (type, brand, last four), and `available_on` from the Stripe Charge and Balance Transaction.
*   **Error Handling**: Test with invalid scenarios to ensure all new logic handles errors gracefully.