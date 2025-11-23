<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Api\BaseUserApiTest;

class LogoutTest extends BaseUserApiTest
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_log_out()
    {
        $user = $this->createAuthenticatedUser();

        $response = $this->postJson('/api/v24/logout');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Logged out successfully.',
            ]);

        // Assert that the user's tokens have been deleted
        $this->assertCount(0, $user->tokens);
    }

    public function test_a_guest_cannot_log_out()
    {
        $response = $this->postJson('/api/v24/logout');

        // Assuming unauthenticated requests return 401
        $response->assertStatus(401);
    }
}
