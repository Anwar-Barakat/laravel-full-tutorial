<?php

namespace App\Http\Controllers\Api\_21_Order_Events_Listeners;

use App\Actions\Order\CreateOrderAction;
use App\Data\OrderData;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Traits\ApiResponseTrait;
use App\Models\Order;
use App\Events\Order\OrderCreated;
use Illuminate\Http\JsonResponse;

class OrderEventController extends Controller
{
    use ApiResponseTrait;

    public function store(OrderData $orderData, CreateOrderAction $createOrderAction): JsonResponse
    {
        $this->authorize('create', Order::class);

        try {
            $order = $createOrderAction->execute($orderData);

            event(new OrderCreated($order));

            return $this->successResponse(new OrderResource($order), 'Order created successfully and event dispatched.', 201);
        } catch (\Throwable $e) {
            return $this->errorResponse('Failed to create order: ' . $e->getMessage(), 500);
        }
    }
}