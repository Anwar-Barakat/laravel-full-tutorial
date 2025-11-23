<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
// Removed: use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Hash; // Keep Hash for explicit password hashing where needed
use PragmaRX\Google2FA\Google2FA;

class EnableTwoFactorTest extends BaseUserApiTest
{
    use RefreshDatabase;

    // Removed setUp method as users will be created explicitly in each test

    public function test_an_authenticated_and_verified_user_can_enable_two_factor_authentication()
    {
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/enable', [
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'secret',
                    'qr_code',
                    'recovery_codes',
                ],
            ])
            ->assertJson([
                'status' => 'success',
                'message' => 'Two-factor authentication enabled. Please scan the QR code and save your recovery codes.',
            ]);

        $user->fresh();
        $this->assertNotNull($user->two_factor_secret);
        $this->assertNotNull($user->two_factor_recovery_codes);
        $this->assertTrue(is_array(json_decode($user->two_factor_recovery_codes, true)));
    }

    public function test_an_authenticated_and_verified_user_cannot_enable_two_factor_if_already_enabled()
    {
        $google2fa = new Google2FA();
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'two_factor_secret' => $google2fa->generateSecretKey(),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/enable', [
            'password' => 'password',
        ]);

        $response->assertStatus(409) // Conflict status code
            ->assertJson([
                'status' => 'error',
                'message' => 'Two-factor authentication is already enabled.',
            ]);
    }

    public function test_enabling_two_factor_requires_correct_password()
    {
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/enable', [
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_enabling_two_factor_fails_if_user_is_not_verified()
    {
        $user = $this->createAuthenticatedUser([
            'password' => Hash::make('password'),
            'email_verified_at' => null, // User is not verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/enable', [
            'password' => 'password',
        ]);

        $response->assertStatus(403); // Forbidden because email is not verified
    }

    public function test_enabling_two_factor_fails_if_user_is_unauthenticated()
    {
        $response = $this->postJson('/api/v24/two-factor/enable', [
            'password' => 'password',
        ]);

        $response->assertStatus(401); // Unauthorized
    }
}
