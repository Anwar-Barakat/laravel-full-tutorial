<?php

namespace App\Actions\Auth;

use App\Data\Auth\TwoFactorVerifyData;
use App\Models\User;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log; // Added for logging

class TwoFactorVerifyAction
{
    protected Google2FA $google2fa;

    public function __construct(Google2FA $google2fa)
    {
        $this->google2fa = $google2fa;
    }

    public function execute(User $user, TwoFactorVerifyData $data): bool
    {
        if (empty($user->two_factor_secret)) {
            Log::warning("2FA verification attempt for user without 2FA secret: {$user->email}");
            throw ValidationException::withMessages([
                'code' => ['Two-factor authentication is not enabled for this account.'],
            ]);
        }

        $isValid = $this->google2fa->verifyKey(decrypt($user->two_factor_secret), $data->code);

        if (!$isValid) {
            Log::warning("Invalid 2FA code provided by user: {$user->email}");
            throw ValidationException::withMessages([
                'code' => ['The provided two-factor authentication code is invalid.'],
            ]);
        }
        
        Log::info("2FA code successfully verified for user: {$user->email}");
        return true;
    }
}
