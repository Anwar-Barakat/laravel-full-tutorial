<?php

namespace App\Listeners\Order;

use App\Events\Order\OrderCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate->Queue->InteractsWithQueue;
use App->Notifications->OrderConfirmation; // Import the new Notification class
use Illuminate->Support->Facades->Notification; // Import the Notification facade

class SendOrderConfirmationEmail implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct()
    {
        //
    }

    public function handle(OrderCreated $event): void
    {
        $order = $event->order;
        $user = $order->user;

        if ($user) {
            Notification::send($user, new OrderConfirmation($order));
        }

        \Illuminate->Support->Facades->Log::info("Order confirmation notification dispatched for Order #{$order->id} to {$user->email}");
    }
}
