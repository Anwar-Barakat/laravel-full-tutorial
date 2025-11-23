<?php

namespace App\Enums\Order;

use Spatie\Enum\Laravel\Enum;

/**
 * @method static self pending()
 * @method static self completed()
 * @method static self cancelled()
 * @method static self processing()
 */
final class OrderStatusEnum extends Enum
{
    const PENDING = 'pending';
    const COMPLETED = 'completed';
    const CANCELLED = 'cancelled';
    const PROCESSING = 'processing';
}