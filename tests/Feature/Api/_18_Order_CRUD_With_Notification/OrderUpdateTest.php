<?php

namespace Tests\Feature\Api\_18_Order_CRUD_With_Notification;

use App\Data\Order\UpdateOrderData;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BasePermissionTest;
use App\Enums\Order\OrderStatusEnum;
use App\Data\OrderItem\OrderItemData;

class OrderUpdateTest extends BasePermissionTest
{
    use RefreshDatabase;

    protected string $apiVersion = 'v18';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders";
    }

    private function getOrderData(User $user, Product $product = null): array
    {
        if (!$product) {
            $product = Product::factory()->create();
        }

        return UpdateOrderData::from([
            'user_id' => $user->id,
            'total_amount' => 200.00,
            'status' => OrderStatusEnum::COMPLETED,
            'shipping_address' => '456 Oak Ave',
            'billing_address' => '456 Oak Ave',
            'payment_method' => 'Bank Transfer',
            'order_items' => [
                OrderItemData::from([
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'price' => $product->price,
                ])->toArray()
            ]
        ])->toArray();
    }

    public function test_authenticated_user_with_permission_can_update_an_order()
    {
        $user = $this->createUserWithPermission('update-order');
        $order = Order::factory()->create(['user_id' => $user->id]);
        $updatedOrderData = $this->getOrderData($user);

        $response = $this->actingAs($user)->putJson($this->getBaseUrl() . '/' . $order->id, $updatedOrderData);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'id',
                    'user_id',
                    'total_amount',
                    'status',
                    'shipping_address',
                    'billing_address',
                    'payment_method',
                    'slug',
                    'created_at',
                    'updated_at',
                ]
            ])
            ->assertJsonFragment([
                'id' => $order->id,
                'total_amount' => 200.00,
                'status' => OrderStatusEnum::COMPLETED,
                'payment_method' => 'Bank Transfer',
            ]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'total_amount' => 200.00,
            'status' => OrderStatusEnum::COMPLETED,
            'payment_method' => 'Bank Transfer',
        ]);
    }

    public function test_order_update_returns_404_if_order_not_found()
    {
        $user = $this->createUserWithPermission('update-order');
        $updatedOrderData = $this->getOrderData($user);

        $response = $this->actingAs($user)->putJson($this->getBaseUrl() . '/9999', $updatedOrderData); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Order not found.'
            ]);
    }

    public function test_unauthenticated_user_cannot_update_an_order()
    {
        $user = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $user->id]);
        $updatedOrderData = $this->getOrderData($user);

        $response = $this->putJson($this->getBaseUrl() . '/' . $order->id, $updatedOrderData);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.'
            ]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'total_amount' => $order->total_amount]); // Ensure no update occurred
    }

    public function test_order_update_fails_with_invalid_data()
    {
        $user = $this->createUserWithPermission('update-order');
        $order = Order::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->putJson($this->getBaseUrl() . '/' . $order->id, ['total_amount' => -100]); // Invalid total_amount

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['total_amount']);
    }
}
