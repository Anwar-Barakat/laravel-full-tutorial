<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\Payment\PaymentStatusEnum;

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
        'user_id',
        'stripe_checkout_session_id',
        'payment_intent_id',
        'stripe_charge_id',
        'amount',
        'amount_captured',
        'currency',
        'currency_captured',
        'status',
        'payment_method', // deprecated, but keeping for now
        'payment_method_type',
        'card_brand',
        'card_last_four',
        'stripe_balance_transaction_id',
        'net_amount',
        'fees_amount',
        'available_on',
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
        'amount_captured' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'fees_amount' => 'decimal:2',
        'status' => PaymentStatusEnum::class,
        'available_on' => 'datetime',
    ];

    /**
     * Get the order that owns the Payment.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the user that owns the Payment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}