<?php

namespace Tests\Feature\Api\_12_Product_Action_Layer_With_Spatie_DTO;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use App\Data\Product\StoreProductData; // Use the new DTO namespace
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductStoreTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v12';

    public function test_authenticated_user_with_permission_can_create_a_product()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createUserWithPermission('create products');
        $category = $this->createCategory();
        $tag1 = Tag::factory()->create();
        $tag2 = Tag::factory()->create();

        $mainImage = UploadedFile::fake()->image('main_image.jpg');
        $galleryImage1 = UploadedFile::fake()->image('gallery_image1.jpg');
        $galleryImage2 = UploadedFile::fake()->image('gallery_image2.jpg');

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'tags' => [$tag1->id, $tag2->id],
            'main_image' => $mainImage,
            'gallery_images' => [$galleryImage1, $galleryImage2],
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Product created successfully.',
                'data' => [
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'price' => $productData['price'],
                ]
            ]);

        $product = Product::firstWhere('name', $productData['name']);
        $this->assertNotNull($product);

        // Assert Spatie Media Library images
        $this->assertCount(1, $product->getMedia('main_image'));
        $this->assertCount(2, $product->getMedia('gallery_images'));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getFirstMedia('main_image')));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getMedia('gallery_images')[0]));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getMedia('gallery_images')[1]));
    }

    public function test_authenticated_user_without_permission_cannot_create_a_product()
    {
        $this->createAuthenticatedUser(); // User without 'create products' permission
        $category = $this->createCategory();

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(403);
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

    public function test_product_creation_requires_name_description_price()
    {
        $this->createUserWithPermission('create products');

        $response = $this->postJson($this->getBaseUrl(), []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'price']);
    }

    public function test_product_creation_fails_with_invalid_price()
    {
        $this->createUserWithPermission('create products');
        $category = $this->createCategory();

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
}
