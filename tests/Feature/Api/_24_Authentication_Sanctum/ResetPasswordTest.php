<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Passwords\PasswordBroker;

class ResetPasswordTest extends BaseUserApiTest
{
    use RefreshDatabase, WithFaker;

    public function test_a_user_can_reset_their_password_with_a_valid_token()
    {
        $user = $this->createUser([ // Using helper
            'email' => 'test@example.com'
        ]);

        $token = Password::broker()->createToken($user);

        $newPassword = 'new-secure-password';

        $response = $this->postJson('/api/v24/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Your password has been reset.',
            ]);

        $this->assertTrue(Hash::check($newPassword, $user->fresh()->password));
    }

    public function test_password_reset_fails_with_invalid_token()
    {
        $user = $this->createUser(); // Using helper

        $newPassword = 'new-secure-password';

        $response = $this->postJson('/api/v24/reset-password', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_password_reset_fails_if_email_does_not_match_token()
    {
        $user1 = $this->createUser(['email' => 'user1@example.com']); // Using helper
        $user2 = $this->createUser(['email' => 'user2@example.com']); // Using helper

        $token = Password::broker()->createToken($user1);

        $newPassword = 'new-secure-password';

        $response = $this->postJson('/api/v24/reset-password', [
            'token' => $token,
            'email' => $user2->email, // Mismatched email
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_password_reset_requires_email_token_password_and_confirmation()
    {
        $response = $this->postJson('/api/v24/reset-password', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'token', 'password']);
    }

    public function test_password_reset_password_must_be_confirmed()
    {
        $user = $this->createUser(); // Using helper
        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/v24/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'mismatched-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_password_reset_password_must_be_at_least_8_characters()
    {
        $user = $this->createUser(); // Using helper
        $token = Password::broker()->createToken($user);

        $password = $this->faker->password(5, 7); // Generate password less than 8 chars

        $response = $this->postJson('/api/v24/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => $password,
            'password_confirmation' => $password,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
