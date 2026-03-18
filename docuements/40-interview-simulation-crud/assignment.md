# Complete API Build — Interview Simulation

Build a complete `Destination` CRUD API from zero in 25 minutes: migration → model → form request → resource → controller → test. This replicates the exact exercise interviewers give in take-home or live coding rounds.

| Phase          | Minutes | Deliverable                                      |
|----------------|---------|--------------------------------------------------|
| Migration      | 0 – 3   | `destinations` table with all columns + indexes  |
| Model          | 3 – 7   | `$fillable`, `$casts`, scopes, relationships      |
| Form Request   | 7 – 10  | Validation rules + `authorize()`                 |
| Resource       | 10 – 13 | `DestinationResource` with computed field        |
| Controller     | 13 – 20 | `index` (filterable), `store`, `show`, `update`, `destroy` |
| Routes + Test  | 20 – 23 | `api.php` + one passing feature test             |
| Review         | 23 – 25 | Fix typos, missing `use` statements, test passes |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Destination CRUD API (Medium)

### Scenario

Build a complete REST API for trip `Destination` entities. Destinations have a maximum student capacity and can be filtered by city and active status. Prioritise **working code** over perfection — a controller with one missing `authorize()` call scores higher than a perfectly planned but incomplete feature.

### Requirements

1. Migration — `destinations` table: `name`, `description` (nullable), `city`, `max_capacity` (int), `price_per_student` (decimal 10,2), `is_active` (bool, default true), `image_url` (nullable), `softDeletes`; composite index on `(city, is_active)`
2. `Destination` model — `$fillable`, `$casts` (boolean, decimal, integer), `scopeActive()`, `scopeInCity(string $city)`
3. `StoreDestinationRequest` — `authorize()` via `$this->user()->can('create', Destination::class)`; rules for all fields
4. `DestinationResource` — all columns + `price_formatted` (`AED x,xxx`) + `links.self`
5. `DestinationController@index` — filter by `?city=` and `?active=` using `when()`; `paginate(15)->withQueryString()`
6. `DestinationController@store` — `201 Created` + `Location` header
7. `DestinationController@destroy` — `204 No Content` via `response()->noContent()`
8. Feature test — `POST /api/destinations` with valid data → assert 201, `assertDatabaseHas`, `assertHeader('Location')`

### Expected Code

```php
// database/migrations/xxxx_create_destinations_table.php
Schema::create('destinations', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->text('description')->nullable();
    $table->string('city');
    $table->unsignedInteger('max_capacity');
    $table->decimal('price_per_student', 10, 2);
    $table->boolean('is_active')->default(true);
    $table->string('image_url')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['city', 'is_active']); // covers common filter query
});
```

```php
// app/Models/Destination.php
class Destination extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'description', 'city',
        'max_capacity', 'price_per_student', 'is_active', 'image_url',
    ];

    protected $casts = [
        'max_capacity'      => 'integer',
        'price_per_student' => 'decimal:2',
        'is_active'         => 'boolean',
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeInCity(Builder $query, string $city): Builder
    {
        return $query->where('city', $city);
    }
}
```

```php
// app/Http/Requests/StoreDestinationRequest.php
class StoreDestinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Destination::class);
    }

    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string'],
            'city'              => ['required', 'string', 'max:100'],
            'max_capacity'      => ['required', 'integer', 'min:1', 'max:1000'],
            'price_per_student' => ['required', 'numeric', 'min:0'],
            'is_active'         => ['boolean'],
            'image_url'         => ['nullable', 'url', 'max:500'],
        ];
    }
}
```

```php
// app/Http/Resources/DestinationResource.php
class DestinationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'description'       => $this->description,
            'city'              => $this->city,
            'max_capacity'      => $this->max_capacity,
            'price_per_student' => $this->price_per_student,
            'price_formatted'   => 'AED ' . number_format($this->price_per_student, 2),
            'is_active'         => $this->is_active,
            'image_url'         => $this->image_url,
            'created_at'        => $this->created_at->toIso8601String(),
            'links' => [
                'self' => route('api.destinations.show', $this->id),
            ],
        ];
    }
}
```

```php
// app/Http/Controllers/Api/DestinationController.php
class DestinationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $destinations = Destination::query()
            ->when($request->city,           fn($q, $c) => $q->inCity($c))
            ->when($request->has('active'),  fn($q)     => $q->where('is_active', $request->boolean('active')))
            ->when(!$request->has('active'), fn($q)     => $q->active()) // default: active only
            ->paginate(15)
            ->withQueryString();

        return DestinationResource::collection($destinations);
    }

    public function store(StoreDestinationRequest $request): JsonResponse
    {
        $destination = Destination::create($request->validated());

        return DestinationResource::make($destination)
            ->response()
            ->setStatusCode(201)
            ->header('Location', route('api.destinations.show', $destination));
    }

    public function show(Destination $destination): DestinationResource
    {
        return DestinationResource::make($destination);
    }

    public function update(UpdateDestinationRequest $request, Destination $destination): DestinationResource
    {
        $this->authorize('update', $destination);
        $destination->update($request->validated());
        return DestinationResource::make($destination->fresh());
    }

    public function destroy(Destination $destination): \Illuminate\Http\Response
    {
        $this->authorize('delete', $destination);
        $destination->delete();
        return response()->noContent();
    }
}

// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('destinations', DestinationController::class);
});
```

