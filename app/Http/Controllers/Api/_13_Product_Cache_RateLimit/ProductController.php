<?php

namespace App\Http\Controllers\Api\_13_Product_Cache_RateLimit;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Http\Traits\ApiResponseTrait;
use App\Http\Resources\ProductResource;
use App\Data\Product\StoreProductData;
use App\Data\Product\UpdateProductData;

// Import Actions
use App\Actions\Product\GetAllProductsAction;
use App\Actions\Product\FindProductAction;
use App\Actions\Product\CreateProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Actions\Product\DeleteProductAction;

// Import Cache Facade
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request, GetAllProductsAction $action)
    {
        $this->authorize('viewAny', Product::class);

        $cacheKey = 'products_all_' . md5(json_encode($request->all()));

        $products = Cache::remember($cacheKey, 60, function () use ($action, $request) {
            return $action->execute($request->all());
        });

        return $this->successResponse(ProductResource::collection($products), 'Products retrieved successfully.');
    }

    public function store(StoreProductData $productData, CreateProductAction $action)
    {
        $this->authorize('create', Product::class);

        $product = $action->execute($productData);

        // Invalidate cache for all products after creation
        Cache::flush(); // More specific invalidation needed, but for now flush all product caches

        return $this->successResponse(new ProductResource($product), 'Product created successfully.', 201);
    }

    public function show(string $id, FindProductAction $action)
    {
        $cacheKey = 'product_' . $id;

        $product = Cache::remember($cacheKey, 60, function () use ($action, $id) {
            return $action->execute($id);
        });

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('view', $product);

        return $this->successResponse(new ProductResource($product), 'Product retrieved successfully.');
    }

    public function update(UpdateProductData $productData, string $id, UpdateProductAction $action, FindProductAction $findProductAction)
    {
        $product = $findProductAction->execute($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('update', $product);

        $product = $action->execute($product, $productData);

        // Invalidate cache for specific product and all products list
        Cache::forget('product_' . $id);
        Cache::flush();

        return $this->successResponse(new ProductResource($product), 'Product updated successfully.');
    }

    public function destroy(string $id, DeleteProductAction $action, FindProductAction $findProductAction)
    {
        $product = $findProductAction->execute($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('delete', $product);

        $action->execute($product);

        // Invalidate cache for specific product and all products list
        Cache::forget('product_' . $id);
        Cache::flush();

        return $this->successResponse(null, 'Product deleted successfully.', 204);
    }
}
