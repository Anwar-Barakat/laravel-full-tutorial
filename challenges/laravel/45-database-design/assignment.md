# LARAVEL_TEST_45 — Database Design · ERD · Normalization

**Time:** 25 minutes | **Stack:** Laravel 11 + PHP 8.3

---

## Problem 01 — Database Architecture (Medium)

Design database schemas for the Tripz booking platform.

---

### ERD — Entity Relationship Diagram

```
schools ──< bookings >── trips
   │                       │
   │                    trip_categories
   │
   └─< users (school staff)

bookings ──< payments
bookings ──< booking_students  (optional: student manifest)

┌─────────┐       ┌──────────┐       ┌────────┐
│ schools │ 1───∞ │ bookings │ ∞───1 │ trips  │
│  id     │       │  id      │       │  id    │
│  name   │       │  school_id       │  title │
│  emirate│       │  trip_id │       │  price │
└─────────┘       │  status  │       └────────┘
                  │  amount  │
                  └──────────┘
                       │
                       1
                       │
                       ∞
                  ┌──────────┐
                  │ payments │
                  │  id      │
                  │ booking_id
                  │  amount  │
                  │  status  │
                  └──────────┘

Cardinalities:
  school 1:∞ bookings    (one school, many bookings)
  trip   1:∞ bookings    (one trip, many bookings)
  booking 1:∞ payments   (one booking, many payment attempts)
```

---

### Schema design — all migrations

```php
// database/migrations/2026_01_01_000001_create_schools_table.php
Schema::create('schools', function (Blueprint $table) {
    $table->id();
    $table->string('name', 255);
    $table->string('emirate', 50);          // Dubai, Abu Dhabi, Sharjah…
    $table->string('type', 50)->default('private'); // private, public, international
    $table->string('contact_name', 100);
    $table->string('contact_email', 255)->unique();
    $table->string('contact_phone', 20)->nullable();
    $table->string('address')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();

    $table->index('emirate');
    $table->index('is_active');
    $table->index(['emirate', 'is_active']);  // compound: common query pattern
});

// database/migrations/2026_01_01_000002_create_trips_table.php
Schema::create('trips', function (Blueprint $table) {
    $table->id();
    $table->string('title', 255);
    $table->string('destination', 255);
    $table->string('country', 100);
    $table->text('description')->nullable();
    $table->decimal('price_per_student', 10, 2);
    $table->integer('min_students')->default(10);
    $table->integer('max_students');
    $table->integer('capacity_remaining'); // denormalized — updated on each booking
    $table->string('status', 20)->default('draft'); // draft, active, full, archived
    $table->date('available_from');
    $table->date('available_to');
    $table->string('image_path')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index('status');
    $table->index(['status', 'available_from', 'available_to']);  // trip listing query
    $table->index('destination');
});

// database/migrations/2026_01_01_000003_create_bookings_table.php
Schema::create('bookings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('school_id')->constrained('schools')->restrictOnDelete();
    $table->foreignId('trip_id')->constrained('trips')->restrictOnDelete();

    // Denormalized contact info — snapshot at booking time
    // (school contact can change — booking is a historical record)
    $table->string('contact_name', 100);
    $table->string('contact_email', 255);
    $table->string('contact_phone', 20)->nullable();

    $table->unsignedSmallInteger('student_count');
    $table->date('trip_date');
    $table->decimal('amount', 10, 2);
    $table->string('status', 20)->default('pending');
    // pending → confirmed → paid → completed → cancelled

    $table->string('payment_id', 255)->nullable();    // gateway transaction reference
    $table->string('payment_gateway', 50)->nullable(); // stripe | mamopay

    $table->string('pricing_type', 50)->default('standard'); // which strategy was used
    $table->decimal('base_amount', 10, 2);                   // per-student price at booking

    $table->string('cancellation_reason')->nullable();
    $table->timestamp('cancelled_at')->nullable();

    $table->timestamps();
    $table->softDeletes();

    // Indexes for common access patterns:
    $table->index(['school_id', 'status']);       // school dashboard
    $table->index(['trip_id', 'trip_date']);       // trip manifest
    $table->index('status');                       // admin list
    $table->index('created_at');                   // chronological queries
    $table->index('payment_id');                   // webhook lookup
});

// database/migrations/2026_01_01_000004_create_payments_table.php
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('booking_id')->constrained('bookings')->restrictOnDelete();
    $table->string('gateway_transaction_id', 255)->unique(); // idempotency key
    $table->string('gateway', 50);           // stripe | mamopay
    $table->decimal('amount', 10, 2);
    $table->char('currency', 3);             // ISO 4217: GBP, AED, USD
    $table->string('status', 30);            // pending, captured, refunded, partially_refunded, failed
    $table->string('type', 20)->default('charge'); // charge | refund
    $table->json('gateway_response')->nullable();  // raw response — never delete
    $table->timestamp('processed_at')->nullable();
    $table->timestamps();

    $table->index(['booking_id', 'status']);
    $table->index('gateway_transaction_id'); // webhook deduplication
    $table->index(['gateway', 'status']);    // reporting by gateway
});
```

