<?php

namespace App\Exports\Order;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use App\Enums\Order\OrderStatusEnum;

class OrderExportCustomQuery implements FromCollection, WithHeadings, WithMapping
{
    protected $status;

    public function __construct(string $status = null)
    {
        $this->status = $status;
    }

    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        $query = Order::with('user');

        if ($this->status) {
            $query->where('status', $this->status);
        }

        return $query->get();
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
