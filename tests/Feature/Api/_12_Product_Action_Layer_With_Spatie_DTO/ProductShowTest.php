<?php

namespace Tests\Feature\Api\_12_Product_Action_Layer_With_Spatie_DTO;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductShowTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v12';

    public function test_authenticated_user_with_permission_can_retrieve_a_single_product_with_media_data()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createUserWithPermission('view products');
        $product = $this->createProduct();

        // Add Spatie Media Library images
        $mainImage = UploadedFile::fake()->image('main_image.jpg');
        $galleryImage1 = UploadedFile::fake()->image('gallery_image1.jpg');
        $product->addMedia($mainImage)->toMediaCollection('main_image');
        $product->addMedia($galleryImage1)->toMediaCollection('gallery_images');

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Product retrieved successfully.',
                'data' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description,
                    'price' => $product->price,
                    'media' => [
                        'image' => [
                            'url' => $product->getFirstMediaUrl('main_image'),
                            'thumb_url' => $product->getFirstMediaUrl('main_image', 'thumb'),
                        ],
                        'gallery' => [
                            [
                                'id' => $product->getMedia('gallery_images')[0]->id,
                                'url' => $product->getMedia('gallery_images')[0]->getFullUrl(),
                                'thumb_url' => $product->getMedia('gallery_images')[0]->getUrl('thumb'),
                            ]
                        ]
                    ]
                ]
            ]);
    }

    public function test_authenticated_user_without_permission_cannot_retrieve_a_product()
    {
        $this->createAuthenticatedUser(); // User without 'view products' permission
        $product = $this->createProduct();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(403);
    }

    public function test_product_retrieval_returns_not_found_response()
    {
        $this->createUserWithPermission('view products'); // User with permission
        $response = $this->getJson($this->getBaseUrl() . '/9999'); // Non-existent ID

        $response->assertStatus(404);
    }

    public function test_unauthenticated_user_cannot_retrieve_a_product()
    {
        $product = $this->createProduct();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(401); // Unauthorized
    }
}
