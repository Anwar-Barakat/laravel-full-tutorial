<?php

namespace App\Http\Controllers\Api\_08_Product_Spatie_Role_Permission;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\Api\Product\StoreProductRequest;
use App\Http\Requests\Api\Product\UpdateProductRequest;
use App\Models\Product;
use App\Http\Traits\ApiResponseTrait;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use App\Http\Resources\ProductResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        if (Auth::check() && !Auth::user()->can('view products')) {
            return $this->errorResponse('Unauthorized to view products.', 403);
        }

        $products = QueryBuilder::for(Product::class)
            ->allowedFilters([
                AllowedFilter::exact('name'),
                AllowedFilter::partial('name'),
                AllowedFilter::exact('description'),
                AllowedFilter::partial('description'),
                AllowedFilter::exact('tags.name'),
                AllowedFilter::partial('tags.name'),
            ])
            ->allowedSorts(['name', 'price', 'created_at'])
            ->allowedIncludes(['category', 'tags'])
            ->paginate(10);

        return $this->successResponse(ProductResource::collection($products), 'Products retrieved successfully.');
    }

    public function store(StoreProductRequest $request)
    {
        if (Auth::check() && !Auth::user()->can('create products')) {
            return $this->errorResponse('Unauthorized to create products.', 403);
        }

        return DB::transaction(function () use ($request) {
            $product = Product::create($request->except(['image', 'main_image', 'gallery_images', 'tags']));

            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($request->hasFile('main_image')) {
                $product->addMediaFromRequest('main_image')->toMediaCollection('main_image');
            }

            if ($request->hasFile('gallery_images')) {
                foreach ($request->file('gallery_images') as $galleryImage) {
                    $product->addMedia($galleryImage)->toMediaCollection('gallery_images');
                }
            }

            if ($request->has('tags')) {
                $product->tags()->sync($request->input('tags'));
            }

            return $this->successResponse(new ProductResource($product), 'Product created successfully.', 201);
        });
    }

    public function show(string $id)
    {
        if (Auth::check() && !Auth::user()->can('view products')) {
            return $this->errorResponse('Unauthorized to view products.', 403);
        }

        $product = Product::with(['category', 'tags'])->find($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        return $this->successResponse(new ProductResource($product), 'Product retrieved successfully.');
    }

    public function update(UpdateProductRequest $request, string $id)
    {
        if (Auth::check() && !Auth::user()->can('edit products')) {
            return $this->errorResponse('Unauthorized to edit products.', 403);
        }

        $product = Product::find($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        return DB::transaction(function () use ($request, $product) {
            $product->update($request->except(['image', 'main_image', 'gallery_images', 'tags', 'delete_gallery_images']));

            if ($request->hasFile('image')) {
                if ($product->image) {
                    Storage::disk('public')->delete($product->image);
                }
                $imagePath = $request->file('image')->store('products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($request->hasFile('main_image')) {
                $product->clearMediaCollection('main_image');
                $product->addMediaFromRequest('main_image')->toMediaCollection('main_image');
            }

            if ($request->hasFile('gallery_images')) {
                foreach ($request->file('gallery_images') as $galleryImage) {
                    $product->addMedia($galleryImage)->toMediaCollection('gallery_images');
                }
            }

            if ($request->has('delete_gallery_images')) {
                $product->deleteMedia($request->input('delete_gallery_images'));
            }

            if ($request->has('tags')) {
                $product->tags()->sync($request->input('tags'));
            } else {
                $product->tags()->detach();
            }

            return $this->successResponse(new ProductResource($product), 'Product updated successfully.');
        });
    }

    public function destroy(string $id)
    {
        if (Auth::check() && !Auth::user()->can('delete products')) {
            return $this->errorResponse('Unauthorized to delete products.', 403);
        }

        $product = Product::find($id);

        if (!$product) {
            return $this->notFoundResponse('Product not found.');
        }

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        $product->delete();

        return $this->successResponse(null, 'Product deleted successfully.', 204);
    }
}
