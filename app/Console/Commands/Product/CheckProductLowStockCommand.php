<?php

namespace App\Console\Commands\Product;

use App\Models\Product;
use App\Models\User;
use App\Notifications\Product\LowProductStockNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class CheckProductLowStockCommand extends Command
{
    /**
     * The low stock threshold.
     */
    const LOW_STOCK_THRESHOLD = 10;

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:check-low-stock';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for products that are low on stock and notify an administrator.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for low stock products...');

        $lowStockProducts = Product::where('stock', '<', self::LOW_STOCK_THRESHOLD)->get();

        if ($lowStockProducts->isEmpty()) {
            $this->info('No low stock products found.');
            return;
        }

        $this->warn('Found ' . $lowStockProducts->count() . ' low stock products:');

        foreach ($lowStockProducts as $product) {
            $this->line("- {$product->name} (Stock: {$product->stock})");
        }

        // Find admin user to notify
        $admin = User::role('admin')->first(); // Find the first user with the 'admin' role

        if ($admin) {
            Notification::send($admin, new LowProductStockNotification($lowStockProducts));
            $this->info('Low stock notification sent to admin.');
        } else {
            $this->error('Could not find admin user to send notification.');
        }
    }
}
