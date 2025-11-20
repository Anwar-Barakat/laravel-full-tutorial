<?php

namespace App\Data;

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
        public ?OrderStatusEnum $status,
        public ?string $shipping_address,
        public ?string $billing_address,
        public string $payment_method,
        /** @var \App\Data\OrderItemData[] */
        public DataCollection $order_items,
    ) {}

    public static function rules(): array
    {
        return [
            'user_id'           => ['nullable', 'integer', 'exists:users,id'],
            // 'slug' => ['nullable', 'string', 'unique:orders,slug'], // Remove slug validation
            'total_amount'      => ['required', 'numeric', 'min:0'],
            'status'            => ['nullable', Rule::enum(OrderStatusEnum::class)],
            'shipping_address'  => ['nullable', 'string'],
            'billing_address'   => ['nullable', 'string'],
            'payment_method'    => ['required', 'string'],
            'order_items'       => ['required', 'array', 'min:1'],
            'order_items.*'     => ['required', 'array'],
        ];
    }
}