---

### Normalization — 3NF analysis

```php
// 1NF (First Normal Form): atomic values, no repeating groups
// ✅ Each column holds one value (student_count: integer, not "30,40,50")
// ✅ No arrays stored as comma-separated strings
// ✅ Each row is unique (primary key)

// 2NF (Second Normal Form): no partial dependencies (applies to composite PKs)
// Our tables use surrogate PKs (id) — 2NF automatically satisfied

// 3NF (Third Normal Form): no transitive dependencies
// Violation example (would break 3NF):
//   bookings table storing: school_name, school_emirate
//   These depend on school_id (transitive: booking → school_id → school_name)
//   Fix: store only school_id → JOIN to get school_name

// ✅ bookings stores school_id (FK), not school_name
// ✅ trips stores trip attributes, bookings reference by trip_id

// Intentional denormalization (performance trade-off):
// bookings.contact_name, bookings.contact_email:
//   Denormalized: snapshot the contact at booking time
//   Why: school contact can change — the booking is a legal record
//   If contact_email lived only in schools table, a school update would
//   alter historical booking records — wrong

// trips.capacity_remaining:
//   Denormalized: could be calculated as max_students - SUM(student_count for paid bookings)
//   Why cached: recalculating on every trip listing = expensive aggregate query
//   Trade-off: must update atomically via DB::transaction + decrement on booking
//   If calculation is acceptable: DROP this column, calculate in query/attribute
```

---

### Index strategy

```php
// ============================================================
// RULE: Add index if WHERE/ORDER BY/JOIN column appears in queries
// running > 100×/day or on tables > 10,000 rows
// ============================================================

// Index 1: school dashboard — most common read
// SELECT * FROM bookings WHERE school_id = ? AND status = 'paid'
// → Compound index (school_id, status) — covers both WHERE clauses
$table->index(['school_id', 'status']);

// Index 2: trip availability check — every booking attempt
// SELECT SUM(student_count) FROM bookings WHERE trip_id = ? AND status IN ('paid','confirmed')
// → Index on trip_id covers this; add status for covering index benefit
$table->index(['trip_id', 'status']);

// Index 3: admin booking list — date range filter
// SELECT * FROM bookings WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC
$table->index('created_at');

// Index 4: payment webhook deduplication — critical path
// SELECT id FROM payments WHERE gateway_transaction_id = ?
// → UNIQUE index (prevents duplicates + speeds lookup)
$table->unique('gateway_transaction_id');

// Index 5: full-text search on trip title/destination
// In MySQL: FULLTEXT index
// For complex search: move to Elasticsearch (better relevance, facets)
DB::statement('ALTER TABLE trips ADD FULLTEXT ft_trips (title, destination, description)');

// What NOT to index:
//   status column on its own (low cardinality: only 5 values — poor selectivity)
//   boolean columns (is_active: only 2 values — index rarely helps)
//   Columns rarely used in WHERE/JOIN (wastes write overhead)

// EXPLAIN to verify index usage:
// EXPLAIN SELECT * FROM bookings WHERE school_id = 1 AND status = 'paid';
// → key: 'bookings_school_id_status_index' ✅
// → type: 'ref' (index lookup, not full scan) ✅
```

---

### Query optimization

