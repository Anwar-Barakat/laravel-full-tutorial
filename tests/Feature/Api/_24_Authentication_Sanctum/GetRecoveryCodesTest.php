<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\Hash;

class GetRecoveryCodesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure that the user factory creates verified users for these tests by default
        User::factory()->state(['email_verified_at' => now()])->create();
    }

    public function test_an_authenticated_and_verified_user_can_retrieve_their_two_factor_recovery_codes()
    {
        $google2fa = new Google2FA();
        // Generate recovery codes locally for tests
        $recoveryCodes = collect(range(1, 8))->map(function () {
            return \Illuminate\Support\Str::random(10);
        })->all();
        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
        ]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create(['two_factor_secret' => null]);
        Sanctum::actingAs($user);

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
        $user = User::factory()->create([
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode(collect(range(1, 8))->map(fn() => \Illuminate\Support\Str::random(10))->all())),
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes'); // No password provided

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_retrieving_recovery_codes_fails_with_incorrect_password()
    {
        $google2fa = new Google2FA();
        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode(collect(range(1, 8))->map(fn() => \Illuminate\Support\Str::random(10))->all())),
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes?password=incorrect-password');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_retrieving_recovery_codes_fails_if_user_is_not_verified()
    {
        $google2fa = new Google2FA();
        $user = User::factory()->create([
            'email_verified_at' => null, // Not verified
            'password' => Hash::make('password'),
            'two_factor_secret' => encrypt($google2fa->generateSecretKey()),
            'two_factor_recovery_codes' => encrypt(json_encode(collect(range(1, 8))->map(fn() => \Illuminate\Support\Str::random(10))->all())),
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v24/two-factor/recovery-codes?password=password');

        $response->assertStatus(403); // Forbidden because email is not verified
    }

    public function test_retrieving_recovery_codes_fails_if_user_is_unauthenticated()
    {
        $response = $this->getJson('/api/v24/two-factor/recovery-codes');

        $response->assertStatus(401); // Unauthorized
    }
}
