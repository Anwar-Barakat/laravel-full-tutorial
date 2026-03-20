# Challenge 13: Batch Job Failure Handling

**Format:** BUILD
**Topic:** Build batch job processing with failure handling
**App:** Tripz — Laravel school booking platform

---

## Problem

Tripz needs to send a monthly invoice PDF to every school at the end of each month. There are 50+ schools and each PDF takes approximately 2 seconds to generate. If you dispatch everything synchronously the Artisan command would block for over 100 seconds and would fail if any single school hits an error.

Build a robust batch processing system so that invoices are generated and emailed in the background, failed jobs are retried automatically, and an admin is notified once the full batch completes.

---

## Requirements

1. Artisan command: `php artisan invoices:send-monthly`
2. The command dispatches **one job per school** — do not put all schools in a single job
3. Each job must:
   - Generate a PDF for that school's monthly invoice
   - Attach the PDF to the `Invoice` model (store the file path)
   - Email the PDF to the school's contact email
4. All jobs must run on the `invoices` queue
5. Failed jobs must be retried up to **3 times** with **exponential backoff** (e.g. 10s, 30s, 60s)
6. After all jobs in the batch have completed (success or failure), notify the admin with a summary: how many succeeded, how many failed
7. If a school has no bookings for the target month, **skip it** — do not generate an invoice
8. Log each individual success and failure with the school name and any error message

---

## Starter Code

The following code is **incomplete**. It will not run as-is. Your job is to fill in all the missing pieces.

```php
<?php

// app/Console/Commands/SendMonthlyInvoices.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\School;
use App\Jobs\GenerateSchoolInvoice;

class SendMonthlyInvoices extends Command
{
    protected $signature = 'invoices:send-monthly
                            {--month= : Month number (1-12), defaults to last month}
                            {--year=  : Year, defaults to current year}';

    protected $description = 'Generate and send monthly invoices to all schools';

    public function handle()
    {
        // TODO: resolve month and year from options or derive from "last month"

        // TODO: get all active schools

        // TODO: dispatch one GenerateSchoolInvoice job per school
        //       jobs must land on the "invoices" queue

        // TODO: notify admin once all jobs finish (success count, failure count)
    }
}
```

```php
<?php

// app/Jobs/GenerateSchoolInvoice.php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\School;

class GenerateSchoolInvoice implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly School $school,
        public readonly int $month,
        public readonly int $year,
    ) {}

    public function handle()
    {
        // TODO: check if school has any bookings this month — if not, skip

        // TODO: generate the PDF (use a service class, e.g. InvoicePdfService)

        // TODO: create or update the Invoice model, store the PDF path

        // TODO: email the PDF to the school's contact
        //       use Mail::to()->queue() so the email itself is also non-blocking

        // TODO: log success
    }

    // TODO: add a failed() method that logs the error and school name
}
```

---

## Models / Context

```php
// School model fields relevant to this challenge:
// id, name, contact_email, is_active

// Booking model fields:
// id, school_id, amount, created_at

// Invoice model fields:
// id, school_id, month, year, pdf_path, total_amount, sent_at
```

---

## Expected Output

When you run `php artisan invoices:send-monthly`, the command should:

1. Print a progress summary to the console, e.g.:
   ```
   Dispatching invoice jobs for 52 active schools...
   47 schools have bookings this month — jobs dispatched.
   5 schools skipped (no bookings).
   Batch ID: 01HX... — monitor with: php artisan queue:work --queue=invoices
   ```

2. Each background job should produce a log entry on success:
   ```
   [INFO] Invoice generated for "Greenfield Academy" (school_id=14) — £2,340.00
   ```

3. On failure (after all retries exhausted):
   ```
   [ERROR] Invoice job failed for "Riverside School" (school_id=27) — RuntimeException: PDF generation timed out
   ```

4. After the entire batch finishes, an admin notification (email or Slack) should be sent:
   ```
   Monthly Invoice Batch — January 2024
   ✓ 46 succeeded
   ✗ 1 failed (see failed_jobs table)
   ```

---

## Constraints

- Do not use `$this->tries` alone — implement proper backoff as well
- The `failed()` method on the job must do something useful (log at minimum)
- The admin notification after the full batch must use the batch callback, not a scheduled check
- Do not use `queue:work --once` in your implementation — the batch must self-notify

---

## Hints

- Laravel's `Bus::batch()` can wrap multiple jobs and provides `then()`, `catch()`, and `finally()` callbacks
- Alternatively, you can dispatch jobs individually and use a separate "summary" job chained at the end — both approaches are valid
- `$this->backoff = [10, 30, 60]` sets per-retry delays in seconds
- `Mail::to($email)->queue(new Mailable())` sends the email through the queue rather than inline
- Check the `jobs` and `failed_jobs` tables in the database to monitor progress
