<?php

namespace App\Data\Product;

use Spatie\LaravelData\Data;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Attributes\Validation\Rule;
use Spatie\LaravelData\Optional;

class UpdateProductData extends Data
{
    public function __construct(
        #[Rule(['sometimes', 'required', 'string', 'max:255'])]
        public string|Optional $name,
        #[Rule(['sometimes', 'required', 'string'])]
        public string|Optional $description,
        #[Rule(['sometimes', 'required', 'numeric', 'min:0'])]
        public float|Optional $price,
        #[Rule(['sometimes', 'required', 'exists:categories,id'])]
        public int|Optional $category_id,
        #[Rule(['nullable', 'array'])]
        public array|Optional|null $tags,
        #[Rule(['nullable', 'image'])]
        public UploadedFile|Optional|null $main_image,
        #[Rule(['nullable', 'array'])]
        public array|Optional|null $gallery_images,
        #[Rule(['nullable', 'array'])]
        public array|Optional|null $delete_gallery_images,
    ) {}
}