# Next.js App Router & Server Components

Build Next.js pages with the App Router: server components, loading states, dynamic routes, layouts, and data fetching.

| Topic             | Details                           |
|-------------------|-----------------------------------|
| App Router        | layout.tsx, page.tsx, loading.tsx |
| Server Components | RSC, async components, use server |
| Dynamic Routes    | [id], searchParams, parallel      |

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

| File                    | Type       | Why                                     |
|-------------------------|------------|-----------------------------------------|
| `layout.tsx`            | Server     | Static shell, no interactivity          |
| `page.tsx`              | Server     | Fetches data, no browser APIs           |
| `loading.tsx`           | Server     | Static skeleton                         |
| `error.tsx`             | **Client** | Uses `reset()` callback (event handler) |
| `BookingFilters.tsx`    | **Client** | `useRouter`, `onChange` handlers        |
| `BookingTable.tsx`      | Server     | Renders data, no interactivity          |
| `BookingDetailTabs.tsx` | **Client** | Tab switching state                     |

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

Use Next.js Server Actions with react-hook-form: shared Zod schema between client and server, client-side validation with `zodResolver`, server-side validation with `safeParse` + cross-field `.refine()`. Call server actions directly from `handleSubmit` — no FormData, no `useActionState`.

### Requirements

1. Single shared `BookingSchema` — used by `zodResolver` on the client AND `safeParse` on the server
2. `"use server"` action functions for create/update/delete — accept typed data, not FormData
3. `react-hook-form` + `zodResolver(BookingSchema)` — instant client-side validation including `.refine()`
4. `useTransition` for non-blocking pending state while the server action runs
5. Call server action directly: `await createBookingAction(data)` inside `startTransition`
6. Server returns `ActionResult` on error — merge field errors into RHF via `setError`
7. `revalidatePath` to purge RSC cache, then `redirect()` on success

### Expected Code

```tsx
// lib/schemas/bookingSchema.ts  (shared — client AND server)
import { z } from "zod"

// One schema for both — .refine() is pure JS, runs on client and server
export const BookingSchema = z.object({
  school_id:     z.string().min(1, "School is required"),
  trip_type:     z.enum(["domestic", "international"]),
  student_count: z.coerce.number().min(1, "Min 1").max(500, "Max 500"),
  date_from:     z.string().min(1, "Start date required"),
  date_to:       z.string().min(1, "End date required"),
}).refine(
  (data) => new Date(data.date_to) > new Date(data.date_from),
  { message: "End date must be after start date", path: ["date_to"] }
)

export type BookingFormData = z.infer<typeof BookingSchema>
```

```tsx
// app/bookings/actions.ts
"use server"

import { BookingSchema } from "@/lib/schemas/bookingSchema"
import { redirect }      from "next/navigation"
import { revalidatePath } from "next/cache"

export interface ActionResult {
  success: boolean
  errors:  Record<string, string[]>
  message: string | null
}

export async function createBookingAction(data: unknown): Promise<ActionResult> {
  const parsed = BookingSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    }
  }
  try {
    await db.booking.create({ data: parsed.data })
  } catch {
    return { success: false, errors: {}, message: "Database error" }
  }
  revalidatePath("/bookings")
  redirect("/bookings")
}

export async function updateBookingAction(id: number, data: unknown): Promise<ActionResult> {
  const parsed = BookingSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    }
  }
  await db.booking.update({ where: { id }, data: parsed.data })
  revalidatePath(`/bookings/${id}`)
  revalidatePath("/bookings")
  redirect(`/bookings/${id}`)
}

export async function deleteBookingAction(id: number): Promise<void> {
  await db.booking.delete({ where: { id } })
  revalidatePath("/bookings")
  redirect("/bookings")
}
```