```php
// ❌ N+1 problem — fires one query per booking
$bookings = Booking::where('status', 'paid')->get();
foreach ($bookings as $booking) {
    echo $booking->school->name;   // new SELECT per row → 100 bookings = 101 queries
}

// ✅ Eager loading — 2 queries total
$bookings = Booking::with(['school', 'trip'])
    ->where('status', 'paid')
    ->get();
// SELECT * FROM bookings WHERE status = 'paid'
// SELECT * FROM schools WHERE id IN (1, 2, 3, ...)  → single IN query

// ✅ Lazy eager loading when conditional
$booking = Booking::find(1);
if ($needsSchool) {
    $booking->load('school');  // only if needed
}

// ❌ SELECT * when only need id and name
$bookings = Booking::all();   // fetches all 50 columns

// ✅ Select only needed columns
$bookings = Booking::select('id', 'school_id', 'amount', 'status')->paginate(15);

// ✅ Chunking for bulk operations (never load millions of rows into memory)
Booking::where('status', 'pending')
    ->where('created_at', '<', now()->subDays(30))
    ->chunkById(100, function (Collection $bookings) {
        $bookings->each(fn ($b) => $b->update(['status' => 'expired']));
    });

// ✅ Aggregate queries — push work to DB, not PHP
$revenue = Booking::where('status', 'paid')
    ->whereBetween('trip_date', [$from, $to])
    ->sum('amount');   // SELECT SUM(amount) — not get() then sum()

// ✅ Covering index query — all columns in query are in the index
// Index: (school_id, status, amount)  ← covering
// Query: SELECT amount FROM bookings WHERE school_id = ? AND status = ?
// → DB reads only index, never touches table rows (fast)
```

---

## Problem 02 — Advanced Database Architecture (Hard)

---

### Normalization vs Denormalization — when to break 3NF

```php
// ============================================================
// Case 1: Denormalize for performance (read-heavy dashboards)
// ============================================================

// schools table — add denormalized booking_count:
$table->unsignedInteger('booking_count')->default(0);   // denormalized
$table->decimal('total_revenue', 12, 2)->default(0);    // denormalized

// Kept in sync by:
//   Increment on BookingCreated listener
//   Decrement on BookingCancelled listener
//   Nightly job recalculates from source of truth (drift correction)

// vs. normalized (recalculate each time):
$count = Booking::where('school_id', $schoolId)->count();  // hits DB every request

// Trade-off:
//   Denormalized: O(1) read, maintenance overhead to keep in sync
//   Normalized:   always accurate, expensive aggregate on large tables

// ============================================================
// Case 2: Soft deletes — keep history, hide from queries
// ============================================================
$table->softDeletes();  // adds deleted_at column

// Booking::find(1)                → WHERE deleted_at IS NULL (default)
// Booking::withTrashed()->find(1) → includes deleted rows
// Booking::onlyTrashed()->get()   → only deleted rows

// Why soft deletes for bookings:
//   Legal requirement: payment records must be retained 7 years
//   Audit trail: cancellation reason, who cancelled, when
//   Restore accidentally cancelled bookings

// When NOT to use soft deletes:
//   High-churn tables (sessions, logs) — deleted_at column wastes space
//   If you want data truly gone (GDPR right to erasure) → hard delete + archive

// ============================================================
// Case 3: JSON columns — flexible attributes without schema changes
// ============================================================
$table->json('metadata')->nullable();  // bookings.metadata

// Store gateway-specific extras without polluting main schema:
$booking->metadata = [
    'stripe_customer_id' => 'cus_xxx',
    'risk_score'         => 45,
    'device'             => 'mobile',
];

// Query JSON columns in MySQL:
Booking::whereJsonContains('metadata->device', 'mobile')->get();
Booking::where('metadata->risk_score', '>', 50)->get();

// Index JSON virtual column for performance:
// ALTER TABLE bookings ADD COLUMN device VARCHAR(50)
//   GENERATED ALWAYS AS (JSON_UNQUOTE(metadata->'$.device')) STORED;
// ALTER TABLE bookings ADD INDEX idx_device (device);

// Trade-off:
//   JSON: flexible, schema-free additions
//   Normalized columns: type-safe, indexed efficiently, queryable without JSON functions
```

---

### Migrations best practices

