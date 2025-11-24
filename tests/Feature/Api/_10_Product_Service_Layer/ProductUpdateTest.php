<?php

namespace Tests\Feature\Api\_10_Product_Service_Layer;

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

    protected string $apiVersion = 'v10';

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
        \PHPUnit\Framework\Assert::assertFileDoesNotExist($this->getFakedMediaPath($oldMediaMain));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getFirstMedia('main_image')));


        // Assert new gallery images are added
        $this->assertCount(1, $product->getMedia('gallery_images'));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($product->getMedia('gallery_images')[0]));
    }

    public function test_authenticated_user_with_permission_can_update_a_product_with_new_default_image()
    {
        Storage::fake('public');

        $this->createUserWithPermission('edit products');
        $product = $this->createProduct(); // Create with no image initially
        
        // Explicitly store an old image to be replaced
        $oldImagePath = 'products/old_default_image.jpg';
        Storage::disk('public')->put($oldImagePath, UploadedFile::fake()->image('old_default_image.jpg')->get());
        $product->image = $oldImagePath;
        $product->save();
        Storage::disk('public')->assertExists($oldImagePath);


        $category = $this->createCategory();

        $newDefaultImage = UploadedFile::fake()->image('new_default_image.jpg');
        $newImageHashedPath = 'products/' . $newDefaultImage->hashName();

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
            'image' => $newDefaultImage,
        ];

        $response = $this->post($this->getBaseUrl() . '/' . $product->id, $updatedData + ['_method' => 'PUT']);

        $response->assertStatus(200);

        $product->fresh();
        // Assert that the stored image path is now the new one
        $this->assertEquals($newImageHashedPath, $product->image);
        Storage::disk('public')->assertMissing($oldImagePath); // Old image should be deleted
        Storage::disk('public')->assertExists($product->image); // New image should exist

        // Assert that the database record is updated
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'image' => $newImageHashedPath,
        ]);
    }


    public function test_authenticated_user_with_permission_can_update_a_product_and_delete_specific_gallery_images()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createUserWithPermission('edit products');
        $product = $this->createProduct();

        // Add multiple gallery images
        $galleryImage1 = UploadedFile::fake()->image('gallery_to_keep.jpg');
        $galleryImage2 = UploadedFile::fake()->image('gallery_to_delete1.jpg');
        $galleryImage3 = UploadedFile::fake()->image('gallery_to_delete2.jpg');

        $media1 = $product->addMedia($galleryImage1)->toMediaCollection('gallery_images');
        $media2 = $product->addMedia($galleryImage2)->toMediaCollection('gallery_images');
        $media3 = $product->addMedia($galleryImage3)->toMediaCollection('gallery_images');

        $this->assertCount(3, $product->getMedia('gallery_images'));

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'delete_gallery_images' => [$media2->id, $media3->id],
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200);

        $product->fresh();
        // Assert that the deletion did happen correctly
        $this->assertCount(1, $product->getMedia('gallery_images')); // Should now be 1
        $this->assertNotNull($product->getMedia('gallery_images')->find($media1->id));
        $this->assertNull($product->getMedia('gallery_images')->find($media2->id)); // Should be null
        $this->assertNull($product->getMedia('gallery_images')->find($media3->id)); // Should be null

        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($media1));
        \PHPUnit\Framework\Assert::assertFileDoesNotExist($this->getFakedMediaPath($media2));
        \PHPUnit\Framework\Assert::assertFileDoesNotExist($this->getFakedMediaPath($media3));
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
                'message' => 'This action is unauthorized.',
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
