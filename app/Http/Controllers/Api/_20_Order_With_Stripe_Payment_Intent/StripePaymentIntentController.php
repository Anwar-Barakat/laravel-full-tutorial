<?php

namespace App\Http\Controllers\Api\_20_Order_With_Stripe_Payment_Intent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User; // Import User model
use App\Http\Traits\ApiResponseTrait;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Customer; // Import Stripe Customer
use Illuminate\Http\JsonResponse;
use App\Enums\Order\OrderStatusEnum;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class StripePaymentIntentController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    public function createPaymentIntent(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $orderId = $request->input('order_id');

        try {
            $order = Order::with('user')->findOrFail($orderId);
            $user = $order->user; // Get the user associated with the order

            // Check if order is already paid or cancelled
            if ($order->payment && $order->payment->status === PaymentStatusEnum::PAID()) {
                return $this->errorResponse('Order has already been paid.', 400);
            }
            if ($order->status === OrderStatusEnum::CANCELLED) {
                return $this->errorResponse('Cannot create payment intent for a cancelled order.', 400);
            }

            // Find or create Stripe Customer
            $stripeCustomer = $this->findOrCreateStripeCustomer($user);

            // Calculate total amount in cents
            $amountInCents = (int) ($order->total_amount * 100);

            // Create or update pending payment record
            $payment = Payment::firstOrCreate(
                ['order_id' => $order->id],
                [
                    'user_id' => $user->id, // Associate payment with user
                    'amount' => $order->total_amount,
                    'currency' => 'usd', // Assuming USD, or get from order/config
                    'status' => PaymentStatusEnum::PENDING(),
                    'payment_method' => null, // Will be updated by webhook
                ]
            );

            $paymentIntent = null;

            // If a payment intent already exists for this payment, try to retrieve it
            if ($payment->payment_intent_id) {
                try {
                    $paymentIntent = PaymentIntent::retrieve($payment->payment_intent_id);
                    // If the intent is not succeeded or canceled, we can reuse it
                    if ($paymentIntent->status !== 'succeeded' && $paymentIntent->status !== 'canceled') {
                        // Update intent if amount or other details changed or customer changed
                        $updateParams = [];
                        if ($paymentIntent->amount !== $amountInCents) {
                            $updateParams['amount'] = $amountInCents;
                        }
                        if ($paymentIntent->customer !== $stripeCustomer->id) {
                            $updateParams['customer'] = $stripeCustomer->id;
                        }
                        if (!empty($updateParams)) {
                             $paymentIntent = PaymentIntent::update(
                                $payment->payment_intent_id,
                                $updateParams
                            );
                        }
                    } else {
                        // If it's already succeeded or canceled, create a new one
                        $paymentIntent = null; // Force creation of a new one
                    }
                } catch (Throwable $e) {
                    Log::warning("Could not retrieve existing Payment Intent {$payment->payment_intent_id}: " . $e->getMessage());
                    $paymentIntent = null; // Force creation of a new one if retrieval fails
                }
            }

            // Create a new Payment Intent if none exists or the existing one is not reusable
            if (!$paymentIntent) {
                $paymentIntent = PaymentIntent::create([
                    'amount' => $amountInCents,
                    'currency' => 'usd', // Must match currency
                    'payment_method_types' => ['card'],
                    'customer' => $stripeCustomer->id, // Associate Payment Intent with Stripe Customer
                    'metadata' => [
                        'order_id' => $order->id,
                        'user_id' => $user->id,
                    ],
                ]);
            }

            // Update payment record with Stripe Payment Intent ID and client secret
            $payment->update([
                'payment_intent_id' => $paymentIntent->id,
                'user_id' => $user->id, // Ensure user_id is set on payment
            ]);

            return $this->successResponse([
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'customer_id' => $stripeCustomer->id, // Optionally return customer ID
            ], 'Stripe Payment Intent created successfully.');

        } catch (Throwable $e) {
            Log::error("Stripe Payment Intent Creation Error: " . $e->getMessage(), ['trace' => $e->getTrace()]);
            return $this->errorResponse('Failed to create Stripe Payment Intent: ' . $e->getMessage(), 500);
        }
    }

    public function retrievePaymentIntent(string $paymentIntentId): JsonResponse
    {
        try {
            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);
            return $this->successResponse($paymentIntent->toArray(), 'Payment Intent retrieved successfully.');
        } catch (Throwable $e) {
            Log::error("Stripe Payment Intent Retrieval Error: " . $e->getMessage(), ['payment_intent_id' => $paymentIntentId, 'trace' => $e->getTrace()]);
            return $this->errorResponse('Failed to retrieve Payment Intent: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Finds or creates a Stripe Customer for the given User.
     */
    protected function findOrCreateStripeCustomer(User $user): Customer
    {
        if ($user->stripe_customer_id) {
            try {
                return Customer::retrieve($user->stripe_customer_id);
            } catch (Throwable $e) {
                Log::warning("Stripe Customer {$user->stripe_customer_id} not found, creating a new one for user {$user->id}. Error: " . $e->getMessage());
                // Fall through to create new customer if retrieval fails
            }
        }

        $stripeCustomer = Customer::create([
            'email' => $user->email,
            'name' => $user->name,
            'metadata' => ['user_id' => $user->id],
        ]);

        $user->forceFill([ // Use forceFill to bypass $fillable for this specific update if needed
            'stripe_customer_id' => $stripeCustomer->id,
        ])->save();

        return $stripeCustomer;
    }
}
