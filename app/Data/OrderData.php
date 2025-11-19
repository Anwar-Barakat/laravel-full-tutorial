<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Illuminate\Validation\Rule;

class OrderData extends Data
{
    public function __construct(
        public ?int $user_id,
        public float $total_amount,
        public string $status,
        public ?string $shipping_address,
        public ?string $billing_address,
        public string $payment_method,
        /** @var \App\Data\OrderItemData[] */
        public DataCollection $order_items,
    ) {}

    public static function rules(): array
    {
        return [
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['pending', 'completed', 'cancelled', 'processing'])],
            'shipping_address' => ['nullable', 'string'],
            'billing_address' => ['nullable', 'string'],
            'payment_method' => ['required', 'string'],
            'order_items' => ['required', 'array', 'min:1'],
            'order_items.*' => ['required', 'array'], // Spatie Data will handle validation of nested DTOs if they have rules()
        ];
    }
}