<?php

namespace Tests\Feature\Api\_04_Product_ApiResponse_Refactor;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v4';

    public function test_can_get_all_products_with_new_api_response_structure()
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
                        'created_at', 'updated_at',
                    ]
                ]
            ])
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Products retrieved successfully.',
            ])
            ->assertJsonCount(10, 'data'); // Assert count on the main 'data' array
    }

    public function test_unauthenticated_user_cannot_access_products()
    {
        $this->createProducts(3);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(401); // Unauthorized
    }
}