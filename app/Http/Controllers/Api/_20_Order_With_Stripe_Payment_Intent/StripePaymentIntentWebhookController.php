<?php

namespace App\Http\Controllers\Api\_20_Order_With_Stripe_Payment_Intent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Traits\ApiResponseTrait;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;
use Illuminate\Support\Facades\Log;
use Throwable;

use App\Actions\Stripe\ProcessPaymentIntentSucceededAction;
use App\Actions\Stripe\ProcessPaymentIntentFailedAction;
use App\Actions\Stripe\ProcessPaymentIntentCanceledAction;
use Symfony\Component\HttpFoundation\JsonResponse;

class StripePaymentIntentWebhookController extends Controller
{
    use ApiResponseTrait;

    public function handleWebhook(
        Request $request,
        ProcessPaymentIntentSucceededAction $processPaymentIntentSucceededAction,
        ProcessPaymentIntentFailedAction $processPaymentIntentFailedAction,
        ProcessPaymentIntentCanceledAction $processPaymentIntentCanceledAction
    ): JsonResponse {
        $payload = $request->getContent();
        $sigHeader = $request->header('stripe-signature');
        $webhookSecret = env('STRIPE_WEBHOOK_SECRET_PAYMENT_INTENTS');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe Payment Intent Webhook Signature Verification Failed: ' . $e->getMessage());
            return $this->errorResponse('Webhook signature verification failed.', 400);
        } catch (Throwable $e) {
            Log::error('Stripe Payment Intent Webhook Error: ' . $e->getMessage());
            return $this->errorResponse('Webhook error.', 400);
        }

        switch ($event->type) {
            case 'payment_intent.succeeded':
                try {
                    $processPaymentIntentSucceededAction->execute($event->data->object);
                } catch (Throwable $e) {
                    return $this->errorResponse('Error processing payment_intent.succeeded event.', 500);
                }
                break;

            case 'payment_intent.payment_failed':
                try {
                    $processPaymentIntentFailedAction->execute($event->data->object);
                } catch (Throwable $e) {
                    return $this->errorResponse('Error processing payment_intent.payment_failed event.', 500);
                }
                break;

            case 'payment_intent.canceled':
                try {
                    $processPaymentIntentCanceledAction->execute($event->data->object);
                } catch (Throwable $e) {
                    return $this->errorResponse('Error processing payment_intent.canceled event.', 500);
                }
                break;

            default:
                Log::info('Received unknown Payment Intent event type ' . $event->type);
                break;
        }

        return $this->successResponse(null, 'Payment Intent Webhook handled.', 200);
    }
}
