<?php

namespace Tests\Feature\Api\_06_Product_Spatie_Media_Library;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class ProductStoreTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v6';

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
        Storage::disk($product->getFirstMedia('main_image')->disk)->assertExists($product->getFirstMedia('main_image')->getPathRelativeToRoot());
        Storage::disk($product->getMedia('gallery_images')[0]->disk)->assertExists($product->getMedia('gallery_images')[0]->getPathRelativeToRoot());
        Storage::disk($product->getMedia('gallery_images')[1]->disk)->assertExists($product->getMedia('gallery_images')[1]->getPathRelativeToRoot());
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

        $response->assertStatus(422);
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