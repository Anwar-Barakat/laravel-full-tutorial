<?php

namespace App\Listeners\Order;

use App\Events\Order\OrderCreated;
use App\Notifications\Order\OrderConfirmation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SendOrderConfirmationEmail implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct()
    {
    }

    public function handle(OrderCreated $event): void
    {
        $order = $event->order;
        $user = $order->user;

        if ($user) {
            Notification::send($user, new OrderConfirmation($order));
        }

        Log::info("Order confirmation notification dispatched for Order #{$order->id} to {$user->email}");
    }
}
