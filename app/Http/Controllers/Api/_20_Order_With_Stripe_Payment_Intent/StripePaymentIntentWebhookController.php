<?php

namespace App\Http\Controllers\Api\_20_Order_With_Stripe_Payment_Intent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Payment;
use App\Http\Traits\ApiResponseTrait;
use Stripe\Webhook;
use Stripe\Charge; // Import Charge
use Stripe\BalanceTransaction; // Import BalanceTransaction
use Stripe\Exception\SignatureVerificationException;
use App\Enums\Order\OrderStatusEnum;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class StripePaymentIntentWebhookController extends Controller
{
    use ApiResponseTrait;

    /**
     * Handle Stripe webhooks for Payment Intents.
     * Webhook route should be excluded from CSRF protection.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('stripe-signature');
        $webhookSecret = env('STRIPE_WEBHOOK_SECRET_PAYMENT_INTENTS'); // Use a specific secret for PIs

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe Payment Intent Webhook Signature Verification Failed: ' . $e->getMessage());
            return $this->errorResponse('Webhook signature verification failed.', 400);
        } catch (Throwable $e) {
            Log::error('Stripe Payment Intent Webhook Error: ' . $e->getMessage());
            return $this->errorResponse('Webhook error.', 400);
        }

        // Handle the event
        switch ($event->type) {
            case 'payment_intent.succeeded':
                $paymentIntent = $event->data->object;
                Log::info("Payment Intent Succeeded: " . $paymentIntent->id);

                try {
                    $payment = Payment::where('payment_intent_id', $paymentIntent->id)->firstOrFail();
                    $order = $payment->order;

                    // Retrieve Charge and Balance Transaction details
                    $charge = null;
                    if ($paymentIntent->latest_charge) {
                        $charge = Charge::retrieve($paymentIntent->latest_charge);
                    }

                    $balanceTransaction = null;
                    if ($charge && $charge->balance_transaction) {
                        $balanceTransaction = BalanceTransaction::retrieve($charge->balance_transaction);
                    }

                    $updateData = [
                        'status' => PaymentStatusEnum::PAID(),
                        'payment_method' => $paymentIntent->payment_method_types[0] ?? 'unknown', // Keep old field for compatibility
                        'metadata' => array_merge($payment->metadata ?? [], ['stripe_payment_intent_data' => $paymentIntent->toArray()]),
                    ];

                    if ($charge) {
                        $updateData['stripe_charge_id'] = $charge->id;
                        $updateData['amount_captured'] = $charge->amount_captured / 100; // Convert to dollars
                        $updateData['currency_captured'] = $charge->currency;
                        $updateData['payment_method_type'] = $charge->payment_method_details->type ?? null;

                        if (isset($charge->payment_method_details->card)) {
                            $updateData['card_brand'] = $charge->payment_method_details->card->brand ?? null;
                            $updateData['card_last_four'] = $charge->payment_method_details->card->last4 ?? null;
                        }
                    }

                    if ($balanceTransaction) {
                        $updateData['stripe_balance_transaction_id'] = $balanceTransaction->id;
                        $updateData['net_amount'] = $balanceTransaction->net / 100; // Convert to dollars
                        $updateData['fees_amount'] = $balanceTransaction->fee / 100; // Convert to dollars
                        $updateData['available_on'] = \Carbon\Carbon::createFromTimestamp($balanceTransaction->available_on);
                    }

                    $payment->update($updateData);

                    // Update Order Status
                    if ($order->status === OrderStatusEnum::PENDING) {
                        $order->status = OrderStatusEnum::PROCESSING;
                        $order->save();
                    }

                    Log::info("Order {$order->id} and Payment {$payment->id} updated successfully to 'paid' via Payment Intent with charge/balance details.");

                } catch (Throwable $e) {
                    Log::error("Error processing payment_intent.succeeded for Payment Intent {$paymentIntent->id}: " . $e->getMessage());
                    return $this->errorResponse('Error processing event.', 500);
                }
                break;

            case 'payment_intent.payment_failed':
                $paymentIntent = $event->data->object;
                Log::warning("Payment Intent Failed: " . $paymentIntent->id);

                try {
                    $payment = Payment::where('payment_intent_id', $paymentIntent->id)->firstOrFail();
                    $payment->update([
                        'status' => PaymentStatusEnum::FAILED(),
                        'metadata' => array_merge($payment->metadata ?? [], ['stripe_payment_intent_data' => $paymentIntent->toArray()]),
                    ]);
                    // Optionally update order status or notify user
                } catch (Throwable $e) {
                    Log::error("Error processing payment_intent.payment_failed for Payment Intent {$paymentIntent->id}: " . $e->getMessage());
                    return $this->errorResponse('Error processing event.', 500);
                }
                break;

            case 'payment_intent.canceled':
                $paymentIntent = $event->data->object;
                Log::info("Payment Intent Canceled: " . $paymentIntent->id);

                try {
                    $payment = Payment::where('payment_intent_id', $paymentIntent->id)->firstOrFail();
                    $payment->update([
                        'status' => PaymentStatusEnum::CANCELLED(),
                        'metadata' => array_merge($payment->metadata ?? [], ['stripe_payment_intent_data' => $paymentIntent->toArray()]),
                    ]);
                    // Optionally update order status or notify user
                } catch (Throwable $e) {
                    Log::error("Error processing payment_intent.canceled for Payment Intent {$paymentIntent->id}: " . $e->getMessage());
                    return $this->errorResponse('Error processing event.', 500);
                }
                break;

            // ... handle other payment_intent event types as needed
            default:
                Log::info('Received unknown Payment Intent event type ' . $event->type);
                break;
        }

        return $this->successResponse(null, 'Payment Intent Webhook handled.', 200);
    }
}
