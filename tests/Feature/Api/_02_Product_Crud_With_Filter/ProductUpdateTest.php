<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class ProductUpdateTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_given_valid_data_when_update_called_then_updates_without_image_change()
    {
        $product = $this->createProduct();
        $category = $this->createCategory();

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
        ];

        $response = $this->putJson('/api/v2/products/' . $product->id, $updatedData);

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
            'image' => $product->image,
        ]);
    }

    public function test_given_new_image_when_update_called_then_replaces_image_and_deletes_old()
    {
        Storage::fake('public');
        $product = $this->createProduct(['image' => 'products/old_image.jpg']);
        $category = $this->createCategory();

        $newImage = UploadedFile::fake()->image('new_product_image.jpg');

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
            'image' => $newImage,
        ];

        $response = $this->post('/api/v2/products/' . $product->id, $updatedData + ['_method' => 'PUT']);

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

    public function test_given_invalid_fields_when_update_called_then_returns_validation_errors()
    {
        $product = $this->createProduct();

        $response = $this->putJson('/api/v2/products/' . $product->id, [
            'name' => '',
            'description' => '',
            'price' => null,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_given_negative_price_when_update_called_then_returns_validation_error()
    {
        $product = $this->createProduct();

        $updatedData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => -10,
        ];

        $response = $this->putJson('/api/v2/products/' . $product->id, $updatedData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['price']);
    }

    public function test_given_nonexistent_id_when_update_called_then_returns_404()
    {
        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
        ];

        $response = $this->putJson('/api/v2/products/9999', $updatedData);

        $response->assertStatus(404);
    }
}