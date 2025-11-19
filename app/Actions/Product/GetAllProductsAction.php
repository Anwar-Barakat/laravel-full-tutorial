<?php

namespace App\Actions\Product;

use App\Models\Product;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class GetAllProductsAction
{
    public function execute(array $queryParams): LengthAwarePaginator
    {
        return QueryBuilder::for(Product::class)
            ->allowedFilters([
                AllowedFilter::exact('name'),
                AllowedFilter::partial('name'),
                AllowedFilter::exact('description'),
                AllowedFilter::partial('description'),
                AllowedFilter::exact('tags.name'),
                AllowedFilter::partial('tags.name'),
            ])
            ->allowedSorts(['name', 'price', 'created_at'])
            ->allowedIncludes(['category', 'tags'])
            ->paginate(10);
    }
}
