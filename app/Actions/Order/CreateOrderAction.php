<?php

namespace App\Actions\Order;

use App\Data\OrderData;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;
// use Illuminate\Support\Str; // Remove this line

class CreateOrderAction
{
    use AsAction;

    public function handle(OrderData $orderData): Order
    {
        return DB::transaction(function () use ($orderData) {

            $order = Order::create([
                'user_id' => $orderData->user_id,
                'total_amount' => $orderData->total_amount,
                'status' => $orderData->status,
                'shipping_address' => $orderData->shipping_address,
                'billing_address' => $orderData->billing_address,
                'payment_method' => $orderData->payment_method,
            ]);

            foreach ($orderData->order_items as $orderItemData) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $orderItemData->product_id,
                    'quantity' => $orderItemData->quantity,
                    'price' => $orderItemData->price,
                ]);
            }

            return $order->load(['user', 'orderItems.product']);
        });
    }
}
