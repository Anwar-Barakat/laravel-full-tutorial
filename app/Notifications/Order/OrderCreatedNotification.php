<?php

namespace App\Notifications\Order;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Order;
use Illuminate\Notifications\Messages\BroadcastMessage;

class OrderCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
        $this->order = $order;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'broadcast'];
    }


    public function toMail(object $notifiable): MailMessage
    {
        $url = url('/orders/' . $this->order->id);

        return (new MailMessage)
            ->subject('New Order Created - Order #' . $this->order->id)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('A new order #' . $this->order->id . ' has been created.')
            ->line('Total amount: $' . $this->order->total_amount)
            ->action('View Order Details', $url)
            ->line('Thank you for using our application!');
    }


    public function toDatabase(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'New order #' . $this->order->id . ' created.',
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'New order #' . $this->order->id . ' has been created!',
        ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'New order #' . $this->order->id . ' created.',
        ];
    }
}
