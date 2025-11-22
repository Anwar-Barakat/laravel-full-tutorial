<?php

namespace App\Http\Controllers\Api\_20_Order_Stripe_Payment_Intent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Http\Traits\ApiResponseTrait;
use Stripe\Stripe;
use Illuminate\Http\JsonResponse;
use App\Enums\Order\OrderStatusEnum;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;


use App\Actions\Stripe\FindOrCreateStripeCustomerAction;
use App\Actions\Stripe\CreatePaymentIntentAction;

class StripePaymentIntentController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    public function createPaymentIntent(
        Request $request,
        FindOrCreateStripeCustomerAction $findOrCreateStripeCustomerAction,
        CreatePaymentIntentAction $createPaymentIntentAction
    ): JsonResponse {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $orderId = $request->input('order_id');

        try {
            $order = Order::with('user')->findOrFail($orderId);
            $user = $order->user;

            if ($order->payment && $order->payment->status === PaymentStatusEnum::PAID()) {
                return $this->errorResponse('Order has already been paid.', 400);
            }
            if ($order->status === OrderStatusEnum::CANCELLED) {
                return $this->errorResponse('Cannot create payment intent for a cancelled order.', 400);
            }

            $stripeCustomer = $findOrCreateStripeCustomerAction->execute($user);

            $paymentIntent = $createPaymentIntentAction->execute($order, $stripeCustomer);

            return $this->successResponse([
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'customer_id' => $stripeCustomer->id,
            ], 'Stripe Payment Intent created successfully.');
        } catch (Throwable $e) {
            Log::error("Stripe Payment Intent Creation Error: " . $e->getMessage(), ['trace' => $e->getTrace()]);
            return $this->errorResponse('Failed to create Stripe Payment Intent: ' . $e->getMessage(), 500);
        }
    }

    public function retrievePaymentIntent(string $paymentIntentId): JsonResponse
    {
        try {
            $paymentIntent = \Stripe\PaymentIntent::retrieve($paymentIntentId);
            return $this->successResponse($paymentIntent->toArray(), 'Payment Intent retrieved successfully.');
        } catch (Throwable $e) {
            Log::error("Stripe Payment Intent Retrieval Error: " . $e->getMessage(), ['payment_intent_id' => $paymentIntentId, 'trace' => $e->getTrace()]);
            return $this->errorResponse('Failed to retrieve Payment Intent: ' . $e->getMessage(), 500);
        }
    }
}
