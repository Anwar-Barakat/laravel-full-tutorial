# VUE_TEST_08 — Inertia.js + Vue + Laravel Bridge

**Time:** 30 minutes | **Stack:** Vue 3 · TypeScript · Inertia.js · Laravel

---

## Setup

Inertia.js is not an API layer — it is a protocol that lets Laravel controllers
render Vue page components directly, passing server data as props. There is no
separate REST API and no client-side routing config: Laravel owns routing,
Vue owns rendering.

The Tripz booking platform uses Laravel + Inertia + Vue 3. Controllers return
`Inertia::render(...)`, Vue page components receive props via `defineProps`, and
`useForm()` / `usePage()` from `@inertiajs/vue3` handle form state and shared
data respectively.

### Types

```typescript
// types/inertia.ts

export interface User {
  id:    number
  name:  string
  email: string
  role:  'admin' | 'school_admin' | 'parent'
}

export interface Booking {
  id:           number
  school_name:  string
  trip_id:      number
  student_count: number
  status:       'pending' | 'confirmed' | 'paid' | 'cancelled'
  created_at:   string
}

export interface Trip {
  id:          number
  destination: string
  departure_date: string
  price_per_student: number
  max_capacity: number
}

export interface Flash {
  success: string | null
  error:   string | null
}

// Shared data shape — available on every page via usePage()
export interface SharedProps {
  auth: {
    user: User | null
  }
  flash: Flash
  can: {
    createBooking: boolean
    manageTrips:   boolean
  }
}

// Per-page props — typed individually per page component
export interface BookingsIndexProps {
  bookings: Booking[]
  total:    number
}

export interface CreateBookingProps {
  trips: Trip[]
}
```

---

## Problem 01 — Inertia Page Components & usePage()

### 1a. How Inertia delivers server data to Vue

The flow replaces the traditional API fetch:

```
Traditional SPA:
  Browser → GET /bookings → Laravel returns HTML shell
  Vue mounts → fetch('/api/v1/bookings') → JSON response → update state

Inertia:
  Browser → GET /bookings → Laravel controller calls Inertia::render()
  Inertia serialises props to JSON → injects into page as initial payload
  Vue mounts → page component already has bookings in defineProps
  Subsequent navigations → XHR with X-Inertia header → JSON only (no full HTML)
```

Laravel controller:

```php
// app/Http/Controllers/BookingController.php

public function index(): \Inertia\Response
{
    return Inertia::render('Bookings/Index', [
        'bookings' => BookingResource::collection(
            Booking::with('trip')->forUser(auth()->user())->paginate(15)
        ),
        'total' => Booking::forUser(auth()->user())->count(),
    ]);
}

public function create(): \Inertia\Response
{
    return Inertia::render('Bookings/Create', [
        'trips' => Trip::published()->get(['id', 'destination', 'departure_date']),
    ]);
}
```

### 1b. Vue page component — receiving props with defineProps

```vue
<!-- resources/js/Pages/Bookings/Index.vue -->
<script setup lang="ts">
import type { Booking } from '@/types/inertia'

// Props are injected by Inertia from the controller's second argument
// Naming must match the snake_case keys returned by Laravel exactly
const props = defineProps<{
  bookings: Booking[]
  total:    number
}>()
// ← props.bookings is already populated — no onMounted fetch required
// ← if the controller sends paginated data, bookings is a LengthAwarePaginator
//   resource shape: { data: Booking[], links: {...}, meta: { total, per_page, ... } }
</script>

<template>
  <div>
    <h1>Bookings ({{ props.total }})</h1>
    <ul>
      <li v-for="booking in props.bookings" :key="booking.id">
        {{ booking.school_name }} — {{ booking.status }}
      </li>
    </ul>
  </div>
</template>
```

### 1c. usePage() — accessing shared props and page metadata

