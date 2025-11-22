<?php

namespace App\Actions\Stripe;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Stripe\Customer;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class CreatePaymentIntentAction
{
    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    public function execute(Order $order, Customer $stripeCustomer): PaymentIntent
    {
        $user = $order->user;
        $amountInCents = (int) ($order->total_amount * 100);

        $payment = Payment::firstOrCreate(
            ['order_id' => $order->id],
            [
                'user_id' => $user->id,
                'amount' => $order->total_amount,
                'currency' => 'usd',
                'status' => PaymentStatusEnum::PENDING(),
                'payment_method' => null,
            ]
        );

        $paymentIntent = null;

        if ($payment->payment_intent_id) {
            try {
                $paymentIntent = PaymentIntent::retrieve($payment->payment_intent_id);
                if ($paymentIntent->status !== 'succeeded' && $paymentIntent->status !== 'canceled') {
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
                    $paymentIntent = null;
                }
            } catch (Throwable $e) {
                Log::warning("Could not retrieve existing Payment Intent {$payment->payment_intent_id}: " . $e->getMessage());
                $paymentIntent = null;
            }
        }

        if (!$paymentIntent) {
            $paymentIntent = PaymentIntent::create([
                'amount' => $amountInCents,
                'currency' => 'usd',
                'payment_method_types' => ['card'],
                'customer' => $stripeCustomer->id,
                'metadata' => [
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                ],
            ]);
        }

        $payment->update([
            'payment_intent_id' => $paymentIntent->id,
            'user_id' => $user->id,
        ]);

        return $paymentIntent;
    }
}
