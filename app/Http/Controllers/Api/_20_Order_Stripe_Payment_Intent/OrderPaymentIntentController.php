<?php

namespace App\Http\Controllers\Api\_20_Order_Stripe_Payment_Intent;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Http\Traits\ApiResponseTrait;
use App\Data\OrderData;
use App\Actions\Order\CreateOrderAction;
use App\Http\Resources\OrderResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class OrderPaymentIntentController extends Controller
{
    use ApiResponseTrait;

    public function createOrder(OrderData $orderData, CreateOrderAction $createOrderAction): JsonResponse
    {
        $this->authorize('create', Order::class); // Authorize order creation

        try {
            $order = $createOrderAction->execute($orderData);
            return $this->successResponse(new OrderResource($order), 'Order created successfully. Proceed to payment intent creation.', 201);
        } catch (\Throwable $e) {
            Log::error("Order creation failed in OrderPaymentIntentController: " . $e->getMessage(), ['trace' => $e->getTrace()]);
            return $this->errorResponse('Failed to create order: ' . $e->getMessage(), 500);
        }
    }
}
