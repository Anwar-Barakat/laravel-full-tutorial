<?php

namespace App\Data\Product;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Lazy;
use Spatie\LaravelData\Support\Validation\ValidationContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class ProductData extends Data
{
    public function __construct(
        public string $name,
        public string $description,
        public float $price,
        public ?int $stock,
        public ?int $category_id,
        public ?UploadedFile $image,
        public ?UploadedFile $main_image,
        /** @var UploadedFile[]|null */
        public ?array $gallery_images,
        /** @var int[]|null */
        public ?array $tags,
        /** @var int[]|null */
        public ?array $delete_gallery_images = null,
    ) {}

    public static function rules(ValidationContext $context): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['exists:tags,id'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'main_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'gallery_images' => ['nullable', 'array'],
            'gallery_images.*' => ['image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'delete_gallery_images' => ['nullable', 'array'],
            'delete_gallery_images.*' => ['integer'],
        ];

        return $rules;
    }
}
