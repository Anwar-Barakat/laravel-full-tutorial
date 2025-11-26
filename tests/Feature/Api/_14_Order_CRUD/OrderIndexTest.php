<?php

namespace Tests\Feature\Api\_14_Order_CRUD;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderCrudApiTest;

class OrderIndexTest extends BaseOrderCrudApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_with_permission_can_view_all_orders()
    {
        $this->createUserWithPermission('view-any-order');
        $this->createOrders(5);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_unauthenticated_user_cannot_view_orders()
    {
        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(401);
    }
}
