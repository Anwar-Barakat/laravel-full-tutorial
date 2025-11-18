<?php

namespace App\Http\Controllers\Api\_05_Product_Review_Polymorphic;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use App\Http\Traits\ApiResponseTrait;

class ReviewController extends Controller
{
    use ApiResponseTrait;

    public function index(Product $product)
    {
        $reviews = $product->reviews()->paginate(10);
        return $this->successResponse(ReviewResource::collection($reviews), 'Reviews retrieved successfully.');
    }

    public function store(Request $request, Product $product)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string',
        ]);

        $review = $product->reviews()->create([
            'user_id' => auth()->id() ?? \App\Models\User::factory()->create()->id, // for testing
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        return $this->successResponse(new ReviewResource($review), 'Review created successfully.', 201);
    }
}
