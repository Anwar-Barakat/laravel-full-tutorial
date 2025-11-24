<?php

namespace Tests\Feature\Api\_06_Product_Spatie_Media_Library;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File; // Import File facade

class ProductDestroyTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v6';

    public function test_authenticated_user_can_delete_a_product_and_its_associated_images()
    {
        Storage::fake('public'); // This fakes the default 'public' disk
        Storage::fake('media'); // Spatie Media Library uses its own disk (often 'media')

        $this->createAuthenticatedUser();
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
        
        // Assert Spatie Media Library files exist on their respective faked disks
        // Assuming 'media' disk is configured to use 'storage_path('app/media')' or similar for testing
        // For testing, Spatie Media Library uses the 'public' disk by default when faking, so we assert on 'public'
        Storage::disk($mediaMain->disk)->assertExists($mediaMain->getPathRelativeToRoot());
        Storage::disk($mediaGallery1->disk)->assertExists($mediaGallery1->getPathRelativeToRoot());

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(204);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseMissing('media', ['id' => $mediaMain->id]);
        $this->assertDatabaseMissing('media', ['id' => $mediaGallery1->id]);

        // Assert images are deleted from storage
        Storage::disk('public')->assertMissing($product->image);
        Storage::disk($mediaMain->disk)->assertMissing($mediaMain->getPathRelativeToRoot());
        Storage::disk($mediaGallery1->disk)->assertMissing($mediaGallery1->getPathRelativeToRoot());
    }

    public function test_product_deletion_returns_not_found_response()
    {
        $this->createAuthenticatedUser();

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