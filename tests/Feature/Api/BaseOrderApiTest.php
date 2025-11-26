<?php

namespace Tests\Feature\Api;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Collection;

class BaseOrderApiTest extends BasePermissionTest
{
    protected string $apiVersion = 'v15';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders-exports";
    }

    protected function createOrder(array $attributes = []): Order
    {
        return Order::factory()->create($attributes);
    }

    protected function createOrders(int $count = 1, array $attributes = []): Collection
    {
        return Order::factory()->count($count)->create($attributes);
    }

    protected function createOrderItem(array $attributes = []): OrderItem
    {
        return OrderItem::factory()->create($attributes);
    }

    protected function createOrderItems(int $count = 1, array $attributes = []): Collection
    {
        return OrderItem::factory()->count($count)->create($attributes);
    }
}
