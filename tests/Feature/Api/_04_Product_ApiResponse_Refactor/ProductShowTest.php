<?php

namespace Tests\Feature\Api\_04_Product_ApiResponse_Refactor;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductShowTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v4';

    public function test_authenticated_user_can_retrieve_a_single_product_with_new_api_response_structure()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Product retrieved successfully.',
                'data' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description,
                    'price' => $product->price,
                ]
            ]);
    }

    public function test_product_retrieval_returns_not_found_response()
    {
        $this->createAuthenticatedUser();

        $response = $this->getJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Product not found.',
            ]);
    }

    public function test_unauthenticated_user_cannot_retrieve_a_product()
    {
        $product = $this->createProduct();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}
