<?php

namespace App\Actions\Auth;

use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class GoogleCallbackAction
{
    public function execute(): array
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::error("Google Socialite callback failed: " . $e->getMessage());
            throw ValidationException::withMessages([
                'google' => ['Google authentication failed.'],
            ]);
        }

        $user = User::where('google_id', $googleUser->id)->first();

        if (!$user) {
            $user = User::where('email', $googleUser->email)->first();

            if ($user) {
                // User exists with this email, link Google ID
                $user->google_id = $googleUser->id;
                $user->save();
            } else {
                // Create a new user
                $user = User::create([
                    'name' => $googleUser->name,
                    'email' => $googleUser->email,
                    'google_id' => $googleUser->id,
                    'password' => Hash::make(Str::random(24)), // Random password for socialite users
                    'email_verified_at' => now(), // Email is verified by Google
                ]);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        Log::info("User logged in via Google Socialite: {$user->email}");

        return ['user' => $user, 'token' => $token];
    }
}
