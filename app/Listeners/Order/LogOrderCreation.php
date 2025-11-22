<?php

namespace App\Listeners\Order;

use App\Events\Order\OrderCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class LogOrderCreation implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct()
    {
        //
    }

    public function handle(OrderCreated $event): void
    {
        $order = $event->order;

        Log::info("New order created: ID {$order->id}, Total: \${$order->total_amount}, User: {$order->user->email}");
    }
}
