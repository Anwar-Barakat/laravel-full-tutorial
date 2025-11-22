<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('products:check-low-stock', function () {})->purpose('Manually trigger the low stock check command');
