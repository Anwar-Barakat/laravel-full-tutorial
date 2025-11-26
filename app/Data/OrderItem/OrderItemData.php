<?php

namespace App\Data\OrderItem;

use Spatie\LaravelData\Data;

class OrderItemData extends Data
{
    public function __construct(
        public int $product_id,
        public int $quantity,
        public float $price,
    ) {}

    public static function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
        ];
    }
}