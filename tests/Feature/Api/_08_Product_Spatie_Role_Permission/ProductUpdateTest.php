<?php

namespace Tests\Feature\Api\_08_Product_Spatie_Role_Permission;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductUpdateTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v8';

    public function test_authenticated_user_with_permission_can_update_a_product_with_new_main_image_and_add_gallery_images()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createUserWithPermission('edit products');
        $product = $this->createProduct();
        $category = $this->createCategory();

        // Add an initial main image via Media Library
        $oldMainImage = UploadedFile::fake()->image('old_main_image.jpg');
        $oldMediaMain = $product->addMedia($oldMainImage)->toMediaCollection('main_image');

        $newMainImage = UploadedFile::fake()->image('new_main_image.jpg');
        $newGalleryImage1 = UploadedFile::fake()->image('new_gallery_image1.jpg');

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
            'main_image' => $newMainImage,
            'gallery_images' => [$newGalleryImage1],
        ];

        $response = $this->post($this->getBaseUrl() . '/' . $product->id, $updatedData + ['_method' => 'PUT']);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Product updated successfully.',
                'data' => [
                    'name' => 'Updated Product Name',
                ]
            ]);

        $product->fresh();

        // Assert new main image is present and old one is gone
        $this->assertCount(1, $product->getMedia('main_image'));
        $this->assertEquals($newMainImage->getClientOriginalName(), $product->getFirstMedia('main_image')->file_name);
        Storage::disk($oldMediaMain->disk)->assertMissing($oldMediaMain->getPathRelativeToRoot());
        Storage::disk($product->getFirstMedia('main_image')->disk)->assertExists($product->getFirstMedia('main_image')->getPathRelativeToRoot());


        // Assert new gallery images are added
        $this->assertCount(1, $product->getMedia('gallery_images'));
        Storage::disk($product->getMedia('gallery_images')[0]->disk)->assertExists($product->getMedia('gallery_images')[0]->getPathRelativeToRoot());
    }

    public function test_authenticated_user_without_permission_cannot_update_a_product()
    {
        $this->createAuthenticatedUser(); // User without 'edit products' permission
        $product = $this->createProduct();
        $updatedData = [
            'name' => 'Updated Product Name',
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Unauthorized to edit products.',
            ]);
    }

    public function test_unauthenticated_user_cannot_update_a_product()
    {
        $product = $this->createProduct();
        $updatedData = [
            'name' => 'Updated Product Name',
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(401); // Unauthorized
    }

    public function test_product_update_returns_not_found_response()
    {
        $this->createUserWithPermission('edit products'); // User with permission
        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/9999', $updatedData); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Product not found.',
            ]);
    }
}
