<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
// Removed: use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str; // Added for Str::random

class GetRecoveryCodesTest extends BaseUserApiTest
{
    use RefreshDatabase;

    // Removed setUp method as users will be created explicitly in each test

    public function test_an_authenticated_and_verified_user_can_retrieve_their_two_factor_recovery_codes()
    {
        $google2fa = new Google2FA();
        // Generate recovery codes locally for tests
        $recoveryCodes = collect(range(1, 8))->map(function () {
            return Str::random(10);
        })->all();
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes?password=password');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'recovery_codes',
                ],
            ])
            ->assertJson([
                'status' => 'success',
                'message' => 'Recovery codes retrieved successfully.',
                'data' => [
                    'recovery_codes' => $recoveryCodes,
                ],
            ]);
    }

    public function test_retrieving_recovery_codes_fails_if_two_factor_is_not_enabled()
    {
        $user = $this->createAuthenticatedUser([
            'email_verified_at' => now(), // Ensure user is verified
            'two_factor_secret' => null,
        ]);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes');

        $response->assertStatus(409) // Conflict status code
            ->assertJson([
                'status' => 'error',
                'message' => 'Two-factor authentication is not enabled.',
            ]);
    }

    public function test_retrieving_recovery_codes_requires_password()
    {
        $google2fa = new Google2FA();
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode(collect(range(1, 8))->map(fn() => Str::random(10))->all())),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes'); // No password provided

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_retrieving_recovery_codes_fails_with_incorrect_password()
    {
        $google2fa = new Google2FA();
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode(collect(range(1, 8))->map(fn() => Str::random(10))->all())),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes?password=incorrect-password');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_retrieving_recovery_codes_fails_if_user_is_not_verified()
    {
        $google2fa = new Google2FA();
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'email_verified_at' => null, // User is not verified
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode(collect(range(1, 8))->map(fn() => Str::random(10))->all())),
        ]);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes?password=password');

        $response->assertStatus(403); // Forbidden because email is not verified
    }

    public function test_retrieving_recovery_codes_fails_if_user_is_unauthenticated()
    {
        $response = $this->getJson('/api/v24/two-factor/recovery-codes');

        $response->assertStatus(401); // Unauthorized
    }
}
