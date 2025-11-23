<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class ProductStoreTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_given_valid_data_when_store_called_then_creates_product_without_image()
    {
        $category = $this->createCategory();

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
        ];

        $response = $this->postJson('/api/v2/products', $productData);

        $response->assertStatus(201)
            ->assertJson([
                'name' => $productData['name'],
                'description' => $productData['description'],
                'price' => $productData['price'],
                'category_id' => $productData['category_id'],
            ]);

        $this->assertDatabaseHas('products', [
            'name' => $productData['name'],
            'description' => $productData['description'],
            'price' => $productData['price'],
            'category_id' => $productData['category_id'],
            'image' => null,
        ]);
    }

    public function test_given_valid_data_with_image_when_store_called_then_saves_image()
    {
        Storage::fake('public');
        $category = $this->createCategory();

        $image = UploadedFile::fake()->image('product_image.jpg');

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'image' => $image,
        ];

        $response = $this->postJson('/api/v2/products', $productData);

        $response->assertStatus(201)
            ->assertJson([
                'name' => $productData['name'],
                'description' => $productData['description'],
                'price' => $productData['price'],
                'category_id' => $productData['category_id'],
            ]);

        $this->assertDatabaseHas('products', [
            'name' => $productData['name'],
            'image' => 'products/' . $image->hashName(),
        ]);

        Storage::disk('public')->assertExists('products/' . $image->hashName());
    }

    public function test_given_missing_required_fields_when_store_called_then_returns_validation_errors()
    {
        $response = $this->postJson('/api/v2/products', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_given_negative_price_when_store_called_then_returns_validation_error()
    {
        $category = $this->createCategory();
        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => -10,
            'category_id' => $category->id,
        ];

        $response = $this->postJson('/api/v2/products', $productData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['price']);
    }

    public function test_given_nonexistent_category_when_store_called_then_returns_validation_error()
    {
        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => 9999,
        ];

        $response = $this->postJson('/api/v2/products', $productData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);
    }

    public function test_given_invalid_tags_when_store_called_then_returns_validation_error()
    {
        $category = $this->createCategory();
        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'tags' => [9999],
        ];

        $response = $this->postJson('/api/v2/products', $productData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tags.0']);
    }
}