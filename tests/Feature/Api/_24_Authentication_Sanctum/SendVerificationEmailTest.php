<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Notification;
use Illuminate\Auth\Notifications\VerifyEmail;

class SendVerificationEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_unverified_authenticated_user_can_request_a_new_verification_email()
    {
        Notification::fake();

        $user = User::factory()->create(['email_verified_at' => null]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v24/email/verify/send');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'A fresh verification link has been sent to your email address.',
            ]);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_a_verified_user_cannot_request_a_new_verification_email()
    {
        Notification::fake();

        $user = User::factory()->create(['email_verified_at' => now()]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v24/email/verify/send');

        $response->assertStatus(409) // Conflict status code
            ->assertJson([
                'status' => 'error',
                'message' => 'Your email address is already verified.',
            ]);

        Notification::assertNothingSent();
    }

    public function test_an_unauthenticated_user_cannot_request_a_new_verification_email()
    {
        Notification::fake();

        $response = $this->postJson('/api/v24/email/verify/send');

        $response->assertStatus(401); // Unauthorized

        Notification::assertNothingSent();
    }
}
