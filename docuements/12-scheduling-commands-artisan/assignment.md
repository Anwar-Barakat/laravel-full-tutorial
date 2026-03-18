# Task Scheduling & Artisan Commands

Build scheduled tasks and custom Artisan commands — automate recurring work in your Laravel app.

| Topic              | Details                          |
|--------------------|----------------------------------|
| Task Scheduling    | Cron-like scheduling in Laravel  |
| Artisan Commands   | Custom CLI commands              |
| Automated Reports  | Scheduled data processing        |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Custom Artisan Commands (Medium)

### Scenario

Build Artisan commands for the booking system: generate reports, clean old data, send reminders, and sync with external APIs.

### Requirements

1. `bookings:send-reminders` — email schools about upcoming trips (accepts `--days` option)
2. `bookings:generate-report {month}` — create monthly CSV/PDF report
3. Use `$this->argument()` and `$this->option()` for input
4. Add progress bar for batch operations
5. Schedule commands in `routes/console.php` (Laravel 11)
6. Use `withoutOverlapping()` and `onOneServer()`

### Expected Code

```php
// Run manually
php artisan bookings:send-reminders --days=7
php artisan bookings:generate-report 2026-03

// Scheduled in routes/console.php
Schedule::command('bookings:send-reminders --days=7')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->onOneServer();
```

### What We're Evaluating

- Artisan command structure (`handle`, `$signature`, `$description`)
- Arguments and options with defaults
- Progress bars for batch output
- Schedule configuration in `routes/console.php`

---

## Problem 02 — Advanced Scheduling Patterns (Hard)

### Scenario

Build production-grade scheduled tasks: database cleanup, health checks, external API sync, and environment-aware scheduling with proper failure handling and alerting.

### Requirements

1. `bookings:cleanup` — soft-delete bookings older than 1 year, using `chunkById` to avoid memory issues
2. `bookings:sync-external` — pull latest school data from an external API, skip if API is down
3. Schedule cleanup only on **weekdays**, only in **production**, email admin on failure
4. Use `Schedule::call()` for inline closures alongside `Schedule::command()`
5. Use `onSuccess()` and `onFailure()` callbacks on scheduled tasks
6. Use `pingBefore()` / `thenPing()` for uptime monitoring (healthchecks.io style)
7. Build a `schedule:status` command that lists all scheduled tasks and their next run time

### Expected Code

```php
// routes/console.php
Schedule::command('bookings:cleanup')
    ->weekdays()
    ->at('02:00')
    ->environments('production')
    ->withoutOverlapping(30)
    ->onOneServer()
    ->onFailure(function () {
        Mail::to(config('mail.admin'))->send(new ScheduleFailedMail('bookings:cleanup'));
    })
    ->pingBefore(config('services.healthcheck.cleanup_url'));

// Inline closure task
Schedule::call(function () {
    // quick inline task — no command class needed
})->hourly()->name('inline-task')->withoutOverlapping();
```

### What We're Evaluating

- `chunkById` for memory-safe batch processing
- Environment-aware scheduling
- `onSuccess()` / `onFailure()` callbacks
- `pingBefore()` / `thenPing()` for monitoring
- `Schedule::call()` for inline tasks
- Command output logging with `sendOutputTo()`
