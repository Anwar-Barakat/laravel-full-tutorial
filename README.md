# Laravel E-commerce API

This project is a comprehensive backend API, built with Laravel. It demonstrates modern architectural patterns, advanced features, and robust integrations, providing a scalable foundation for e-commerce services.

## Table of Contents

- [Features Highlight](#features-highlight)
- [Architectural Principles](#architectural-principles)
- [Key Integrations](#key-integrations)
- [Setup & Installation](#setup--installation)
- [API Endpoints Overview](#api-endpoints-overview)
- [Technical Stack](#technical-stack)
- [Contributing](#contributing)
- [License](#license)

## Features Highlight

This API offers a rich set of functionalities essential for a modern e-commerce platform:

*   **Product Management**: Full CRUD for products with advanced querying (filtering, sorting), image galleries, tagging, and polymorphic reviews.
*   **Order Management**: Complete CRUD for orders, supported by fine-grained authorization policies.
*   **User Authentication**: Robust authentication system via Laravel Sanctum, including registration, login, logout, password reset, email verification, Two-Factor Authentication (2FA), and social login (Google).
*   **Data Import/Export**: Comprehensive tools for exporting data (Excel, CSV, PDF, queued for large sets) and importing orders with detailed validation.
*   **Payment Processing**: Secure integrations with Stripe for both:
    *   **Stripe Checkout**: Redirect-based payments with webhook handling for fulfillment.
    *   **Stripe Payment Intents**: Custom on-site payment forms, customer management, and webhook handling.
*   **Notifications**: Multi-channel (Email, Database, Broadcast) and queueable notifications for events like order creation.

## Architectural Principles

The project strictly adheres to best practices, ensuring a clean, maintainable, and scalable codebase:

*   **Action Layer**: Business logic encapsulated in single-responsibility Action classes for thin controllers.
*   **Data Transfer Objects (DTOs)**: Type-safe data contracts for clear communication between layers and robust validation.
*   **API Resources**: Standardized JSON response formatting for consistent API output.
*   **Policies & Permissions**: Centralized authorization using Laravel Policies and `spatie/laravel-permission` for fine-grained access control.
*   **Event-Driven Architecture**: Decoupled side effects via Events and Listeners (e.g., Order created triggers multiple background tasks).

## Key Integrations

*   **Laravel Sanctum**: API token authentication.
*   **`spatie/laravel-permission`**: Role and permission management.
*   **`spatie/laravel-medialibrary`**: Robust media (image) handling with conversions and queues.
*   **`spatie/laravel-data`**: DTOs for structured data and validation.
*   **`spatie/laravel-query-builder`**: Enhanced API querying capabilities.
*   **`maatwebsite/excel`**: Excel, CSV, and PDF import/export.
*   **Stripe**: Secure payment gateway integration.

## Setup & Installation

Follow these standard Laravel steps to get the project running locally:

1.  **Clone the repository:** `git clone https://github.com/your-username/laravel-ecommerce-api.git && cd laravel-ecommerce-api`
2.  **Install dependencies:** `composer install`
3.  **Environment setup:** `cp .env.example .env && php artisan key:generate`
4.  **Configure `.env`**: Set up database, Stripe, and Mail credentials.
5.  **Database & Seeding**: `php artisan migrate --seed` (add `--seed` if you want initial data).
6.  **Start Services**:
    *   `php artisan serve` (for the web server)
    *   `php artisan queue:work` (for background jobs)
    *   Configure system cron for `php artisan schedule:run` (for scheduled tasks).

## API Endpoints Overview

The API is versioned (e.g., `/api/v1`, `/api/v2`) and covers:

*   `/api/v1-v13/products`: Product CRUD with progressive enhancements.
*   `/api/v14/orders`: Core Order CRUD.
*   `/api/v15/orders-exports`, `/api/v16/orders-imports`, `/api/v17/orders/export/pdf-*`: Data import/export functionalities.
*   `/api/v19/orders`, `/api/stripe/*`: Stripe Checkout integration.
*   `/api/v20/orders`, `/api/stripe/payment-intents*`: Stripe Payment Intents integration.
*   `/api/v24/auth/*`: Comprehensive authentication (register, login, 2FA, social login).

## Technical Stack

*   **Framework**: Laravel (v12)
*   **Database**: MySQL
*   **Auth**: Laravel Sanctum
*   **Permissions**: `spatie/laravel-permission`
*   **Media**: `spatie/laravel-medialibrary`
*   **DTOs**: `spatie/laravel-data`
*   **Exports/Imports**: `maatwebsite/excel`, `barryvdh/laravel-dompdf`
*   **Payments**: Stripe
*   **Testing**: PHPUnit

## Contributing

See the [Laravel documentation](https://laravel.com/docs/contributions) for general contribution guidelines.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
