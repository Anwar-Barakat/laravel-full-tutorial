<?php

namespace App\Exports\Order\Sheets;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use App\Enums\Order\OrderStatusEnum;

class CompletedOrdersSheet implements FromCollection, WithHeadings, WithMapping, WithTitle
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return Order::with('user')->where('status', OrderStatusEnum::COMPLETED)->get();
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
            $order->created_at->toDateTimeString(),
        ];
    }

    /**
     * @return string
     */
    public function title(): string
    {
        return 'Completed Orders';
    }
}
