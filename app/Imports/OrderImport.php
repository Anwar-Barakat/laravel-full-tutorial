<?php

namespace App\Imports;

use App\Models\User;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Enums\Order\OrderStatusEnum;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Contracts\Queue\ShouldQueue;

class OrderImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnError, SkipsOnFailure, WithChunkReading, ShouldQueue
{
    use SkipsErrors, SkipsFailures;

    /**
     * Map each Excel row to models.
     */
    public function model(array $row)
    {
        return DB::transaction(function () use ($row) {

            // 1️⃣ Find or create the user
            $user = User::firstOrCreate(
                ['email' => $row['user_email']],
                [
                    'name' => $row['user_name'] ?? Str::before($row['user_email'], '@'),
                    'password' => bcrypt(Str::random(10)),
                ]
            );

            // 2️⃣ Create the order
            $order = Order::create([
                'user_id' => $user->id,
                'total_amount' => $row['total_amount'],
                'status' => OrderStatusEnum::tryFrom(Str::upper($row['status'])) ?? OrderStatusEnum::PENDING,
                'shipping_address' => $row['shipping_address'] ?? 'N/A',
                'billing_address' => $row['billing_address'] ?? 'N/A',
                'payment_method' => $row['payment_method'] ?? 'Stripe',
            ]);

            // 3️⃣ Create order items if they exist in the row
            // Expecting 'order_items_json' column in Excel with JSON array of items
            if (!empty($row['order_items_json'])) {
                $items = json_decode($row['order_items_json'], true);
                if (is_array($items)) {
                    foreach ($items as $itemData) {
                        $productId = $itemData['product_id'] ?? null;
                        $quantity = $itemData['quantity'] ?? 1;
                        $price = $itemData['price'] ?? null;

                        if (!$productId)
                            continue;

                        $product = Product::find($productId);
                        if (!$product)
                            continue;

                        if (!$price || $price < 0) {
                            $price = $product->price;
                        }

                        OrderItem::create([
                            'order_id' => $order->id,
                            'product_id' => $product->id,
                            'quantity' => $quantity,
                            'price' => $price,
                        ]);
                    }
                }
            }

            return $order;
        });
    }

    /**
     * Validation rules for each row.
     */
    public function rules(): array
    {
        return [
            'user_email' => ['required', 'email', 'max:255'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(array_column(OrderStatusEnum::cases(), 'value'))],
            'shipping_address' => ['nullable', 'string', 'max:255'],
            'billing_address' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['nullable', 'string', 'max:255'],
            'order_items_json' => ['nullable', 'json'], // JSON string for order items
        ];
    }

    /**
     * Custom validation messages.
     */
    public function customValidationMessages()
    {
        return [
            'user_email.required' => 'A user email is required for each order.',
            'total_amount.required' => 'The total amount is required.',
            'status.in' => 'The status must be one of the valid order statuses.',
            'shipping_address.string' => 'The shipping address must be a string.',
            'billing_address.string' => 'The billing address must be a string.',
            'payment_method.string' => 'The payment method must be a string.',
            'order_items_json.json' => 'The order items must be a valid JSON string.',
        ];
    }

    /**
     * Process large files in chunks.
     */
    public function chunkSize(): int
    {
        return 500; // Adjust based on your memory limits
    }
}
