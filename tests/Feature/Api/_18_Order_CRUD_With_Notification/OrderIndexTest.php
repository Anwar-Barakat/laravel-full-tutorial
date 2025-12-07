<?php

namespace Tests\Feature\Api\_18_Order_CRUD_With_Notification;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BasePermissionTest;

class OrderIndexTest extends BasePermissionTest
{
    use RefreshDatabase;

    protected string $apiVersion = 'v18';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders";
    }

    public function test_authenticated_user_with_permission_can_view_all_orders()
    {
        $user = $this->createUserWithPermission('view-any-order');
        Order::factory()->count(5)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    '*' => [
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
                ]
            ])
            ->assertJsonCount(5, 'data');
    }

    public function test_unauthenticated_user_cannot_view_orders()
    {
        Order::factory()->count(3)->create();

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.'
            ]);
    }
}
