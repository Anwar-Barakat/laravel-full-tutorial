<?php

namespace App\Actions\Order;

use App\Models\Order;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteOrderAction
{
    use AsAction;

    public function execute(Order $order): bool
    {
        return $order->delete();
    }
}
