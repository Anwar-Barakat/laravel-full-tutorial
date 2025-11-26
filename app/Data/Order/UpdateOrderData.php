<?php

namespace App\Data\Order;

use App\Data\OrderItem\OrderItemData;
use App\Enums\Order\OrderStatusEnum;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Optional;

class UpdateOrderData extends Data
{
    public function __construct(
        public int|Optional $user_id,
        public float|Optional $total_amount,
        public string|Optional $status,
        public string|Optional $shipping_address,
        public string|Optional $billing_address,
        public string|Optional $payment_method,
        /** @var \App\Data\OrderItem\OrderItemData[] */
        public DataCollection|Optional $order_items,
    ) {}

    public static function rules(): array
    {
        return [
            'user_id'           => ['sometimes', 'integer', 'exists:users,id'],
            'total_amount'      => ['sometimes', 'numeric', 'min:0'],
            'status'            => ['sometimes', Rule::in(OrderStatusEnum::toArray())],
            'shipping_address'  => ['sometimes', 'string'],
            'billing_address'   => ['sometimes', 'string'],
            'payment_method'    => ['sometimes', 'string'],
            'order_items'       => ['sometimes', 'array', 'min:1'],
            'order_items.*'     => ['sometimes', 'array'],
        ];
    }
}
