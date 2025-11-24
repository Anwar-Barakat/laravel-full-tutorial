<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Collection;
use Tests\Feature\Api\BaseUserApiTest;

class BaseProductApiTest extends BaseUserApiTest
{
    protected string $apiVersion = 'v1';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/products";
    }

    protected function createProduct(array $attributes = []): Product
    {
        return Product::factory()->create($attributes);
    }

    protected function createProducts(int $count = 1, array $attributes = []): Collection
    {
        if (empty($attributes) || ! is_array(reset($attributes))) {
            return Product::factory()->count($count)->create($attributes);
        }

        $products = new Collection();
        foreach ($attributes as $productAttrs) {
            $products->push(Product::factory()->create($productAttrs));
        }
        return $products;
    }

    protected function createCategory(array $attributes = []): Category
    {
        return Category::factory()->create($attributes);
    }


    protected function createCategories(int $count = 1, array $attributes = []): Collection
    {
        if (empty($attributes) || ! is_array(reset($attributes))) {
            return Category::factory()->count($count)->create($attributes);
        }

        $categories = new Collection();
        foreach ($attributes as $categoryAttrs) {
            $categories->push(Category::factory()->create($categoryAttrs));
        }
        return $categories;
    }
}
