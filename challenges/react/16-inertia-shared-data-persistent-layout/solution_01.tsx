// ============================================================
// Problem 01 — Inertia Page Architecture
// ============================================================



// ============================================================
// types/inertia.d.ts
//
// interface SharedProps extends BasePageProps:
//   auth: { user: { id, name, email, role } | null; permissions: string[] }
//   flash: { success?, error?, info? }
//   ziggy: { location, url, port, routes }
//
// declare module "@inertiajs/core":
//   interface PageProps extends SharedProps {}
//   ← merges shared props into every page's TypeScript type
// ============================================================



// ============================================================
// Layouts/MainLayout.tsx  (persistent layout)
//
// const { auth, ziggy } = usePage<SharedProps>().props
// currentPath = ziggy.location
//
// Sidebar nav:
//   navItems = [{ href, label, icon }, ...]
//   isActive = currentPath.startsWith(item.href)
//   <Link href={item.href}> with active styles + aria-current="page"
//   Link component = Inertia SPA navigation (no full reload)
//
// User section (bottom):
//   auth.user → avatar initials + name + role
//   <Link href="/logout" method="post" as="button"> Sign out
//
// <FlashMessages /> rendered in content area
//
// PERSISTENT LAYOUT: attach as static property on each page component:
//   BookingsPage.layout = (page) => <MainLayout>{page}</MainLayout>
//   ← same layout across pages = NOT remounted = sidebar state preserved
// ============================================================



// ============================================================
// components/FlashMessages.tsx
//
// const { flash } = usePage<SharedProps>().props
// const [visible, setVisible] = useState(true)
//
// useEffect([flash]):
//   setVisible(true)
//   timer = setTimeout(() => setVisible(false), 4000)
//   return () => clearTimeout(timer)
//   ← re-runs when Inertia delivers new page props (each navigation)
//
// render: flash.success → green alert, flash.error → red alert, flash.info → blue alert
// role="alert" on each div for screen readers
// ============================================================



// ============================================================
// Pages/Bookings/Index.tsx
//
// Props: { bookings: { data, links, meta }, filters: { status?, search? } }
//        extends SharedProps (auth.permissions available)
//
// handleStatusChange(status):
//   router.get("/bookings", { ...filters, status, page: 1 },
//     { preserveState: true, preserveScroll: true })
//   ← preserveState: keeps non-filter state; preserveScroll: no jump
//
// handleSearch(e):
//   router.get("/bookings", { ...filters, search: e.target.value, page: 1 },
//     { preserveState: true, preserveScroll: true })
//
// render:
//   <Head title="Bookings" />  ← updates <title> without full reload
//   filter bar: <select> + <input type="search">
//   <Link href="/bookings/create"> (if auth.permissions.includes("bookings.create"))
//   bookings table with <Link href={/bookings/${id}}> View
//   pagination: {links.prev && <Link href={links.prev}>} + page N of M + next
//
// PERSISTENT LAYOUT:
//   BookingsPage.layout = (page) => <MainLayout title="Bookings">{page}</MainLayout>
// ============================================================
