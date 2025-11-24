<?php

namespace App\Actions\Product;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Data\ProductData;
use Illuminate\Http\UploadedFile;

class UpdateProductAction
{
    public function execute(Product $product, ProductData $productData): Product
    {
        return DB::transaction(function () use ($product, $productData) {
            $updateData = [
                'name' => $productData->name,
                'description' => $productData->description,
                'price' => $productData->price,
                'stock' => $productData->stock,
                'category_id' => $productData->category_id,
            ];

            // Handle the 'image' field specifically
            if ($productData->image instanceof UploadedFile) {
                if ($product->image) {
                    Storage::disk('public')->delete($product->image);
                }
                $imagePath = $productData->image->store('products', 'public');
                $updateData['image'] = $imagePath;
            } else if ($productData->image === null && isset($productData->image)) {
                // If 'image' was explicitly sent as null in the request
                if ($product->image) {
                    Storage::disk('public')->delete($product->image);
                }
                $updateData['image'] = null;
            }
            // If productData->image is not provided in the request at all, it would be null,
            // and its value in $updateData would not be explicitly set. This is desired.


            $product->update($updateData);

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
                $product->load('media'); // Reload media relationships
            }

            if ($productData->tags !== null) {
                $product->tags()->sync($productData->tags);
            }

            return $product;
        });
    }
}
