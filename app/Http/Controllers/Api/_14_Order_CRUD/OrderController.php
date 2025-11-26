<?php

namespace App\Http\Controllers\Api\_14_Order_CRUD;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Http\Traits\ApiResponseTrait;
use App\Data\Order\OrderData;
use App\Data\Order\UpdateOrderData;
use App\Http\Resources\OrderResource;

use App\Actions\Order\GetAllOrdersAction;
use App\Actions\Order\FindOrderAction;
use App\Actions\Order\CreateOrderAction;
use App\Actions\Order\UpdateOrderAction;
use App\Actions\Order\DeleteOrderAction;

class OrderController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request, GetAllOrdersAction $action)
    {
        $this->authorize('viewAny', Order::class);

        $orders = $action->execute($request->all());

        return $this->successResponse(OrderResource::collection($orders), 'Orders retrieved successfully.');
    }

    public function store(OrderData $orderData, CreateOrderAction $action)
    {
        $this->authorize('create', Order::class);

        $order = $action->execute($orderData);

        return $this->successResponse(new OrderResource($order), 'Order created successfully.', 201);
    }

    public function show(string $id, FindOrderAction $action)
    {
        $order = $action->execute($id);

        if (!$order) {
            return $this->notFoundResponse('Order not found.');
        }

        $this->authorize('view', $order);

        return $this->successResponse(new OrderResource($order), 'Order retrieved successfully.');
    }

    public function update(UpdateOrderData $orderData, string $id, UpdateOrderAction $action, FindOrderAction $findOrderAction)
    {
        $order = $findOrderAction->execute($id);

        if (!$order) {
            return $this->notFoundResponse('Order not found.');
        }

        $this->authorize('update', $order);

        $order = $action->execute($order, $orderData);

        return $this->successResponse(new OrderResource($order), 'Order updated successfully.');
    }

    public function destroy(string $id, DeleteOrderAction $action, FindOrderAction $findOrderAction)
    {
        $order = $findOrderAction->execute($id);

        if (!$order) {
            return $this->notFoundResponse('Order not found.');
        }

        $this->authorize('delete', $order);

        $action->execute($order);

        return $this->successResponse(null, 'Order deleted successfully.', 204);
    }
}
