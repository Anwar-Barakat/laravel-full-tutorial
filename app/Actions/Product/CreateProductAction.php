<?php

namespace App\Actions\Product;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use App\Data\Product\ProductData;
use App\Jobs\SendNewProductNotification;
use Illuminate\Http\UploadedFile;

class CreateProductAction
{
    public function execute(ProductData $productData): Product
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
}
