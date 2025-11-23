<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Data;
use Illuminate\Validation\Rule; // Added

class ResetPasswordRequestData extends Data
{
    public function __construct(
        public string $email,
        public string $password,
        public string $password_confirmation,
        public string $token,
    ) {}

    public static function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'exists:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
