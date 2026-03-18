# Action Classes & Pipeline Pattern

Use single-action classes and Laravel Pipeline for clean, testable business logic.

| Topic          | Details                              |
|----------------|--------------------------------------|
| Action Classes | Single-purpose invokable classes     |
| Pipeline       | Sequential processing steps          |
| Testability    | Easy to unit test                    |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — CreateBookingAction (Medium)

### Scenario

Refactor complex booking creation from a fat controller into a single-action class, then chain multiple actions using Laravel's Pipeline.

### Requirements

1. `CreateBookingAction` — invokable class with `__invoke()`
2. `ValidateAvailabilityAction`, `CalculatePricingAction`, `SendNotificationsAction`
3. `BookingData` DTO — carries data through the pipeline
4. Chain actions via `app(Pipeline::class)->send()->through()->thenReturn()`
5. Each action receives the DTO, modifies it, and passes it to the next
6. Actions are independently unit-testable
7. Thin controller: delegates entirely to the pipeline

### Expected Code

```php
// Single action — called directly
$booking = app(CreateBookingAction::class)($validated);

// Pipeline — multi-step processing
$result = app(Pipeline::class)
    ->send(new BookingData($request->validated()))
    ->through([
        ValidateAvailabilityAction::class,
        CalculatePricingAction::class,
        CreateBookingAction::class,
        SendNotificationsAction::class,
    ])
    ->thenReturn();

// Thin controller
public function store(StoreBookingRequest $request)
{
    $booking = app(Pipeline::class)
        ->send(new BookingData($request->validated()))
        ->through([...])
        ->thenReturn();

    return BookingResource::make($booking);
}
```

### What We're Evaluating

- Action class pattern with `__invoke()`
- `BookingData` DTO
- Pipeline chaining with `send → through → thenReturn`
- Each pipe receives `($data, $next)` and calls `$next($data)`
- Thin controller delegating to pipeline

---

## Problem 02 — Advanced Pipeline Patterns (Hard)

### Scenario

Extend Problem 01 with production-grade patterns: conditional pipeline steps, transaction-wrapped pipeline, rollback on failure, and comprehensive unit testing of each pipe.

### Requirements

1. Wrap the entire pipeline in `DB::transaction()` — if any action throws, everything rolls back
2. Conditional pipe: only run `SendNotificationsAction` if `BookingData->sendNotifications === true`
3. `BookingData` DTO is immutable — each pipe returns a new instance (no mutation)
4. Pipeline with early termination: `ValidateAvailabilityAction` short-circuits and returns a failure response without running later pipes
5. Test each action in **isolation** — no pipeline needed in unit tests
6. `CancelBookingPipeline` — a second pipeline with `ValidateCancellationAction`, `ProcessRefundAction`, `UpdateStatusAction`, `NotifyCancellationAction`

### Expected Code

```php
// Transaction-wrapped pipeline
$booking = DB::transaction(fn() =>
    app(Pipeline::class)
        ->send(new BookingData($request->validated()))
        ->through([
            ValidateAvailabilityAction::class,
            CalculatePricingAction::class,
            CreateBookingAction::class,
        ])
        ->thenReturn()
);

// Conditional pipe — skip if flag not set
class SendNotificationsAction
{
    public function __invoke(BookingData $data, Closure $next)
    {
        if ($data->sendNotifications) {
            // send...
        }
        return $next($data);  // always call $next to continue the pipeline
    }
}

// Immutable DTO — each pipe returns new instance
class CalculatePricingAction
{
    public function __invoke(BookingData $data, Closure $next)
    {
        return $next($data->with(amount: $data->studentCount * $data->pricePerStudent));
    }
}

// Unit test a single action in isolation
public function test_calculate_pricing_sets_correct_amount(): void
{
    $data   = new BookingData(studentCount: 10, pricePerStudent: 500);
    $action = new CalculatePricingAction();
    $result = $action($data, fn($d) => $d);  // mock $next as identity function
    $this->assertEquals(5000, $result->amount);
}
```

### What We're Evaluating

- `DB::transaction()` wrapping the full pipeline
- Conditional pipe execution
- Immutable DTO with `with()` method
- Pipeline early termination
- Unit testing individual pipes with a mock `$next`
- Second pipeline for cancellation flow
