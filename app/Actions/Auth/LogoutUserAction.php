<?php

namespace App\Actions\Auth;

use Illuminate\Support\Facades\Auth;

class LogoutUserAction
{
    public function execute()
    {
        Auth::user()->currentAccessToken()->delete();
        return true;
    }
}
