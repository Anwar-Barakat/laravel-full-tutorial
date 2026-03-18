# Inertia.js Deep Integration

Build Inertia.js pages with shared data, persistent layouts, flash messages, and the complete Laravel-React bridge.

| Topic              | Details                                                         |
|--------------------|-----------------------------------------------------------------|
| Page Components    | Props from Laravel controllers                                  |
| Shared Data        | Auth, flash, ziggy routes                                       |
| Persistent Layouts | Sidebar persists across navigation                              |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Inertia Page Architecture (Medium)

### Scenario

Build a complete Inertia.js page architecture for Tripz: shared data middleware, persistent layout, flash messages, and server-side filtering via URL updates.

### Requirements

1. `HandleInertiaRequests` middleware sharing `auth`, `flash`, `ziggy`
2. `MainLayout` — persistent sidebar that doesn't remount on navigation
3. `BookingsPage` — receives props from `BookingController::index()`
4. Flash messages displayed from `usePage().props.flash`
5. Filter via `router.get()` with `preserveState`
6. `Link` component for SPA navigation
7. `Head` component for page titles

### Expected Code

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return array_merge(parent::share($request), [
        'auth' => [
            'user'        => $request->user()?->only('id', 'name', 'email', 'role'),
            'permissions' => $request->user()?->getPermissions() ?? [],
        ],
        'flash' => [
            'success' => $request->session()->get('success'),
            'error'   => $request->session()->get('error'),
            'info'    => $request->session()->get('info'),
        ],
        'ziggy' => fn() => [
            ...Ziggy::json($request->url()),
            'location' => $request->url(),
        ],
    ]);
}
```

```tsx
// types/inertia.d.ts  — extend Inertia's PageProps for TypeScript
import type { PageProps as BasePageProps } from "@inertiajs/core"

export interface SharedProps extends BasePageProps {
  auth: {
    user: {
      id:          number
      name:        string
      email:       string
      role:        "admin" | "school_admin" | "staff"
    } | null
    permissions: string[]
  }
  flash: {
    success?: string
    error?:   string
    info?:    string
  }
  ziggy: {
    location: string
    url:      string
    port:     number | null
    routes:   Record<string, unknown>
  }
}

// Merge shared props into every page's props
declare module "@inertiajs/core" {
  interface PageProps extends SharedProps {}
}
```

```tsx
// Layouts/MainLayout.tsx  — persistent layout
import { Link, usePage } from "@inertiajs/react"
import type { SharedProps } from "@/types/inertia"
import { FlashMessages } from "@/components/FlashMessages"

interface MainLayoutProps {
  children: React.ReactNode
  title?:   string
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const { auth, ziggy } = usePage<SharedProps>().props
  const currentPath = ziggy.location

