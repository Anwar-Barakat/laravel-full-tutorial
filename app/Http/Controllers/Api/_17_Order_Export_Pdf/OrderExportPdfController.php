<?php

namespace App\Http\Controllers\Api\_17_Order_Export_Pdf;

use App\Http\Controllers\Controller;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\Order\OrderExportFromView;
use App\Models\Order;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Barryvdh\DomPDF\Facade\Pdf;

class OrderExportPdfController extends Controller
{
    public function exportPdfFromView(): BinaryFileResponse
    {
        $this->authorize('export', Order::class); // Assuming 'export' permission
        return Excel::download(new OrderExportFromView, 'orders_from_view.pdf', \Maatwebsite\Excel\Excel::DOMPDF);
    }

    public function exportDirectPdf(): BinaryFileResponse
    {
        $this->authorize('export', Order::class); // Assuming 'export' permission
        $orders = Order::with('user')->get();
        $pdf = Pdf::loadView('exports.orders_pdf', compact('orders'));
        return $pdf->download('orders_direct_dompdf.pdf');
    }
}
