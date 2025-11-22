<?php

namespace App\Http\Controllers\Api\_24_Authentication_With_Sanctum;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Http\Traits\ApiResponseTrait;
use App\Actions\Auth\RegisterUserAction;
use App\Actions\Auth\LoginUserAction;
use App\Actions\Auth\LogoutUserAction;
use App\Data\Auth\RegisterUserData; // New
use App\Data\Auth\LoginUserData;    // New

class AuthController extends Controller
{
    use ApiResponseTrait; // Assuming this trait exists

    public function register(RegisterUserData $registerData, RegisterUserAction $registerUserAction)
    {
        $result = $registerUserAction->execute($registerData);

        return $this->successResponse($result, 'User registered successfully.', 201);
    }

    public function login(LoginUserData $loginData, LoginUserAction $loginUserAction)
    {
        try {
            $result = $loginUserAction->execute($loginData);
            return $this->successResponse($result, 'Logged in successfully.');
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 401);
        }
    }

    public function logout(Request $request, LogoutUserAction $logoutUserAction)
    {
        $logoutUserAction->execute();

        return $this->successResponse(null, 'Logged out successfully.');
    }
}
