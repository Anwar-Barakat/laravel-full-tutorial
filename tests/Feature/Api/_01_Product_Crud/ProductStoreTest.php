<?php

namespace Tests\Feature\Api\_01_Product_Crud;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
// use App\Models\Category; // Removed as helper is used
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductStoreTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_authenticated_user_can_create_a_product_without_image()
    {
        $this->createAuthenticatedUser();
        $category = $this->createCategory(); // Using helper

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

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

    public function test_authenticated_user_can_create_a_product_with_image()
    {
        Storage::fake('public');
        $this->createAuthenticatedUser();
        $category = $this->createCategory(); // Using helper

        $image = UploadedFile::fake()->image('product_image.jpg');

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'image' => $image,
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

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
            'image' => 'products/' . $image->hashName(),
        ]);

        Storage::disk('public')->assertExists('products/' . $image->hashName());
    }

    public function test_product_creation_requires_name_description_price()
    {
        $this->createAuthenticatedUser();

        $response = $this->postJson($this->getBaseUrl(), []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_product_creation_fails_with_invalid_price()
    {
        $this->createAuthenticatedUser();
        $category = $this->createCategory(); // Using helper

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => -10, // Invalid price
            'category_id' => $category->id,
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['price']);
    }

    public function test_product_creation_fails_with_non_existent_category_id()
    {
        $this->createAuthenticatedUser();

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => 9999, // Non-existent category ID
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);
    }

    public function test_unauthenticated_user_cannot_create_a_product()
    {
        $category = $this->createCategory(); // Using helper
        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id, // Provide a valid category_id
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(401); // Unauthorized
    }
}
