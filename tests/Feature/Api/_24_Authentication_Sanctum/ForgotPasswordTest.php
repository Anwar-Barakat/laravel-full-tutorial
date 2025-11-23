<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Notification;
use App\Notifications\Auth\ResetPasswordEmailNotification;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_a_password_reset_link_can_be_sent_to_a_valid_user()
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->postJson('/api/v24/forgot-password', ['email' => $user->email]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'We have emailed your password reset link.',
            ]);

        Notification::assertSentTo($user, ResetPasswordEmailNotification::class);
    }

    public function test_a_password_reset_link_is_not_sent_to_an_invalid_email()
    {
        Notification::fake();

        $response = $this->postJson('/api/v24/forgot-password', ['email' => 'nonexistent@example.com']);

        $response->assertStatus(200) // Laravel returns 200 even for non-existent users for security reasons
            ->assertJson([
                'status' => 'success',
                'message' => 'We have emailed your password reset link.', // Still returns success message
            ]);

        Notification::assertNothingSent();
    }

    public function test_forgot_password_requires_email()
    {
        $response = $this->postJson('/api/v24/forgot-password', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_forgot_password_email_must_be_valid_format()
    {
        $response = $this->postJson('/api/v24/forgot-password', ['email' => 'invalid-email']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
