<?php

namespace Tests\Feature\Api\_14_Order_CRUD;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderCrudApiTest;
use App\Models\User;

class OrderStoreTest extends BaseOrderCrudApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_with_permission_can_create_an_order()
    {
        $user = $this->createUserWithPermission('create-order');
        $product = $this->createProduct();

        $orderData = [
            'user_id' => $user->id,
            'total_amount' => 100.00,
            'status' => 'pending',
            'shipping_address' => $this->faker->address,
            'billing_address' => $this->faker->address,
            'payment_method' => 'credit_card',
            'order_items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'price' => 50.00,
                ],
            ],
        ];

        $response = $this->postJson($this->getBaseUrl(), $orderData);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Order created successfully.',
            ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'total_amount' => 100.00,
        ]);
        
        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
    }

    public function test_unauthenticated_user_cannot_create_an_order()
    {
        $response = $this->postJson($this->getBaseUrl(), []);

        $response->assertStatus(401);
    }

    public function test_order_creation_requires_required_fields()
    {
        $this->createUserWithPermission('create-order');
        
        $response = $this->postJson($this->getBaseUrl(), []);
        
        $response->assertStatus(422);
    }
}
