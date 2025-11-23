<?php

namespace App\Http\Controllers;

use App\Http\Traits\ApiResponseTrait;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

abstract class Controller
{
    use ApiResponseTrait, AuthorizesRequests, ValidatesRequests;
}
