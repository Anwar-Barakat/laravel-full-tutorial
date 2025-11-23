<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Data;

class ForgetPasswordRequestData extends Data
{
    public function __construct(
        public string $email,
    ) {}

    public static function rules(): array
    {
        return [
            // Do not validate 'exists' here to avoid leaking whether an email is registered.
            'email' => ['required', 'string', 'email'],
        ];
    }
}
