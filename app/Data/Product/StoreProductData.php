<?php

namespace App\Data\Product;

use Spatie\LaravelData\Data;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Attributes\Validation\Rule;

class StoreProductData extends Data
{
    public function __construct(
        #[Rule(['required', 'string', 'max:255'])]
        public string $name,
        #[Rule(['required', 'string'])]
        public string $description,
        #[Rule(['required', 'numeric', 'min:0'])]
        public float $price,
        #[Rule(['required', 'exists:categories,id'])]
        public int $category_id,
        #[Rule(['nullable', 'array'])]
        public ?array $tags,
        #[Rule(['nullable', 'image'])]
        public ?UploadedFile $main_image,
        #[Rule(['nullable', 'array'])]
        public ?array $gallery_images,
    ) {}
}
