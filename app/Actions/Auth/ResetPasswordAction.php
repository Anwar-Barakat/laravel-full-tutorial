<?php

namespace App\Actions\Auth;

use App\Data\Auth\ResetPasswordRequestData;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log; // Added for logging
use App\Models\User;

class ResetPasswordAction
{
    public function execute(ResetPasswordRequestData $data)
    {
        // Custom reset flow to avoid issues with the Password broker in tests
        $credentials = $data->toArray();
        $user = User::where('email', $credentials['email'])->first();

        if (! $user) {
            Log::error("Password reset failed - user not found for email: {$credentials['email']}");
            throw ValidationException::withMessages([
                'email' => ['The selected email is invalid.'],
            ]);
        }

        $broker = Password::broker();
        $repository = $broker->getRepository();

        if (! $repository->exists($user, $credentials['token'])) {
            Log::warning("Invalid or expired password reset token for email: {$credentials['email']}");
            throw ValidationException::withMessages([
                'email' => [trans('passwords.token')],
            ]);
        }

        $user->password = bcrypt($credentials['password']);
        $user->setRememberToken(null);
        $user->save();

        // Optionally, invalidate the token
        $repository->delete($user);

        Log::info("Password successfully reset for email: {$credentials['email']}");
        return ['status' => trans(Password::PASSWORD_RESET)];
    }
}
