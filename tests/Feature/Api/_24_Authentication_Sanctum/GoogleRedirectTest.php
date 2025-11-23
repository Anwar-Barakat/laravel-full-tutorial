<?php

namespace Tests\Feature\Api\_24_Authentication_Sanctum;

use Tests\Feature\Api\BaseUserApiTest; // Updated
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Mockery;

class GoogleRedirectTest extends BaseUserApiTest
{
    use RefreshDatabase;

    public function test_it_redirects_to_google_for_authentication()
    {
        // Mock the Socialite driver
        $abstractProvider = Mockery::mock('Laravel\Socialite\Two\AbstractProvider');
        $abstractProvider->shouldReceive('redirect')->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        Socialite::shouldReceive('driver->stateless')->andReturn($abstractProvider);
        Socialite::shouldReceive('driver')->with('google')->andReturn($abstractProvider);


        $response = $this->get('/api/v24/google/redirect');

        $response->assertStatus(302); // Redirect status
        $response->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }
}
