<?php

namespace App\Http\Controllers\Api\_19_Stripe_Checkout_Payments;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request; // Re-added
use App\Models\Order;
use App\Models\Payment;
use App\Http\Traits\ApiResponseTrait;
use Stripe\Stripe;
use Stripe\Checkout\Session;
use Illuminate\Http\JsonResponse;
use App\Enums\Order\OrderStatusEnum;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class StripeCheckoutController extends Controller // Renamed
{
    use ApiResponseTrait;

    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    public function createCheckoutSession(Request $request): JsonResponse // Renamed and signature changed
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            // 'success_url' => 'required|url', // Frontend success URL
            // 'cancel_url' => 'required|url',  // Frontend cancel URL
        ]);

        $orderId = $request->input('order_id');
        $successUrl = env('STRIPE_SUCCESS_URL', config('app.url') . '/checkout/success');
        $cancelUrl = env('STRIPE_CANCEL_URL', config('app.url') . '/checkout/cancel');

        try {
            $order = Order::with('orderItems.product')->findOrFail($orderId); // Fetch existing order

            // Check if order is already paid or cancelled
            if ($order->payment && $order->payment->status === PaymentStatusEnum::PAID()) {
                return $this->errorResponse('Order has already been paid.', 400);
            }
            if ($order->status === OrderStatusEnum::CANCELLED) {
                return $this->errorResponse('Cannot create checkout session for a cancelled order.', 400);
            }

            // Create or update pending payment record
            $payment = Payment::firstOrCreate(
                ['order_id' => $order->id],
                [
                    'amount' => $order->total_amount,
                    'currency' => 'usd',
                    'status' => PaymentStatusEnum::PENDING(),
                    'payment_method' => null, 
                ]
            );

            // If a session already exists for this payment and it's not expired, reuse it or create a new one
            if ($payment->stripe_checkout_session_id) {
                try {
                    $existingSession = Session::retrieve($payment->stripe_checkout_session_id);
                    if ($existingSession->status === 'open' && $existingSession->expires_at > time()) {
                        // Reuse existing session if still valid
                        return $this->successResponse(['checkout_url' => $existingSession->url], 'Existing checkout session retrieved.');
                    }
                } catch (Throwable $e) {
                    // Session not found or invalid, create new one
                    $payment->stripe_checkout_session_id = null; // Clear invalid session ID
                    $payment->save();
                }
            }

            // Prepare line items for Stripe
            $lineItems = [];
            foreach ($order->orderItems as $item) {
                if ($item->product) {
                    $lineItems[] = [
                        'price_data' => [
                            'currency' => 'usd', // Must match currency above
                            'product_data' => [
                                'name' => $item->product->name,
                            ],
                            'unit_amount' => (int) ($item->price * 100), // Amount in cents
                        ],
                        'quantity' => $item->quantity,
                    ];
                }
            }

            if (empty($lineItems)) {
                return $this->errorResponse('Order has no items to checkout.', 400);
            }

            $checkoutSession = Session::create([
                'line_items' => $lineItems,
                'mode' => 'payment',
                'success_url' => $successUrl . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $cancelUrl,
                'client_reference_id' => $order->id, // Link to your order ID
                'metadata' => [
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                ],
                'customer_email' => $order->user->email, // Pre-fill customer email if user exists
            ]);

            // Update payment record with Stripe session ID
            $payment->update([
                'stripe_checkout_session_id' => $checkoutSession->id,
            ]);

            return $this->successResponse(['checkout_url' => $checkoutSession->url], 'Stripe checkout session created successfully.');

        } catch (Throwable $e) {
            Log::error("Stripe Checkout Session Error: " . $e->getMessage(), ['trace' => $e->getTrace()]);
            return $this->errorResponse('Failed to create Stripe checkout session: ' . $e->getMessage(), 500);
        }
    }
}