```php
// ✅ Always reversible: down() method that perfectly undoes up()
public function up(): void
{
    Schema::table('bookings', function (Blueprint $table) {
        $table->string('pricing_type', 50)->default('standard')->after('payment_gateway');
    });
}

public function down(): void
{
    Schema::table('bookings', function (Blueprint $table) {
        $table->dropColumn('pricing_type');
    });
}

// ✅ Never modify existing migrations — create a new one
// ❌ Don't: edit old migration to add a column (breaks teams that already ran it)
// ✅ Do: php artisan make:migration add_pricing_type_to_bookings_table

// ✅ Zero-downtime migrations (large tables):
// Phase 1 (deploy): add nullable column
$table->string('new_column')->nullable();   // no default = instant on large tables

// Phase 2 (background job): backfill data
Booking::chunkById(1000, fn ($bookings) =>
    Booking::whereIn('id', $bookings->pluck('id'))->update(['new_column' => 'value'])
);

// Phase 3 (deploy): add NOT NULL constraint after backfill complete
$table->string('new_column')->nullable(false)->change();

// Phase 4: drop old column (separate deploy — safe to remove once all code updated)
$table->dropColumn('old_column');

// ✅ Foreign key constraints — always constrain + decide on cascade behaviour:
$table->foreignId('school_id')->constrained()->restrictOnDelete();
//   restrictOnDelete: prevent deleting school if it has bookings (default, safest)
//   cascadeOnDelete: delete bookings when school deleted (dangerous — think twice)
//   nullOnDelete:    set school_id = NULL when school deleted (use for optional FKs)
```

---

### Database transactions and locking

```php
// ✅ Transaction for multi-step operations — all succeed or all roll back
DB::transaction(function () use ($data) {
    $booking = Booking::create($data);

    Trip::where('id', $data['trip_id'])
        ->decrement('capacity_remaining', $data['student_count']);

    Payment::create([
        'booking_id' => $booking->id,
        'amount'     => $data['amount'],
        'status'     => 'pending',
    ]);

    event(new BookingCreated($booking));
    // If any step throws → entire transaction rolled back
});

// ✅ Optimistic locking — for low-contention updates
// Add version column:
$table->unsignedInteger('version')->default(0);

// Update only if version matches:
$updated = Trip::where('id', $tripId)
    ->where('version', $expectedVersion)
    ->update([
        'capacity_remaining' => DB::raw('capacity_remaining - ' . $count),
        'version'            => DB::raw('version + 1'),
    ]);

if ($updated === 0) {
    throw new StaleDataException('Trip was modified by another request — please retry');
}
// → No row lock held, better concurrency
// → Client must retry on StaleDataException

// ✅ Pessimistic locking — for high-contention or financial operations
DB::transaction(function () use ($bookingId, $amount) {
    $booking = Booking::lockForUpdate()->findOrFail($bookingId);
    // Row is locked — other transactions wait until this one commits
    if ($booking->status !== 'pending') {
        throw new InvalidStateException('Booking no longer pending');
    }
    $booking->update(['status' => 'paid', 'amount' => $amount]);
});

// lockForUpdate(): SELECT ... FOR UPDATE (write lock — others wait)
// sharedLock():   SELECT ... LOCK IN SHARE MODE (read lock — prevents writes)
```

---

### Reporting and analytics queries

```php
// Revenue by emirate — GROUP BY with JOIN
$revenue = DB::table('bookings')
    ->join('schools', 'bookings.school_id', '=', 'schools.id')
    ->select('schools.emirate', DB::raw('SUM(bookings.amount) as total_revenue'))
    ->where('bookings.status', 'paid')
    ->groupBy('schools.emirate')
    ->orderByDesc('total_revenue')
    ->get();

// Booking trend — aggregate by month
$trend = DB::table('bookings')
    ->select(
        DB::raw('YEAR(created_at) as year'),
        DB::raw('MONTH(created_at) as month'),
        DB::raw('COUNT(*) as count'),
        DB::raw('SUM(amount) as revenue'),
    )
    ->where('status', 'paid')
    ->groupBy('year', 'month')
    ->orderBy('year')
    ->orderBy('month')
    ->get();

// Top schools by revenue — HAVING for post-aggregate filter
$topSchools = DB::table('bookings')
    ->join('schools', 'bookings.school_id', '=', 'schools.id')
    ->select('schools.name', DB::raw('SUM(bookings.amount) as revenue'))
    ->where('bookings.status', 'paid')
    ->groupBy('schools.id', 'schools.name')
    ->having('revenue', '>', 10000)    // HAVING: filter after GROUP BY
    ->orderByDesc('revenue')
    ->limit(10)
    ->get();

// For complex reporting: consider separate read replica + MySQL views
// CREATE VIEW booking_monthly_summary AS
//   SELECT YEAR(created_at), MONTH(created_at), COUNT(*), SUM(amount) FROM bookings
//   WHERE status = 'paid' GROUP BY 1, 2;
// → View abstracts query complexity, indexed by created_at
```
