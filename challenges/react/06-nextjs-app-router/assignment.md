# Next.js App Router & Server Components

Build Next.js pages with the App Router: server components, loading states, dynamic routes, layouts, and data fetching.

| Topic           | Details                                                         |
|-----------------|-----------------------------------------------------------------|
| App Router      | layout.tsx, page.tsx, loading.tsx                               |
| Server Components | RSC, async components, use server                             |
| Dynamic Routes  | [id], searchParams, parallel                                    |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Pages with App Router (Medium)

### Scenario

Build the booking section of a Next.js app using the App Router: list page with server-side filtering, detail page with dynamic route, layouts, loading states, and error boundaries.

### Requirements

1. `app/bookings/layout.tsx` — shared sidebar + content layout
2. `app/bookings/page.tsx` — server component fetching bookings list
3. `app/bookings/loading.tsx` — skeleton loading state
4. `app/bookings/[id]/page.tsx` — dynamic route for booking detail
5. `app/bookings/error.tsx` — error boundary
6. Use `searchParams` for server-side filtering
7. Use `generateMetadata()` for dynamic page titles
8. Separate server and client components properly

### Expected Code

```
// File structure:
app/
  bookings/
    layout.tsx      ← shared layout
    page.tsx        ← server component (list)
    loading.tsx     ← loading skeleton
    error.tsx       ← error boundary
    [id]/
      page.tsx      ← server component (detail)
      loading.tsx   ← detail skeleton

// URL: /bookings?status=paid&page=2
// → Server fetches paid bookings, page 2
// → Streams HTML to client (no client JS needed for initial render)
```

```tsx
// app/bookings/layout.tsx
export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-50 border-r p-4">
        <nav>
          <h2 className="font-semibold mb-4">Bookings</h2>
          <ul className="space-y-2">
            <li><a href="/bookings">All Bookings</a></li>
            <li><a href="/bookings?status=pending">Pending</a></li>
            <li><a href="/bookings?status=paid">Paid</a></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
```

```tsx
// app/bookings/page.tsx  (Server Component — no "use client")
import { Suspense } from "react"
import { BookingFilters } from "@/components/BookingFilters"   // client component
import { BookingTable }   from "@/components/BookingTable"     // server component

interface PageProps {
  searchParams: { status?: string; page?: string; search?: string }
}

// generateMetadata runs on the server alongside the page
export async function generateMetadata({ searchParams }: PageProps) {
  const status = searchParams.status ?? "all"
  return {
    title:       `Bookings — ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    description: `View ${status} bookings`,
  }
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const status  = searchParams.status  ?? "all"
  const page    = Number(searchParams.page ?? "1")
  const search  = searchParams.search  ?? ""

  // Direct DB/service call — no fetch() needed in RSC
  const bookings = await getBookings({ status, page, search })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      {/* Client component — needs interactivity */}
      <BookingFilters currentStatus={status} currentSearch={search} />

      {/* Suspense wraps async sub-trees */}
      <Suspense fallback={<BookingTableSkeleton />}>
        <BookingTable bookings={bookings} />
      </Suspense>
    </div>
  )
}
```

```tsx
// app/bookings/loading.tsx  (automatic Suspense boundary for the whole page)
export default function BookingsLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-10 bg-gray-200 rounded" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded" />
      ))}
    </div>
  )
}
```

```tsx
// app/bookings/error.tsx  (must be "use client" — uses React error boundary hooks)
"use client"

export default function BookingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-red-600 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
```

```tsx
// app/bookings/[id]/page.tsx  (dynamic route — Server Component)
interface PageProps {
  params:      { id: string }
  searchParams: { tab?: string }
}

export async function generateMetadata({ params }: PageProps) {
  const booking = await getBookingById(Number(params.id))
  return {
    title: `Booking #${booking.id} — ${booking.school_name}`,
  }
}

export default async function BookingDetailPage({ params, searchParams }: PageProps) {
  const booking = await getBookingById(Number(params.id))
  const tab     = searchParams.tab ?? "details"

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Booking #{booking.id}
      </h1>
      <p className="text-gray-600 mb-6">{booking.school_name}</p>

      {/* Client component for tab interactivity */}
      <BookingDetailTabs booking={booking} activeTab={tab} />
    </div>
  )
}
```

```tsx
// components/BookingFilters.tsx  ("use client" — needs onChange handlers)
"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"

interface BookingFiltersProps {
  currentStatus: string
  currentSearch: string
}

