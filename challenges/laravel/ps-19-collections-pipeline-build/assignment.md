# Challenge 19 — Collections Pipeline Build

**Format:** BUILD
**Topic:** Build a complex data transformation pipeline using Laravel Collections
**App:** Tripz — Laravel school booking platform

---

## Brief

Build a `BookingAnalytics` class that transforms raw booking data into five different analytical views using Laravel Collections. The rule is strict: **you get one DB query to load the data, then everything else must be done in memory using Collections.**

No additional queries are allowed inside the analytics methods.

---

## Starter Code

```php
<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Support\Collection;

class BookingAnalytics
{
    protected Collection $bookings;

    public function __construct()
    {
        // One query — load everything you need up front
        $this->bookings = Booking::with(['school', 'trip'])->get();
        // Each booking has:
        //   id, school_id, trip_id, student_count, amount (decimal),
        //   status (string), created_at (Carbon)
        // school relation: id, name, region
        // trip relation:   id, destination, departure_date (Carbon)
    }

    /**
     * ANALYTICS METHOD 1
     * Return total revenue per region, for paid bookings only.
     *
     * Expected output:
     * ['UAE' => 45000.00, 'KSA' => 23000.00, 'Kuwait' => 12000.00]
     */
    public function revenueByRegion(): array
    {
        // TODO
    }

    /**
     * ANALYTICS METHOD 2
     * Return the top 3 schools by total number of bookings.
     *
     * Expected output:
     * [
     *   ['school' => 'Greenwood Academy', 'count' => 24],
     *   ['school' => 'Horizon School',    'count' => 19],
     *   ['school' => 'Maple International','count' => 15],
     * ]
     */
    public function topSchoolsByBookingCount(): array
    {
        // TODO
    }

    /**
     * ANALYTICS METHOD 3
     * Return booking counts grouped by month for the last 6 months.
     * Months with zero bookings must still appear in the output.
     *
     * Expected output:
     * ['2024-10' => 12, '2024-11' => 18, '2024-12' => 7,
     *  '2025-01' => 0,  '2025-02' => 22, '2025-03' => 5]
     */
    public function monthlyBookingTrend(): array
    {
        // TODO
    }

    /**
     * ANALYTICS METHOD 4
     * Return bookings grouped by status, with count and percentage share.
     *
     * Expected output:
     * [
     *   'pending'   => ['count' => 45, 'pct' => 32.1],
     *   'confirmed' => ['count' => 63, 'pct' => 45.0],
     *   'cancelled' => ['count' => 32, 'pct' => 22.9],
     * ]
     */
    public function bookingsByStatusWithPercentage(): array
    {
        // TODO
    }

    /**
     * ANALYTICS METHOD 5
     * Return the average number of students per booking, grouped by trip destination.
     * Round to 1 decimal place.
     *
     * Expected output:
     * ['Dubai' => 18.5, 'London' => 22.0, 'Paris' => 14.3]
     */
    public function avgStudentsByDestination(): array
    {
        // TODO
    }
}
```

---

## Requirements

1. Implement all five methods using Laravel Collection methods
2. No additional DB queries inside any method — use `$this->bookings` only
3. `monthlyBookingTrend()` must include months with zero bookings
4. All returned arrays must be sorted as shown in the expected output comments
5. Percentages must be rounded to 1 decimal place

---

## Constraints

- You may use any methods on `Illuminate\Support\Collection`
- You may use Carbon for date manipulation
- You may not call `DB::`, `Booking::`, or any other query inside the methods
- The constructor loads the data — all methods transform it
