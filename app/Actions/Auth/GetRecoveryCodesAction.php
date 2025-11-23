<?php

namespace App\Actions\Auth;

use App\Data\Auth\GetRecoveryCodesData;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class GetRecoveryCodesAction
{
    public function execute(User $user, GetRecoveryCodesData $data): array
    {
        if (!Hash::check($data->password, $user->password)) {
            Log::warning("Attempt to retrieve 2FA recovery codes with incorrect password for user: {$user->email}");
            throw ValidationException::withMessages([
                'password' => ['The provided password does not match your current password.'],
            ]);
        }

        if (empty($user->two_factor_recovery_codes)) {
            Log::warning("Attempt to retrieve 2FA recovery codes for user without 2FA enabled: {$user->email}");
            throw ValidationException::withMessages([
                '2fa' => ['Two-factor authentication is not enabled or recovery codes are not set.'],
            ]);
        }
        // Recovery codes are stored encrypted as JSON in the database for tests
        try {
            $decoded = decrypt($user->two_factor_recovery_codes);
            $recoveryCodes = json_decode($decoded, true);
        } catch (\Throwable $e) {
            Log::error("Failed to decrypt or decode recovery codes for user {$user->email}: " . $e->getMessage());
            $recoveryCodes = null;
        }
        Log::info("2FA recovery codes retrieved for user: {$user->email}");

        return ['recovery_codes' => $recoveryCodes];
    }
}
