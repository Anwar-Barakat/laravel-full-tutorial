<?php

namespace App\Http\Controllers\Api\_02_Product_Crud_With_Filter;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use App\Models\Tag;
use App\Models\Category;

class ProductController extends Controller
{
    public function index()
    {
        $products = QueryBuilder::for(Product::class)
            ->allowedFilters([
                AllowedFilter::scope('whereName'),
                AllowedFilter::scope('priceBetween'),
                'price',
                'category_id',
                AllowedFilter::exact('tags.name'),
                AllowedFilter::partial('tags.name'),
            ])
            ->allowedSorts('name', 'price', 'created_at')
            ->allowedIncludes(['category', 'tags'])
            ->get();

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'category_id' => 'nullable|exists:categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
        ]);

        $product = Product::create($request->except(['image', 'tags']));

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
            $product->image = $imagePath;
            $product->save();
        }

        return response()->json($product, 201);
    }

    public function show(string $id)
    {
        return Product::findOrFail($id);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'category_id' => 'nullable|exists:categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
        ]);

        $product = Product::findOrFail($id);
        $product->update($request->except(['image', 'tags']));

        if ($request->hasFile('image')) {
            // Delete old image if it exists
            if ($product->image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($product->image);
            }
            $imagePath = $request->file('image')->store('products', 'public');
            $product->image = $imagePath;
            $product->save();
        }

        return response()->json($product);
    }

    public function destroy(string $id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json(null, 204);
    }
}
