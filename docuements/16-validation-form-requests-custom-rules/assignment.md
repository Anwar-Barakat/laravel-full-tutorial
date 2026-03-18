# Advanced Validation

Master Form Requests with custom rules, conditional validation, and complex validation scenarios.

| Topic          | Details                              |
|----------------|--------------------------------------|
| Form Requests  | Authorize, rules, messages           |
| Custom Rules   | Rule objects, closures               |
| Conditional    | sometimes, required_if, when         |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Complex Booking Validation (Medium)

### Scenario

Build comprehensive validation for booking creation and updates: conditional rules based on booking type, custom rules for business logic, and proper error messages.

### Requirements

1. `StoreBookingRequest` with complex conditional rules
2. Custom rule: `AvailableSpotsRule` — checks destination capacity against `student_count`
3. Custom rule: `SchoolBookingLimitRule` — max 3 bookings per school per month
4. Use `sometimes` for optional fields
5. Use `required_if` for conditional requirements
6. Add `after()` hook for cross-field validation (e.g. trip_date not on a weekend)
7. Custom error messages in both English

### Expected Code

```php
// Complex validation
// POST /api/bookings
// {
//     school_id:       1,
//     destination_id:  5,
//     student_count:   45,         // must be <= destination capacity
//     trip_date:       "2026-06-15", // must be future, not a weekend
//     type:            "international",
//     passport_copies: [...]       // required only if type = international
// }

// Custom rule usage
'destination_id' => ['required', 'exists:destinations,id', new AvailableSpotsRule($request->student_count)],
'school_id'      => ['required', 'exists:schools,id',      new SchoolBookingLimitRule],
```

### What We're Evaluating

- Conditional validation rules (`required_if`, `sometimes`)
- Custom `Rule` objects
- Cross-field validation in `after()`
- Error message customization

---

## Problem 02 — Advanced Validation Patterns (Hard)

### Scenario

Build production-grade validation: reusable rule objects with constructor injection, array/nested validation, validation for file uploads, and a global validation macro.

### Requirements

1. `ValidTripDateRule` — implements `ValidationRule`, checks not weekend + not public holiday (from DB)
2. Validate nested array input: `passengers.*.name`, `passengers.*.passport_number` (unique per booking)
3. File upload validation: `passport_copies.*` — pdf/jpg, max 2MB, max 10 files
4. Extend `Validator` with a custom macro: `Rule::bookingDate()` as a fluent shortcut
5. `PrepareForValidation` — sanitize input before rules run (trim strings, normalize phone)
6. `passedValidation()` — transform data after validation passes (format date, cast types)
7. Global `failedValidation()` override — return `{ error: { code, message, errors } }` envelope

### Expected Code

```php
// Nested array validation
'passengers'                    => ['required', 'array', 'min:1'],
'passengers.*.name'             => ['required', 'string', 'max:255'],
'passengers.*.passport_number'  => ['required', 'distinct'],  // no duplicates in array

// File upload
'passport_copies'   => ['required', 'array', 'max:10'],
'passport_copies.*' => ['file', 'mimes:pdf,jpg,jpeg', 'max:2048'],

// Custom macro
'trip_date' => ['required', Rule::bookingDate()],

// prepareForValidation
protected function prepareForValidation(): void
{
    $this->merge([
        'phone' => preg_replace('/\s+/', '', $this->phone),
    ]);
}

// passedValidation — transform after rules pass
protected function passedValidation(): void
{
    $this->replace(['trip_date' => Carbon::parse($this->trip_date)->format('Y-m-d')]);
}
```

### What We're Evaluating

- `ValidationRule` interface (Laravel 10+ style)
- Nested array validation with `*` wildcard
- File upload rules
- Custom `Rule` macro
- `prepareForValidation` and `passedValidation` hooks
- Custom `failedValidation` for consistent error envelope
