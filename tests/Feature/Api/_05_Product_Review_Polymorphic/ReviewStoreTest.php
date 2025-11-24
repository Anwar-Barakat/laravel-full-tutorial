<?php

namespace Tests\Feature\Api\_05_Product_Review_Polymorphic;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use App\Models\Review;

class ReviewStoreTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v5';

    public function test_authenticated_user_can_store_a_review_with_new_api_response_structure()
    {
        $user = $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $reviewData = [
            'rating' => $this->faker->numberBetween(1, 5),
            'comment' => $this->faker->paragraph,
        ];

        $response = $this->postJson($this->getBaseUrl() . '/' . $product->id . '/reviews', $reviewData);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Review created successfully.',
                'data' => [
                    'rating' => $reviewData['rating'],
                    'comment' => $reviewData['comment'],
                    'user_id' => $user->id,
                ]
            ]);

        $this->assertDatabaseHas('reviews', [
            'rating' => $reviewData['rating'],
            'comment' => $reviewData['comment'],
            'reviewable_id' => $product->id,
            'reviewable_type' => Product::class,
            'user_id' => $user->id,
        ]);
    }

    public function test_review_creation_requires_rating_and_comment()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $response = $this->postJson($this->getBaseUrl() . '/' . $product->id . '/reviews', []);

        $response->assertStatus(422);
    }

    public function test_review_creation_fails_with_invalid_rating()
    {
        $this->createAuthenticatedUser();
        $product = $this->createProduct();

        $reviewData = [
            'rating' => 6, // Invalid rating
            'comment' => $this->faker->paragraph,
        ];

        $response = $this->postJson($this->getBaseUrl() . '/' . $product->id . '/reviews', $reviewData);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_user_cannot_store_a_review()
    {
        $product = $this->createProduct();

        $reviewData = [
            'rating' => $this->faker->numberBetween(1, 5),
            'comment' => $this->faker->paragraph,
        ];

        $response = $this->postJson($this->getBaseUrl() . '/' . $product->id . '/reviews', $reviewData);

        $response->assertStatus(401); // Unauthorized
    }
}
