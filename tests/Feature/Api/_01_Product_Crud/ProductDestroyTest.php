<?php

namespace Tests\Feature\Api\_01_Product_Crud;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;

class ProductDestroyTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_can_delete_a_product()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->deleteJson('/api/v1/products/' . $product->id);

        $response->assertStatus(204); // No Content

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_product_deletion_returns_404_if_product_not_found()
    {
        $this->createAuthenticatedUser();

        $response = $this->deleteJson('/api/v1/products/9999'); // Non-existent ID

        $response->assertStatus(404);
    }

    public function test_unauthenticated_user_cannot_delete_a_product()
    {
        $product = $this->createProduct();

        $response = $this->deleteJson('/api/v1/products/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}
