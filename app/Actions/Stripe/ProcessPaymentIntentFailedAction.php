<?php

namespace App\Actions\Stripe;

use App\Models\Payment;
use Stripe\PaymentIntent;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessPaymentIntentFailedAction
{
    public function execute(PaymentIntent $paymentIntent): void
    {
        Log::warning("Payment Intent Failed: " . $paymentIntent->id);

        try {
            $payment = Payment::where('payment_intent_id', $paymentIntent->id)->firstOrFail();
            $payment->update([
                'status' => PaymentStatusEnum::FAILED(),
                'metadata' => array_merge($payment->metadata ?? [], ['stripe_payment_intent_data' => $paymentIntent->toArray()]),
            ]);
        } catch (Throwable $e) {
            Log::error("Error processing payment_intent.payment_failed for Payment Intent {$paymentIntent->id}: " . $e->getMessage());
            throw $e;
        }
    }
}
