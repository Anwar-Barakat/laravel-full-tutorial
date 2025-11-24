<?php

namespace Tests\Feature\Api\_04_Product_ApiResponse_Refactor;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductDestroyTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v4';

    public function test_authenticated_user_can_delete_a_product_with_new_api_response_structure()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(204);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_product_deletion_returns_not_found_response()
    {
        $this->createAuthenticatedUser();

        $response = $this->deleteJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Product not found.',
            ]);
    }

    public function test_unauthenticated_user_cannot_delete_a_product()
    {
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}
