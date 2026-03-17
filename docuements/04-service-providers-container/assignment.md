# Service Providers & Container Bindings

Bind interfaces to implementations, swap gateways via config, and wire up the service container the Laravel way.

| Topic                  | Details                                      |
|------------------------|----------------------------------------------|
| Service Providers      | register() vs boot(), singleton binding      |
| Interface Binding      | Config-driven, contextual binding            |
| Repository Pattern     | Interface → Eloquent → Cached decorator      |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first

---

## Problem 01 — Payment Service Provider (Medium)

### Scenario

Create a Service Provider that registers payment gateway bindings. 
The application should be able to swap between Stripe and Mamo Pay without changing any controller code — just configuration.

### Requirements

1. `PaymentGatewayInterface` with `charge()`, `refund()`
2. `StripeGateway` and `MamoPayGateway` implementations
3. `PaymentServiceProvider` that binds interface to implementation based on config
4. Use `config('payment.default')` to determine which gateway
5. Bind as singleton (same instance throughout request)
6. Register a `PaymentService` that receives the gateway via DI
7. Support contextual binding: `BookingController` gets Stripe, `RefundController` gets MamoPay

### Expected Code

```php
// config/payment.php
return [
    'default' => env('PAYMENT_GATEWAY', 'stripe'),
    'gateways' => [
        'stripe'  => ['secret' => env('STRIPE_SECRET')],
        'mamopay' => ['api_key' => env('MAMOPAY_API_KEY')],
    ],
];

// In any controller — just type-hint the interface
class BookingController extends Controller
{
    public function __construct(
        private PaymentGatewayInterface $payment
    ) {}

    public function pay(Booking $booking)
    {
        $result = $this->payment->charge($booking->amount, 'AED');
    }
}
```

### What We're Evaluating

- Service Provider `register()` vs `boot()`
- Interface-to-concrete binding
- Config-driven implementation selection
- Singleton binding
- Contextual binding

---

## Problem 02 — Custom Service with Repository Pattern (Hard)

### Scenario

Build a Service + Repository layer in Laravel: the Service handles business logic, 
the Repository handles data access, and both are registered in the container with proper binding.

### Requirements

1. `BookingRepositoryInterface` with standard CRUD + custom query methods
2. `EloquentBookingRepository` implementing the interface
3. ``BookingService`` containing business logic (not in controllers!)
4. Service Provider binding interface → Eloquent implementation
5. Controller uses Service (not Repository directly)
6. Support swapping to a Cache-decorated repository
7. Write a `CachedBookingRepository` decorator

### Expected Code

```php
// Controller is thin — delegates to service
class BookingController extends Controller
{
    public function __construct(private BookingService $service) {}

    public function store(StoreBookingRequest $request)
    {
        $booking = $this->service->createBooking($request->validated());
        return BookingResource::make($booking);
    }
}

// Service contains business logic
$service->createBooking($data);    // validates business rules, creates, dispatches events
$service->cancelBooking($booking); // checks cancellation policy, processes refund
```

### What We're Evaluating

- Repository pattern in Laravel
- Service layer for business logic
- Container binding with decorator
- Thin controllers, fat services
