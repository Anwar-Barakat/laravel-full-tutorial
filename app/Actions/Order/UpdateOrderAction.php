<?php

namespace App\Actions\Order;

use App\Data\Order\UpdateOrderData;
use App\Data\OrderItem\OrderItemData;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\LaravelData\Optional;

class UpdateOrderAction
{
    use AsAction;

    public function execute(Order $order, UpdateOrderData $orderData): Order
    {
        return DB::transaction(function () use ($order, $orderData) {
            $order->update($orderData->except('order_items')->toArray());

            if (!$orderData->order_items instanceof Optional) {
                $order->orderItems()->delete();
                foreach ($orderData->order_items as $orderItemData) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $orderItemData->product_id,
                        'quantity' => $orderItemData->quantity,
                        'price' => $orderItemData->price,
                    ]);
                }
            }

            return $order->load(['user', 'orderItems.product']);
        });
    }
}
