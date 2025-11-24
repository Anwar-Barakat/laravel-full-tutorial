<?php

namespace App\Services\Product;

use App\Models\Product;
use App\Models\Category;
use App\Models\Tag;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use App\Services\Media\SpatieMediaUploadService;
use App\Services\Media\DefaultStorageUploadService;

class ProductService
{
    public function __construct(
        protected SpatieMediaUploadService $spatieMediaUploadService,
        protected DefaultStorageUploadService $defaultStorageUploadService
    ) {}

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
                $imagePath = $this->defaultStorageUploadService->upload($image, 'products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($mainImage) {
                $this->spatieMediaUploadService->upload($product, $mainImage, 'main_image');
            }

            if ($galleryImages) {
                foreach ($galleryImages as $galleryImage) {
                    $this->spatieMediaUploadService->upload($product, $galleryImage, 'gallery_images');
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
            $attributesToUpdate = $data;

            // Handle the 'image' field before updating other data
            if ($image) {
                if ($product->image) {
                    $this->defaultStorageUploadService->delete($product->image);
                }
                $attributesToUpdate['image'] = $this->defaultStorageUploadService->upload($image, 'products', 'public');
            } elseif (array_key_exists('image', $attributesToUpdate) && $attributesToUpdate['image'] === null) {
                if ($product->image) {
                    $this->defaultStorageUploadService->delete($product->image);
                }
                $attributesToUpdate['image'] = null;
            }

            $product->update($attributesToUpdate);

            if ($mainImage) {
                $product->clearMediaCollection('main_image');
                $this->spatieMediaUploadService->upload($product, $mainImage, 'main_image');
            }

            if ($galleryImages) {
                foreach ($galleryImages as $galleryImage) {
                    $this->spatieMediaUploadService->upload($product, $galleryImage, 'gallery_images');
                }
            }

            if ($deleteGalleryImages) {
                foreach ($deleteGalleryImages as $mediaId) {
                    $product->deleteMedia($mediaId);
                }
                $product->load('media'); // Reload media relationships
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
                $this->defaultStorageUploadService->delete($product->image);
            }
            return $product->delete();
        });
    }
}
