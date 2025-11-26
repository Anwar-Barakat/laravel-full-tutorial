<?php

namespace App\Actions\Product;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Data\Product\UpdateProductData;
use Spatie\LaravelData\Optional;
use Illuminate\Http\UploadedFile;
use App\Services\Media\SpatieMediaUploadService;
use App\Services\Media\DefaultStorageUploadService;

class UpdateProductAction
{
    public function __construct(
        protected SpatieMediaUploadService $spatieMediaUploadService,
        protected DefaultStorageUploadService $defaultStorageUploadService
    ) {}

    public function execute(Product $product, UpdateProductData $productData): Product
    {
        return DB::transaction(function () use ($product, $productData) {
            $updateData = $productData->except('main_image', 'gallery_images', 'delete_gallery_images', 'tags')->toArray();
            
            $product->update($updateData);

            if (!$productData->main_image instanceof Optional && $productData->main_image) {
                $product->clearMediaCollection('main_image');
                $this->spatieMediaUploadService->upload($product, $productData->main_image, 'main_image');
            }

            if (!$productData->gallery_images instanceof Optional && $productData->gallery_images) {
                foreach ($productData->gallery_images as $galleryImage) {
                    if ($galleryImage instanceof UploadedFile) {
                        $this->spatieMediaUploadService->upload($product, $galleryImage, 'gallery_images');
                    }
                }
            }

            if (!$productData->delete_gallery_images instanceof Optional && $productData->delete_gallery_images) {
                foreach ($productData->delete_gallery_images as $mediaId) {
                    $product->deleteMedia($mediaId);
                }
                $product->load('media'); // Reload media relationships
            }

            if (!$productData->tags instanceof Optional) {
                $product->tags()->sync($productData->tags);
            }

            return $product;
        });
    }
}
