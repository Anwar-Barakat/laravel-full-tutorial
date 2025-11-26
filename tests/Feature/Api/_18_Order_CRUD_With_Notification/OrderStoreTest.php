<?php

namespace Tests\Feature\Api\_18_Order_CRUD_With_Notification;

use App\Data\Order\OrderData;
use App\Models\User;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BasePermissionTest;
use Illuminate\Support\Facades\Notification;
use App\Notifications\Order\OrderCreatedNotification;
use App\Enums\Order\OrderStatusEnum;
use App\Data\OrderItem\OrderItemData;

class OrderStoreTest extends BasePermissionTest
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

        return OrderData::from([
            'user_id' => $user->id,
            'total_amount' => 100.00,
            'status' => OrderStatusEnum::PENDING,
            'shipping_address' => '123 Main St',
            'billing_address' => '123 Main St',
            'payment_method' => 'Credit Card',
            'order_items' => [
                OrderItemData::from([
                    'product_id' => $product->id,
                    'quantity' => 1,
                    'price' => $product->price,
                ])->toArray()
            ]
        ])->toArray();
    }

    public function test_authenticated_user_with_permission_can_create_an_order()
    {
        Notification::fake();
        $user = $this->createUserWithPermission('create-order');
        $orderData = $this->getOrderData($user);

        $response = $this->actingAs($user)->postJson($this->getBaseUrl(), $orderData);

        $response->assertStatus(201)
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
                'user_id' => $user->id,
                'total_amount' => 100.00,
                'status' => OrderStatusEnum::PENDING,
                'payment_method' => 'Credit Card',
            ]);

        $this->assertDatabaseHas('orders', ['user_id' => $user->id]);
        Notification::assertSentTo($user, OrderCreatedNotification::class);
    }

    public function test_unauthenticated_user_cannot_create_an_order()
    {
        $user = User::factory()->create();
        $orderData = $this->getOrderData($user);

        $response = $this->postJson($this->getBaseUrl(), $orderData);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.'
            ]);
        $this->assertDatabaseMissing('orders', ['user_id' => $user->id]);
    }

    public function test_order_creation_requires_required_fields()
    {
        $user = $this->createUserWithPermission('create-order');

        $response = $this->actingAs($user)->postJson($this->getBaseUrl(), []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['total_amount', 'payment_method', 'order_items']);
    }

    public function test_order_creation_fails_with_invalid_order_items()
    {
        $user = $this->createUserWithPermission('create-order');
        $product = Product::factory()->create(); // Create a real product to use its price for valid items

        $invalidOrderData = [
            'user_id' => $user->id,
            'total_amount' => 100.00,
            'status' => OrderStatusEnum::PENDING,
            'shipping_address' => '123 Main St',
            'billing_address' => '123 Main St',
            'payment_method' => 'Credit Card',
            'order_items' => [
                [
                    'product_id' => 9999, // Invalid product_id
                    'quantity' => 1,
                    'price' => 10.00,
                ]
            ]
        ];

        $response = $this->actingAs($user)->postJson($this->getBaseUrl(), $invalidOrderData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['order_items.0.product_id']);
    }
}
