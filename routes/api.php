<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// _01_Product_Crud
// use App\Http\Controllers\Api\_01_Product_Crud\ProductController;

// _02_Product_Crud_With_Filter
// use App\Http\Controllers\Api\_02_Product_Crud_With_Filter\ProductController; // Renamed from ProductControllerV2

// _03_Product_Crud_With_Resource
use App\Http\Controllers\Api\_03_Product_Crud_With_Resource\ProductController as ProductResourceController;

// _01_Product_Crud
// Route::apiResource('products', ProductController::class);

// _02_Product_Crud_With_Filter
// Route::apiResource('products', ProductController::class);

// _03_Product_Crud_With_Resource
Route::apiResource('products', ProductResourceController::class);
