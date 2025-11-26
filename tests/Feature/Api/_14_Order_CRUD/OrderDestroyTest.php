<?php

namespace Tests\Feature\Api\_14_Order_CRUD;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderCrudApiTest;

class OrderDestroyTest extends BaseOrderCrudApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_with_permission_can_delete_an_order()
    {
        $user = $this->createUserWithPermission('delete-order');
        $order = $this->createOrder(['user_id' => $user->id]);

        $this->actingAs($user);

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $order->id);

        $response->assertStatus(204);

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
    }
}
