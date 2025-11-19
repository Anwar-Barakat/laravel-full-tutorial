<?php

namespace App\Actions\Product;

use App\Models\Product;

class FindProductAction
{
    public function execute(string $id): ?Product
    {
        return Product::with(['category', 'tags'])->find($id);
    }
}
