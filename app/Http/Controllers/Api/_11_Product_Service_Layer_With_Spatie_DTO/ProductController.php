<?php

namespace App\Http\Controllers\Api\_11_Product_Service_Layer_With_Spatie_DTO;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Http\Traits\ApiResponseTrait;
use App\Http\Resources\ProductResource;
use App\Services\_11_Product_Service_Layer_With_Spatie_DTO\ProductService;
use App\Data\Product\StoreProductData;
use App\Data\Product\UpdateProductData;

class ProductController extends Controller
{
    use ApiResponseTrait;

    protected $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Product::class);

        $products = $this->productService->getAllProducts($request->all());

        return $this->successResponse(ProductResource::collection($products), 'Products retrieved successfully.');
    }

    public function store(StoreProductData $productData)
    {
        $this->authorize('create', Product::class);

        $product = $this->productService->createProduct($productData);

        return $this->successResponse(new ProductResource($product), 'Product created successfully.', 201);
    }

    public function show(string $id)
    {
        $product = $this->productService->findProduct($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('view', $product);

        return $this->successResponse(new ProductResource($product), 'Product retrieved successfully.');
    }

    public function update(UpdateProductData $productData, string $id)
    {
        $product = $this->productService->findProduct($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('update', $product);

        $product = $this->productService->updateProduct($product, $productData);

        return $this->successResponse(new ProductResource($product), 'Product updated successfully.');
    }

    public function destroy(string $id)
    {
        $product = $this->productService->findProduct($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('delete', $product);

        $this->productService->deleteProduct($product);

        return $this->successResponse(null, 'Product deleted successfully.', 204);
    }
}