export function BookingFilters({ currentStatus, currentSearch }: BookingFiltersProps) {
  const router         = useRouter()
  const pathname       = usePathname()
  const searchParams   = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete("page")          // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex gap-4 mb-6">
      <select
        value={currentStatus}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="border rounded px-3 py-2"
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input
        type="search"
        defaultValue={currentSearch}
        placeholder="Search bookings..."
        onChange={(e) => updateFilter("search", e.target.value)}
        className="border rounded px-3 py-2 flex-1"
      />
    </div>
  )
}
```

### Server vs Client Component Decision Table

| File | Type | Why |
|------|------|-----|
| `layout.tsx` | Server | Static shell, no interactivity |
| `page.tsx` | Server | Fetches data, no browser APIs |
| `loading.tsx` | Server | Static skeleton |
| `error.tsx` | **Client** | Uses `reset()` callback (event handler) |
| `BookingFilters.tsx` | **Client** | `useRouter`, `onChange` handlers |
| `BookingTable.tsx` | Server | Renders data, no interactivity |
| `BookingDetailTabs.tsx` | **Client** | Tab switching state |

### What We're Evaluating

- `app/bookings/layout.tsx` — wraps all `/bookings/*` routes with shared shell
- `page.tsx` with no `"use client"` — Server Component by default
- `searchParams` prop — server-side filtering without client JS
- `loading.tsx` — automatic Suspense wrapping the page segment
- `error.tsx` must be `"use client"` — error boundaries are class-based under the hood
- `generateMetadata()` — co-located with the page, runs on server
- `useRouter()` + `useSearchParams()` — only available in Client Components

---

## Problem 02 — Server Actions & Mutations (Hard)

### Scenario

Use Next.js Server Actions for form mutations: create and update bookings without API routes, with progressive enhancement (works without JavaScript).

### Requirements

1. `"use server"` action functions for create/update/delete
2. `useFormState` hook for form state from server
3. `useFormStatus` for pending state in submit button
4. Redirect after successful mutation
5. Revalidate cached data with `revalidatePath`/`revalidateTag`
6. Show server-side validation errors in the form
7. Progressive enhancement — form works without JS

### Expected Code

```tsx
// app/bookings/actions.ts  — Server Actions file
"use server"

import { redirect }        from "next/navigation"
import { revalidatePath, revalidateTag } from "next/cache"
import { z }               from "zod"

// ── Validation schema ────────────────────────────────────────
const BookingSchema = z.object({
  school_id:     z.string().min(1, "School is required"),
  trip_type:     z.enum(["domestic", "international"]),
  student_count: z.coerce.number().min(1).max(500),
  date_from:     z.string().min(1, "Start date required"),
  date_to:       z.string().min(1, "End date required"),
})

// ── State shape returned to the client ──────────────────────
export interface ActionState {
  errors:  Record<string, string[]>
  message: string | null
  success: boolean
}

// ── Create action ────────────────────────────────────────────
export async function createBookingAction(
  prevState: ActionState,
  formData:  FormData
): Promise<ActionState> {
  // Parse FormData into a plain object
  const raw = Object.fromEntries(formData.entries())

  // Validate with Zod
  const parsed = BookingSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
      success: false,
    }
  }

  try {
    await db.booking.create({ data: parsed.data })
  } catch (e) {
    return { errors: {}, message: "Database error", success: false }
  }

  revalidatePath("/bookings")           // purge the list page cache
  revalidateTag("bookings")             // purge any fetch() tagged "bookings"
  redirect("/bookings")                 // server-side redirect (throws internally)
}

// ── Update action ────────────────────────────────────────────
export async function updateBookingAction(
  prevState: ActionState,
  formData:  FormData
): Promise<ActionState> {
  const id  = formData.get("id") as string
  const raw = Object.fromEntries(formData.entries())

  const parsed = BookingSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
      success: false,
    }
  }

  await db.booking.update({ where: { id: Number(id) }, data: parsed.data })

  revalidatePath(`/bookings/${id}`)
  revalidatePath("/bookings")
  redirect(`/bookings/${id}`)
}

// ── Delete action (no form state needed) ────────────────────
export async function deleteBookingAction(formData: FormData): Promise<void> {
  const id = formData.get("id") as string
  await db.booking.delete({ where: { id: Number(id) } })
  revalidatePath("/bookings")
  redirect("/bookings")
}
```

```tsx
// app/bookings/new/page.tsx  (Server Component — renders the client form)
import { CreateBookingForm } from "@/components/CreateBookingForm"

export const metadata = { title: "New Booking" }

export default function NewBookingPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Booking</h1>
      <CreateBookingForm />
    </div>
  )
}
```

```tsx
// components/CreateBookingForm.tsx  ("use client" — uses hooks)
"use client"

import { useFormState } from "react-dom"
import { createBookingAction, type ActionState } from "@/app/bookings/actions"
import { SubmitButton } from "@/components/SubmitButton"

const initialState: ActionState = { errors: {}, message: null, success: false }

export function CreateBookingForm() {
  // useFormState wires the server action to local state
  const [state, formAction] = useFormState(createBookingAction, initialState)

  return (
    // action={formAction} — works with and without JavaScript (progressive enhancement)
    <form action={formAction} className="space-y-4">
      {state.message && !state.success && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="school_id" className="block text-sm font-medium mb-1">
          School
        </label>
        <select
          id="school_id"
          name="school_id"     // ← name attr is how FormData collects values
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select school…</option>
          <option value="1">Al Ain School</option>
          <option value="2">Dubai Academy</option>
        </select>
        {state.errors.school_id && (
          <p className="text-red-600 text-sm mt-1">{state.errors.school_id[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Trip Type</label>
        <div className="flex gap-4">
          {(["domestic", "international"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input type="radio" name="trip_type" value={type} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
        {state.errors.trip_type && (
          <p className="text-red-600 text-sm mt-1">{state.errors.trip_type[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="student_count" className="block text-sm font-medium mb-1">
          Student Count
        </label>
        <input
          id="student_count"
          name="student_count"
          type="number"
          min={1}
          max={500}
          className="w-full border rounded px-3 py-2"
        />
        {state.errors.student_count && (
          <p className="text-red-600 text-sm mt-1">{state.errors.student_count[0]}</p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="date_from" className="block text-sm font-medium mb-1">From</label>
          <input id="date_from" name="date_from" type="date" className="w-full border rounded px-3 py-2" />
          {state.errors.date_from && (
            <p className="text-red-600 text-sm mt-1">{state.errors.date_from[0]}</p>
          )}
        </div>
        <div className="flex-1">
          <label htmlFor="date_to" className="block text-sm font-medium mb-1">To</label>
          <input id="date_to" name="date_to" type="date" className="w-full border rounded px-3 py-2" />
          {state.errors.date_to && (
            <p className="text-red-600 text-sm mt-1">{state.errors.date_to[0]}</p>
          )}
        </div>
      </div>

      <SubmitButton label="Create Booking" />
    </form>
  )
}
```

```tsx
// components/SubmitButton.tsx  ("use client" — uses useFormStatus)
"use client"

import { useFormStatus } from "react-dom"

interface SubmitButtonProps { label: string }

// Must be a separate component — useFormStatus reads the PARENT form's status
export function SubmitButton({ label }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : label}
    </button>
  )
}
```

```tsx
// Delete button — inline Server Action (alternative pattern)
// components/DeleteBookingButton.tsx
"use client"
import { deleteBookingAction } from "@/app/bookings/actions"

export function DeleteBookingButton({ bookingId }: { bookingId: number }) {
  return (
    <form action={deleteBookingAction}>
      <input type="hidden" name="id" value={bookingId} />
      <SubmitButton label="Delete Booking" />
    </form>
  )
}
```

### Server Actions Mental Model

```
Browser submits <form action={formAction}>
  → Next.js POSTs to special Server Action endpoint
  → createBookingAction(prevState, formData) runs on server
  → On error: returns { errors, message } → useFormState updates UI
  → On success: revalidatePath() clears cache → redirect() navigates
  → No API route needed — the action IS the endpoint
```

### Progressive Enhancement

```
With JavaScript:    useFormState intercepts submit → async action → optimistic UI update
Without JavaScript: form POSTs normally → server action runs → full page redirect
```

### What We're Evaluating

- `"use server"` at file top — marks all exports as Server Actions
- `useFormState(action, initialState)` — binds action return value to component state
- `useFormStatus()` — must be in a **child** component of the form (not the form component itself)
- `FormData` — server receives form values; `formData.get("field")` or `Object.fromEntries()`
- `revalidatePath("/bookings")` — busts the RSC cache for that route segment
- `revalidateTag("bookings")` — busts any `fetch(..., { next: { tags: ["bookings"] } })` cache
- `redirect()` — throws internally (no try/catch around it); must be called outside try blocks
- Progressive enhancement — `action={formAction}` on `<form>` works without JS
