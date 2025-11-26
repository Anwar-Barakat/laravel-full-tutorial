<?php

namespace Tests\Feature\Api\_13_Product_Cache_RateLimit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProductShowTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v13';

    public function test_single_product_is_cached_on_first_request()
    {
        $this->createUserWithPermission('view products');
        $product = $this->createProduct();

        // Enable query logging
        DB::enableQueryLog();

        // First request - should hit the database and cache the result
        $response1 = $this->getJson($this->getBaseUrl() . '/' . $product->id);
        $response1->assertStatus(200);
        $this->assertGreaterThan(0, count(DB::getQueryLog()));
        DB::flushQueryLog();

        // Second request - should be served from cache
        $response2 = $this->getJson($this->getBaseUrl() . '/' . $product->id);
        $response2->assertStatus(200);
        $this->assertCount(0, DB::getQueryLog());
    }

    public function test_single_product_cache_is_invalidated_on_update()
    {
        $user = $this->createUserWithPermission('edit products');
        $product = $this->createProduct();
        
        $viewUser = $this->createUserWithPermission('view products');
        // Authenticate as a user with view permissions
        $this->actingAs($viewUser);
        $this->getJson($this->getBaseUrl() . '/' . $product->id)->assertStatus(200);
        
        // Update the product (as a user with permission)
        $this->actingAs($user);
        $this->putJson($this->getBaseUrl() . '/' . $product->id, [
            'name' => 'Updated Product Name',
            'description' => 'Updated description',
            'price' => 123.45,
            'category_id' => $product->category_id,
        ])->assertStatus(200);

        $this->actingAs($viewUser);
        DB::enableQueryLog();
        // The next GET request should hit the database again
        $this->getJson($this->getBaseUrl() . '/' . $product->id)->assertStatus(200);
        $this->assertGreaterThan(0, count(DB::getQueryLog()));
    }
}
