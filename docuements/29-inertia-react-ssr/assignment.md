# Inertia.js with React & Laravel

Build a full-stack SPA for Tripz using Inertia.js — server-driven React pages, `useForm()`, shared data, lazy props, SSR, and feature tests with `assertInertia()`.

| Topic              | Details                                               |
|--------------------|-------------------------------------------------------|
| Core Inertia       | Inertia::render(), HandleInertiaRequests, useForm()   |
| Advanced Patterns  | Lazy props, partial reloads, persistent layouts       |
| SSR & Testing      | SSR setup, assertInertia(), withViewData for SEO      |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Core Inertia.js Setup & Features (Medium)

### Scenario

Wire up the Tripz bookings UI with Inertia.js. Controllers render Inertia responses instead of JSON or Blade. React pages consume props directly. Forms use `useForm()` so validation errors flow back automatically.

### Requirements

1. `HandleInertiaRequests` middleware shares `auth.user`, `flash`, and `can` permissions globally
2. `BookingController@index` — query, paginate, pass `bookings` + `filters` to `Bookings/Index` page
3. `BookingController@store` — validate, create inside `DB::transaction()`, redirect with flash
4. React `Bookings/Index` page — search form with `useForm()` + `get()` using `preserveState: true`
5. React `Bookings/Create` page — `useForm()` with `post()`, display per-field `errors`, disable button while `processing`
6. Use `withQueryString()` on the paginator so filter params survive pagination clicks
7. Inertia routes defined with `Route::inertia()` for static pages (e.g. `/about`)

### Expected Code

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return array_merge(parent::share($request), [
        'auth' => [
            'user' => $request->user()?->only('id', 'name', 'email', 'role'),
        ],
        'flash' => [
            'success' => $request->session()->get('success'),
            'error'   => $request->session()->get('error'),
        ],
        'can' => [
            'create_bookings' => $request->user()?->can('create', Booking::class),
        ],
    ]);
}

// app/Http/Controllers/BookingController.php  (index)
public function index(Request $request): \Inertia\Response
{
    $bookings = Booking::query()
        ->with(['school', 'trip'])
        ->when($request->search, fn($q, $s) => $q->where('reference', 'like', "%$s%"))
        ->when($request->status, fn($q, $s) => $q->where('status', $s))
        ->paginate(15)
        ->withQueryString();

    return Inertia::render('Bookings/Index', [
        'bookings' => BookingResource::collection($bookings),
        'filters'  => $request->only('search', 'status'),
    ]);
}

// app/Http/Controllers/BookingController.php  (store)
public function store(StoreBookingRequest $request): \Illuminate\Http\RedirectResponse
{
    $booking = DB::transaction(fn() => Booking::create($request->validated()));

    return redirect()->route('bookings.show', $booking)
        ->with('success', 'Booking created successfully.');
}
```

```jsx
// resources/js/Pages/Bookings/Index.jsx
import { Link, useForm } from '@inertiajs/react'

export default function BookingsIndex({ bookings, filters }) {
    const { data, setData, get } = useForm({ search: filters.search ?? '' })

    function search(e) {
        e.preventDefault()
        get(route('bookings.index'), { preserveState: true })
    }

    return (
        <div>
            <form onSubmit={search}>
                <input
                    value={data.search}
                    onChange={e => setData('search', e.target.value)}
                    placeholder="Search reference..."
                />
            </form>

            {bookings.data.map(booking => (
                <Link key={booking.id} href={route('bookings.show', booking.id)}>
                    {booking.reference}
                </Link>
            ))}
        </div>
    )
}
```

```jsx
// resources/js/Pages/Bookings/Create.jsx
import { useForm } from '@inertiajs/react'

