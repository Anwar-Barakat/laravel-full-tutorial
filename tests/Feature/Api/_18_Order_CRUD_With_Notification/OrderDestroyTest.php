<?php

namespace Tests\Feature\Api\_18_Order_CRUD_With_Notification;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BasePermissionTest;

class OrderDestroyTest extends BasePermissionTest
{
    use RefreshDatabase;

    protected string $apiVersion = 'v18';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders";
    }

    public function test_authenticated_user_with_permission_can_delete_an_order()
    {
        $user = $this->createUserWithPermission('delete-order');
        $order = Order::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->deleteJson($this->getBaseUrl() . '/' . $order->id);

        $response->assertStatus(204); // No Content

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
    }

    public function test_order_deletion_returns_404_if_order_not_found()
    {
        $user = $this->createUserWithPermission('delete-order');

        $response = $this->actingAs($user)->deleteJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Order not found.'
            ]);
    }

    public function test_unauthenticated_user_cannot_delete_an_order()
    {
        $user = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $user->id]);

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $order->id);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.'
            ]);
        $this->assertDatabaseHas('orders', ['id' => $order->id]); // Ensure order was not deleted
    }
}