<?php

namespace App\Services\_11_Product_Service_Spatie_Data;

use App\Models\Product;
use App\Models\Category;
use App\Models\Tag;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Data\ProductData;
use Illuminate\Http\UploadedFile;

class ProductService
{
    public function getAllProducts(array $queryParams)
    {
        return QueryBuilder::for(Product::class)
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
    }

    public function findProduct(string $id): ?Product
    {
        return Product::with(['category', 'tags'])->find($id);
    }

    public function createProduct(ProductData $productData): Product
    {
        return DB::transaction(function () use ($productData) {
            $product = Product::create($productData->except('image', 'main_image', 'gallery_images', 'tags')->toArray());

            if ($productData->image instanceof UploadedFile) {
                $imagePath = $productData->image->store('products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($productData->main_image instanceof UploadedFile) {
                $product->addMedia($productData->main_image)->toMediaCollection('main_image');
            }

            if ($productData->gallery_images) {
                foreach ($productData->gallery_images as $galleryImage) {
                    if ($galleryImage instanceof UploadedFile) {
                        $product->addMedia($galleryImage)->toMediaCollection('gallery_images');
                    }
                }
            }

            if ($productData->tags) {
                $product->tags()->sync($productData->tags);
            }

            return $product;
        });
    }

    public function updateProduct(Product $product, ProductData $productData): Product
    {
        return DB::transaction(function () use ($product, $productData) {
            $product->update($productData->except('image', 'main_image', 'gallery_images', 'tags', 'delete_gallery_images')->toArray());

            if ($productData->image instanceof UploadedFile) {
                if ($product->image) {
                    Storage::disk('public')->delete($product->image);
                }
                $imagePath = $productData->image->store('products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($productData->main_image instanceof UploadedFile) {
                $product->clearMediaCollection('main_image');
                $product->addMedia($productData->main_image)->toMediaCollection('main_image');
            }

            if ($productData->gallery_images) {
                foreach ($productData->gallery_images as $galleryImage) {
                    if ($galleryImage instanceof UploadedFile) {
                        $product->addMedia($galleryImage)->toMediaCollection('gallery_images');
                    }
                }
            }

            if ($productData->delete_gallery_images) {
                foreach ($productData->delete_gallery_images as $mediaId) {
                    $product->deleteMedia($mediaId);
                }
            }

            if ($productData->tags !== null) {
                $product->tags()->sync($productData->tags);
            }

            return $product;
        });
    }

    public function deleteProduct(Product $product): ?bool
    {
        return DB::transaction(function () use ($product) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            return $product->delete();
        });
    }
}
