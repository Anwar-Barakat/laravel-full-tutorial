<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;

class ProductDestroyTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_given_existing_product_when_destroy_called_then_deletes()
    {
        $product = $this->createProduct();

        $response = $this->deleteJson('/api/v2/products/' . $product->id);

        $response->assertStatus(204);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_given_nonexistent_id_when_destroy_called_then_returns_404()
    {
        $response = $this->deleteJson('/api/v2/products/9999');
        $response->assertStatus(404);
    }
}