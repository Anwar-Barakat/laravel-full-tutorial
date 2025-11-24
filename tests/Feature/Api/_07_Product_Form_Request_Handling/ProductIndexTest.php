<?php

namespace Tests\Feature\Api\_07_Product_Form_Request_Handling;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v7';

    public function test_can_get_all_products_with_api_response_structure()
    {
        $this->createAuthenticatedUser();
        $this->createProducts(15);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status', 'success', 'message',
                'data' => [
                    '*' => [
                        'id', 'name', 'description', 'price', 'stock', 'image',
                        'media' => [
                            'image' => [
                                'url', 'thumb_url'
                            ],
                            'gallery'
                        ],
                        'created_at', 'updated_at',
                    ]
                ]
            ])
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Products retrieved successfully.',
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
