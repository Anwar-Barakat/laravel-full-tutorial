<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;

class VerifyTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected $google2fa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->google2fa = new Google2FA();
        // Ensure that the user factory creates verified users for these tests by default
        User::factory()->state(['email_verified_at' => now()])->create();
    }

    public function test_an_authenticated_and_verified_user_can_verify_their_two_factor_code()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
        ]);
        Sanctum::actingAs($user);

        $validCode = $this->google2fa->getCurrentOtp($secret);

        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => $validCode,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Two-factor authentication code verified successfully.',
            ]);

        // Optionally, assert that the session indicates 2FA has been passed
        // This might depend on how your application uses the `password.confirm` or similar middleware
        // For simplicity, we just check the response.
    }

    public function test_verification_fails_with_an_invalid_two_factor_code()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v24/two-factor/verify', [
            'code' => '000000', // Invalid code
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_verification_fails_if_two_factor_is_not_enabled()
    {
        $user = User::factory()->create(['two_factor_secret' => null]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v24/two-factor/verify', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_verification_fails_if_user_is_not_verified()
    {
        $secret = $this->google2fa->generateSecretKey();
        $user = User::factory()->create([
            'email_verified_at' => null, // Not verified
            'two_factor_secret' => encrypt($secret),
        ]);
        Sanctum::actingAs($user);

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