```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed }  from 'vue'
import type { SharedProps } from '@/types/inertia'

// usePage() returns the reactive Inertia page object
// page.props contains BOTH the page-specific props AND the shared props
// (merged by Inertia — shared data from HandleInertiaRequests lives here)
const page = usePage<SharedProps>()

// Access shared auth user (set in HandleInertiaRequests middleware)
const user = computed(() => page.props.auth.user)

// Access flash messages injected on redirect
const flash = computed(() => page.props.flash)

// Access can-permissions
const canCreateBooking = computed(() => page.props.can.createBooking)

// page.component — name of the current page component ('Bookings/Index')
// page.url       — current URL string ('/bookings')
// page.version   — asset version for cache-busting
</script>

<template>
  <div>
    <p v-if="flash.success" class="bg-green-100 text-green-800 p-3 rounded">
      {{ flash.success }}
    </p>
    <p v-if="flash.error" class="bg-red-100 text-red-800 p-3 rounded">
      {{ flash.error }}
    </p>

    <nav>
      <span>Logged in as: {{ user?.name }}</span>
      <Link v-if="canCreateBooking" href="/bookings/create">New Booking</Link>
    </nav>
  </div>
</template>
```

### 1d. TypeScript typing for page props

```typescript
// Augment Inertia's PageProps to type usePage() globally
// Place in resources/js/types/inertia.d.ts

import type { SharedProps } from './inertia'

declare module '@inertiajs/vue3' {
  interface PageProps extends SharedProps {}
}

// Now usePage() is typed without passing the generic every time:
// const page = usePage()
// page.props.auth.user  ← typed as User | null automatically
```

---

## Problem 02 — Shared Data via HandleInertiaRequests

### 2a. The middleware — what it does

`HandleInertiaRequests` runs on every Inertia request. Its `share()` method
returns an array merged into every page's props. This is where auth state,
flash messages, and permission flags live — avoiding repetition in every
controller.

```php
// app/Http/Middleware/HandleInertiaRequests.php

class HandleInertiaRequests extends Middleware
{
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id'    => $request->user()->id,
                    'name'  => $request->user()->name,
                    'email' => $request->user()->email,
                    'role'  => $request->user()->role,
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'can' => [
                'createBooking' => $request->user()?->can('create', Booking::class) ?? false,
                'manageTrips'   => $request->user()?->hasRole('admin') ?? false,
            ],
        ]);
    }
}
```

### 2b. Using shared data in components

```vue
<script setup lang="ts">
import { usePage }  from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()

// Shared props are always present — no need to pass them per-controller
const user            = computed(() => page.props.auth.user)
const successMessage  = computed(() => page.props.flash.success)
const canManageTrips  = computed(() => page.props.can.manageTrips)
</script>
```

---

## Problem 03 — useForm()

### 3a. Form state and structure

`useForm()` from `@inertiajs/vue3` replaces manual `ref`/`reactive` form
management. It handles HTTP submission, loading state, server-side validation
errors, and reset — all without a separate API call.

```vue
<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import type { Trip } from '@/types/inertia'

const props = defineProps<{ trips: Trip[] }>()

// useForm() takes the initial field values
const form = useForm({
  school_name:   '',
  contact_email: '',
  trip_id:       null as number | null,
  student_count: 1,
  notes:         '',
})

// form.data()           — plain object of current field values
// form.errors           — object keyed by field name, values from Laravel validation
// form.processing       — true while the XHR is in flight
// form.recentlySuccessful — true for ~2s after a successful submission
// form.isDirty          — true if any field differs from initial values
// form.wasSuccessful    — true after any successful submission (stays true)
</script>
```

### 3b. Submitting — post, put, delete

```vue
<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'

const form = useForm({
  school_name:   '',
  contact_email: '',
  trip_id:       null as number | null,
  student_count: 1,
})

// POST — create resource
function submit() {
  form.post('/bookings', {
    onSuccess: () => form.reset(),           // clear form after success
    onError:   () => console.log(form.errors), // errors auto-populated
    onFinish:  () => console.log('done'),    // fires whether success or error
  })
}

// PUT — update resource (Inertia uses method spoofing under the hood)
function update(id: number) {
  form.put(`/bookings/${id}`, {
    preserveScroll: true,                    // keep scroll position on success
  })
}

// PATCH — partial update
function patch(id: number) {
  form.patch(`/bookings/${id}`)
}

// DELETE
function destroy(id: number) {
  form.delete(`/bookings/${id}`, {
    onSuccess: () => router.visit('/bookings'),
  })
}
</script>
```

### 3c. Server-side validation errors — automatic population

When Laravel returns a 422 validation response, Inertia populates `form.errors`
automatically. No manual JSON parsing required.

