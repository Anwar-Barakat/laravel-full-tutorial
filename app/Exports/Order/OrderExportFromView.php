<?php

namespace App\Exports\Order;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromView;
use Illuminate\Contracts\View\View;

class OrderExportFromView implements FromView
{
    /**
    * @return View
    */
    public function view(): View
    {
        return view('exports.orders_pdf', [
            'orders' => Order::with('user')->get()
        ]);
    }
}
