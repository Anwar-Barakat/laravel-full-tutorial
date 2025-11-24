<?php

namespace Tests\Feature\Api\_03_Product_Crud_With_Resource;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductDestroyTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v3';

    public function test_authenticated_user_can_delete_a_product()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(204); // No Content

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_product_deletion_returns_404_if_product_not_found()
    {
        $this->createAuthenticatedUser();

        $response = $this->deleteJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404);
    }

    public function test_unauthenticated_user_cannot_delete_a_product()
    {
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}
