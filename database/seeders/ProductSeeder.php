<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        \App\Models\Product::factory(10)->create()->each(function ($product) {
            $tags = \App\Models\Tag::all()->random(rand(1, 3));
            $product->tags()->attach($tags);
        });
    }
}
