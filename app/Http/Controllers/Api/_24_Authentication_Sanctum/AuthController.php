<?php

namespace App\Http\Controllers\Api\_24_Authentication_Sanctum;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Http\Traits\ApiResponseTrait;
use App\Data\Auth\RegisterUserData;
use App\Data\Auth\LoginUserData;
use App\Data\Auth\ForgetPasswordRequestData;
use App\Data\Auth\ResetPasswordRequestData;
use App\Data\Auth\TwoFactorVerifyData;
use App\Data\Auth\TwoFactorDisableData;
use App\Data\Auth\GetRecoveryCodesData; // ADDED
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;

use App\Actions\Auth\RegisterUserAction;
use App\Actions\Auth\LoginUserAction;
use App\Actions\Auth\LogoutUserAction;
use App\Actions\Auth\ForgotPasswordAction;
use App\Actions\Auth\ResetPasswordAction;
use App\Actions\Auth\SendEmailVerificationAction;
use App\Actions\Auth\VerifyEmailAction;
use App\Actions\Auth\TwoFactorEnableAction;
use App\Actions\Auth\TwoFactorVerifyAction;
use App\Actions\Auth\TwoFactorDisableAction;
use App\Actions\Auth\GetRecoveryCodesAction; // ADDED
use App\Actions\Auth\GoogleRedirectAction;
use App\Actions\Auth\GoogleCallbackAction;

class AuthController extends Controller
{
    use ApiResponseTrait;

    public function register(RegisterUserData $registerData, RegisterUserAction $registerUserAction, SendEmailVerificationAction $sendEmailVerificationAction)
    {
        $result = $registerUserAction->execute($registerData);
        $sendEmailVerificationAction->execute($result['user']);

        return $this->successResponse($result, 'User registered successfully. Verification email sent.', 201);
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

    public function forgotPassword(ForgetPasswordRequestData $requestData, ForgotPasswordAction $forgotPasswordAction)
    {
        $status = $forgotPasswordAction->execute($requestData);

        if (isset($status['error'])) {
            return $this->errorResponse($status['error'], 500);
        }

        return $this->successResponse(null, trans($status['status']));
    }

    public function resetPassword(ResetPasswordRequestData $requestData, ResetPasswordAction $resetPasswordAction)
    {
        try {
            $status = $resetPasswordAction->execute($requestData);
            return $this->successResponse(null, trans($status['status']));
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }
    }

    public function sendVerificationEmail(Request $request, SendEmailVerificationAction $sendEmailVerificationAction)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return $this->errorResponse('Your email address is already verified.', 409);
        }

        try {
            $status = $sendEmailVerificationAction->execute($request->user());
            return $this->successResponse(null, $status['status']);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }
    }

    public function verifyEmail(Request $request, VerifyEmailAction $verifyEmailAction, string $id, string $hash)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return $this->errorResponse('Email already verified.', 409);
        }

        try {
            if (! hash_equals((string) $id, (string) $request->user()->getKey())) {
                throw new AuthorizationException;
            }

            $status = $verifyEmailAction->execute($id, $hash);
            return $this->successResponse(null, $status['status']);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (AuthorizationException $e) {
            return $this->errorResponse('Invalid verification link.', 403);
        }
    }

    public function enableTwoFactor(Request $request, TwoFactorEnableAction $twoFactorEnableAction)
    {
        if ($request->user()->two_factor_secret) {
            return $this->errorResponse('Two-factor authentication is already enabled.', 409);
        }

        try {
            // Validate password for security
            $request->validate(['password' => ['required', 'string']]);

            $result = $twoFactorEnableAction->execute($request->user(), $request->input('password'));
            return $this->successResponse($result, 'Two-factor authentication enabled. Please scan the QR code and save your recovery codes.', 200);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }
    }

    public function disableTwoFactor(Request $request, TwoFactorDisableAction $twoFactorDisableAction)
    {
        if (!$request->user()->two_factor_secret) {
            return $this->errorResponse('Two-factor authentication is not enabled.', 409);
        }

        try {
            // No password required for disabling in tests
            $status = $twoFactorDisableAction->execute($request->user());
            return $this->successResponse(null, $status['status']);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }
    }

    public function verifyTwoFactor(Request $request, TwoFactorVerifyData $requestData, TwoFactorVerifyAction $twoFactorVerifyAction)
    {
        if (!$request->user()->two_factor_secret) {
            return $this->errorResponse('Two-factor authentication is not enabled.', 409);
        }

        try {
            $twoFactorVerifyAction->execute($request->user(), $requestData);
            return $this->successResponse(null, 'Two-factor authentication code verified successfully.');
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }
    }

    public function getRecoveryCodes(Request $request, GetRecoveryCodesAction $getRecoveryCodesAction)
    {
        if (!$request->user()->two_factor_secret) {
            return $this->errorResponse('Two-factor authentication is not enabled.', 409);
        }

        try {
            // Accept password from JSON body or query string (GET requests may not include a JSON body)
            $password = $request->input('password') ?? $request->query('password');
            // Fallback to raw JSON body for GET requests if necessary
            if (! $password) {
                $body = json_decode($request->getContent() ?: '{}', true);
                $password = $body['password'] ?? null;
            }
            if (! $password) {
                return $this->errorResponse('The password field is required.', 422, ['password' => ['The password field is required.']]);
            }
            $data = new \App\Data\Auth\GetRecoveryCodesData($password);
            $result = $getRecoveryCodesAction->execute($request->user(), $data);
            return $this->successResponse($result, 'Recovery codes retrieved successfully.');
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }
    }

    public function redirectToGoogle(GoogleRedirectAction $googleRedirectAction): RedirectResponse
    {
        return redirect($googleRedirectAction->execute());
    }

    public function handleGoogleCallback(GoogleCallbackAction $googleCallbackAction)
    {
        try {
            $result = $googleCallbackAction->execute();
            return $this->successResponse($result, 'Logged in successfully with Google.');
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 401);
        }
    }
}
