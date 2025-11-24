<?php

namespace Tests\Feature\Api\_08_Product_Spatie_Role_Permission;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductDestroyTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v8';

    public function test_authenticated_user_with_permission_can_delete_a_product_and_its_associated_images()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createUserWithPermission('delete products');
        $product = $this->createProduct();

        // Add a default image
        $defaultImage = UploadedFile::fake()->image('default_image.jpg');
        $imagePath = 'products/' . $defaultImage->hashName(); // Store with hashName for consistency
        Storage::disk('public')->put($imagePath, $defaultImage->get());
        $product->image = $imagePath;
        $product->save();

        // Add Spatie Media Library images
        $mainImage = UploadedFile::fake()->image('main_image.jpg');
        $galleryImage1 = UploadedFile::fake()->image('gallery_image1.jpg');
        $mediaMain = $product->addMedia($mainImage)->toMediaCollection('main_image');
        $mediaGallery1 = $product->addMedia($galleryImage1)->toMediaCollection('gallery_images');

        // Assert images exist before deletion
        Storage::disk('public')->assertExists($product->image);
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($mediaMain));
        \PHPUnit\Framework\Assert::assertFileExists($this->getFakedMediaPath($mediaGallery1));

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(204);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseMissing('media', ['id' => $mediaMain->id]);
        $this->assertDatabaseMissing('media', ['id' => $mediaGallery1->id]);

        // Assert images are deleted from storage
        Storage::disk('public')->assertMissing($product->image);
        \PHPUnit\Framework\Assert::assertFileDoesNotExist($this->getFakedMediaPath($mediaMain));
        \PHPUnit\Framework\Assert::assertFileDoesNotExist($this->getFakedMediaPath($mediaGallery1));
    }

    public function test_authenticated_user_without_permission_cannot_delete_a_product()
    {
        $this->createAuthenticatedUser(); // User without 'delete products' permission
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Unauthorized to delete products.',
            ]);
    }

    public function test_product_deletion_returns_not_found_response()
    {
        $this->createUserWithPermission('delete products'); // User with permission
        $response = $this->deleteJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'success' => false,
                'message' => 'Product not found.',
            ]);
    }

    public function test_unauthenticated_user_cannot_delete_a_product()
    {
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}