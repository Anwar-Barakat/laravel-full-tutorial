<?php

namespace App\Exports\Order;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use App\Exports\Order\Sheets\PendingOrdersSheet;
use App\Exports\Order\Sheets\CompletedOrdersSheet;

class OrderExportMultipleSheets implements WithMultipleSheets
{
    use Exportable;

    /**
     * @return array
     */
    public function sheets(): array
    {
        $sheets = [];

        $sheets[] = new PendingOrdersSheet();
        $sheets[] = new CompletedOrdersSheet();

        return $sheets;
    }
}