<?php

namespace App\Http\Controllers\Api\_01_Product_Crud;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index()
    {
        return Product::all();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg'
        ]);

        $product = Product::create($request->except('image'));

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
        ]);

        $product = Product::findOrFail($id);
        $product->update($request->except('image'));

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
