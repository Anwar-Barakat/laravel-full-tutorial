<?php

namespace Tests\Feature\Api\_01_Product_Crud;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use Illuminate\Support\Collection;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_can_get_all_products()
    {
        $this->createAuthenticatedUser();
        $products = $this->createProducts(3); // Using helper

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonCount(3)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'name',
                    'description',
                    'price',
                    'image',
                    'category_id',
                    'created_at',
                    'updated_at',
                ]
            ]);

        // Optionally, assert that specific product data is present
        foreach ($products as $product) {
            $response->assertJsonFragment([
                'name' => $product->name,
                'description' => $product->description,
                'price' => (string) $product->price, // Cast price to string
            ]);
        }
    }

    public function test_can_get_empty_products_list()
    {
        $this->createAuthenticatedUser();
        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonCount(0);
    }
}
