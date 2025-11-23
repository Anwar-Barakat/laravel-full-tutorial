<?php

namespace App\Actions\Stripe;

use App\Models\Order;
use App\Models\Payment;
use Stripe\PaymentIntent;
use Stripe\Charge;
use Stripe\BalanceTransaction;
use App\Enums\Order\OrderStatusEnum;
use App\Enums\Payment\PaymentStatusEnum;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessPaymentIntentSucceededAction
{
    public function execute(PaymentIntent $paymentIntent): void
    {
        try {
            $payment = Payment::where('payment_intent_id', $paymentIntent->id)->firstOrFail();
            $order = $payment->order;

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
                'payment_method' => $paymentIntent->payment_method_types[0] ?? 'unknown',
                'metadata' => array_merge($payment->metadata ?? [], ['stripe_payment_intent_data' => $paymentIntent->toArray()]),
            ];

            if ($charge) {
                $updateData['stripe_charge_id'] = $charge->id;
                $updateData['amount_captured'] = $charge->amount_captured / 100;
                $updateData['currency_captured'] = $charge->currency;
                $updateData['payment_method_type'] = $charge->payment_method_details->type ?? null;

                if (isset($charge->payment_method_details->card)) {
                    $updateData['card_brand'] = $charge->payment_method_details->card->brand ?? null;
                    $updateData['card_last_four'] = $charge->payment_method_details->card->last4 ?? null;
                }
            }

            if ($balanceTransaction) {
                $updateData['stripe_balance_transaction_id'] = $balanceTransaction->id;
                $updateData['net_amount'] = $balanceTransaction->net / 100;
                $updateData['fees_amount'] = $balanceTransaction->fee / 100;
                $updateData['available_on'] = \Carbon\Carbon::createFromTimestamp($balanceTransaction->available_on);
            }

            $payment->update($updateData);

            if ($order->status === OrderStatusEnum::PENDING) {
                $order->status = OrderStatusEnum::PROCESSING;
                $order->save();
            }

            Log::info("Order {$order->id} and Payment {$payment->id} updated successfully to 'paid' via Payment Intent with charge/balance details.");

        } catch (Throwable $e) {
            Log::error("Error processing payment_intent.succeeded for Payment Intent {$paymentIntent->id}: " . $e->getMessage());
            throw $e;
        }
    }
}
