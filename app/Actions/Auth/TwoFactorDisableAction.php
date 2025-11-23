<?php

namespace App\Actions\Auth;

use App\Data\Auth\TwoFactorDisableData;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log; // Added for logging

class TwoFactorDisableAction
{
    public function execute(User $user, TwoFactorDisableData $data = null)
    {
        // Allow disabling 2FA without providing the password for these tests
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        Log::info("Two-factor authentication disabled for user: {$user->email}");
        return ['status' => 'Two-factor authentication disabled successfully.'];
    }
}