```php
// tests/Feature/DestinationApiTest.php
public function test_store_destination_returns_201_with_location_header(): void
{
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin, 'sanctum')
        ->postJson(route('api.destinations.store'), [
            'name'              => 'Dubai Museum of the Future',
            'city'              => 'Dubai',
            'max_capacity'      => 100,
            'price_per_student' => 150.00,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Dubai Museum of the Future')
        ->assertJsonPath('data.city', 'Dubai')
        ->assertJsonPath('data.price_formatted', 'AED 150.00')
        ->assertHeader('Location');

    $this->assertDatabaseHas('destinations', ['name' => 'Dubai Museum of the Future']);
}

public function test_index_filters_by_city(): void
{
    Destination::factory()->create(['city' => 'Dubai', 'is_active' => true]);
    Destination::factory()->create(['city' => 'Abu Dhabi', 'is_active' => true]);

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson(route('api.destinations.index') . '?city=Dubai')
        ->assertOk()
        ->assertJsonCount(1, 'data');
}
```

### What We're Evaluating

- Complete feature in 25 minutes — prioritise breadth over depth
- Composite index `(city, is_active)` — covers the default filter query exactly
- `$casts` — `boolean` for `is_active`, `decimal:2` for price (not `float`)
- `when()` — conditional query building without if/else branches
- `201 + Location` on `store()`, `204` on `destroy()`
- `SoftDeletes` — `delete()` sets `deleted_at`, not hard deletes

---

## Problem 02 — Availability Business Logic (Hard)

### Scenario

With the CRUD running, add capacity enforcement: a `checkAvailability()` model method, a `withAvailability()` scope that adds `available_spots` via subquery, and prevent booking if a destination is at capacity.

### Requirements

1. `Destination::checkAvailability(int $studentCount): bool` — sums non-cancelled `student_count` from `bookings`, returns `true` if `(booked + $studentCount) <= max_capacity`
2. `scopeWithAvailability(Builder $query)` — `addSelect` a subquery for `booked_students`; `available_spots` in the resource reads `max_capacity - booked_students`
3. `DestinationResource` — include `available_spots` via `$this->when(isset($this->booked_students), ...)`
4. `DestinationController@index` — chain `->withAvailability()` so `available_spots` appears in the listing
5. Feature test — destination at capacity (50/50 booked) → `checkAvailability(1)` returns `false`
6. Feature test — destination with room → `checkAvailability(10)` returns `true`

### Expected Code

```php
// app/Models/Destination.php  (additional methods)

public function scopeWithAvailability(Builder $query): Builder
{
    return $query->addSelect([
        'booked_students' => Booking::selectRaw('COALESCE(SUM(student_count), 0)')
            ->whereColumn('destination_id', 'destinations.id')
            ->whereNotIn('status', [BookingStatus::CANCELLED, BookingStatus::EXPIRED]),
    ]);
}

public function checkAvailability(int $studentCount): bool
{
    $booked = $this->bookings()
        ->whereNotIn('status', [BookingStatus::CANCELLED, BookingStatus::EXPIRED])
        ->sum('student_count');

    return ($booked + $studentCount) <= $this->max_capacity;
}
```

```php
// app/Http/Resources/DestinationResource.php  (available_spots field)
'available_spots' => $this->when(
    isset($this->booked_students),
    fn() => max(0, $this->max_capacity - (int) $this->booked_students)
),
```

```php
// app/Http/Controllers/Api/DestinationController.php  (index with availability)
public function index(Request $request): AnonymousResourceCollection
{
    $destinations = Destination::query()
        ->when($request->city,           fn($q, $c) => $q->inCity($c))
        ->when(!$request->has('active'), fn($q)     => $q->active())
        ->withAvailability()   // adds booked_students subquery
        ->paginate(15)
        ->withQueryString();

    return DestinationResource::collection($destinations);
}
```

```php
// tests/Feature/DestinationAvailabilityTest.php
public function test_check_availability_returns_false_when_at_capacity(): void
{
    $destination = Destination::factory()->create(['max_capacity' => 50]);

    Booking::factory()->create([
        'destination_id' => $destination->id,
        'student_count'  => 50,
        'status'         => BookingStatus::CONFIRMED,
    ]);

    $this->assertFalse($destination->checkAvailability(1));
    $this->assertTrue($destination->checkAvailability(0));
}

public function test_check_availability_ignores_cancelled_bookings(): void
{
    $destination = Destination::factory()->create(['max_capacity' => 50]);

    Booking::factory()->create([
        'destination_id' => $destination->id,
        'student_count'  => 50,
        'status'         => BookingStatus::CANCELLED, // should not count
    ]);

    $this->assertTrue($destination->checkAvailability(50)); // full capacity still free
}

public function test_index_includes_available_spots_in_response(): void
{
    $destination = Destination::factory()->create(['max_capacity' => 100]);
    Booking::factory()->create([
        'destination_id' => $destination->id,
        'student_count'  => 30,
        'status'         => BookingStatus::CONFIRMED,
    ]);

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson(route('api.destinations.index'))
        ->assertOk()
        ->assertJsonPath('data.0.available_spots', 70);
}
```

### What We're Evaluating

- `addSelect` subquery — `available_spots` in one query, not N+1
- `COALESCE(SUM(...), 0)` — handles destinations with zero bookings (returns 0 not null)
- `whereNotIn('status', [...])` — excludes multiple terminal statuses, not just `cancelled`
- `$this->when(isset($this->booked_students), ...)` — field absent unless scope was applied
- Cancelled bookings do **not** count against capacity (test explicitly verifies this)