export default function CreateBooking({ trips, schools }) {
    const { data, setData, post, processing, errors } = useForm({
        trip_id:       '',
        school_id:     '',
        student_count: '',
    })

    function submit(e) {
        e.preventDefault()
        post(route('bookings.store'))
    }

    return (
        <form onSubmit={submit}>
            <select value={data.trip_id} onChange={e => setData('trip_id', e.target.value)}>
                {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.trip_id && <p className="text-red-500">{errors.trip_id}</p>}

            <input
                type="number"
                value={data.student_count}
                onChange={e => setData('student_count', e.target.value)}
            />
            {errors.student_count && <p className="text-red-500">{errors.student_count}</p>}

            <button type="submit" disabled={processing}>
                {processing ? 'Creating…' : 'Create Booking'}
            </button>
        </form>
    )
}
```

### What We're Evaluating

- `HandleInertiaRequests::share()` for global data (auth, flash, permissions)
- `Inertia::render()` with paginated resource collections
- `withQueryString()` to persist filters across pages
- `useForm()` → `post()` / `get()` with per-field `errors` display
- `processing` flag to disable submit while in-flight
- `DB::transaction()` at the controller level for multi-step creates

---

## Problem 02 — SSR, Lazy Props & Feature Tests (Hard)

### Scenario

Harden the Inertia app for production: defer expensive data with lazy props, implement SSR for SEO, add persistent layouts so navigation state is preserved, and write feature tests using `assertInertia()`.

### Requirements

1. `Inertia::lazy()` on `BookingController@show` to defer `payments` and `timeline` props until explicitly requested
2. Partial reload on the frontend — `router.reload({ only: ['payments'] })` to fetch deferred data
3. `->withViewData(['title' => ...])` on Inertia responses for `<title>` and Open Graph meta
4. Persistent layout via `Page.layout` property — wraps every bookings page in `AppLayout` without re-mounting
5. SSR entry point at `resources/js/ssr.jsx` using `createInertiaApp` with `ReactDOMServer.renderToString`
6. Feature test: `assertInertia()` verifies component name, prop shape (`has`, `where`, `has('data', 3)`)
7. Feature test: partial reload test verifies only `payments` prop is returned when `X-Inertia-Partial-Data` header is sent

### Expected Code

```php
// app/Http/Controllers/BookingController.php  (show — lazy props)
public function show(Booking $booking): \Inertia\Response
{
    return Inertia::render('Bookings/Show', [
        'booking'  => BookingResource::make($booking->load('school', 'trip')),
        'payments' => Inertia::lazy(fn() => PaymentResource::collection($booking->payments)),
        'timeline' => Inertia::lazy(fn() => $booking->auditLogs()->latest()->get()),
    ])->withViewData([
        'title'       => "Booking {$booking->reference} | Tripz",
        'description' => "Trip to {$booking->trip->name} for {$booking->school->name}",
    ]);
}
```

```jsx
// resources/js/Pages/Bookings/Show.jsx  (persistent layout + partial reload)
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'

export default function BookingsShow({ booking, payments }) {
    function loadPayments() {
        router.reload({ only: ['payments'] })
    }

    return (
        <div>
            <h1>{booking.reference}</h1>
            <button onClick={loadPayments}>Load Payments</button>
            {payments && payments.data.map(p => <div key={p.id}>{p.amount}</div>)}
        </div>
    )
}

// Persistent layout — AppLayout is NOT re-mounted on navigation
BookingsShow.layout = page => <AppLayout title={page.props.booking.reference}>{page}</AppLayout>
```

```jsx
// resources/js/ssr.jsx  (SSR entry point)
import { createInertiaApp } from '@inertiajs/react'
import ReactDOMServer from 'react-dom/server'

export default createInertiaApp({
    page: global.page,
    render: ReactDOMServer.renderToString,
    resolve: name =>
        resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup: ({ App, props }) => <App {...props} />,
})
```

```php
// tests/Feature/BookingInertiaTest.php
use Inertia\Testing\AssertableInertia as Assert;

public function test_bookings_index_renders_correct_inertia_component(): void
{
    $user     = User::factory()->create();
    $bookings = Booking::factory(3)->for($user->school)->create();

    $this->actingAs($user)
        ->get(route('bookings.index'))
        ->assertInertia(fn(Assert $page) => $page
            ->component('Bookings/Index')
            ->has('bookings.data', 3)
            ->has('filters')
            ->has('filters.search')
        );
}

public function test_create_booking_redirects_with_flash_on_success(): void
{
    $user = User::factory()->create();
    $trip = Trip::factory()->create();

    $this->actingAs($user)
        ->post(route('bookings.store'), [
            'trip_id'       => $trip->id,
            'school_id'     => $user->school_id,
            'student_count' => 10,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
}

public function test_partial_reload_returns_only_requested_prop(): void
{
    $user    = User::factory()->create();
    $booking = Booking::factory()->create();

    $this->actingAs($user)
        ->get(route('bookings.show', $booking), [
            'X-Inertia'              => 'true',
            'X-Inertia-Partial-Data' => 'payments',
            'X-Inertia-Partial-Component' => 'Bookings/Show',
        ])
        ->assertJsonFragment(['component' => 'Bookings/Show'])
        ->assertJsonMissingPath('props.timeline');   // lazy, not requested
}
```

### What We're Evaluating

- `Inertia::lazy()` — prop is evaluated only when explicitly requested via partial reload
- `->withViewData()` for `<title>` tag and SEO meta (not passed as Inertia props)
- Persistent layout via `Page.layout` — component survives navigation, state is preserved
- SSR entry (`ssr.jsx`) using `ReactDOMServer.renderToString`
- `assertInertia()` with `->component()`, `->has()`, `->where()` fluent assertions
- Partial reload header pattern (`X-Inertia-Partial-Data`)
