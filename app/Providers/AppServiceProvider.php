<?php

namespace App\Providers;

use App\Models\Order; // Add this line
use App\Observers\OrderObserver; // Add this line
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Order::observe(OrderObserver::class); // Add this line
    }
}