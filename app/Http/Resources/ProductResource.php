<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => (float) $this->price,
            'stock' => $this->stock,
            'image' => $this->image ? asset($this->image) : null,
            'media' => [
                'image' => [
                    'url' => $this->getFirstMediaUrl('main_image'),
                    'thumb_url' => $this->getFirstMediaUrl('main_image', 'thumb'),
                ],
                'gallery' => $this->getMedia('gallery_images')->map(function ($media) {
                    return [
                        'id' => $media->id,
                        'url' => $media->getFullUrl(),
                        'thumb_url' => $media->getUrl('thumb'),
                    ];
                })->toArray(), // Convert collection to array
            ],
            'category' => $this->whenLoaded('category', new CategoryResource($this->category)),
            'tags' => TagResource::collection($this->whenLoaded('tags') ?? $this->tags),
            'reviews' => ReviewResource::collection($this->whenLoaded('reviews')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
