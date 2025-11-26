<?php

namespace App\Data\Order;

use App\Data\OrderItem\OrderItemData;
use App\Enums\Order\OrderStatusEnum;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Illuminate\Validation\Rule;

class OrderData extends Data
{
    public function __construct(
        public ?int $user_id,
        // public ?string $slug, // Remove slug from constructor
        public float $total_amount,
        public ?string $status,
        public ?string $shipping_address,
        public ?string $billing_address,
        public string $payment_method,
        /** @var \App\Data\OrderItem\OrderItemData[] */
        /** @var DataCollection<OrderItemData> */
        public DataCollection $order_items,
    ) {}

    public static function rules(): array
    {
        return [
            'user_id'           => ['nullable', 'integer', 'exists:users,id'],
            // 'slug' => ['nullable', 'string', 'unique:orders,slug'], // Remove slug validation
            'total_amount'      => ['required', 'numeric', 'min:0'],
            'status'            => ['nullable', Rule::in(OrderStatusEnum::toArray())],
            'shipping_address'  => ['nullable', 'string'],
            'billing_address'   => ['nullable', 'string'],
            'payment_method'    => ['required', 'string'],
            'order_items'       => ['required', 'array', 'min:1'],
            'order_items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'order_items.*.quantity' => ['required', 'integer', 'min:1'],
            'order_items.*.price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
