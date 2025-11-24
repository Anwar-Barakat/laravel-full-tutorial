<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Collection;
use Tests\Feature\Api\BaseUserApiTest;

class BaseProductApiTest extends BaseUserApiTest
{
    /**
     * The API version for the product routes.
     *
     * @var string
     */
    protected string $apiVersion = 'v1';

    /**
     * Get the base URL for the product API.
     *
     * @return string
     */
    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/products";
    }

    /**
     * Create a single product with specified attributes.
     *
     * @param array $attributes Additional attributes for the product factory.
     * @return Product
     */
    protected function createProduct(array $attributes = []): Product
    {
        return Product::factory()->create($attributes);
    }

    /**
     * Create multiple products with specified attributes.
     *
     * @param int $count The number of products to create.
     * @param array $attributes Attributes for each product, or an array of attribute arrays.
     * @return Collection<Product>
     */
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

    /**
     * Create a single category with specified attributes.
     *
     * @param array $attributes Additional attributes for the category factory.
     * @return Category
     */
    protected function createCategory(array $attributes = []): Category
    {
        return Category::factory()->create($attributes);
    }

    /**
     * Create multiple categories with specified attributes.
     *
     * @param int $count The number of categories to create.
     * @param array $attributes Attributes for each category, or an array of attribute arrays.
     * @return Collection<Category>
     */
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