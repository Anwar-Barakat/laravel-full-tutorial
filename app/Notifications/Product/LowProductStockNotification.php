<?php

namespace App\Notifications\Product;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LowProductStockNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $lowStockProducts;

    /**
     * Create a new notification instance.
     */
    public function __construct(Collection $lowStockProducts)
    {
        $this->lowStockProducts = $lowStockProducts;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mailMessage = (new MailMessage)
            ->subject('Low Stock Alert')
            ->line('The following products are running low on stock:');

        foreach ($this->lowStockProducts as $product) {
            $mailMessage->line("- {$product->name} (Stock: {$product->stock})");
        }

        $mailMessage->action('View Products', url('/admin/products'))
            ->line('Please update the stock levels soon.');

        return $mailMessage;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'There are ' . $this->lowStockProducts->count() . ' products running low on stock.',
            'products' => $this->lowStockProducts->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'stock' => $product->stock,
                ];
            })->toArray(),
        ];
    }
}
