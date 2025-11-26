<?php

namespace App\Actions\Product;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DeleteProductAction
{
    public function execute(Product $product): ?bool
    {
        return DB::transaction(function () use ($product) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            // Delete all media associated with the product
            $product->clearMediaCollection('main_image');
            $product->clearMediaCollection('gallery_images');

            return $product->delete();
        });
    }
}
