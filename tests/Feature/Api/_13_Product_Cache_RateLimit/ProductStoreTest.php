<?php

namespace Tests\Feature\Api\_13_Product_Cache_RateLimit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use App\Data\Product\StoreProductData;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductStoreTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v13';

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

        $response->assertStatus(201);
    }
}
