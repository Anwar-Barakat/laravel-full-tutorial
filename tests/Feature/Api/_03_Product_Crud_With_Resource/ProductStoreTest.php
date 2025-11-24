<?php

namespace Tests\Feature\Api\_03_Product_Crud_With_Resource;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductStoreTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v3';

    public function test_authenticated_user_can_create_a_product_with_tags()
    {
        Storage::fake('public');
        $this->createAuthenticatedUser();
        $category = $this->createCategory();
        $tag1 = Tag::factory()->create();
        $tag2 = Tag::factory()->create();

        $image = UploadedFile::fake()->image('product_image.jpg');

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'image' => $image,
            'tags' => [$tag1->id, $tag2->id],
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'price' => $productData['price'],
                    'stock' => null, // Default value for stock
                ]
            ])
            ->assertJsonPath('data.category.id', $category->id);

        $this->assertDatabaseHas('products', [
            'name' => $productData['name'],
        ]);

        $product = Product::firstWhere('name', $productData['name']);
        $this->assertCount(2, $product->tags);
        $this->assertTrue($product->tags->contains($tag1));
        $this->assertTrue($product->tags->contains($tag2));

        Storage::disk('public')->assertExists('products/' . $image->hashName());
    }

    public function test_product_creation_requires_name_description_price()
    {
        $this->createAuthenticatedUser();

        $response = $this->postJson($this->getBaseUrl(), []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_unauthenticated_user_cannot_create_a_product()
    {
        $category = $this->createCategory();
        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(401); // Unauthorized
    }
}