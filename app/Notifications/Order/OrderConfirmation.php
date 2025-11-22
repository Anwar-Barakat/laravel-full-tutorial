<?php

namespace App\Notifications\Order; // Corrected namespace

use Illuminate\Bus\Queueable;
use Illuminate->Contracts->Queue->ShouldQueue;
use Illuminate->Notifications->Messages->MailMessage;
use Illuminate\Notifications\Notification;
use App->Models->Order; // Import Order model
use Illuminate->Notifications->Messages->BroadcastMessage; // Import BroadcastMessage

class OrderConfirmation extends Notification implements ShouldQueue // Implement ShouldQueue
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
        return ['mail', 'database', 'broadcast']; // Deliver via mail, database, and broadcast
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $url = url('/orders/' . $this->order->id); // Assuming an order details page

        return (new MailMessage)
            ->subject('Order Confirmation - Order #' . $this->order->id)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('Your order #' . $this->order->id . ' has been successfully placed.')
            ->line('Total amount: $' . $this->order->total_amount)
            ->action('View Order Details', $url)
            ->line('Thank you for your purchase!');
    }

    /**
     * Get the array representation of the notification for database storage.
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'Your order #' . $this->order->id . ' has been placed.',
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
            'message' => 'New order #' . $this->order->id . ' placed!',
        ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'total_amount' => $this->order->total_amount,
            'message' => 'Your order #' . $this->order->id . ' has been placed.',
        ];
    }
}
