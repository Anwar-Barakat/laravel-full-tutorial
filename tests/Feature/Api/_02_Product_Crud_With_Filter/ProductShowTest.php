<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;

class ProductShowTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_given_existing_product_when_show_called_then_returns_product()
    {
        $product = $this->createProduct();

        $response = $this->getJson('/api/v2/products/' . $product->id);

        $response->assertStatus(200)
            ->assertJson([
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'price' => $product->price,
            ]);
    }

    public function test_given_nonexistent_id_when_show_called_then_returns_404()
    {
        $response = $this->getJson('/api/v2/products/999999');
        $response->assertStatus(404);
    }
}