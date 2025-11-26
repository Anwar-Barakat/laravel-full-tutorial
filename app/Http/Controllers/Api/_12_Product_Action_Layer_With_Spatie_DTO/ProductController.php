<?php

namespace App\Http\Controllers\Api\_12_Product_Action_Layer_With_Spatie_DTO;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Http\Traits\ApiResponseTrait;
use App\Http\Resources\ProductResource;
use App\Data\Product\StoreProductData;
use App\Data\Product\UpdateProductData;

use App\Actions\Product\GetAllProductsAction;
use App\Actions\Product\FindProductAction;
use App\Actions\Product\CreateProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Actions\Product\DeleteProductAction;

class ProductController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request, GetAllProductsAction $action)
    {
        $this->authorize('viewAny', Product::class);

        $products = $action->execute($request->all());

        return $this->successResponse(ProductResource::collection($products), 'Products retrieved successfully.');
    }

    public function store(StoreProductData $productData, CreateProductAction $action)
    {
        $this->authorize('create', Product::class);

        $product = $action->execute($productData);

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

    public function update(UpdateProductData $productData, string $id, UpdateProductAction $action, FindProductAction $findProductAction)
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
