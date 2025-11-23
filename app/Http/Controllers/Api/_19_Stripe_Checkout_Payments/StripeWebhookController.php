<?php

namespace App\Http\Controllers\Api\_19_Stripe_Checkout_Payments;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Payment;
use App\Http\Traits\ApiResponseTrait;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;
use App\Enums\Order\OrderStatusEnum;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class StripeWebhookController extends Controller
{
    use ApiResponseTrait;

    /**
     * Handle Stripe webhooks.
     * Webhook route should be excluded from CSRF protection.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('stripe-signature');
        $webhookSecret = env('STRIPE_WEBHOOK_SECRET');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe Webhook Signature Verification Failed: ' . $e->getMessage());
            return $this->errorResponse('Webhook signature verification failed.', 400);
        } catch (Throwable $e) {
            Log::error('Stripe Webhook Error: ' . $e->getMessage());
            return $this->errorResponse('Webhook error.', 400);
        }

        // Handle the event
        switch ($event->type) {
            case 'checkout.session.completed':
                $session = $event->data->object;

                Log::info("Checkout Session Completed: " . $session->id);

                try {
                    $orderId = $session->metadata->order_id ?? null;
                    if (!$orderId) {
                        throw new \Exception("Order ID not found in checkout session metadata.");
                    }

                    $payment = Payment::where('stripe_checkout_session_id', $session->id)
                        ->where('order_id', $orderId)
                        ->firstOrFail();

                    $order = $payment->order;

                    // Update Payment Status
                    $payment->update([
                        'status' => PaymentStatusEnum::PAID(),
                        'payment_method' => $session->payment_method_types[0] ?? 'unknown',
                        'metadata' => array_merge($payment->metadata ?? [], ['stripe_session_data' => $session->toArray()]),
                    ]);

                    if ($order->status === OrderStatusEnum::PENDING) {
                        $order->status = OrderStatusEnum::PROCESSING;
                        $order->save();
                    }

                    Log::info("Order {$order->id} and Payment {$payment->id} updated successfully to 'paid'.");
                } catch (Throwable $e) {
                    Log::error("Error processing checkout.session.completed for session {$session->id}: " . $e->getMessage());
                    return $this->errorResponse('Error processing event.', 500);
                }
                break;

            case 'checkout.session.async_payment_succeeded':
                $session = $event->data->object;
                Log::info("Checkout Session Async Payment Succeeded: " . $session->id);
                $payment = Payment::where('stripe_checkout_session_id', $session->id)->first();
                if ($payment && $payment->status !== PaymentStatusEnum::PAID()) {
                    $payment->update(['status' => PaymentStatusEnum::PAID()]);
                }
                break;

            case 'checkout.session.async_payment_failed':
                $session = $event->data->object;
                Log::warning("Checkout Session Async Payment Failed: " . $session->id);
                $payment = Payment::where('stripe_checkout_session_id', $session->id)->first();
                if ($payment && $payment->status !== PaymentStatusEnum::FAILED()) {
                    $payment->update(['status' => PaymentStatusEnum::FAILED()]);
                }
                break;

            default:
                Log::info('Received unknown event type ' . $event->type);
                break;
        }

        return $this->successResponse(null, 'Webhook handled.', 200);
    }
}
