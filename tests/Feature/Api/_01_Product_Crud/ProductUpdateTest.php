<?php

namespace Tests\Feature\Api\_01_Product_Crud;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductUpdateTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_can_update_a_product_without_image_change()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct(); // Using helper
        $category = $this->createCategory(); // Using helper

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200)
            ->assertJson([
                'id' => $product->id,
                'name' => 'Updated Product Name',
                'description' => 'Updated product description.',
                'price' => 123.45,
                'category_id' => $category->id,
            ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
            'image' => $product->image, // Image should remain the same
        ]);
    }

    public function test_authenticated_user_can_update_a_product_with_new_image()
    {
        Storage::fake('public');
        $this->createAuthenticatedUser();
        $product = $this->createProduct(['image' => 'products/old_image.jpg']); // Using helper
        $category = $this->createCategory(); // Using helper

        $newImage = UploadedFile::fake()->image('new_product_image.jpg');

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
            'image' => $newImage,
        ];

        $response = $this->post($this->getBaseUrl() . '/' . $product->id, $updatedData + ['_method' => 'PUT']);

        $response->assertStatus(200)
            ->assertJson([
                'id' => $product->id,
                'name' => 'Updated Product Name',
                'description' => 'Updated product description.',
                'price' => 123.45,
                'category_id' => $category->id,
            ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'image' => 'products/' . $newImage->hashName(),
        ]);

        Storage::disk('public')->assertExists('products/' . $newImage->hashName());
        Storage::disk('public')->assertMissing('products/old_image.jpg');
    }


    public function test_product_update_requires_name_description_price()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct(); // Using helper

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, [
            'name' => '', // Invalid
            'description' => '', // Invalid
            'price' => null, // Invalid
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_product_update_fails_with_invalid_price()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct(); // Using helper

        $updatedData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => -10, // Invalid price
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['price']);
    }

    public function test_product_update_returns_404_if_product_not_found()
    {
        $this->createAuthenticatedUser();
        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/9999', $updatedData); // Non-existent ID

        $response->assertStatus(404);
    }

    public function test_unauthenticated_user_cannot_update_a_product()
    {
        $product = $this->createProduct(); // Using helper
        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(401); // Unauthorized
    }
}
