<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// _01_Product_Crud
// use App\Http\Controllers\Api\_01_Product_Crud\ProductController;

// _02_Product_Crud_With_Filter
// use App\Http\Controllers\Api\_02_Product_Crud_With_Filter\ProductController; // Renamed from ProductControllerV2

// _03_Product_Crud_With_Resource
// use App\Http\Controllers\Api\_03_Product_Crud_With_Resource\ProductController as ProductResourceController;

// _04_ApiResponse_Refactor
// use App\Http\Controllers\Api\_04_ApiResponse_Refactor\ProductController as ProductResourceController;

// _05_Product_Review_Polymorphic
use App\Http\Controllers\Api\_05_Product_Review_Polymorphic\ProductController as ProductResourceController;
use App\Http\Controllers\Api\_05_Product_Review_Polymorphic\ReviewController;

// _01_Product_Crud
// Route::apiResource('products', ProductController::class);

// _02_Product_Crud_With_Filter
// Route::apiResource('products', ProductController::class);

// _03_Product_Crud_With_Resource
// Route::apiResource('products', ProductResourceController::class);

// _04_ApiResponse_Refactor
// Route::apiResource('products', ProductResourceController::class);

// _05_Product_Review_Polymorphic
Route::apiResource('products.reviews', ReviewController::class)->only(['index', 'store']);

