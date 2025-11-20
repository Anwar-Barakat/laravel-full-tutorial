<?php

namespace App\Http\Controllers\Api\_16_Order_Import_Excel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\OrderImport;
use App\Models\Order;
use App\Http\Traits\ApiResponseTrait;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;

class OrderImportController extends Controller
{
    use ApiResponseTrait;

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:2048',
        ]);

        $this->authorize('import', Order::class); // Assuming an 'import' policy for Order

        try {
            Excel::import(new OrderImport, $request->file('file'));
            return $this->successResponse(null, 'Orders imported successfully.', 200);
        } catch (ValidationException $e) {
            return $this->errorResponse('Import failed: ' . $e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Import failed: ' . $e->getMessage(), 500);
        }
    }
}
