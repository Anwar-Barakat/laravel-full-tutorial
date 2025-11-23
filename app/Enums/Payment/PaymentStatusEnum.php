<?php

namespace App\Enums\Payment;

use Spatie\Enum\Laravel\Enum;

/**
 * @method static self PENDING()
 * @method static self PAID()
 * @method static self FAILED()
 * @method static self REFUNDED()
 * @method static self CANCELLED()
 */
final class PaymentStatusEnum extends Enum
{
    //
}
