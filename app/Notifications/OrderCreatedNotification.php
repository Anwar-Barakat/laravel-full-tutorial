<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\DatabaseMessage;

class OrderCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $order;

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
        return ['mail', 'database', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('Your Order Has Been Placed!')
                    ->markdown('mail.orders.created', ['order' => $this->order, 'user' => $notifiable]); // $notifiable is now the User
    }

    /**
     * Get the array representation of the notification.
     * This is used by the database channel.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'amount' => $this->order->total_amount,
            'status' => $this->order->status->value, // Use ->value for enum
            'message' => 'New order created!',
        ];
    }

    /**
     * Get the database representation of the notification.
     * This method is explicitly defined when you want to customize the database message.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'amount' => $this->order->total_amount,
            'status' => $this->order->status->value,
            'message' => 'New order created!',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'order_id' => $this->order->id,
            'amount' => $this->order->total_amount,
            'status' => $this->order->status->value,
            'message' => 'New order created!',
        ]);
    }
}
