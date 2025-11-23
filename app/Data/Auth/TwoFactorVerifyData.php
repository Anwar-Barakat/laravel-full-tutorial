<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Data;

class TwoFactorVerifyData extends Data
{
    public function __construct(
        public string $code,
    ) {}

    public static function rules(): array
    {
        return [
            'code' => ['required', 'string', 'digits:6'],
        ];
    }
}
