# Challenge 10 — Failing Test Debug (DEBUG)

**App:** Tripz — Laravel school booking platform
**Format:** DEBUG
**Topic:** Tests are failing — find why and fix the application code (not the tests)

---

## Background

The Tripz booking model was refactored last week to "clean things up." Since then, four tests that were passing are now failing. Your job is to **read the failing tests, understand what they expect, then fix the application code** so the tests pass again.

**Rule: Do NOT modify the tests. Fix the model.**

---

## Failing Tests

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use App\Models\Booking;
use App\Mail\BookingConfirmationMail;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_total_price_calculates_correctly()
    {
        $booking = Booking::factory()->create([
            'student_count'     => 10,
            'price_per_student' => 50.00,
        ]);

        $this->assertEquals(500.00, $booking->total_price);
    }

    public function test_booking_is_overdue_when_unpaid_after_7_days()
    {
        $booking = Booking::factory()->create([
            'status'     => 'pending',
            'created_at' => now()->subDays(8),
        ]);

        $this->assertTrue($booking->isOverdue());
    }

    public function test_booking_scope_pending_returns_only_pending()
    {
        Booking::factory()->count(3)->create(['status' => 'pending']);
        Booking::factory()->count(2)->create(['status' => 'confirmed']);

        $this->assertCount(3, Booking::pending()->get());
    }

    public function test_booking_confirmation_email_sent_on_creation()
    {
        Mail::fake();

        $booking = Booking::factory()->create();

        Mail::assertSent(BookingConfirmationMail::class);
    }
}
```

---

## The Broken Model

This is `app/Models/Booking.php` after the refactor. It contains **4 bugs**. Find them all.

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'school_id',
        'student_count',
        'price_per_student',
        'status',
        'contact_email',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Bug 1: Accessor was renamed during refactor — tests expect total_price
    public function getTotalAmountAttribute(): float
    {
        return $this->student_count * $this->price_per_student;
    }

    // Bug 2: Wrong comparison operator — this is an assignment, not a comparison
    public function isOverdue(): bool
    {
        if ($this->status = 'pending' && $this->created_at->diffInDays(now()) > 7) {
            return true;
        }
        return false;
    }

    // Bug 3: Scope was accidentally removed during refactor
    // (it was here before — now it's gone)

    // Bug 4: Observer is not registered anywhere
    // (BookingObserver exists in app/Observers/ but is never booted)
}
```

---

## Requirements

Find and fix all 4 bugs so all tests pass. You may edit:

- `app/Models/Booking.php`
- `app/Observers/BookingObserver.php` (create if missing)
- `app/Providers/AppServiceProvider.php`

You may **not** edit the test file.

---

## Expected Output

After your fixes, all 4 tests should pass:

```
PASS  Tests\Unit\BookingTest
✓ booking total price calculates correctly
✓ booking is overdue when unpaid after 7 days
✓ booking scope pending returns only pending
✓ booking confirmation email sent on creation

Tests: 4 passed
```

---

## Hints

- Read each failing test carefully — it tells you exactly what the model must provide
- Test 1 accesses `$booking->total_price` — what does the current accessor expose?
- Test 2 calls `isOverdue()` — is `=` the right operator for a condition check?
- Test 3 calls `Booking::pending()` — what Laravel feature makes this work?
- Test 4 uses `Mail::fake()` and `Mail::assertSent()` — when does Laravel fire observers?
