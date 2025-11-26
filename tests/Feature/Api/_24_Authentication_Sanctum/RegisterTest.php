<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseUserApiTest;
// Removed: use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Events\Registered;
use App\Models\User; // Re-added

class RegisterTest extends BaseUserApiTest
{
    use RefreshDatabase, WithFaker;
    protected bool $seed = false;

    public function test_a_user_can_register_successfully()
    {
        Event::fake();

        $password = $this->faker->password(8);
        $userData = [
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'password' => $password,
            'password_confirmation' => $password,
        ];

        $response = $this->postJson('/api/v24/register', $userData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => [
                        'name',
                        'email',
                        // 'email_verified_at', // Not verified until email confirmed
                        'updated_at',
                        'created_at',
                        'id',
                    ],
                    'token',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => $userData['email'],
            'name' => $userData['name'],
        ]);

        $user = User::where('email', $userData['email'])->first();
        $this->assertTrue(Hash::check($password, $user->password));

        Event::assertDispatched(Registered::class);
    }

    public function test_registration_requires_name_email_password_and_password_confirmation()
    {
        $response = $this->postJson('/api/v24/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_registration_requires_a_unique_email()
    {
        $this->createUser(['email' => 'test@example.com']); // Using helper

        $password = $this->faker->password(8);
        $userData = [
            'name' => $this->faker->name,
            'email' => 'test@example.com',
            'password' => $password,
            'password_confirmation' => $password,
        ];

        $response = $this->postJson('/api/v24/register', $userData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_password_must_be_confirmed()
    {
        $password = $this->faker->password(8);
        $userData = [
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'password' => $password,
            'password_confirmation' => 'not-the-same-password',
        ];

        $response = $this->postJson('/api/v24/register', $userData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_password_must_be_at_least_8_characters()
    {
        $password = $this->faker->password(5, 7); // Generate password less than 8 chars
        $userData = [
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'password' => $password,
            'password_confirmation' => $password,
        ];

        $response = $this->postJson('/api/v24/register', $userData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
