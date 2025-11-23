<?php

namespace App\Actions\Auth;

use App\Data\Auth\ForgetPasswordRequestData;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log; // Added for logging

class ForgotPasswordAction
{
    public function execute(ForgetPasswordRequestData $data)
    {
        $user = User::where('email', $data->email)->first();

        if (!$user) {
            Log::warning("Forgot password attempt for non-existent email: {$data->email}");
            // Return a success response to prevent email enumeration attacks
            return ['status' => 'passwords.sent'];
        }

        $status = Password::sendResetLink(
            ['email' => $data->email]
        );

        if ($status !== Password::RESET_LINK_SENT) {
            Log::error("Failed to send password reset link for email: {$data->email}. Status: {$status}");
            throw ValidationException::withMessages([
                'email' => [trans($status)],
            ]);
        }

        Log::info("Password reset link sent to email: {$data->email}. Status: {$status}");
        return ['status' => trans($status)];
    }
}
