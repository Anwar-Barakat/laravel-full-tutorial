<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
// Removed: use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\URL;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;

class VerifyEmailTest extends BaseUserApiTest
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_verify_their_email_with_a_valid_signed_url()
    {
        Event::fake();

        $user = $this->createAuthenticatedUser(['email_verified_at' => null]); // Using helper

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $response = $this->actingAs($user)->getJson($verificationUrl);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Email verified successfully.',
            ]);

        $this->assertNotNull($user->fresh()->email_verified_at);
        Event::assertDispatched(Verified::class, function ($e) use ($user) {
            return $e->user->id === $user->id;
        });
    }

    public function test_an_authenticated_user_cannot_verify_their_email_with_an_invalid_hash()
    {
        Event::fake();

        $user = $this->createAuthenticatedUser(['email_verified_at' => null]); // Using helper

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => 'invalid-hash']
        );

        $response = $this->actingAs($user)->getJson($verificationUrl);

        $response->assertStatus(403) // Forbidden due to invalid hash
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid verification link.',
            ]);

        $this->assertNull($user->fresh()->email_verified_at);
        Event::assertNotDispatched(Verified::class);
    }

    public function test_an_authenticated_user_cannot_verify_their_email_with_an_expired_signed_url()
    {
        Event::fake();

        $user = $this->createAuthenticatedUser(['email_verified_at' => null]); // Using helper

        // Generate an expired URL
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->subMinutes(1), // Expired
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $response = $this->actingAs($user)->getJson($verificationUrl);

        $response->assertStatus(403); // Forbidden due to expired signature

        $this->assertNull($user->fresh()->email_verified_at);
        Event::assertNotDispatched(Verified::class);
    }

    public function test_a_verified_user_cannot_re_verify_their_email()
    {
        Event::fake();

        $user = $this->createAuthenticatedUser(['email_verified_at' => now()]); // Using helper

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $response = $this->actingAs($user)->getJson($verificationUrl);

        $response->assertStatus(409) // Conflict status code
            ->assertJson([
                'status' => 'error',
                'message' => 'Email already verified.',
            ]);

        Event::assertNotDispatched(Verified::class);
    }

    public function test_an_unauthenticated_user_cannot_verify_email()
    {
        Event::fake();

        $user = $this->createUnverifiedUser(); // Using helper

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // Attempt to access without actingAs
        $response = $this->getJson($verificationUrl);

        $response->assertStatus(401); // Unauthorized

        $this->assertNull($user->fresh()->email_verified_at);
        Event::assertNotDispatched(Verified::class);
    }
}
