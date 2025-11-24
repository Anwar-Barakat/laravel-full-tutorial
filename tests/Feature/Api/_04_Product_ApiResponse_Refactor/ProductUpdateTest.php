<?php

namespace Tests\Feature\Api\_04_Product_ApiResponse_Refactor;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductUpdateTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v4';

    public function test_authenticated_user_can_update_a_product_with_new_api_response_structure()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();
        $initialTag = Tag::factory()->create();
        $product->tags()->attach($initialTag);

        $newTag1 = Tag::factory()->create();
        $newTag2 = Tag::factory()->create();

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'tags' => [$newTag1->id, $newTag2->id],
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Product updated successfully.',
                'data' => [
                    'name' => 'Updated Product Name',
                    'description' => 'Updated product description.',
                    'price' => 123.45,
                ]
            ]);

        $product->fresh();
        $this->assertCount(2, $product->tags);
        $this->assertTrue($product->tags->contains($newTag1));
        $this->assertTrue($product->tags->contains($newTag2));
        $this->assertFalse($product->tags->contains($initialTag));
    }

    public function test_product_update_requires_name_description_price()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, [
            'name' => '', // Invalid
            'description' => '', // Invalid
            'price' => null, // Invalid
        ]);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_user_cannot_update_a_product()
    {
        $product = $this->createProduct();
        $updatedData = [
            'name' => 'Updated Product Name',
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(401); // Unauthorized
    }

    public function test_product_update_returns_not_found_response()
    {
        $this->createAuthenticatedUser();
        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/9999', $updatedData); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Product not found.',
            ]);
    }
}
