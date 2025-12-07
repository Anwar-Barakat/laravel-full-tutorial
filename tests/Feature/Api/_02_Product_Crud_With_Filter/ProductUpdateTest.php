<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

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

    protected string $apiVersion = 'v2';

    public function test_authenticated_user_can_update_a_product_with_new_tags()
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
                'name' => 'Updated Product Name',
                'description' => 'Updated product description.',
                'price' => 123.45,
            ]);

        $product->fresh();
        $this->assertCount(2, $product->tags);
        $this->assertTrue($product->tags->contains($newTag1));
        $this->assertTrue($product->tags->contains($newTag2));
        $this->assertFalse($product->tags->contains($initialTag));
    }

    public function test_authenticated_user_can_update_a_product_removing_all_tags()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();
        $initialTag = Tag::factory()->create();
        $product->tags()->attach($initialTag);

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'tags' => [], // Remove all tags
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'Updated Product Name',
            ]);

        $product->fresh();
        $this->assertCount(0, $product->tags);
    }

    public function test_authenticated_user_can_update_a_product_with_no_tag_changes()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();
        $initialTag = Tag::factory()->create();
        $product->tags()->attach($initialTag);

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            // Tags not included in update request
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'Updated Product Name',
            ]);

        $product->fresh();
        $this->assertCount(1, $product->tags);
        $this->assertTrue($product->tags->contains($initialTag));
    }

    public function test_product_update_fails_with_invalid_tag_ids()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'tags' => [999, 1000], // Non-existent tag IDs
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tags.0', 'tags.1']);
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

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_unauthenticated_user_cannot_update_a_product()
    {
        $product = $this->createProduct();
        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(401); // Unauthorized
    }

    public function test_authenticated_user_can_update_a_product_with_image_and_tags()
    {
        Storage::fake('public');
        $this->createAuthenticatedUser();
        $product = $this->createProduct(['image' => 'products/old_image.jpg']);
        $category = $this->createCategory();
        $newTag1 = Tag::factory()->create();
        $newTag2 = Tag::factory()->create();

        $newImage = UploadedFile::fake()->image('new_product_image.jpg');

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
            'image' => $newImage,
            'tags' => [$newTag1->id, $newTag2->id],
            '_method' => 'PUT', // Important for file uploads with PUT method
        ];

        $response = $this->post($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'Updated Product Name',
                'description' => 'Updated product description.',
                'price' => 123.45,
                'category_id' => $category->id,
            ]);

        $product->fresh();
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'image' => 'products/' . $newImage->hashName(),
        ]);
        $this->assertCount(2, $product->tags);
        $this->assertTrue($product->tags->contains($newTag1));
        $this->assertTrue($product->tags->contains($newTag2));

        Storage::disk('public')->assertExists('products/' . $newImage->hashName());
        Storage::disk('public')->assertMissing('products/old_image.jpg');
    }
}