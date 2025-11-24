<?php

namespace Tests\Feature\Api\_07_Product_Form_Request_Handling;

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

    protected string $apiVersion = 'v7';

    public function test_authenticated_user_can_create_a_product_with_main_image_and_gallery_images()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createAuthenticatedUser();
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

        // Assert the default 'image' field is null if not provided
        $this->assertNull($product->image);

        // Assert that the media files exist on the faked disk
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getFirstMedia('main_image')));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getMedia('gallery_images')[0]));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getMedia('gallery_images')[1]));
    }

    public function test_authenticated_user_can_create_a_product_with_only_default_image()
    {
        Storage::fake('public');

        $this->createAuthenticatedUser();
        $category = $this->createCategory();

        $defaultImage = UploadedFile::fake()->image('default_image.png');

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'image' => $defaultImage,
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Product created successfully.',
            ]);

        $product = Product::firstWhere('name', $productData['name']);
        $this->assertNotNull($product->image);
        Storage::disk('public')->assertExists('products/' . $defaultImage->hashName());
        $this->assertStringContainsString($defaultImage->hashName(), $product->image);


        $this->assertCount(0, $product->getMedia('main_image'));
        $this->assertCount(0, $product->getMedia('gallery_images'));
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

    public function test_product_creation_fails_with_invalid_tag_ids()
    {
        $this->createAuthenticatedUser();
        $category = $this->createCategory();

        $productData = [
            'name' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'category_id' => $category->id,
            'tags' => [999, 1000], // Non-existent tag IDs
        ];

        $response = $this->postJson($this->getBaseUrl(), $productData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tags.0', 'tags.1']);
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