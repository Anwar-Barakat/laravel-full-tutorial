<?php

namespace App\Notifications\Order;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Order; // Import Order model
use Illuminate\Notifications\Messages\BroadcastMessage; // Import BroadcastMessage

class OrderCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public Order $order;

    /**
     * Create a new notification instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'broadcast']; // Example channels
    }

    /**
     * Get the mail representation of the notification.
     */
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

    /**
     * Get the array representation of the notification for database storage.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'New order #' . $this->order->id . ' created.',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'New order #' . $this->order->id . ' has been created!',
        ]);
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'New order #' . $this->order->id . ' created.',
        ];
    }
}
