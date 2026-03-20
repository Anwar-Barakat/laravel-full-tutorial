# Challenge 18 — Normalise Schema Refactor

**Format:** REFACTOR
**Topic:** Fix a badly designed database schema
**App:** Tripz — Laravel school booking platform

---

## Brief

A junior developer built the initial Tripz schema and shipped it to production. The schema has multiple normalisation violations. Your job is to identify every problem, design a corrected schema, and write the migration that safely transforms the existing data without downtime.

---

## Bad Schema (already in production)

```php
Schema::create('bookings', function (Blueprint $table) {
    $table->id();
    $table->string('school_name');           // school info stored directly on booking
    $table->string('school_email');
    $table->string('school_phone');
    $table->string('school_region');
    $table->string('trip_destination');      // trip info stored directly on booking
    $table->date('trip_departure');
    $table->decimal('trip_price', 8, 2);
    $table->integer('student_count');
    $table->string('status');                // free-text, no constraint
    $table->string('payment_status');        // payment concern mixed into booking
    $table->decimal('payment_amount', 8, 2)->nullable();
    $table->string('payment_ref')->nullable();
    $table->timestamps();
    // No indexes at all
});
```

There are no other tables. Everything is in this one `bookings` table.

---

## Your Tasks

### Task 1 — Identify Each Normalisation Violation

For each problem column or group of columns:
- Name the violation
- State which normal form is broken (1NF, 2NF, 3NF, or other)
- Explain the anomaly it causes (insert anomaly, update anomaly, delete anomaly)

### Task 2 — Design the Target Schema

Produce the correct set of tables. At minimum:

```
schools         — id, name, email, phone, region, timestamps
trips           — id, destination, departure_date, price_per_student (decimal), timestamps
bookings        — id, school_id (FK), trip_id (FK), student_count, status (constrained),
                  contact_email (snapshot), booking_reference (unique), timestamps
payments        — id, booking_id (FK), amount (decimal), status (enum), reference, paid_at, timestamps
```

### Task 3 — Write the Safe Migration

The table is live with real data. You cannot drop it and start over. Write the migration steps in order:

1. Create the new normalised tables (`schools`, `trips`, `payments`)
2. Backfill data — extract unique schools from `bookings`, extract unique trips, move payments
3. Add new FK columns to `bookings` (`school_id`, `trip_id`)
4. Populate the FK columns from the data you just backfilled
5. Drop the old denormalised columns
6. Add indexes

### Task 4 — Decide What to Keep as a Snapshot

Some denormalisation is acceptable. Decide which columns (if any) to keep on `bookings` even after normalisation, and justify why.

---

## Expected Output

After your migration runs, the `bookings` table should contain only:

```
id, school_id, trip_id, student_count, status, contact_email, booking_reference, created_at, updated_at
```

And these new tables should exist with correct FKs and indexes:

```
schools:  id, name, email, phone, region, created_at, updated_at
trips:    id, destination, departure_date, price_per_student, created_at, updated_at
payments: id, booking_id, amount, status, reference, paid_at, created_at, updated_at
```

---

## Constraints

- Do not drop any data during the migration — every row must be preserved
- The migration must be reversible (write a `down()` method)
- Add a `status` check constraint or ENUM to prevent free-text status values
- Zero-downtime approach: add columns first, backfill, then drop old columns in a separate migration
