<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/admin/products', function () {
        return 'This is the admin products page.';
    })->name('admin.products');
});
