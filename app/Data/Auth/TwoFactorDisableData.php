<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Data;

class TwoFactorDisableData extends Data
{
    public function __construct(
        public string $password,
    ) {}

    public static function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }
}
