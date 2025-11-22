<?php

namespace App\Notifications\Product;

use App\Models\Product;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewProductNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Product $product, public User $user)
    {
        $this->product = $product;
        $this->user = $user;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'broadcast'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Product Alert: ' . $this->product->name)
            ->greeting('Hello ' . $this->user->name . '!')
            ->line('A new exciting product has just been added to our catalog:')
            ->line('**Product Name:** ' . $this->product->name)
            ->line('**Description:** ' . $this->product->description)
            ->line('**Price:** $' . number_format($this->product->price, 2))
            ->action('View Product', url('/products/' . $this->product->id))
            ->line('Thank you for subscribing to our updates!');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'product_description' => $this->product->description,
            'product_price' => $this->product->price,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'message' => 'A new product "' . $this->product->name . '" has been added!',
        ]);
    }
}
