<?php

namespace App\Exports\Order;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;

class OrderExportAdvancedFeatures implements FromCollection, WithHeadings, WithMapping, WithStyles, WithColumnWidths, WithColumnFormatting
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return Order::with('user')->get();
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'ID',
            'User Name',
            'User Email',
            'Total Amount',
            'Status',
            'Shipping Address',
            'Billing Address',
            'Payment Method',
            'Created At',
        ];
    }

    /**
     * @param Order $order
     * @return array
     */
    public function map($order): array
    {
        return [
            $order->id,
            $order->user->name,
            $order->user->email,
            $order->total_amount,
            $order->status->value,
            $order->shipping_address,
            $order->billing_address,
            $order->payment_method,
            $order->created_at->toDateTimeString(),
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1    => [
                'font' => [
                    'bold' => true,
                    'italic' => false,
                    'color' => ['rgb' => "FFFFFF"]
                ],
                'fill' => [
                    "fillType" => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    "startColor" => ['rgb' => "FF0000"]
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => '000000'],
                    ],
                ],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 5,
            'B' => 25,
            'C' => 30,
            'D' => 15,
            'E' => 15,
            'F' => 40,
            'G' => 40,
            'H' => 20,
            'I' => 20,
        ];
    }

    public function columnFormats(): array
    {
        return [
            'D' => NumberFormat::FORMAT_CURRENCY_USD_SIMPLE,
            'I' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }
}
