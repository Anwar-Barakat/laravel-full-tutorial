# Assignment 23: Scheduled Tasks & Notifications for Low Stock Alerts

## Objective

This assignment focuses on creating a scheduled task using Laravel's Console Kernel to monitor product inventory. When a product's stock falls below a certain threshold, the system will automatically send a notification to an administrator. This involves creating a custom Artisan command, a notification class, and scheduling the command to run periodically.

## Key Concepts Covered

*   **Laravel Task Scheduling**: Using the `app/Console/Kernel.php` file to schedule recurring tasks.
*   **Custom Artisan Commands**: Building custom commands with `php artisan make:command`.
*   **Database Migrations**: Modifying existing table schemas.
*   **Eloquent**: Querying the database for specific conditions (e.g., low stock).
*   **Factories & Seeders**: Adding new fields to factories and ensuring an admin user exists.
*   **Laravel Notifications**: Sending notifications via multiple channels (mail, database).
*   **Role-based User Retrieval**: Finding users by their role for notifications.
*   **Console Routes**: Defining custom commands directly in the console routes file.

## Prerequisites

*   Familiarity with Laravel's basic routing, controllers, models, and notifications.
*   A working mail configuration in your `.env` file to test email notifications.
*   Spatie's `laravel-permission` package is expected to be installed and configured.

## Tasks

1.  **Add `stock` Column to Products Table**
    *   **Action**: Modify the `create_products_table` migration.
    *   **File**: `database/migrations/*_create_products_table.php`
    *   **Change**: Add an integer column `stock` with a default value of 0.
        ```php
        $table->integer('stock')->default(0);
        ```

2.  **Update `ProductFactory` for Seeding**
    *   **Action**: Add the `stock` attribute to the factory definition.
    *   **File**: `database/factories/ProductFactory.php`
    *   **Change**: Use Faker to generate a random stock number.
        ```php
        'stock' => $this->faker->numberBetween(0, 100),
        ```

3.  **Update Product-related Classes**
    *   **`app/Data/ProductData.php`**: Add `?int $stock` to the constructor and a `'stock' => ['nullable', 'integer', 'min:0']` validation rule.
    *   **`app/Models/Product.php`**: Add `'stock'` to the `$fillable` array.
    *   **`app/Http/Resources/ProductResource.php`**: Add `'stock' => $this->stock` to the `toArray` method.

4.  **Create the `CheckProductLowStockCommand`**
    *   **Action**: Generate a new Artisan command.
    *   **Command**: `php artisan make:command CheckProductLowStockCommand`
    *   **File**: `app/Console/Commands/Product/CheckProductLowStockCommand.php`
    *   **Implementation**:
        *   Set the signature to `products:check-low-stock`.
        *   In the `handle` method, query the `Product` model for items where `stock` is less than a defined threshold (e.g., 10).
        *   Find the admin user using `User::role('admin')->first()`.
        *   If low-stock products are found, send a `LowStockNotification` to the admin.
        *   Log output to the console using `$this->info()`, `$this->warn()`, and `$this->line()`.

5.  **Create the `LowStockNotification`**
    *   **Action**: Generate a new notification class.
    *   **Command**: `php artisan make:notification LowStockNotification`
    *   **File**: `app/Notifications/LowStockNotification.php`
    *   **Implementation**:
        *   The constructor should accept a collection of the low-stock products.
        *   The `via()` method should return `['mail', 'database']`.
        *   The `toMail()` method should create a `MailMessage` that lists the low-stock products.
        *   The `toArray()` method should return a data array with the product details for database storage.
        *   Implement the `ShouldQueue` interface to send notifications asynchronously.

6.  **Ensure Admin User Exists**
    *   **Action**: Verify that the `RolePermissionSeeder` creates an admin user.
    *   **File**: `database/seeders/RolePermissionSeeder.php`
    *   **Check**: Ensure an 'admin' role and a user with that role are created. The `CheckProductLowStockCommand` was updated to find this user by role instead of a static ID.

7.  **Schedule the Command**
    *   **Action**: Register the command in the console kernel.
    *   **File**: `app/Console/Kernel.php`
    *   **Change**: In the `schedule` method, add the following line to run the check daily.
        ```php
        $schedule->command('products:check-low-stock')->daily();
        ```

8.  **Create Manual Trigger in Console Routes**
    *   **Action**: Add a new command to the console routes file to manually trigger the low stock check.
    *   **File**: `routes/console.php`
    *   **Change**: Add the following command definition. This allows for easy manual testing from the command line.
        ```php
        Artisan::command('schedule:trigger-low-stock-check', function () {
            $this->info('Manually triggering the low stock check...');
            Artisan::call('products:check-low-stock');
            $this->info(Artisan::output());
        })->purpose('Manually trigger the low stock check command');
        ```

## Verification

1.  **Run Migrations**: Refresh your database and run the seeders:
    ```bash
    php artisan migrate:fresh --seed
    ```
2.  **Run the Main Command Manually**: Execute the original command to test its functionality.
    ```bash
    php artisan products:check-low-stock
    ```
3.  **Run the Trigger Command**: Execute the new trigger command from the console routes to ensure it correctly calls the main command.
    ```bash
    php artisan schedule:trigger-low-stock-check
    ```
4.  **Check Logs & Mail**: Verify that the command output is correct and that an email notification was sent (if mail is configured).
5.  **Check Database Notifications**: To verify database notifications, you would typically need an API endpoint. Since we removed it for this lesson, you can use `php artisan tinker` to query the database directly:
    ```bash
    php artisan tinker
    >>> $admin = App\Models\User::role('admin')->first();
    >>> $admin->notifications;
    ```
6.  **Test the Scheduler**: (Locally) Run `php artisan schedule:work` and wait for the task to execute on its schedule (you can temporarily change it to `everyMinute()` for faster testing).

This setup provides a robust, automated way to keep track of inventory and ensures that administrators are promptly informed about potential stock shortages.
