<?php

namespace App\Observers;

use App\Models\Order;
use App\Enums\Order\OrderStatusEnum;

class OrderObserver
{
    /**
     * Handle the Order "creating" event.
     *
     * @param  \App\Models\Order  $order
     * @return void
     */
    public function creating(Order $order): void
    {
        if (empty($order->status)) {
            $order->status = OrderStatusEnum::pending();
        }
    }

    /**
     * Handle the Order "created" event.
     */
    public function created(Order $order): void
    {
        //
    }

    /**
     * Handle the Order "updated" event.
     */
    public function updated(Order $order): void
    {
        // You might want to regenerate slug if certain fields that define it change
        // For now, we'll assume the slug is set on creation or explicitly provided.
        // If a new slug is provided through the DTO, it will be handled there.
    }

    /**
     * Handle the Order "deleted" event.
     */
    public function deleted(Order $order): void
    {
        //
    }

    /**
     * Handle the Order "restored" event.
     */
    public function restored(Order $order): void
    {
        //
    }

    /**
     * Handle the Order "force deleted" event.
     */
    public function forceDeleted(Order $order): void
    {
        //
    }
}
