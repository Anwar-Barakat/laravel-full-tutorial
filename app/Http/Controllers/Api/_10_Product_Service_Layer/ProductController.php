<?php

namespace App\Http\Controllers\Api\_10_Product_Service_Layer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\Api\Product\StoreProductRequest;
use App\Http\Requests\Api\Product\UpdateProductRequest;
use App\Models\Product;
use App\Http\Traits\ApiResponseTrait;
use App\Http\Resources\ProductResource;
use App\Services\_10_Product_Service_Layer\ProductService;

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

    public function store(StoreProductRequest $request)
    {
        $this->authorize('create', Product::class);

        $product = $this->productService->createProduct(
            $request->except(['image', 'main_image', 'gallery_images', 'tags']),
            $request->file('image'),
            $request->file('main_image'),
            $request->file('gallery_images'),
            $request->input('tags')
        );

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

    public function update(UpdateProductRequest $request, string $id)
    {
        $product = $this->productService->findProduct($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('update', $product);

        $product = $this->productService->updateProduct(
            $product,
            $request->except(['image', 'main_image', 'gallery_images', 'tags', 'delete_gallery_images']),
            $request->file('image'),
            $request->file('main_image'),
            $request->file('gallery_images'),
            $request->has('tags') ? $request->input('tags') : null,
            $request->has('delete_gallery_images') ? (array) $request->input('delete_gallery_images') : null
        );

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
