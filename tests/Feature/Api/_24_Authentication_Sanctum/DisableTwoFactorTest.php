<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
// Removed: use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;

class DisableTwoFactorTest extends BaseUserApiTest
{
    use RefreshDatabase;

    // Removed setUp method as users will be created explicitly in each test

    public function test_an_authenticated_and_verified_user_can_disable_two_factor_authentication()
    {
        $google2fa = new Google2FA();
        $user = $this->createAuthenticatedUser([
            'email_verified_at' => now(), // Ensure user is verified
            'two_factor_secret' => $google2fa->generateSecretKey(),
            'two_factor_recovery_codes' => json_encode(['code1', 'code2']),
        ]);

        $response = $this->postJson('/api/v24/two-factor/disable');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Two-factor authentication disabled successfully.',
            ]);

        $this->assertNull($user->fresh()->two_factor_secret);
        $this->assertNull($user->fresh()->two_factor_recovery_codes);
    }

    public function test_an_authenticated_and_verified_user_cannot_disable_two_factor_if_not_enabled()
    {
        $user = $this->createAuthenticatedUser([
            'email_verified_at' => now(), // Ensure user is verified
            'two_factor_secret' => null,
        ]);

        $response = $this->postJson('/api/v24/two-factor/disable');

        $response->assertStatus(409) // Conflict status code
            ->assertJson([
                'status' => 'error',
                'message' => 'Two-factor authentication is not enabled.',
            ]);
    }

    public function test_disabling_two_factor_fails_if_user_is_not_verified()
    {
        $google2fa = new Google2FA();
        $user = $this->createAuthenticatedUser([
            'email_verified_at' => null, // User is not verified
            'two_factor_secret' => $google2fa->generateSecretKey(),
        ]);

        $response = $this->postJson('/api/v24/two-factor/disable');

        $response->assertStatus(403); // Forbidden because email is not verified
    }

    public function test_disabling_two_factor_fails_if_user_is_unauthenticated()
    {
        $response = $this->postJson('/api/v24/two-factor/disable');

        $response->assertStatus(401); // Unauthorized
    }
}
