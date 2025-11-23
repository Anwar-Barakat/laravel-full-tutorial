<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Support\Collection; // Added
use Illuminate\Support\Facades\Hash; // Added
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BaseUserApiTest extends TestCase
{
    /**
     * Create and authenticate a user.
     *
     * @param array $attributes Additional attributes for the user factory.
     * @param array $abilities Abilities for Sanctum authentication.
     * @return User
     */
    protected function createAuthenticatedUser(array $attributes = [], array $abilities = ['*']): User
    {
        $user = User::factory()->create($attributes);
        Sanctum::actingAs($user, $abilities);
        return $user;
    }

    /**
     * Create a user with specified attributes.
     *
     * @param array $attributes
     * @return User
     */
    protected function createUser(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    /**
     * Create a user with a specific raw password.
     *
     * @param string $password The raw password.
     * @param array $attributes Additional attributes for the user factory.
     * @return User
     */
    protected function createPasswordedUser(string $password, array $attributes = []): User
    {
        return User::factory()->create(array_merge($attributes, [
            'password' => Hash::make($password),
        ]));
    }

    /**
     * Create a verified user with specified attributes.
     *
     * @param array $attributes
     * @return User
     */
    protected function createVerifiedUser(array $attributes = []): User
    {
        return User::factory()->create(array_merge($attributes, [
            'email_verified_at' => now(),
        ]));
    }

    /**
     * Create an unverified user with specified attributes.
     *
     * @param array $attributes
     * @return User
     */
    protected function createUnverifiedUser(array $attributes = []): User
    {
        return User::factory()->create(array_merge($attributes, [
            'email_verified_at' => null,
        ]));
    }

    /**
     * Create multiple users with specified attributes.
     *
     * @param int $count The number of users to create.
     * @param array $attributes Attributes for each user, or an array of attribute arrays.
     * @return Collection<User>
     */
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
