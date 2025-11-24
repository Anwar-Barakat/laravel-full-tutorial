<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Support\Collection; // Added
use Illuminate\Support\Facades\Hash; // Added
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BaseUserApiTest extends TestCase
{
    protected function createAuthenticatedUser(array $attributes = [], array $abilities = ['*']): User
    {
        $user = User::factory()->create($attributes);
        Sanctum::actingAs($user, $abilities);
        return $user;
    }

    protected function createUser(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    protected function createPasswordedUser(string $password, array $attributes = []): User
    {
        return User::factory()->create(array_merge($attributes, [
            'password' => Hash::make($password),
        ]));
    }

    protected function createVerifiedUser(array $attributes = []): User
    {
        return User::factory()->create(array_merge($attributes, [
            'email_verified_at' => now(),
        ]));
    }

    protected function createUnverifiedUser(array $attributes = []): User
    {
        return User::factory()->create(array_merge($attributes, [
            'email_verified_at' => null,
        ]));
    }

    protected function createUsers(int $count = 1, array $attributes = []): Collection
    {
        if (empty($attributes) || ! is_array(reset($attributes))) {
            return User::factory()->count($count)->create($attributes);
        }

        $users = new Collection();
        foreach ($attributes as $userAttrs) {
            $users->push(User::factory()->create($userAttrs));
        }
        return $users;
    }
}
