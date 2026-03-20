# Challenge 14: Stuck Job Debug

**Format:** DEBUG
**Topic:** Debug stuck and failing jobs in the queue
**App:** Tripz — Laravel school booking platform

---

## Problem

You have just received a production alert at 14:23. The `bookings` queue has **847 failed jobs**. All of them started failing yesterday after a deployment. The queue worker is still running but every new `ProcessBookingConfirmation` job fails within seconds of being picked up.

Your tasks:
1. Identify every bug in the code below
2. Write the corrected version (as comments explaining what the fix is)
3. Explain the safe procedure for re-processing the 847 failed jobs

---

## Error Logs from Production

```
[2024-01-15 14:23:11] production.ERROR: Serialization of 'Closure' is not allowed
Stack trace: App\Jobs\ProcessBookingConfirmation::__construct()

[2024-01-15 14:23:14] production.ERROR: Call to undefined method App\Models\Booking::sendConfirmation()
Stack trace: App\Jobs\ProcessBookingConfirmation::handle()

[2024-01-15 14:23:18] production.ERROR: Trying to get property 'email' of non-object
Stack trace: App\Jobs\ProcessBookingConfirmation::handle() line 34
```

---

## The Broken Code

```php
<?php

// app/Jobs/ProcessBookingConfirmation.php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Booking;
use App\Models\User;
use App\Mail\BookingConfirmationMail;
use Closure;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class ProcessBookingConfirmation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 10;   // ← Bug A

    public function __construct(
        private Booking $booking,
        private Closure $onSuccess,  // ← Bug B
    ) {}

    public function handle()
    {
        // ← Bug C — this method no longer exists
        $this->booking->sendConfirmation();

        // ← Bug D — no null check
        $user = User::find($this->booking->user_id);
        Mail::to($user->email)->send(new BookingConfirmationMail($this->booking));

        ($this->onSuccess)();
    }

    // ← Bug E — failed() exists but does nothing useful
    public function failed(\Throwable $e)
    {
        // nothing
    }
}
```

---

## Additional Context

- Yesterday's deployment included a rename: `Booking::sendConfirmation()` was replaced by `Booking::dispatchConfirmationNotification()`
- Some older bookings in the queue reference users that have since been soft-deleted
- The `$onSuccess` closure was used in the original (non-queued) version of this logic to chain callbacks; it was copy-pasted into the job by mistake
- The `public $tries = 10` was set "just in case" by a junior developer — no backoff was configured

---

## Your Tasks

### Task 1 — Bug Report

List every bug. For each bug provide:
- A label (Bug A, Bug B, etc.)
- The line or property it affects
- Why it is a bug
- What the correct behaviour should be

There are at least **5 bugs** in this file.

### Task 2 — Fixed Job (as an explanation)

Describe the corrected version of `ProcessBookingConfirmation`. You do not need to write executable PHP — explain each fix in plain terms.

### Task 3 — Re-processing the 847 Failed Jobs

Answer the following:

1. Before retrying anything, what should you do first?
2. What is the command to retry all failed jobs?
3. What is the risk of running `php artisan queue:retry all` right now, before any code fix?
4. When is `php artisan queue:flush` appropriate, and when is it dangerous?
5. How do you retry only a subset of failed jobs (e.g. only the ones that failed with `sendConfirmation` error)?

---

## Expected Output After Fix

When a booking confirmation job runs successfully:

```
[INFO] Booking confirmation sent — booking_id=1042, user_id=88, school="Oakwood Academy"
```

When a job fails permanently (after all retries):

```
[ERROR] BookingConfirmation permanently failed — booking_id=1042, error="User not found"
[Slack/email alert sent to admin]
```

---

## Constraints

- Do not store closures, anonymous functions, or any non-serializable objects in a job's constructor
- `$tries` should be 3 or fewer in almost all cases — understand why before changing it
- The `failed()` method must produce an observable side-effect (log, notification, or database record)
- If a related model may have been soft-deleted, always handle the null case explicitly
