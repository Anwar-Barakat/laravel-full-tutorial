<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Product;
use App\Models\Tag;
use App\Models\Category;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v2';

    public function test_can_get_all_products_with_filters()
    {
        $this->createAuthenticatedUser();
        $products = $this->createProducts(5);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJsonCount(5)
            ->assertJsonStructure([
                '*' => [
                    'id', 'name', 'description', 'price', 'image', 'category_id', 'created_at', 'updated_at',
                ]
            ]);
    }

    public function test_can_filter_products_by_name()
    {
        $this->createAuthenticatedUser();
        $product1 = $this->createProduct(['name' => 'Apple iPhone']);
        $product2 = $this->createProduct(['name' => 'Samsung Galaxy']);
        $product3 = $this->createProduct(['name' => 'Google Pixel']);

        $response = $this->getJson($this->getBaseUrl() . '?filter[whereName]=Apple');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Apple iPhone']);
    }

    public function test_can_filter_products_by_price_range()
    {
        $this->createAuthenticatedUser();
        $product1 = $this->createProduct(['price' => 100]);
        $product2 = $this->createProduct(['price' => 250]);
        $product3 = $this->createProduct(['price' => 400]);

        $response = $this->getJson($this->getBaseUrl() . '?filter[priceBetween]=150,300');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => $product2->name]);
    }

    public function test_can_filter_products_by_tag_name()
    {
        $this->createAuthenticatedUser();
        $tagA = Tag::factory()->create(['name' => 'Electronics']);
        $tagB = Tag::factory()->create(['name' => 'Mobile']);

        $product1 = $this->createProduct();
        $product1->tags()->attach($tagA);

        $product2 = $this->createProduct();
        $product2->tags()->attach($tagB);

        $product3 = $this->createProduct();
        $product3->tags()->attach($tagA);
        $product3->tags()->attach($tagB);

        $response = $this->getJson($this->getBaseUrl() . '?filter[tags.name]=Electronics');

        $response->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonFragment(['name' => $product1->name])
            ->assertJsonFragment(['name' => $product3->name]);
    }

    public function test_can_sort_products_by_name_ascending()
    {
        $this->createAuthenticatedUser();
        $productC = $this->createProduct(['name' => 'Product C']);
        $productA = $this->createProduct(['name' => 'Product A']);
        $productB = $this->createProduct(['name' => 'Product B']);

        $response = $this->getJson($this->getBaseUrl() . '?sort=name');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Product A'])
            ->assertJsonFragment(['name' => 'Product B'])
            ->assertJsonFragment(['name' => 'Product C'])
            ->assertSeeInOrder(['Product A', 'Product B', 'Product C']);
    }

    public function test_can_sort_products_by_price_descending()
    {
        $this->createAuthenticatedUser();
        $product100 = $this->createProduct(['price' => 100]);
        $product500 = $this->createProduct(['price' => 500]);
        $product200 = $this->createProduct(['price' => 200]);

        $response = $this->getJson($this->getBaseUrl() . '?sort=-price');

        $response->assertStatus(200)
            ->assertJsonFragment(['price' => 500.00])
            ->assertJsonFragment(['price' => 200.00])
            ->assertJsonFragment(['price' => 100.00])
            ->assertSeeInOrder([500.00, 200.00, 100.00]);
    }

    public function test_can_include_category_and_tags()
    {
        $this->createAuthenticatedUser();
        $category = $this->createCategory(['name' => 'Electronics']);
        $tag = Tag::factory()->create(['name' => 'Featured']);

        $product = $this->createProduct(['category_id' => $category->id]);
        $product->tags()->attach($tag);

        $response = $this->getJson($this->getBaseUrl() . '?include=category,tags');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Electronics'])
            ->assertJsonFragment(['name' => 'Featured']);
    }

    public function test_unauthenticated_user_cannot_access_products_with_filters()
    {
        $this->createProducts(3);

        $response = $this->getJson($this->getBaseUrl() . '?filter[name]=test');

        $response->assertStatus(401); // Unauthorized
    }
}
