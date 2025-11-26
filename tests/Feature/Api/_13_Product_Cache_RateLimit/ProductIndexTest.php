<?php

namespace Tests\Feature\Api\_13_Product_Cache_RateLimit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProductIndexTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v13';

    public function test_products_are_cached_on_first_request()
    {
        $this->createUserWithPermission('view products');
        $this->createProducts(5);

        // Enable query logging
        DB::enableQueryLog();

        // First request - should hit the database and cache the result
        $response1 = $this->getJson($this->getBaseUrl());
        $response1->assertStatus(200);
        $this->assertGreaterThan(0, count(DB::getQueryLog()));
        DB::flushQueryLog();

        // Second request - should be served from cache
        $response2 = $this->getJson($this->getBaseUrl());
        $response2->assertStatus(200);
        $this->assertCount(0, DB::getQueryLog());
    }

    public function test_product_cache_is_invalidated_on_new_product_creation()
    {
        $user = $this->createUserWithPermission('view products');
        $this->createProducts(5);
        $this->getJson($this->getBaseUrl())->assertStatus(200);

        // Create a new product (as a user with permission)
        $this->actingAs($this->createUserWithPermission('create products'));
        $this->postJson($this->getBaseUrl(), [
            'name' => 'New Product',
            'description' => 'A new product description',
            'price' => 99.99,
            'category_id' => $this->createCategory()->id,
        ])->assertStatus(201);
        
        $this->actingAs($user);

        DB::enableQueryLog();
        // The next GET request should hit the database again
        $this->getJson($this->getBaseUrl())->assertStatus(200);
        $this->assertGreaterThan(0, count(DB::getQueryLog()));
    }
    
    public function test_rate_limiting_is_applied_to_product_index()
    {
        $user = $this->createUserWithPermission('view products');

        // Make 61 requests within a minute
        for ($i = 0; $i < 61; $i++) {
            $response = $this->getJson($this->getBaseUrl());
        }

        $response->assertStatus(429); // Too Many Requests
    }
}
