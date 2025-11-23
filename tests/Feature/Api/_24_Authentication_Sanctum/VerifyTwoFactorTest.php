<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
// Removed: use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;

class VerifyTwoFactorTest extends BaseUserApiTest
{
    use RefreshDatabase;

    protected $google2fa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->google2fa = new Google2FA();
        // Removed: User::factory()->state(['email_verified_at' => now()])->create();
    }

    public function test_an_authenticated_and_verified_user_can_verify_their_two_factor_code()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = $this->createAuthenticatedUser([
            'two_factor_secret' => encrypt($secret),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $validCode = $this->google2fa->getCurrentOtp($secret);

        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => $validCode,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Two-factor authentication code verified successfully.',
            ]);
    }

    public function test_verification_fails_with_an_invalid_two_factor_code()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = $this->createAuthenticatedUser([
            'two_factor_secret' => encrypt($secret),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => '000000', // Invalid code
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_verification_fails_if_two_factor_is_not_enabled()
    {
        $user = $this->createAuthenticatedUser([
            'two_factor_secret' => null,
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => '123456',
        ]);

        $response->assertStatus(409) // Conflict status code
            ->assertJson([
                'status' => 'error',
                'message' => 'Two-factor authentication is not enabled.',
            ]);
    }

    public function test_verification_requires_code()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = $this->createAuthenticatedUser([
            'two_factor_secret' => encrypt($secret),
            'email_verified_at' => now(), // Ensure user is verified
        ]);

        $response = $this->postJson('/api/v24/two-factor/verify', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_verification_fails_if_user_is_not_verified()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = $this->createAuthenticatedUser([
            'two_factor_secret' => encrypt($secret),
            'email_verified_at' => null, // User is not verified
        ]);

        $validCode = $this->google2fa->getCurrentOtp($secret);

        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => $validCode,
        ]);

        $response->assertStatus(403); // Forbidden because email is not verified
    }

    public function test_verification_fails_if_user_is_unauthenticated()
    {
        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => '123456',
        ]);

        $response->assertStatus(401); // Unauthorized
    }
}
