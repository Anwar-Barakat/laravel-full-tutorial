<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\Payment\PaymentStatusEnum; // Added

class Payment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_id',
        'stripe_checkout_session_id',
        'amount',
        'currency',
        'status',
        'payment_method',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'metadata' => 'array',
        'amount' => 'decimal:2',
        'status' => PaymentStatusEnum::class, // Cast to enum
    ];

    /**
     * Get the order that owns the Payment.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}