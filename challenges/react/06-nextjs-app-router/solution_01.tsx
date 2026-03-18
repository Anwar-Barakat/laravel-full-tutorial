// ============================================================
// Problem 01 — Booking Pages with App Router
// ============================================================



// ============================================================
// app/bookings/layout.tsx  (Server Component)
//
// flex h-screen layout: <aside> sidebar + <main> content
// sidebar links: All Bookings, ?status=pending, ?status=paid
// children rendered inside <main>
// ============================================================



// ============================================================
// app/bookings/page.tsx  (Server Component — NO "use client")
//
// PageProps: { searchParams: { status?, page?, search? } }
//
// generateMetadata({ searchParams }):
//   title: `Bookings — ${status}` (capitalise first letter)
//
// default export async function BookingsPage({ searchParams }):
//   const status = searchParams.status ?? "all"
//   const page   = Number(searchParams.page ?? "1")
//   const search = searchParams.search ?? ""
//   const bookings = await getBookings({ status, page, search })
//   render: <BookingFilters> (client) + <Suspense> <BookingTable> (server)
// ============================================================



// ============================================================
// app/bookings/loading.tsx  (automatic Suspense for whole segment)
//
// animate-pulse skeleton: title div + filter bar div + 5 row divs
// ============================================================



// ============================================================
// app/bookings/error.tsx  ("use client" — error boundaries need it)
//
// Props: { error: Error & { digest?: string }; reset: () => void }
// render: error.message + <button onClick={reset}>Try again</button>
// ============================================================



// ============================================================
// app/bookings/[id]/page.tsx  (dynamic route — Server Component)
//
// PageProps: { params: { id: string }; searchParams: { tab?: string } }
//
// generateMetadata({ params }):
//   booking = await getBookingById(Number(params.id))
//   title: `Booking #${booking.id} — ${booking.school_name}`
//
// default export async:
//   booking = await getBookingById(Number(params.id))
//   tab = searchParams.tab ?? "details"
//   render: <BookingDetailTabs booking={booking} activeTab={tab} />
// ============================================================



// ============================================================
// components/BookingFilters.tsx  ("use client")
//
// Props: { currentStatus: string; currentSearch: string }
//
// const router       = useRouter()
// const pathname     = usePathname()
// const searchParams = useSearchParams()
//
// updateFilter(key, value):
//   params = new URLSearchParams(searchParams.toString())
//   set/delete key; delete "page" (reset pagination)
//   router.push(`${pathname}?${params.toString()}`)
//
// render: <select> for status + <input type="search"> for search
// ============================================================
