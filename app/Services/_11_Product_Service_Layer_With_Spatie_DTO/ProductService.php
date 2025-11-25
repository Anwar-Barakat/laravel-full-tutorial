<?php

namespace App\Services\_11_Product_Service_Layer_With_Spatie_DTO;

use App\Data\Product\StoreProductData;
use App\Data\Product\UpdateProductData;
use App\Models\Product;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\Support\Facades\Storage;
use Spatie\LaravelData\Optional;

class ProductService
{
    public function getAllProducts(array $data)
    {
        return QueryBuilder::for(Product::class)
            ->allowedFilters(['name', 'price'])
            ->defaultSort('-created_at')
            ->paginate(10);
    }

    public function createProduct(StoreProductData $productData): Product
    {
        $product = Product::create($productData->only('name', 'description', 'price', 'category_id')->toArray());

        if ($productData->tags) {
            $product->tags()->sync($productData->tags);
        }

        if ($productData->main_image) {
            $product->addMedia($productData->main_image)->toMediaCollection('main_image');
        }

        if ($productData->gallery_images) {
            foreach ($productData->gallery_images as $image) {
                $product->addMedia($image)->toMediaCollection('gallery_images');
            }
        }

        return $product;
    }

    public function findProduct(string $id): ?Product
    {
        return Product::find($id);
    }

    public function updateProduct(Product $product, UpdateProductData $productData): Product
    {
        $product->update($productData->except('main_image', 'gallery_images', 'delete_gallery_images', 'tags')->toArray());

        if (!$productData->tags instanceof Optional) {
            $product->tags()->sync($productData->tags);
        }

        if (!$productData->main_image instanceof Optional && $productData->main_image) {
            $product->addMedia($productData->main_image)->toMediaCollection('main_image');
        }

        if (!$productData->gallery_images instanceof Optional && $productData->gallery_images) {
            foreach ($productData->gallery_images as $image) {
                $product->addMedia($image)->toMediaCollection('gallery_images');
            }
        }

        if (!$productData->delete_gallery_images instanceof Optional && $productData->delete_gallery_images) {
            $product->getMedia('gallery_images')
                ->whereIn('id', $productData->delete_gallery_images)
                ->each(fn ($media) => $media->delete());
        }


        return $product;
    }

    public function deleteProduct(Product $product): void
    {
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        // Delete all media associated with the product
        $product->clearMediaCollection('main_image');
        $product->clearMediaCollection('gallery_images');

        $product->delete();
    }
}
