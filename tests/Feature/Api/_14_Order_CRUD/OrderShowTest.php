<?php

namespace Tests\Feature\Api\_14_Order_CRUD;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderCrudApiTest;

class OrderShowTest extends BaseOrderCrudApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_with_permission_can_view_an_order()
    {
        $user = $this->createUserWithPermission('view-order');
        $order = $this->createOrder(['user_id' => $user->id]);

        $this->actingAs($user);

        $response = $this->getJson($this->getBaseUrl() . '/' . $order->id);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $order->id,
                ]
            ]);
    }
}
