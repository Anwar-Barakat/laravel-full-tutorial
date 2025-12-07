<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;

class ProductShowTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v2';

    public function test_authenticated_user_can_retrieve_a_single_product()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(200)
            ->assertJson([
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'price' => $product->price,
            ]);
    }

    public function test_product_retrieval_returns_404_if_product_not_found()
    {
        $this->createAuthenticatedUser();

        $response = $this->getJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404);
    }

    public function test_unauthenticated_user_cannot_retrieve_a_product()
    {
        $product = $this->createProduct();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}