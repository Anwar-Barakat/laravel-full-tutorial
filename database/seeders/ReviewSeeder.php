<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = \App\Models\Product::all();

        if ($products->isEmpty()) {
            $this->command->info('No products found, skipping review seeding.');
            return;
        }

        $products->each(function ($product) {
            \App\Models\Review::factory()->count(rand(1, 5))->create([
                'reviewable_id' => $product->id,
                'reviewable_type' => get_class($product),
            ]);
        });
    }
}
