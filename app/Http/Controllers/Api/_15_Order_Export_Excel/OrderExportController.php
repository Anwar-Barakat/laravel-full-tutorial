<?php

namespace App\Http\Controllers\Api\_15_Order_Export_Excel;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Illuminate\Http\JsonResponse;

// Import all export classes
use App\Exports\Order\OrderExportBasic;
use App\Exports\Order\OrderExportCustomQuery;
use App\Exports\Order\OrderExportCustomizingOutput;
use App\Exports\Order\OrderExportMultipleSheets;
use App\Exports\Order\OrderExportLargeData;
use App\Exports\Order\OrderExportAdvancedFeatures;
use App\Exports\Order\OrderExportOtherFormats;
use App\Exports\Order\OrderExportWithEvents;

class OrderExportController extends Controller
{
    public function exportBasic(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        return Excel::download(new OrderExportBasic, 'orders_basic.xlsx');
    }

    public function exportCustomQuery(Request $request): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        $status = $request->query('status');
        return Excel::download(new OrderExportCustomQuery($status), 'orders_custom_query.xlsx');
    }

    public function exportCustomizingOutput(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        return Excel::download(new OrderExportCustomizingOutput, 'orders_styled.xlsx');
    }

    public function exportMultipleSheets(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        return Excel::download(new OrderExportMultipleSheets, 'orders_multi_sheet.xlsx');
    }

    public function exportLargeData(): JsonResponse
    {
        $this->authorize('export', Order::class);
        (new OrderExportLargeData)->queue('orders_large.xlsx');
        return response()->json(['message' => 'Order export started in the background. You will be notified when it\'s ready.'], 202);
    }

    public function exportAdvancedFeatures(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        return Excel::download(new OrderExportAdvancedFeatures, 'orders_advanced.xlsx');
    }

    public function exportWithEvents(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        return Excel::download(new OrderExportWithEvents, 'orders_with_events.xlsx');
    }

    public function exportCsv(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        return Excel::download(new OrderExportOtherFormats, 'orders.csv', \Maatwebsite\Excel\Excel::CSV);
    }

    public function exportPdf(): BinaryFileResponse
    {
        $this->authorize('export', Order::class);
        // To enable PDF export, you need to install a PDF renderer like dompdf:
        // composer require dompdf/dompdf
        return Excel::download(new OrderExportOtherFormats, 'orders.pdf', \Maatwebsite\Excel\Excel::DOMPDF);
    }
}