<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;

class DisableTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure that the user factory creates verified users for these tests by default
        User::factory()->state(['email_verified_at' => now()])->create();
    }

    public function test_an_authenticated_and_verified_user_can_disable_two_factor_authentication()
    {
        $google2fa = new Google2FA();
        $user = User::factory()->create([
            'two_factor_secret' => $google2fa->generateSecretKey(),
            'two_factor_recovery_codes' => json_encode(['code1', 'code2']),
        ]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create(['two_factor_secret' => null]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create([
            'email_verified_at' => null, // Not verified
            'two_factor_secret' => $google2fa->generateSecretKey(),
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v24/two-factor/disable');

        $response->assertStatus(403); // Forbidden because email is not verified
    }

    public function test_disabling_two_factor_fails_if_user_is_unauthenticated()
    {
        $response = $this->postJson('/api/v24/two-factor/disable');

        $response->assertStatus(401); // Unauthorized
    }
}
