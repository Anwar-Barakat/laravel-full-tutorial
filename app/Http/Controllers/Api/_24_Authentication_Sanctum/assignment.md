# Assignment 24: Full Authentication with Laravel Sanctum

## Topic: Implementing Token-Based API Authentication

This assignment focuses on securing your API endpoints using Laravel Sanctum, a lightweight authentication system for SPAs, mobile applications, and simple token-based APIs. You will implement user registration, login, and logout functionalities, and protect your existing API routes.

## Tasks

1.  **Install Laravel Sanctum:**
    *   Install the `laravel/sanctum` package via Composer.
    *   Publish Sanctum's configuration file and migrations.
    *   Run the database migrations to create the `personal_access_tokens` table.

2.  **Configure Sanctum:**
    *   Ensure the `App\Models\User` model uses the `HasApiTokens` trait.
    *   Add `\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class` to the `api` middleware group in `app/Http/Kernel.php`.
    *   Configure `config/sanctum.php` if needed (e.g., `stateful` domains, expiration).

3.  **Create an `AuthController`:**
    *   Generate a new API controller (e.g., `AuthController.php`) to handle authentication.

4.  **Implement Registration:**
    *   Add a `register` method to `AuthController` to create new user accounts.
    *   Validate input (name, email, password, password confirmation).
    *   Hash the password.
    *   Return a success response, possibly with a newly generated token.

5.  **Implement Login:**
    *   Add a `login` method to `AuthController` to authenticate users.
    *   Validate input (email, password).
    *   Attempt authentication using `Auth::attempt` or check credentials manually.
    *   If successful, generate a Sanctum API token for the user.
    *   Return the token in the response.

6.  **Implement Logout:**
    *   Add a `logout` method to `AuthController` to revoke the user's current API token.
    *   Use `auth()->user()->currentAccessToken()->delete()` or `auth()->user()->tokens()->delete()` for all tokens.

7.  **Define API Routes:**
    *   In `routes/api.php`, define routes for `/register`, `/login`, and `/logout`.
    *   Ensure `/logout` is protected by Sanctum middleware.

8.  **Protect Existing API Routes:**
    *   Apply the `auth:sanctum` middleware to a group of your existing API routes (e.g., the product CRUD routes) to ensure they require authentication.

9.  **Test Your Implementation:**
    *   Use Postman or a similar tool to:
        *   Register a new user.
        *   Log in and obtain a token.
        *   Attempt to access a protected product endpoint without a token (should fail).
        *   Attempt to access a protected product endpoint with the obtained token (should succeed).
        *   Log out and verify the token is no longer valid.