<?php

namespace Tests\Feature\Api\_11_Product_Service_Layer_With_Spatie_DTO;

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

    protected string $apiVersion = 'v11';

    public function test_authenticated_user_with_permission_can_update_a_product()
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
        \PHPUnit\Framework\Assert::assertFileDoesNotExist($this->getFakedMediaPath($oldMediaMain));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getFirstMedia('main_image')));


        // Assert new gallery images are added
        $this->assertCount(1, $product->getMedia('gallery_images'));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getMedia('gallery_images')[0]));
    }

    public function test_authenticated_user_without_permission_cannot_update_a_product()
    {
        $this->createAuthenticatedUser(); // User without 'edit products' permission
        $product = $this->createProduct();
        $updatedData = [
            'name' => 'Updated Product Name',
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(403);
    }

    public function test_authenticated_user_can_update_a_product_and_delete_specific_gallery_images()
    {
        Storage::fake('media');

        $user = $this->createUserWithPermission('edit products');
        $product = $this->createProduct();

        $galleryImage1 = UploadedFile::fake()->image('gallery_to_keep.jpg');
        $galleryImage2 = UploadedFile::fake()->image('gallery_to_delete.jpg');
        $media1 = $product->addMedia($galleryImage1)->toMediaCollection('gallery_images');
        $media2 = $product->addMedia($galleryImage2)->toMediaCollection('gallery_images');

        $this->assertCount(2, $product->getMedia('gallery_images'));

        $updatedData = [
            'name' => 'Updated Product Name',
            'delete_gallery_images' => [$media2->id],
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200);

        $product->refresh();
        $this->assertCount(1, $product->getMedia('gallery_images'));
        $this->assertEquals($media1->id, $product->getFirstMedia('gallery_images')->id);
    }
}
