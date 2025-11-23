<?php

namespace App\Actions\Auth;

use Laravel\Socialite\Facades\Socialite;

class GoogleRedirectAction
{
    public function execute(): string
    {
        return Socialite::driver('google')->stateless()->redirect()->getTargetUrl();
    }
}
