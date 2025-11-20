<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// _01_Product_Crud
use App\Http\Controllers\Api\_01_Product_Crud\ProductController as ProductControllerV1;

// _02_Product_Crud_With_Filter
use App\Http\Controllers\Api\_02_Product_Crud_With_Filter\ProductController as ProductControllerV2;

// _03_Product_Crud_With_Resource
use App\Http\Controllers\Api\_03_Product_Crud_With_Resource\ProductController as ProductControllerV3;

// _04_Product_ApiResponse_Refactor
use App\Http\Controllers\Api\_04_Product_ApiResponse_Refactor\ProductController as ProductControllerV4;

// _05_Product_Review_Polymorphic
use App\Http\Controllers\Api\_05_Product_Review_Polymorphic\ReviewController;

// _06_Product_Spatie_Media_Library
use App\Http\Controllers\Api\_06_Product_Spatie_Media_Library\ProductController as ProductControllerV6;

// _07_Product_Form_Request_Handling
use App\Http\Controllers\Api\_07_Product_Form_Request_Handling\ProductController as ProductControllerV7;

// _08_Product_Spatie_Role_Permission
use App\Http\Controllers\Api\_08_Product_Spatie_Role_Permission\ProductController as ProductControllerV8;

// _09_Product_Spatie_Role_Permission_With_Policy
use App\Http\Controllers\Api\_09_Product_Spatie_Role_Permission_With_Policy\ProductController as ProductControllerV9;

// _10_Product_Service_Layer
use App\Http\Controllers\Api\_10_Product_Service_Layer\ProductController as ProductControllerV10;

// _11_Product_Service_Layer_With_Spatie_DTO
use App\Http\Controllers\Api\_11_Product_Service_Layer_With_Spatie_DTO\ProductController as ProductControllerV11;

// _12_Product_Action_Layer_With_Spatie_DTO
use App\Http\Controllers\Api\_12_Product_Action_Layer_With_Spatie_DTO\ProductController as ProductControllerV12;

// _13_Product_Cache_RateLimit
use App\Http\Controllers\Api\_13_Product_Cache_RateLimit\ProductController as ProductControllerV13;

// _14_Order_CRUD
use App\Http\Controllers\Api\_14_Order_CRUD\OrderController;

// _15_Order_Export_Excel
use App\Http\Controllers\Api\_15_Order_Export_Excel\OrderExportController;

// _16_Order_Import_Excel
use App\Http\Controllers\Api\_16_Order_Import_Excel\OrderImportController;

// _17_Order_Export_Pdf
use App\Http\Controllers\Api\_17_Order_Export_Pdf\OrderExportPdfController;


// _01_Product_Crud
Route::prefix('v1')->group(function () {
    Route::apiResource('products', ProductControllerV1::class);
});

// _02_Product_Crud_With_Filter
Route::prefix('v2')->group(function () {
    Route::apiResource('products', ProductControllerV2::class);
});

// _03_Product_Crud_With_Resource
Route::prefix('v3')->group(function () {
    Route::apiResource('products', ProductControllerV3::class);
});

// _04_Product_ApiResponse_Refactor
Route::prefix('v4')->group(function () {
    Route::apiResource('products', ProductControllerV4::class);
});

// _05_Product_Review_Polymorphic
Route::prefix('v5')->group(function () {
    Route::apiResource('products.reviews', ReviewController::class)->only(['index', 'store']);
});

// _06_Product_Spatie_Media_Library
Route::prefix('v6')->group(function () {
    Route::apiResource('products', ProductControllerV6::class);
});

// _07_Product_Form_Request_Handling
Route::prefix('v7')->group(function () {
    Route::apiResource('products', ProductControllerV7::class);
});

// _08_Product_Spatie_Role_Permission
Route::prefix('v8')->group(function () {
    Route::apiResource('products', ProductControllerV8::class);
});

// _09_Product_Spatie_Role_Permission_With_Policy
Route::prefix('v9')->group(function () {
    Route::apiResource('products', ProductControllerV9::class);
});

// _10_Product_Service_Layer
Route::prefix('v10')->group(function () {
    Route::apiResource('products', ProductControllerV10::class);
});

// _11_Product_Service_Layer_With_Spatie_DTO
Route::prefix('v11')->group(function () {
    Route::apiResource('products', ProductControllerV11::class);
});

// _12_Product_Action_Layer_With_Spatie_DTO
Route::prefix('v12')->group(function () {
    Route::apiResource('products', ProductControllerV12::class);
});

// _13_Product_Cache_RateLimit
Route::prefix('v13')->middleware('throttle:60,1')->group(function () {
    Route::apiResource('products', ProductControllerV13::class);
});

// _14_Order_CRUD
Route::prefix('v14')->group(function () {
    Route::apiResource('orders', OrderController::class);
});

// _15_Order_Export_Excel
Route::prefix('v15')->group(function () {
    Route::prefix('orders-exports')->group(function () {
        Route::get('basic', [OrderExportController::class, 'exportBasic']);
        Route::get('custom-query', [OrderExportController::class, 'exportCustomQuery']);
        Route::get('styled', [OrderExportController::class, 'exportCustomizingOutput']);
        Route::get('multi-sheet', [OrderExportController::class, 'exportMultipleSheets']);
        Route::get('large', [OrderExportController::class, 'exportLargeData']);
        Route::get('advanced', [OrderExportController::class, 'exportAdvancedFeatures']);
        Route::get('with-events', [OrderExportController::class, 'exportWithEvents']);
        Route::get('csv', [OrderExportController::class, 'exportCsv']);
        Route::get('pdf', [OrderExportController::class, 'exportPdf']);
    });
});

// _16_Order_Import_Excel
Route::prefix('v16')->group(function () {
    Route::prefix('orders-imports')->group(function () {
        Route::post('/', [OrderImportController::class, 'import']);
    });
});

// _17_Order_Export_Pdf
Route::prefix('v17')->group(function () {
    Route::get('orders/export/pdf-from-view', [OrderExportPdfController::class, 'exportPdfFromView']);
    Route::get('orders/export/direct-dompdf', [OrderExportPdfController::class, 'exportDirectPdf']);
});
