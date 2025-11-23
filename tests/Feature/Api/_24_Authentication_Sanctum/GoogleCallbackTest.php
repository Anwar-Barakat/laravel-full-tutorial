<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use App\Models\User;
use Mockery;

class GoogleCallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_user_can_register_and_login_via_google_callback()
    {
        $socialiteUser = new SocialiteUser();
        $socialiteUser->map([
            'id' => 'google_id_123',
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        Socialite::shouldReceive('driver->stateless->user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn(
            Mockery::mock('Laravel\Socialite\Two\GoogleProvider')
                ->shouldReceive('stateless->user')
                ->andReturn($socialiteUser)
                ->getMock()
        );

        $response = $this->getJson('/api/v24/google/callback');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'user' => [
                        'name',
                        'email',
                    ],
                    'token',
                ],
            ])
            ->assertJson([
                'status' => 'success',
                'message' => 'Logged in successfully with Google.',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'google_id' => 'google_id_123',
        ]);

        $this->assertNotNull(User::where('email', 'john@example.com')->first()->tokens()->first());
    }

    public function test_an_existing_user_can_login_via_google_callback()
    {
        $existingUser = User::factory()->create([
            'email' => 'jane@example.com',
            'google_id' => 'google_id_456',
        ]);

        $socialiteUser = new SocialiteUser();
        $socialiteUser->map([
            'id' => 'google_id_456',
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        Socialite::shouldReceive('driver->stateless->user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn(
            Mockery::mock('Laravel\Socialite\Two\GoogleProvider')
                ->shouldReceive('stateless->user')
                ->andReturn($socialiteUser)
                ->getMock()
        );

        $response = $this->getJson('/api/v24/google/callback');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Logged in successfully with Google.',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'google_id' => 'google_id_456',
        ]);
        $this->assertNotNull($existingUser->fresh()->tokens()->first());
    }

    public function test_google_callback_handles_socialite_exceptions()
    {
        // Simulate an exception during the Socialite user retrieval process
        Socialite::shouldReceive('driver->stateless->user')->andThrow(new \Exception('Google authentication failed.'));
        Socialite::shouldReceive('driver')->with('google')->andReturn(
            Mockery::mock('Laravel\Socialite\Two\GoogleProvider')
                ->shouldReceive('stateless->user')
                ->andThrow(new \Exception('Google authentication failed.'))
                ->getMock()
        );

        $response = $this->getJson('/api/v24/google/callback');

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
                'message' => 'Google authentication failed.',
            ]);
    }
}
