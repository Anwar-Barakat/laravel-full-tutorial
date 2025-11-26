<?php

namespace Tests\Feature\Api\_14_Order_CRUD;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderCrudApiTest;

class OrderUpdateTest extends BaseOrderCrudApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_with_permission_can_update_an_order()
    {
        $user = $this->createUserWithPermission('update-order');
        $order = $this->createOrder(['user_id' => $user->id]);

        $this->actingAs($user);

        $updatedData = [
            'status' => 'completed',
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $order->id, $updatedData);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'status' => 'completed',
                ]
            ]);
    }
}
