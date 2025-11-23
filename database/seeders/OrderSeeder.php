<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Order::factory(10)->create()->each(function (Order $order) {
            // Each order will have 1 to 5 order items
            $products = Product::inRandomOrder()->limit(rand(1, 5))->get();
            $totalAmount = 0;

            foreach ($products as $product) {
                $quantity = rand(1, 3);
                $price = $product->price;
                $totalAmount += ($quantity * $price);

                OrderItem::factory()->create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $price,
                ]);
            }

            // Update the total amount for the order
            $order->update(['total_amount' => $totalAmount]);
        });
    }
}