```tsx
// components/CreateBookingForm.tsx  ("use client")
"use client"

import { useTransition, useState }          from "react"
import { useForm }                           from "react-hook-form"
import { zodResolver }                       from "@hookform/resolvers/zod"
import { BookingSchema, type BookingFormData } from "@/lib/schemas/bookingSchema"
import { createBookingAction }               from "@/app/bookings/actions"

export function CreateBookingForm() {
  const [isPending, startTransition]      = useTransition()
  const [serverMessage, setServerMessage] = useState<string | null>(null)

  const { register, handleSubmit, setError, formState: { errors } } =
    useForm<BookingFormData>({ resolver: zodResolver(BookingSchema) })

  function onSubmit(data: BookingFormData) {
    setServerMessage(null)
    startTransition(async () => {
      const result = await createBookingAction(data)
      if (result && !result.success) {
        setServerMessage(result.message)
        Object.entries(result.errors).forEach(([field, messages]) => {
          setError(field as keyof BookingFormData, { type: "server", message: messages[0] })
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      {serverMessage && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
          {serverMessage}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">School</label>
        <select {...register("school_id")} className={`w-full border rounded px-3 py-2 ${errors.school_id ? "border-red-500" : "border-gray-300"}`}>
          <option value="">Select school…</option>
          <option value="1">Al Ain School</option>
          <option value="2">Dubai Academy</option>
        </select>
        {errors.school_id && <p className="text-red-600 text-sm mt-1">{errors.school_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Trip Type</label>
        <div className="flex gap-4">
          {(["domestic", "international"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input type="radio" value={type} {...register("trip_type")} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
        {errors.trip_type && <p className="text-red-600 text-sm mt-1">{errors.trip_type.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Student Count</label>
        <input type="number" {...register("student_count")} className={`w-full border rounded px-3 py-2 ${errors.student_count ? "border-red-500" : "border-gray-300"}`} />
        {errors.student_count && <p className="text-red-600 text-sm mt-1">{errors.student_count.message}</p>}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">From</label>
          <input type="date" {...register("date_from")} className={`w-full border rounded px-3 py-2 ${errors.date_from ? "border-red-500" : "border-gray-300"}`} />
          {errors.date_from && <p className="text-red-600 text-sm mt-1">{errors.date_from.message}</p>}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">To</label>
          <input type="date" {...register("date_to")} className={`w-full border rounded px-3 py-2 ${errors.date_to ? "border-red-500" : "border-gray-300"}`} />
          {errors.date_to && <p className="text-red-600 text-sm mt-1">{errors.date_to.message}</p>}
        </div>
      </div>

      <button type="submit" disabled={isPending} className="w-full py-2 px-4 bg-blue-600 text-white rounded disabled:opacity-50">
        {isPending ? "Creating…" : "Create Booking"}
      </button>
    </form>
  )
}
```

```tsx
// components/DeleteBookingButton.tsx  ("use client")
"use client"

import { useTransition }       from "react"
import { deleteBookingAction } from "@/app/bookings/actions"

export function DeleteBookingButton({ bookingId }: { bookingId: number }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteBookingAction(bookingId))}
      disabled={isPending}
      className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete Booking"}
    </button>
  )
}
```

### Flow

```
User submits form
  → handleSubmit(onSubmit) — zodResolver(BookingSchema) validates including .refine
  → fails: show errors inline, no network call
  → passes: startTransition(async () => await createBookingAction(data))
  → isPending = true — button disabled, UI stays responsive
  → server: BookingSchema.safeParse(data) — same schema, validates again
  → on error: returns ActionResult → setError merges into RHF fields
  → on success: redirect() fires server-side → user navigates away
```

### Validation Responsibility Table

| Rule                  | Where           | Why                                             |
|-----------------------|-----------------|-------------------------------------------------|
| School required       | Client + Server | Basic — both layers                             |
| Student count 1–500   | Client + Server | Basic range                                     |
| date_to > date_from   | Client + Server | `.refine()` — pure JS, same schema runs on both |
| School at capacity    | **Server only** | Needs DB query — split schema only for this     |
| Duplicate booking     | **Server only** | Needs DB query — split schema only for this     |

### What We're Evaluating

- Single `BookingSchema` — `zodResolver(BookingSchema)` on client, `BookingSchema.safeParse(data)` on server
- `.refine((data) => bool, { message, path })` — cross-field rule, runs on both sides
- `useTransition` — `[isPending, startTransition]` for non-blocking server calls
- `startTransition(async () => await serverAction(data))` — call action from `onSubmit`
- `setError(field, { type: "server", message })` — server error appears inline in the correct field
- `revalidatePath` — purges RSC cache after mutation
- `redirect()` — throws internally, navigates on success
