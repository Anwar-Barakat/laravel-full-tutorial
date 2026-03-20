# Challenge 17 — Schema Design Build

**Format:** BUILD
**Topic:** Design a complete database schema from business requirements
**App:** Tripz — Laravel school booking platform

---

## Brief

Design the complete database schema for Tripz from scratch. You are given a set of business requirements and empty migration stubs. Your job is to produce a fully normalised, production-ready schema.

---

## Business Requirements

- Schools can make bookings for educational trips
- Each trip has a destination, dates, price per student, and a maximum capacity
- A booking belongs to a school and a trip, and records a specific number of students
- Payments can be made in instalments against a booking
- Each school has multiple contacts (admin, billing, main)
- Trips can have multiple categories / tags (adventure, cultural, language, etc.)
- Users belong to schools and have roles (admin, school_admin, parent)
- Audit log: who created and last updated each booking, and when

---

## Starter Code

You have these empty migration stubs — extend or replace each one as needed:

```php
// create_users_table.php — extend the default Laravel stub
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->rememberToken();
    $table->timestamps();
    // TODO: add school relationship and role
});

// create_schools_table.php — build from scratch
Schema::create('schools', function (Blueprint $table) {
    $table->id();
    // TODO
});

// create_trips_table.php — build from scratch
Schema::create('trips', function (Blueprint $table) {
    $table->id();
    // TODO
});

// create_bookings_table.php — build from scratch
Schema::create('bookings', function (Blueprint $table) {
    $table->id();
    // TODO
});

// create_payments_table.php — build from scratch
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    // TODO
});
```

---

## Requirements

1. Write all migrations in the correct order, respecting foreign key constraints
2. Add indexes on all foreign key columns and any columns commonly used in WHERE or ORDER BY clauses
3. Explain your normalisation decisions (in comments or a short written section)
4. Identify any intentional denormalisations and explain why they are justified
5. Apply soft deletes where appropriate — and explain where you chose not to

---

## Expected Output

A set of migrations that produce these tables (as a minimum):

```
users               — id, school_id (FK), role (enum), name, email, password, soft-delete, timestamps
schools             — id, name, region, soft-delete, timestamps
school_contacts     — id, school_id (FK), type (enum: admin|billing|main), name, email, phone, timestamps
trips               — id, destination, departure_date, return_date, price_per_student (decimal), max_capacity (int), timestamps
tags                — id, name (unique), slug (unique)
trip_tag            — trip_id (FK), tag_id (FK) — pivot
bookings            — id, school_id (FK), trip_id (FK), student_count, status, contact_email (snapshot), booking_reference (unique), created_by (FK), updated_by (FK), soft-delete, timestamps
payments            — id, booking_id (FK), amount (decimal), status (enum), paid_at (nullable timestamp), reference (unique), timestamps
```

---

## Constraints

- No JSON columns for relational data
- Every FK column must have an index
- `booking_reference` must be unique and queryable
- Capacity queries will filter on `(trip_id, status)` — add a compound index
- Use `unsignedBigInteger` / `foreignId` syntax consistently
