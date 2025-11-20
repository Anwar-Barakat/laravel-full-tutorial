<x-mail::message>
# Order Confirmation - ID: {{ $order->id }}

Hello {{ $user->name }},

Thank you for your recent purchase! Your order has been successfully placed and is now being processed.

**Order Details:**
- **Order ID:** {{ $order->id }}
- **Total Amount:** ${{ number_format($order->total_amount, 2) }}
- **Status:** {{ ucfirst($order->status->value) }}
- **Date Placed:** {{ $order->created_at->format('M d, Y H:i A') }}

@if($order->shipping_address)
**Shipping Address:**
{{ $order->shipping_address }}
@endif

<x-mail::button :url="url('/orders/' . $order->id)">
View Your Order
</x-mail::button>

If you have any questions, please feel free to contact our support team.

Thanks,
{{ config('app.name') }} Team
</x-mail::message>
