<?php

namespace App\Actions\Order;

use App\Models\Order;
use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class GetAllOrdersAction
{
    use AsAction;

    public function execute(array $queryParameters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return QueryBuilder::for(Order::class)
            ->allowedFilters([
                AllowedFilter::exact('user_id'),
                AllowedFilter::exact('status'),
                AllowedFilter::partial('shipping_address'),
            ])
            ->allowedSorts(['total_amount', 'status', 'created_at'])
            ->allowedIncludes(['user', 'orderItems'])
            ->paginate(10);
    }
}
