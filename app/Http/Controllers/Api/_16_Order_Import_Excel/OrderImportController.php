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
use Illuminate\Support\MessageBag;

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
            $import = new OrderImport;
            Excel::import($import, $request->file('file'));

            if (!empty($import->failures)) {
                $errors = new MessageBag;
                foreach ($import->failures as $failure) {
                    $errors->add('row_' . $failure->row(), implode(', ', $failure->errors()));
                }
                throw ValidationException::withMessages($errors->toArray());
            }

            return $this->successResponse(null, 'Orders imported successfully.', 200);
        } catch (ValidationException $e) {
            return $this->errorResponse('Import failed: ' . $e->getMessage(), 422, $e->errors());
        } catch (\Exception $e) {
            return $this->errorResponse('Import failed: ' . $e->getMessage(), 500);
        }
    }
}
