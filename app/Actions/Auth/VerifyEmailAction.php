<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Log; // Added for logging

class VerifyEmailAction
{
    public function execute(string $id, string $hash)
    {
        $user = User::find($id);

        if (!$user) {
            Log::warning("Email verification attempt for non-existent user ID: {$id}");
            throw ValidationException::withMessages([
                'user' => ['Invalid verification link.'],
            ]);
        }

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            Log::warning("Email verification attempt with invalid hash for user ID: {$id}");
            throw new AuthorizationException('Invalid verification link.');
        }

        if ($user->hasVerifiedEmail()) {
            Log::info("Email address already verified for user ID: {$id}");
            return ['status' => 'Email already verified.'];
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
            Log::info("User email verified successfully for user ID: {$id}");
        } else {
            Log::error("Failed to mark email as verified for user ID: {$id}");
            throw ValidationException::withMessages([
                'email' => ['Failed to verify email address.'],
            ]);
        }

        return ['status' => 'Email verified successfully.'];
    }
}
