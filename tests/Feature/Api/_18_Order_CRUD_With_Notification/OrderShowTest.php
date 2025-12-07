<?php

namespace Tests\Feature\Api\_18_Order_CRUD_With_Notification;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BasePermissionTest;

class OrderShowTest extends BasePermissionTest
{
    use RefreshDatabase;

    protected string $apiVersion = 'v18';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders";
    }

    public function test_authenticated_user_with_permission_can_retrieve_a_single_order()
    {
        $user = $this->createUserWithPermission('view-order');
        $order = Order::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->getJson($this->getBaseUrl() . '/' . $order->id);

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
                'user_id' => $user->id,
            ]);
    }

    public function test_order_retrieval_returns_404_if_order_not_found()
    {
        $user = $this->createUserWithPermission('view-order');

        $response = $this->actingAs($user)->getJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Order not found.'
            ]);
    }

    public function test_unauthenticated_user_cannot_retrieve_an_order()
    {
        $user = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $user->id]);

        $response = $this->getJson($this->getBaseUrl() . '/' . $order->id);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.'
            ]);
    }
}
