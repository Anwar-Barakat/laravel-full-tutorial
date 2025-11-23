<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class EnableTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure that the user factory creates verified users for these tests by default
        User::factory()->state(['email_verified_at' => now()])->create();
    }

    public function test_an_authenticated_and_verified_user_can_enable_two_factor_authentication()
    {
        $user = User::factory()->create(['password' => Hash::make('password')]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_secret' => $google2fa->generateSecretKey(),
        ]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create(['password' => Hash::make('password')]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v24/two-factor/enable', [
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_enabling_two_factor_fails_if_user_is_not_verified()
    {
        $user = User::factory()->create(['email_verified_at' => null, 'password' => Hash::make('password')]);
        Sanctum::actingAs($user);

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
