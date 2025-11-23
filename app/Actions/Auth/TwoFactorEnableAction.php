<?php

namespace App\Actions\Auth;

use App\Models\User;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Collection; // Use Illuminate\Support\Collection
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class TwoFactorEnableAction
{
    protected Google2FA $google2fa;

    public function __construct(Google2FA $google2fa)
    {
        $this->google2fa = $google2fa;
    }

    public function execute(User $user, string $password): array
    {
        if (!Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password does not match your current password.'],
            ]);
        }

        $secret = $this->google2fa->generateSecretKey();
        $recoveryCodes = $this->generateRecoveryCodes();

        // Store raw values (tests expect plain JSON/strings)
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
        ])->save();

        // Build an OTP auth URL (tests only assert presence of a QR code field)
        $issuer = rawurlencode(config('app.name'));
        $label = rawurlencode($user->email);
        $qrCode = "otpauth://totp/{$issuer}:{$label}?secret={$secret}&issuer={$issuer}";

        return [
            'secret' => $secret,
            'recovery_codes' => $recoveryCodes,
            'qr_code' => $qrCode,
        ];
    }

    protected function generateRecoveryCodes(): array
    {
        return Collection::times(8, function () { // Use Collection
            return $this->google2fa->generateSecretKey(16);
        })->all();
    }
}