```php
// Laravel controller — validation failure automatically becomes form.errors
public function store(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'school_name'   => 'required|string|min:3',
        'contact_email' => 'required|email',
        'trip_id'       => 'required|exists:trips,id',
        'student_count' => 'required|integer|min:1|max:200',
    ]);

    Booking::create($validated + ['user_id' => auth()->id()]);

    return redirect()->route('bookings.index')->with('success', 'Booking created.');
}
```

```vue
<template>
  <form @submit.prevent="submit">

    <div>
      <input v-model="form.school_name" type="text" placeholder="School name" />
      <!-- form.errors.school_name is set automatically by Inertia on 422 response -->
      <p v-if="form.errors.school_name" class="text-red-500 text-sm">
        {{ form.errors.school_name }}
      </p>
    </div>

    <div>
      <input v-model="form.contact_email" type="email" placeholder="Email" />
      <p v-if="form.errors.contact_email" class="text-red-500 text-sm">
        {{ form.errors.contact_email }}
      </p>
    </div>

    <select v-model="form.trip_id">
      <option :value="null" disabled>Select a trip</option>
      <option v-for="trip in props.trips" :key="trip.id" :value="trip.id">
        {{ trip.destination }}
      </option>
    </select>
    <p v-if="form.errors.trip_id" class="text-red-500 text-sm">
      {{ form.errors.trip_id }}
    </p>

    <button type="submit" :disabled="form.processing">
      {{ form.processing ? 'Submitting...' : 'Create Booking' }}
    </button>

    <p v-if="form.recentlySuccessful" class="text-green-600">
      Booking saved successfully.
    </p>

  </form>
</template>
```

### 3d. form.reset(), form.setError(), form.clearErrors()

```typescript
// reset() — resets all or specific fields to their initial values
form.reset()                             // all fields
form.reset('school_name', 'notes')       // only these two fields

// setError() — manually add a validation error (e.g. from a custom check)
form.setError('trip_id', 'This trip is now fully booked.')

// setError with object — set multiple errors at once
form.setError({
  school_name: 'Name already registered for this trip.',
  trip_id:     'Trip no longer available.',
})

// clearErrors() — remove all or specific errors
form.clearErrors()                       // remove all
form.clearErrors('school_name')          // remove one field's error

// hasErrors — true if any field has a validation error
if (form.hasErrors) {
  console.log('Fix errors before submitting')
}
```

### 3e. transform() — modify data before sending

`transform()` returns a new form wrapper whose data is modified before the HTTP
request is made. The original `form` state is not mutated.

```typescript
const form = useForm({
  school_name:   '',
  student_count: 1,
  trip_id:       null as number | null,
  departure_date: '',
})

function submit() {
  form
    .transform((data) => ({
      ...data,
      school_name:    data.school_name.trim().toUpperCase(),
      // Add a computed field not tracked by the form itself
      booking_ref:    `TRP-${Date.now()}`,
      // Remove a field from the payload
      departure_date: undefined,
    }))
    .post('/bookings')
}
// ← form.school_name still holds the original value in the UI
// ← transform() only affects what is sent over the wire
```

---

## Problem 04 — The Link Component & Programmatic Navigation

### 4a. Link component — SPA navigation without page reload

`<Link>` intercepts clicks and makes an XHR request instead of a full browser
navigation. Laravel still handles routing; Inertia swaps the page component.

```vue
<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
</script>

<template>
  <!-- Basic navigation — replaces <a href="/bookings"> -->
  <Link href="/bookings">All Bookings</Link>

  <!-- DELETE via Link (method spoofing with a hidden form) -->
  <Link
    href="/bookings/42"
    method="delete"
    as="button"
    type="button"
    :data="{ reason: 'cancelled' }"
  >
    Cancel Booking
  </Link>

  <!-- preserve-scroll: page stays at current scroll position after navigation -->
  <Link href="/bookings?page=2" preserve-scroll>Next page</Link>

  <!-- preserve-state: keeps component state (search text, open panels) -->
  <Link href="/bookings?status=pending" preserve-state>Filter Pending</Link>

  <!-- replace: replaces history entry instead of pushing new one -->
  <Link href="/bookings" replace>Back</Link>
</template>
```

