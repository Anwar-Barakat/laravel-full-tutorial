<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// _01_Product_Crud
use App\Http\Controllers\Api\_01_Product_Crud\ProductController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// _01_Product_Crud
Route::post('products', [ProductController::class, 'store']);
Route::apiResource('products', ProductController::class);
