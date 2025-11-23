<?php

namespace App\Exports\Order;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Illuminate\Contracts\Queue\ShouldQueue;

class OrderExportLargeData implements FromQuery, WithHeadings, WithMapping, ShouldQueue
{
    /**
    * @return \Illuminate\Database\Eloquent\Builder
    */
    public function query()
    {
        return Order::with('user');
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
}
