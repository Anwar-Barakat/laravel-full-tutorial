<?php

namespace App\Notifications\Auth;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;

class ResetPasswordEmailNotification extends BaseResetPassword
{
    // Extend Laravel's default ResetPassword notification so tests can assert against this class
}
