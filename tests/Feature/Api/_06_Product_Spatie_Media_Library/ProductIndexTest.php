<?php

namespace Tests\Feature\Api\_06_Product_Spatie_Media_Library;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v6';

    public function test_can_get_all_products_with_media_data_in_api_response_structure()
    {
        Storage::fake('public');

        $this->createAuthenticatedUser();
        $this->createProducts(15);
        
        // Add media to a few products to ensure structure is tested
        $productWithMedia = Product::inRandomOrder()->first();
        $mainImage = UploadedFile::fake()->image('main_image.jpg');
        $galleryImage1 = UploadedFile::fake()->image('gallery_image1.jpg');
        $productWithMedia->addMedia($mainImage)->toMediaCollection('main_image');
        $productWithMedia->addMedia($galleryImage1)->toMediaCollection('gallery_images');


        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status', 'success', 'message',
                'data' => [
                    '*' => [
                        'id', 'name', 'description', 'price', 'stock', 'image',
                        'media' => [
                            'image' => [
                                'url', 'thumb_url'
                            ],
                            'gallery'
                        ],
                        'created_at', 'updated_at',
                    ]
                ]
            ])
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Products retrieved successfully.',
            ])
            ->assertJsonCount(10, 'data');
    }

    public function test_unauthenticated_user_cannot_access_products()
    {
        $this->createProducts(3);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(401); // Unauthorized
    }
}
