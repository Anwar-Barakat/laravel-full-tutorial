<?php

namespace App\Actions\Product;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Data\Product\ProductData;
use Illuminate\Http\UploadedFile;

class UpdateProductAction
{
    public function execute(Product $product, ProductData $productData): Product
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
}
