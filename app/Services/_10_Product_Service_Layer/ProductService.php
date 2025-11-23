<?php

namespace App\Services\_10_Product_Service_Layer;

use App\Models\Product;
use App\Models\Category;
use App\Models\Tag;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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

    public function createProduct(array $data, ?UploadedFile $image = null, ?UploadedFile $mainImage = null, ?array $galleryImages = null, ?array $tags = null): Product
    {
        return DB::transaction(function () use ($data, $image, $mainImage, $galleryImages, $tags) {
            $product = Product::create($data);

            if ($image) {
                $imagePath = $image->store('products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($mainImage) {
                $product->addMedia($mainImage)->toMediaCollection('main_image');
            }

            if ($galleryImages) {
                foreach ($galleryImages as $galleryImage) {
                    $product->addMedia($galleryImage)->toMediaCollection('gallery_images');
                }
            }

            if ($tags) {
                $product->tags()->sync($tags);
            }

            return $product;
        });
    }

    public function updateProduct(Product $product, array $data, ?UploadedFile $image = null, ?UploadedFile $mainImage = null, ?array $galleryImages = null, ?array $tags = null, ?array $deleteGalleryImages = null): Product
    {
        return DB::transaction(function () use ($product, $data, $image, $mainImage, $galleryImages, $tags, $deleteGalleryImages) {
            $product->update($data);

            if ($image) {
                if ($product->image) {
                    Storage::disk('public')->delete($product->image);
                }
                $imagePath = $image->store('products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($mainImage) {
                $product->clearMediaCollection('main_image');
                $product->addMedia($mainImage)->toMediaCollection('main_image');
            }

            if ($galleryImages) {
                foreach ($galleryImages as $galleryImage) {
                    $product->addMedia($galleryImage)->toMediaCollection('gallery_images');
                }
            }

            if ($deleteGalleryImages) {
                foreach ($deleteGalleryImages as $mediaId) {
                    $product->deleteMedia($mediaId);
                }
            }

            if ($tags !== null) {
                $product->tags()->sync($tags);
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
