<?php

namespace Tests\Feature\Api\_02_Product_Crud_With_Filter;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseProductApiTest;
use App\Models\Tag;
use App\Models\Product;
use App\Models\Category;

class ProductIndexTest extends BaseProductApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_given_products_exist_when_index_called_then_returns_all_products()
    {
        $this->createProducts(3);

        $response = $this->getJson('/api/v2/products');

        $response->assertStatus(200)
            ->assertJsonCount(3)
            ->assertJsonStructure([
                '*' => [
                    'id', 'name', 'description', 'price', 'image', 'category_id', 'created_at', 'updated_at',
                ],
            ]);
    }

    public function test_given_no_products_when_index_called_then_returns_empty_array()
    {
        $response = $this->getJson('/api/v2/products');

        $response->assertStatus(200)
            ->assertJsonCount(0);
    }

    public function test_given_name_filter_when_index_called_then_returns_matching_products()
    {
        Product::factory()->create(['name' => 'Apple iPhone']);
        Product::factory()->create(['name' => 'Samsung Galaxy']);

        $response = $this->getJson('/api/v2/products?filter[whereName]=iPhone');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Apple iPhone']);
    }

    public function test_given_price_between_filter_when_index_called_then_returns_in_range_products()
    {
        Product::factory()->create(['price' => 50]);
        Product::factory()->create(['price' => 150]);
        Product::factory()->create(['price' => 500]);

        $response = $this->getJson('/api/v2/products?filter[priceBetween]=100,200');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['price' => 150]);
    }

    public function test_given_exact_tag_filter_when_index_called_then_returns_matching_products()
    {
        $tagPhone = Tag::factory()->create(['name' => 'Phone']);
        $tagLaptop = Tag::factory()->create(['name' => 'Laptop']);

        $product1 = Product::factory()->create(['name' => 'Model A']);
        $product2 = Product::factory()->create(['name' => 'Model B']);
        $product1->tags()->attach($tagPhone->id);
        $product2->tags()->attach($tagLaptop->id);

        $response = $this->getJson('/api/v2/products?filter[tags.name]=Phone');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Model A']);
    }

    public function test_given_include_category_and_tags_when_index_called_then_returns_nested_relations()
    {
        $category = Category::factory()->create();
        $tag = Tag::factory()->create(['name' => 'Featured']);
        $product = Product::factory()->create(['category_id' => $category->id]);
        $product->tags()->attach($tag->id);

        $response = $this->getJson('/api/v2/products?include=category,tags');

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $product->id])
            ->assertJsonStructure([
                '*' => [
                    'id', 'name', 'category', 'tags',
                ],
            ]);
    }
}