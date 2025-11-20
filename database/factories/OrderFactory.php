<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Enums\Order\OrderStatusEnum;
// use Illuminate\Support\Str; // Remove this line

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // $name = $this->faker->unique()->sentence(2); // Remove slug source
        return [
            'user_id' => User::factory(),
            'total_amount' => $this->faker->randomFloat(2, 10, 1000),
            'status' => OrderStatusEnum::random(),
            'shipping_address' => $this->faker->address,
            'billing_address' => $this->faker->address,
            'payment_method' => $this->faker->randomElement(['Credit Card', 'PayPal', 'Bank Transfer']),
            // 'slug' => Str::slug($name), // Remove slug assignment
        ];
    }
}