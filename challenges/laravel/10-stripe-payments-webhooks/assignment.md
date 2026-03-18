# Stripe Payment Integration

Integrate Stripe payments end-to-end: create payment intents, handle webhooks, manage subscriptions — your real Tripz experience.

| Topic          | Details                               |
|----------------|---------------------------------------|
| Payment Intents| Charge flow, confirmations            |
| Webhooks       | Verify & process Stripe events        |
| Multi-Party    | Split payments, connected accounts    |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Stripe Checkout Flow (Medium)

### Scenario

Build a complete Stripe payment flow for bookings: create Payment Intent, confirm payment on frontend, handle success/failure, and store transaction records.

### Requirements

1. `PaymentController` with `createIntent()` and `confirm()`
2. Create Stripe `PaymentIntent` with booking metadata
3. Store payment record linked to booking
4. Handle payment success: update booking status to `paid`
5. Handle payment failure: log error, keep booking `pending`
6. Use Stripe PHP SDK with proper error handling
7. Configure Stripe keys in `config/services.php`

### Expected Code

```php
// Create intent
// POST /api/bookings/42/pay
// → { client_secret: "pi_xxx_secret_yyy", amount: 500000 }

// Frontend confirms with Stripe.js
// Stripe sends webhook on completion

// Webhook processes the result
// POST /stripe/webhook  (from Stripe)
// → Updates booking status
```

### What We're Evaluating

- Stripe `PaymentIntent` creation
- Error handling for Stripe API
- Payment record management
- Config-driven Stripe setup

---

## Problem 02 — Stripe Webhook Handler (Hard)

### Scenario

Build a secure webhook handler that processes Stripe events: verify signatures, handle `payment_intent.succeeded` / `payment_intent.payment_failed`, manage idempotency, and process events reliably.

### Requirements

1. Verify Stripe webhook signature using the signing secret
2. Handle events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
3. Idempotency: don't process the same event twice
4. Log all webhook events for debugging
5. Return `200` quickly (process heavy work in queued jobs)
6. Handle missing bookings gracefully (don't crash)
7. Use Laravel's cashier-style webhook controller or build custom

### Expected Code

```php
// routes/api.php  (no auth middleware!)
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle'])
    ->withoutMiddleware(['auth:sanctum', 'throttle']);

// Stripe sends POST with:
// Headers: Stripe-Signature: t=...,v1=...
// Body: { id: "evt_xxx", type: "payment_intent.succeeded", data: {...} }
```

### What We're Evaluating

- Webhook signature verification
- Event routing to handlers
- Idempotency implementation
- Quick `200` response + queued processing
