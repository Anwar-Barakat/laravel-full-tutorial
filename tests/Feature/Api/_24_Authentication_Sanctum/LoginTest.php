<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class LoginTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_a_user_can_log_in_with_valid_credentials()
    {
        $password = 'password123';
        $user = User::factory()->create([
            'password' => Hash::make($password),
        ]);

        $loginData = [
            'email' => $user->email,
            'password' => $password,
        ];

        $response = $this->postJson('/api/v24/login', $loginData);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => [
                        'name',
                        'email',
                    ],
                    'token',
                ],
            ]);

        $this->assertArrayHasKey('token', $response->json('data'));
    }

    public function test_login_fails_with_invalid_credentials()
    {
        $password = 'password123';
        User::factory()->create([
            'password' => Hash::make($password),
        ]);

        $loginData = [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword',
        ];

        $response = $this->postJson('/api/v24/login', $loginData);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'These credentials do not match our records.',
            ]);
    }

    public function test_login_requires_email_and_password()
    {
        $response = $this->postJson('/api/v24/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_email_must_be_a_valid_email_format()
    {
        $loginData = [
            'email' => 'invalid-email',
            'password' => 'password',
        ];

        $response = $this->postJson('/api/v24/login', $loginData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
