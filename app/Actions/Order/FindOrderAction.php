<?php

namespace App\Actions\Order;

use App\Models\Order;
use Lorisleiva\Actions\Concerns\AsAction;

class FindOrderAction
{
    use AsAction;

    public function handle(string $id): ?Order
    {
        return Order::with(['user', 'orderItems.product'])->find($id);
    }
}
