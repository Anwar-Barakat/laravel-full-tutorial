<?php

namespace App\Actions\Order;

use App\Data\OrderData;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateOrderAction
{
    use AsAction;

    public function handle(Order $order, OrderData $orderData): Order
    {
        return DB::transaction(function () use ($order, $orderData) {
            $order->update([
                'user_id' => $orderData->user_id ?? $order->user_id,
                'slug' => $orderData->slug ?? $order->slug, // Update slug if provided in DTO
                'total_amount' => $orderData->total_amount ?? $order->total_amount,
                'status' => $orderData->status ?? $order->status,
                'shipping_address' => $orderData->shipping_address ?? $order->shipping_address,
                'billing_address' => $orderData->billing_address ?? $order->billing_address,
                'payment_method' => $orderData->payment_method ?? $order->payment_method,
            ]);

            // Simple update for order items: delete all existing and re-create.
            // More complex logic (diffing, partial updates) could be added here.
            if ($orderData->order_items) {
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
