<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Notifications\VerifyEmail as VerifyEmailNotification;
use Illuminate\Support\Facades\Log; // Added for logging

class SendEmailVerificationAction
{
    public function execute(User $user)
    {
        if ($user->hasVerifiedEmail()) {
            throw ValidationException::withMessages([
                'email' => ['Your email address is already verified.'],
            ]);
        }

        $user->notify(new VerifyEmailNotification());

        Log::info("Email verification notification sent to user: {$user->email}");
        return ['status' => 'A fresh verification link has been sent to your email address.'];
    }
}
