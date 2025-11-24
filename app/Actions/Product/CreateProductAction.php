<?php

namespace App\Actions\Product;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use App\Data\ProductData;
use App\Jobs\SendNewProductNotification;
use Illuminate\Http\UploadedFile;
use App\Services\Media\SpatieMediaUploadService;
use App\Services\Media\DefaultStorageUploadService;

class CreateProductAction
{
    public function __construct(
        protected SpatieMediaUploadService $spatieMediaUploadService,
        protected DefaultStorageUploadService $defaultStorageUploadService
    ) {}

    public function execute(ProductData $productData): Product
    {
        return DB::transaction(function () use ($productData) {
            $product = Product::create($productData->except('image', 'main_image', 'gallery_images', 'tags')->toArray());

            if ($productData->image instanceof UploadedFile) {
                $imagePath = $this->defaultStorageUploadService->upload($productData->image, 'products', 'public');
                $product->image = $imagePath;
                $product->save();
            }

            if ($productData->main_image instanceof UploadedFile) {
                $this->spatieMediaUploadService->upload($product, $productData->main_image, 'main_image');
            }

            if ($productData->gallery_images) {
                foreach ($productData->gallery_images as $galleryImage) {
                    if ($galleryImage instanceof UploadedFile) {
                        $this->spatieMediaUploadService->upload($product, $galleryImage, 'gallery_images');
                    }
                }
            }

            if ($productData->tags) {
                $product->tags()->sync($productData->tags);
            }

            return $product;
        });
    }
}