  const navItems = [
    { href: "/dashboard",        label: "Dashboard",  icon: "📊" },
    { href: "/bookings",         label: "Bookings",   icon: "📋" },
    { href: "/schools",          label: "Schools",    icon: "🏫" },
    { href: "/reports",          label: "Reports",    icon: "📈" },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — persists across Inertia navigations */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600">Tripz</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.href)
            return (
              // Inertia Link — SPA navigation without full page reload
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section at bottom */}
        {auth.user && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                {auth.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {auth.user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {auth.user.role}
                </p>
              </div>
            </div>
            <Link
              href="/logout"
              method="post"
              as="button"
              className="mt-2 w-full text-left text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Sign out
            </Link>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FlashMessages />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Persistent Layout pattern ─────────────────────────────────
// Attach layout to the page component as a static property.
// Inertia checks for Component.layout before each navigation.
// If the same layout is used, it's NOT remounted — sidebar stays alive.
```

```tsx
// components/FlashMessages.tsx
import { usePage }    from "@inertiajs/react"
import { useEffect, useState } from "react"
import type { SharedProps } from "@/types/inertia"

export function FlashMessages() {
  const { flash } = usePage<SharedProps>().props
  const [visible, setVisible] = useState(true)

  // Re-show flash on every navigation (new flash props)
  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [flash])  // ← re-runs when Inertia delivers new page props

  if (!visible) return null

  return (
    <div className="px-6 pt-4 space-y-2">
      {flash.success && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <span aria-hidden="true">✓</span>
          {flash.success}
        </div>
      )}
      {flash.error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <span aria-hidden="true">✕</span>
          {flash.error}
        </div>
      )}
      {flash.info && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
          <span aria-hidden="true">ℹ</span>
          {flash.info}
        </div>
      )}
    </div>
  )
}
```

```tsx
// Pages/Bookings/Index.tsx
import { Head, Link, router, usePage } from "@inertiajs/react"
import MainLayout from "@/Layouts/MainLayout"
import type { SharedProps } from "@/types/inertia"

// Props injected by Laravel's BookingController::index()
interface BookingsPageProps extends SharedProps {
  bookings: {
    data: Booking[]
    links: { first: string; last: string; prev: string | null; next: string | null }
    meta:  { current_page: number; last_page: number; per_page: number; total: number }
  }
  filters: {
    status?: string
    search?: string
  }
}

export default function BookingsPage({ bookings, filters }: BookingsPageProps) {
  const { auth } = usePage<SharedProps>().props

  // ── Server-side filtering via Inertia ─────────────────────
  // router.get() triggers a new Inertia request with updated URL params.
  // Controller receives new query string → returns filtered data.
  // preserveState: true keeps other inputs in place (e.g. search while changing status)
  // preserveScroll: true stays at same scroll position

  function handleStatusChange(status: string) {
    router.get(
      "/bookings",
      { ...filters, status, page: 1 },
      { preserveState: true, preserveScroll: true }
    )
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    // Use debounce in production; simplified here
    router.get(
      "/bookings",
      { ...filters, search: e.target.value, page: 1 },
      { preserveState: true, preserveScroll: true }
    )
  }

  return (
    <>
      {/* Head component updates <title> and <meta> without full reload */}
      <Head title="Bookings" />

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bookings
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({bookings.meta.total} total)
            </span>
          </h1>

          {/* Link component — SPA navigation, no full page reload */}
          {auth.permissions.includes("bookings.create") && (
            <Link
              href="/bookings/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              New Booking
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filters.status ?? "all"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="search"
            defaultValue={filters.search ?? ""}
            onChange={handleSearch}
            placeholder="Search bookings…"
            className="border rounded-lg px-3 py-2 text-sm flex-1"
          />
        </div>

        {/* Bookings table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {["School", "Status", "Students", "Amount", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {bookings.data.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium">{booking.school_name}</td>
                  <td className="px-4 py-3"><Badge status={booking.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{booking.student_count}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })
                      .format(booking.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="text-blue-600 text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inertia pagination links */}
        <div className="flex justify-between mt-4 text-sm text-gray-600">
          {bookings.links.prev ? (
            <Link href={bookings.links.prev} className="text-blue-600">← Previous</Link>
          ) : <span />}
          <span>
            Page {bookings.meta.current_page} of {bookings.meta.last_page}
          </span>
          {bookings.links.next ? (
            <Link href={bookings.links.next} className="text-blue-600">Next →</Link>
          ) : <span />}
        </div>
      </div>
    </>
  )
}

// ── Persistent layout attachment ─────────────────────────────
// This static property tells Inertia which layout to use.
// Same layout across pages = layout NOT remounted = sidebar state preserved.
BookingsPage.layout = (page: React.ReactNode) => (
  <MainLayout title="Bookings">{page}</MainLayout>
)
```

### Inertia Data Flow

```
1. Browser requests /bookings?status=paid
2. Laravel Router → BookingController::index()
3. Controller builds query, calls Inertia::render('Bookings/Index', [...])
4. Inertia serialises props to JSON
5. React receives { bookings: {...}, filters: {...} } as component props
6. No fetch() needed — data arrives with the page

On filter change (router.get):
1. Inertia sends XHR to /bookings?status=paid&page=2
2. Server returns NEW page props (JSON only, no full HTML)
3. React component re-renders with new props
4. URL updates in address bar
5. preserveState: true — non-changed inputs keep their values
```

### Persistent Layout vs Normal Layout

| Pattern | Remounts on nav? | Sidebar state preserved? |
|---------|-----------------|--------------------------|
| Wrap each page in `<MainLayout>` inside the component | Yes | No — sidebar resets |
| `Component.layout = page => <MainLayout>{page}</MainLayout>` | **No** | **Yes** — sidebar persists |

### What We're Evaluating

- `HandleInertiaRequests::share()` — runs on every request; props merged into every page
- `usePage<SharedProps>().props` — typed access to both page-specific and shared props
- `Component.layout` static property — Inertia's persistent layout pattern
- `router.get(url, params, { preserveState: true })` — partial navigation; keeps non-filter state
- `Head` component — updates document title server-side and client-side
- `Link` with `method="post"` — submits POST via Inertia (logout, delete)
- Flash messages via `useEffect([flash])` — re-triggers auto-dismiss on each navigation

---

## Problem 02 — Inertia Form with Server Validation (Hard)

### Scenario

Build a booking creation form using Inertia's `useForm` — server-side validation with zero manual error handling code.

### Requirements

1. `useForm` from `@inertiajs/react`
2. `form.post("/bookings")` handles submission
3. `form.errors` auto-populated from Laravel 422
4. `form.processing` for loading state
5. `form.reset()` after success
6. Show how Inertia eliminates 60% of form boilerplate vs raw React

### Expected Code

```php
// BookingController::store() — validation triggers the 422 automatically
public function store(Request $request)
{
    $validated = $request->validate([
        'school_name'   => 'required|string|min:2',
        'destination'   => 'required|string',
        'student_count' => 'required|integer|min:1|max:500',
        'amount'        => 'required|numeric|min:0',
        'trip_date'     => 'required|date|after:today',
    ]);

    $booking = Booking::create($validated);

    // Flash message appears automatically via HandleInertiaRequests::share()
    return to_route('bookings.index')
        ->with('success', "Booking #{$booking->id} created successfully");
}
```

```tsx
// Pages/Bookings/Create.tsx
import { Head }     from "@inertiajs/react"
import { useForm }  from "@inertiajs/react"
import MainLayout   from "@/Layouts/MainLayout"

interface BookingFormData {
  school_name:   string
  destination:   string
  student_count: string   // useForm uses strings for all inputs; coercion on server
  amount:        string
  trip_date:     string
  trip_type:     "domestic" | "international" | ""
  notes:         string
}

export default function CreateBookingPage() {
  // useForm initialises form state — ALL of this replaces useState + manual error handling
  const form = useForm<BookingFormData>({
    school_name:   "",
    destination:   "",
    student_count: "",
    amount:        "",
    trip_date:     "",
    trip_type:     "",
    notes:         "",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    form.post("/bookings", {
      // On 302 redirect from server (success)
      onSuccess: () => {
        form.reset()   // clear form — user may want to create another
        // The flash message from the redirect is shown automatically
      },
      // On 422 from server (validation failed)
      // form.errors is auto-populated — NO manual catch needed!
      onError: () => {
        // Optional: scroll to first error, play a shake animation, etc.
        window.scrollTo({ top: 0, behavior: "smooth" })
      },
      preserveScroll: true,   // stay at position — don't jump to top on error
    })
  }

  return (
    <>
      <Head title="Create Booking" />

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Create Booking</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          {/* School Name */}
          <div>
            <label htmlFor="school_name" className="block text-sm font-medium mb-1">
              School Name
            </label>
            <input
              id="school_name"
              type="text"
              value={form.data.school_name}
              onChange={(e) => form.setData("school_name", e.target.value)}
              //                 ↑ setData updates specific field — no spread needed
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                form.errors.school_name
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {/* Error auto-set from Laravel's validation response */}
            {form.errors.school_name && (
              <p className="text-red-600 text-xs mt-1">{form.errors.school_name}</p>
            )}
          </div>

          {/* Destination */}
          <div>
            <label htmlFor="destination" className="block text-sm font-medium mb-1">
              Destination
            </label>
            <input
              id="destination"
              type="text"
              value={form.data.destination}
              onChange={(e) => form.setData("destination", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {form.errors.destination && (
              <p className="text-red-600 text-xs mt-1">{form.errors.destination}</p>
            )}
          </div>

          {/* Student Count + Amount — two column grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="student_count" className="block text-sm font-medium mb-1">
                Student Count
              </label>
              <input
                id="student_count"
                type="number"
                min={1}
                max={500}
                value={form.data.student_count}
                onChange={(e) => form.setData("student_count", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {form.errors.student_count && (
                <p className="text-red-600 text-xs mt-1">{form.errors.student_count}</p>
              )}
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Amount (AED)
              </label>
              <input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={form.data.amount}
                onChange={(e) => form.setData("amount", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {form.errors.amount && (
                <p className="text-red-600 text-xs mt-1">{form.errors.amount}</p>
              )}
            </div>
          </div>

          {/* Trip Date */}
          <div>
            <label htmlFor="trip_date" className="block text-sm font-medium mb-1">
              Trip Date
            </label>
            <input
              id="trip_date"
              type="date"
              value={form.data.trip_date}
              onChange={(e) => form.setData("trip_date", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {form.errors.trip_date && (
              <p className="text-red-600 text-xs mt-1">{form.errors.trip_date}</p>
            )}
          </div>

          {/* Trip Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Trip Type</label>
            <div className="flex gap-4">
              {(["domestic", "international"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trip_type"
                    value={type}
                    checked={form.data.trip_type === type}
                    onChange={() => form.setData("trip_type", type)}
                    className="text-blue-600"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
            {form.errors.trip_type && (
              <p className="text-red-600 text-xs mt-1">{form.errors.trip_type}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              value={form.data.notes}
              onChange={(e) => form.setData("notes", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/bookings"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              onClick={(e) => { e.preventDefault(); window.history.back() }}
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={form.processing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {form.processing ? "Creating…" : "Create Booking"}
            </button>
          </div>

          {/* form.isDirty: unsaved changes warning */}
          {form.isDirty && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              You have unsaved changes
            </p>
          )}
        </form>
      </div>
    </>
  )
}

CreateBookingPage.layout = (page: React.ReactNode) => (
  <MainLayout>{page}</MainLayout>
)
```

```tsx
// Comparison: Inertia useForm vs raw React
// The same form with raw React requires ~60 more lines

// ── Raw React version (what you'd write without Inertia) ────
function CreateBookingRaw() {
  // Manual state for every field
  const [formData, setFormData] = useState<BookingFormData>({
    school_name: "", destination: "", student_count: "", amount: "", trip_date: "",
  })
  // Manual error state
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Manual loading state
  const [isLoading, setIsLoading] = useState(false)
  // Manual dirty tracking
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
    // Clear field error on change (optional but good UX)
    if (errors[field]) setErrors((prev) => { const next = {...prev}; delete next[field]; return next })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body:    JSON.stringify(formData),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          if (res.status === 422) {
            // Flatten Laravel's { field: ["msg"] } to { field: "msg" }
            const flat: Record<string, string> = {}
            for (const [k, v] of Object.entries(data.errors as Record<string, string[]>)) {
              flat[k] = v[0]
            }
            setErrors(flat)
          }
          throw new Error(data.message)
        }
        // Success: redirect manually, handle flash manually
        window.location.href = "/bookings"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ... render with value={formData.school_name}, onChange, errors, disabled={isLoading}
  // ~40 more lines of JSX
}

// ── Inertia useForm version (what you write WITH Inertia) ───
// const form = useForm({ school_name: "", ... })
// form.post("/bookings", { onSuccess: () => form.reset() })
// value={form.data.school_name}
// onChange={e => form.setData("school_name", e.target.value)}
// {form.errors.school_name && <p>{form.errors.school_name}</p>}
// disabled={form.processing}
// → Flash message, redirect, errors ALL handled automatically
```

### useForm Feature Comparison

| Feature | Raw React | Inertia useForm |
|---------|-----------|-----------------|
| Form state | `useState` per field | `form.data.field` — automatic |
| Error state | `useState` + manual 422 parse | `form.errors.field` — auto from Laravel |
| Loading state | `useState(false)` + try/finally | `form.processing` — automatic |
| Dirty tracking | `useState(false)` + manual set | `form.isDirty` — automatic |
| Submit | `fetch()` + error handling | `form.post()` — handles everything |
| Flash messages | Manual state + toast | Auto via `HandleInertiaRequests::share()` |
| Redirect | `window.location.href` | Auto from server's `to_route()` |
| Reset | `setFormData(initial)` + `setErrors({})` | `form.reset()` — one call |
| Lines of code | ~80 lines | ~30 lines |

### What We're Evaluating

- `useForm<T>(initialValues)` — typed form data; TypeScript catches invalid `setData` keys
- `form.setData("field", value)` — single-field update; no spread; reactive
- `form.errors.field` — populated automatically from Laravel's 422 JSON response
- `form.processing` — true while the Inertia request is in flight; disables button automatically
- `form.isDirty` — true when any field differs from initial value
- `form.reset()` — resets to `initialValues`; also clears errors and dirty state
- `onSuccess` / `onError` callbacks — hooks into the request lifecycle
- `preserveScroll: true` — stays at scroll position on validation error (doesn't jump to top)
- `Component.layout` static property — persistent layout; sidebar/nav not remounted between pages