### 4b. router.visit() and helpers for programmatic navigation

```vue
<script setup lang="ts">
import { router } from '@inertiajs/vue3'

// router.visit() — most flexible, all options available
function goToBooking(id: number) {
  router.visit(`/bookings/${id}`, {
    method:         'get',
    preserveScroll: false,
    preserveState:  false,
    onSuccess:      (page) => console.log('navigated', page.component),
    onError:        (errors) => console.error(errors),
  })
}

// Shorthand helpers — equivalent to router.visit with method set
function createBooking(data: object) {
  router.post('/bookings', data, {
    onSuccess: () => router.visit('/bookings'),
  })
}

function deleteBooking(id: number) {
  router.delete(`/bookings/${id}`, {
    preserveScroll: true,
    onSuccess:      () => console.log('deleted'),
  })
}

// router.reload() — re-fetch current page props from the server
// Only re-fetches props listed in `only` — other props are unchanged
function refreshBookings() {
  router.reload({ only: ['bookings', 'total'] })
}
```

### 4c. Link vs router.visit() vs native `<a>`

```
<a href="/bookings">
  ← Full browser navigation (new page load, no Inertia, session flash lost)
  ← Use only for: external URLs, file downloads, or forcing a full reload

<Link href="/bookings">
  ← Inertia SPA navigation (XHR, component swap, keeps layout mounted)
  ← Use for: all internal Laravel routes

router.visit('/bookings')
  ← Same as Link but called from JavaScript (event handlers, after async ops)
  ← Use for: redirect after form submission, navigation inside functions

router.get / post / put / patch / delete
  ← Semantic shorthand — use when the HTTP method is important to express
```

---

## Problem 05 — Persistent Layouts

### 5a. The problem persistent layouts solve

Without persistent layouts, every Inertia navigation unmounts and remounts the
entire page component, including the layout. Sidebar state, scroll position in
the nav, and open dropdowns are lost on each navigation.

### 5b. defineOptions({ layout }) — keep layout alive between navigations

```vue
<!-- resources/js/Pages/Bookings/Index.vue -->
<script setup lang="ts">
import AppLayout from '@/Layouts/AppLayout.vue'
import type { Booking } from '@/types/inertia'

// defineOptions registers the layout on the component options object
// Inertia reads layout from options and wraps the page component inside it
// The layout is NOT unmounted between page navigations — only the inner page is swapped
defineOptions({ layout: AppLayout })

const props = defineProps<{
  bookings: Booking[]
  total:    number
}>()
</script>

<template>
  <!-- This is the page content only — AppLayout provides the outer shell -->
  <div>
    <h1>Bookings ({{ props.total }})</h1>
    <ul>
      <li v-for="b in props.bookings" :key="b.id">{{ b.school_name }}</li>
    </ul>
  </div>
</template>
```

```vue
<!-- resources/js/Layouts/AppLayout.vue -->
<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { usePage, computed } from '@inertiajs/vue3'

// This component stays mounted across all page navigations that use it as layout
const page = usePage()
const user = computed(() => page.props.auth.user)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-indigo-700 text-white px-6 py-4">
      <nav class="flex gap-6">
        <Link href="/bookings">Bookings</Link>
        <Link href="/trips">Trips</Link>
        <span class="ml-auto">{{ user?.name }}</span>
      </nav>
    </header>

    <main class="flex-1 p-6">
      <!-- Page component renders here — layout stays mounted, slot content swaps -->
      <slot />
    </main>
  </div>
</template>
```

### 5c. Nested layouts

```vue
<!-- Page using a nested layout (AdminLayout wraps AppLayout) -->
<script setup lang="ts">
import AdminLayout from '@/Layouts/AdminLayout.vue'
defineOptions({ layout: AdminLayout })
</script>
```

```vue
<!-- Layouts/AdminLayout.vue — can itself declare a parent layout -->
<script setup lang="ts">
import AppLayout from '@/Layouts/AppLayout.vue'
defineOptions({ layout: AppLayout })
</script>

<template>
  <div class="flex">
    <aside class="w-64 bg-gray-800 text-white p-4">
      <!-- Admin sidebar — persists while on admin pages -->
      <Link href="/admin/bookings">All Bookings</Link>
      <Link href="/admin/trips">Manage Trips</Link>
    </aside>
    <div class="flex-1 p-6">
      <slot />
    </div>
  </div>
</template>
```

