<?php

namespace Tests\Feature\Api\_01_Product_Crud;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;

class ProductShowTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_can_retrieve_a_single_product()
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

    public function test_returns_404_if_product_not_found()
    {
        $this->createAuthenticatedUser();
        $response = $this->getJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404);
    }
}
