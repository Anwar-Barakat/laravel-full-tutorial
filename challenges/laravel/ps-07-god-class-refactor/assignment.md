# Challenge 07 — God Class Refactor

**Format:** REFACTOR
**Topic:** Refactor a god controller into service layer + action classes
**App:** Tripz — Laravel school booking platform

---

## Context

The Tripz booking feature launched fast. The `BookingController::store()` method works — but it has grown to handle validation, capacity checks, persistence, emails, notifications, events, and logging all in one place.

The team is now unable to:
- Unit test the booking creation logic without making HTTP requests
- Reuse the "create booking" logic from a CLI command or a queue job
- Change the email sending without touching the controller
- Understand what `store()` does without reading all 60+ lines

This violates the **Single Responsibility Principle**. Your job is to decompose this god method into a clean, testable architecture.

---

## Starter Code (god controller — do not leave it like this)

```php
<?php
// app/Http/Controllers/BookingController.php

class BookingController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validate
        $validated = $request->validate([
            'trip_id'       => 'required|exists:trips,id',
            'school_id'     => 'required|exists:schools,id',
            'student_count' => 'required|integer|min:1',
            'contact_email' => 'required|email',
        ]);

        // 2. Check trip capacity
        $trip = Trip::find($validated['trip_id']);
        $existingCount = Booking::where('trip_id', $trip->id)
            ->where('status', '!=', 'cancelled')
            ->sum('student_count');

        if ($existingCount + $validated['student_count'] > $trip->max_capacity) {
            return response()->json(['error' => 'Trip is fully booked'], 422);
        }

        // 3. Create booking
        $booking = Booking::create([
            ...$validated,
            'status'    => 'pending',
            'reference' => 'TRP-' . strtoupper(Str::random(8)),
        ]);

        // 4. Send confirmation email
        Mail::to($validated['contact_email'])->send(new BookingConfirmationMail($booking));

        // 5. Notify admin
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new NewBookingNotification($booking));
        }

        // 6. Fire event
        event(new BookingCreated($booking));

        // 7. Log
        Log::info('Booking created', [
            'booking_id' => $booking->id,
            'school_id'  => $booking->school_id,
        ]);

        return response()->json(new BookingResource($booking), 201);
    }
}
```

---

## Your Task

Refactor the code above into the following structure. Each class should have **one clear reason to change**.

### Target Architecture

```
app/
├── Http/
│   ├── Controllers/
│   │   └── BookingController.php     ← thin: 3-5 lines in store()
│   └── Requests/
│       └── CreateBookingRequest.php  ← all validation rules live here
├── Actions/
│   └── CreateBookingAction.php       ← creates the Booking record only
└── Services/
    └── BookingService.php            ← orchestrates action + mail + notify + event + log
```

### Requirements

1. **`CreateBookingRequest`** (FormRequest)
   - Move all validation rules out of the controller
   - Authorization logic: only `school_admin` and `admin` may submit this form

2. **`CreateBookingAction`**
   - Accepts the validated data array
   - Responsible for: capacity check, booking creation, generating the reference
   - Throws a domain exception (e.g., `BookingCapacityException`) if the trip is full
   - Returns the created `Booking` model

3. **`BookingService`**
   - Has a `create(array $data): Booking` method
   - Calls `CreateBookingAction`
   - Handles the side effects: mail, notifications, event, log
   - Does NOT know about HTTP — no `Request`, no `response()`

4. **`BookingController::store()`**
   - 3 to 5 lines maximum
   - Inject `BookingService` via constructor
   - Accept `CreateBookingRequest` (replaces `Request`)
   - Catch `BookingCapacityException` and return a 422 response

---

## Expected Structure After Refactor

```php
// Controller — thin shell, nothing else
class BookingController extends Controller
{
    public function __construct(private BookingService $bookingService) {}

    public function store(CreateBookingRequest $request)
    {
        // 3-5 lines — delegate to service, return resource response
    }
}

// FormRequest — owns validation
class CreateBookingRequest extends FormRequest
{
    // authorize(): check role
    // rules(): return validation array
}

// Action — pure booking creation, no side effects
class CreateBookingAction
{
    public function execute(array $data): Booking
    {
        // capacity check → throw exception if full
        // create booking record
        // return Booking
    }
}

// Service — orchestration only
class BookingService
{
    public function __construct(private CreateBookingAction $action) {}

    public function create(array $data): Booking
    {
        // call action
        // fire side effects
        // return booking
    }
}
```

---

## Constraints

- Do not change the observable API behaviour — the response shape must remain the same
- `CreateBookingAction` must be independently testable without booting the HTTP kernel
- `BookingService` must be independently testable by mocking `CreateBookingAction`
- The booking reference generation (`TRP-XXXXXXXX`) can live in the Action or the Booking model — justify your choice
- No static calls (`Mail::`, `Log::`, `event()`) in the controller
