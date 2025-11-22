<?php

namespace App\Actions\Stripe;

use App\Models\Payment;
use Stripe\PaymentIntent;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessPaymentIntentCanceledAction
{
    public function execute(PaymentIntent $paymentIntent): void
    {
        Log::info("Payment Intent Canceled: " . $paymentIntent->id);

        try {
            $payment = Payment::where('payment_intent_id', $paymentIntent->id)->firstOrFail();
            $payment->update([
                'status' => PaymentStatusEnum::CANCELLED(),
                'metadata' => array_merge($payment->metadata ?? [], ['stripe_payment_intent_data' => $paymentIntent->toArray()]),
            ]);
        } catch (Throwable $e) {
            Log::error("Error processing payment_intent.canceled for Payment Intent {$paymentIntent->id}: " . $e->getMessage());
            throw $e;
        }
    }
}
