<?php

namespace Tests\Feature\Api\_03_Product_Crud_With_Resource;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v3';

    public function test_can_get_all_products_with_pagination()
    {
        $this->createAuthenticatedUser();
        $this->createProducts(15);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id', 'name', 'description', 'price', 'stock', 'image',
                        'created_at', 'updated_at',
                    ]
                ],
                'links' => [
                    'first', 'last', 'prev', 'next',
                ],
                'meta' => [
                    'current_page', 'from', 'last_page', 'path', 'per_page', 'to', 'total',
                ],
            ])
            ->assertJsonCount(10, 'data');
    }

    public function test_unauthenticated_user_cannot_access_products()
    {
        $this->createProducts(3);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(401); // Unauthorized
    }
}