---

## Problem 06 — Partial Reloads

### 6a. router.reload() with only

A partial reload asks the server to return only specified props, leaving all
other props unchanged on the client. This avoids re-sending large datasets
when only one piece of data has changed.

```typescript
import { router } from '@inertiajs/vue3'

// Re-fetch only the bookings list (not the trips dropdown, not shared auth)
router.reload({ only: ['bookings'] })

// Re-fetch after a status filter change
function filterByStatus(status: string) {
  router.get('/bookings', { status }, {
    only:           ['bookings', 'total'],   // only re-fetch these two props
    preserveState:  true,                    // keep Vue component state (search text etc)
    preserveScroll: true,                    // keep scroll position
    replace:        true,                    // replace history entry (no back-button noise)
  })
}

// Polling — refresh a live data prop every 30 seconds
let pollTimer: ReturnType<typeof setInterval>

onMounted(() => {
  pollTimer = setInterval(() => {
    router.reload({ only: ['bookings'], preserveScroll: true })
  }, 30_000)
})

onUnmounted(() => clearInterval(pollTimer))
```

### 6b. except — the inverse of only

```typescript
// Reload everything EXCEPT the trips dropdown (it never changes)
router.reload({ except: ['trips'] })
```

---

## Problem 07 — Progress Bar

### 7a. Built-in progress indicator

Inertia includes a thin progress bar (NProgress style) that appears
automatically during navigation and form submission. Configure in `app.ts`:

```typescript
// resources/js/app.ts
import { createInertiaApp } from '@inertiajs/vue3'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'

createInertiaApp({
  progress: {
    color:        '#6366f1',   // indigo-500
    showSpinner:  true,
    delay:        250,         // ms before progress bar appears (avoids flicker on fast navs)
  },
  resolve: (name) =>
    resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el)
  },
})
```

```typescript
// Disable progress per-navigation (e.g. background reload)
router.reload({
  only:     ['bookings'],
  showProgress: false,
})
```

---

## Problem 08 — Inertia vs API-First (Vue + REST)

```
ROUTING:
  Inertia:   Laravel owns all routes — no Vue Router config
             route('/bookings')  → controller → Inertia::render()
  API-first: Vue Router owns client routes
             Axios/fetch hits /api/v1/bookings → JSON → Pinia → component

AUTHENTICATION:
  Inertia:   Laravel session cookies, standard web middleware
             auth()->user() works normally — no token management
  API-first: Sanctum/JWT tokens, Authorization header, token refresh logic

VALIDATION ERRORS:
  Inertia:   form.errors auto-populated from 422 response — zero config
  API-first: catch(err) → parse err.response.data.errors manually
             or use a form library (VeeValidate, react-hook-form equivalent)

SHARED DATA:
  Inertia:   HandleInertiaRequests::share() — once, server-side, on every request
  API-first: fetch /api/v1/me, store in Pinia, guard routes in beforeEach

SEO:
  Inertia:   Server renders full HTML on first load — bots see content
             (with SSR: @inertiajs/vue3 + Ziggy + Laravel server-side rendering)
  API-first: Empty HTML shell on first load — needs SSR (Nuxt) or prerendering

FLASH MESSAGES:
  Inertia:   ->with('success', '...') in controller → shared in middleware → page.props.flash
  API-first: Custom response field, parse in catch/then, store in Pinia/composable

REAL-TIME:
  Inertia:   Partial reloads (router.reload) or Broadcast + Echo
  API-first: WebSocket / Echo / SSE naturally — easier to target specific endpoints

CHOOSE INERTIA WHEN:
  ← monolith Laravel app, team owns both front and back
  ← rapid development, standard CRUD, auth via sessions
  ← no need for a public API consumed by mobile apps or third parties
  ← want server-side validation wired to form UI with zero glue code

CHOOSE API-FIRST WHEN:
  ← mobile app, third-party integrations, or multiple front ends share the API
  ← front end is deployed separately (CDN) from Laravel back end
  ← team is split: dedicated API team + dedicated front-end team
  ← need real-time at scale (dedicated WebSocket server)
```
