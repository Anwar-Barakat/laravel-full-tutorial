<?php

namespace Tests\Feature\Api\_05_Product_Review_Polymorphic;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use App\Models\Review;

class ReviewIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v5';

    public function test_authenticated_user_can_get_product_reviews_with_new_api_response_structure()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();
        $reviews = Review::factory()->count(15)->for($product, 'reviewable')->create();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id . '/reviews');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status', 'success', 'message',
                'data' => [
                    '*' => [
                        'id', 'user_id', 'rating', 'comment', 'reviewable_type', 'reviewable_id',
                        'created_at', 'updated_at',
                    ]
                ]
            ])
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Reviews retrieved successfully.',
            ])
            ->assertJsonCount(10, 'data'); // Assert count on the main 'data' array
    }

    public function test_unauthenticated_user_cannot_get_product_reviews()
    {
        $product = $this->createProduct();
        Review::factory()->count(3)->for($product, 'reviewable')->create();

        $response = $this->getJson($this->getBaseUrl() . '/' . $product->id . '/reviews');

        $response->assertStatus(401); // Unauthorized
    }
}