<?php

namespace App\Http\Controllers\Api\_22_Product_Job_Queue;

use App\Http\Controllers\Controller;
use App\Data\Product\ProductData;
use App\Http\Resources\ProductResource;
use App\Jobs\SendNewProductNotification;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

use App\Actions\Product\GetAllProductsAction;
use App\Actions\Product\FindProductAction;
use App\Actions\Product\CreateProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Actions\Product\DeleteProductAction;

class ProductController extends Controller
{
    public function index(Request $request, GetAllProductsAction $action)
    {
        $this->authorize('viewAny', Product::class);

        $products = $action->execute($request->all());

        return $this->successResponse(ProductResource::collection($products), 'Products retrieved successfully.');
    }


    public function store(ProductData $productData, CreateProductAction $action): JsonResponse
    {
        $this->authorize('create', Product::class);

        $product = $action->execute($productData);

        SendNewProductNotification::dispatch($product);

        return $this->successResponse(new ProductResource($product), 'Product created successfully.', 201);
    }

    public function show(string $id, FindProductAction $action)
    {
        $product = $action->execute($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('view', $product);

        return $this->successResponse(new ProductResource($product), 'Product retrieved successfully.');
    }

    public function update(ProductData $productData, string $id, UpdateProductAction $action, FindProductAction $findProductAction)
    {
        $product = $findProductAction->execute($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        $this->authorize('update', $product);

        $product = $action->execute($product, $productData);

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

        return $this->successResponse(null, 'Product deleted successfully.', 204);
    }
}
