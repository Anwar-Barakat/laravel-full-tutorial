# React Router vs Next.js — Routing Comparison

---

## 1. Setup

**React Router:**
- install manually: `npm install react-router-dom`
- define routes yourself in a config array
- wrap app with `<RouterProvider router={router} />`

**Next.js:**
- built-in, no install needed
- routes come from folder structure automatically
- just create `app/dashboard/page.tsx` → `/dashboard` exists

```tsx
// React Router
const router = createBrowserRouter([
  { path: "/dashboard", element: <DashboardPage /> },
])
<RouterProvider router={router} />

// Next.js — just create the file
// app/dashboard/page.tsx → /dashboard (automatic)
```

---

## 2. Nested Layouts + Outlet

**React Router:**
- layout component contains `<Outlet />`
- `<Outlet />` is where the child route renders
- layout stays on screen, only the child swaps

**Next.js:**
- create `layout.tsx` file in the folder
- `{children}` is where the child page renders
- same behaviour — layout persists, child swaps

```tsx
// React Router
export function AppLayout() {
  return (
    <div>
      <Sidebar />
      <Outlet />   {/* child route renders here */}
    </div>
  )
}

// Next.js — app/layout.tsx
export default function AppLayout({ children }) {
  return (
    <div>
      <Sidebar />
      {children}   {/* child page renders here */}
    </div>
  )
}
```

---

## 3. Protected Routes

**React Router:**
- create a `ProtectedRoute` component (no path)
- renders `<Outlet />` if authorized
- renders `<Navigate to="/login" />` if not
- wrap protected routes inside it in the config

**Next.js:**
- use `middleware.ts` at the root (runs on server/edge)
- call `NextResponse.redirect()` to block access
- OR check auth inside `layout.tsx` and call `redirect()`

```tsx
// React Router
export function ProtectedRoute({ requiredRoles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <Spinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (requiredRoles && !requiredRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />

  return <Outlet />
}

// Next.js — middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] }
```

---

## 4. Dynamic Routes

**React Router:**
- define with `:param` in the path: `path: "/bookings/:id"`
- read with `useParams()` hook inside the component

**Next.js:**
- create folder with brackets: `app/bookings/[id]/page.tsx`
- read from `params.id` prop passed to the page component

```tsx
// React Router
{ path: "/bookings/:id", element: <BookingDetail /> }

function BookingDetail() {
  const { id } = useParams()
  return <div>Booking {id}</div>
}

// Next.js — app/bookings/[id]/page.tsx
export default function BookingDetail({ params }) {
  return <div>Booking {params.id}</div>
}
```

---

## 5. Programmatic Navigation

**React Router:**
- `useNavigate()` hook
- `navigate("/dashboard")` → go to page
- `navigate(-1)` → go back
- `navigate("/login", { replace: true })` → replace history

**Next.js:**
- `useRouter()` from `next/navigation`
- `router.push("/dashboard")` → go to page
- `router.back()` → go back
- `router.replace("/login")` → replace history

```tsx
// React Router
const navigate = useNavigate()
navigate("/dashboard")
navigate(-1)
navigate("/login", { replace: true })

// Next.js
const router = useRouter()
router.push("/dashboard")
router.back()
router.replace("/login")
```

---

## 6. Current Location / URL

**React Router:**
- `useLocation()` returns the full location object
- `location.pathname` → current path
- `location.search` → query string

**Next.js:**
- `usePathname()` → current path only
- `useSearchParams()` → query string separately
- two hooks instead of one

```tsx
// React Router
const location = useLocation()
location.pathname   // "/bookings/5"
location.search     // "?page=2"

// Next.js
const pathname     = usePathname()     // "/bookings/5"
const searchParams = useSearchParams()
searchParams.get("page")               // "2"
```

---

## 7. NavLink Active Styling

**React Router:**
- `<NavLink>` knows if it's the current page
- `className={({ isActive }) => isActive ? "active" : ""}`
- built-in, no extra code needed

**Next.js:**
- `<Link>` has no built-in active state
- check manually: `pathname === href ? "active" : ""`
- need `usePathname()` + conditional class

```tsx
// React Router — built-in isActive
<NavLink
  to="/dashboard"
  className={({ isActive }) => isActive ? "text-blue-600 font-bold" : "text-gray-500"}
>
  Dashboard
</NavLink>

// Next.js — manual check
const pathname = usePathname()
<Link
  href="/dashboard"
  className={pathname === "/dashboard" ? "text-blue-600 font-bold" : "text-gray-500"}
>
  Dashboard
</Link>
```

---

## 8. 404 Page

**React Router:**
- add `{ path: "*", element: <NotFoundPage /> }` at the end of routes
- must be the last route — catches everything not matched above

**Next.js:**
- create `app/not-found.tsx` file
- Next.js shows it automatically for unmatched routes

```tsx
// React Router — catch-all, must be last
{ path: "*", element: <NotFoundPage /> }

// Next.js — just create the file
// app/not-found.tsx
export default function NotFoundPage() {
  return <h1>404 - Page Not Found</h1>
}
```

---

## 9. Loading State During Navigation

**React Router:**
- `useNavigation()` hook → `navigation.state` is `"idle"` or `"loading"`
- build your own progress bar component
- full manual control over the UI

**Next.js:**
- create `loading.tsx` in the folder
- Next.js shows it automatically while the page loads
- no hook needed for basic loading UI

```tsx
// React Router — manual progress bar
const navigation = useNavigation()
const isLoading  = navigation.state !== "idle"
// render your own bar based on isLoading

// Next.js — just create the file
// app/dashboard/loading.tsx
export default function Loading() {
  return <Spinner />   // shown automatically while page loads
}
```

---

## 10. Error Handling

**React Router:**
- add `errorElement: <RouteErrorBoundary />` to the route config
- use `useRouteError()` hook to get the error inside the component
- `isRouteErrorResponse(error)` to check if it's an HTTP error

**Next.js:**
- create `error.tsx` file in the folder
- receives `error` and `reset` as props automatically
- must be a client component (`"use client"`)

```tsx
// React Router
{ path: "/dashboard", element: <DashboardPage />, errorElement: <RouteErrorBoundary /> }

function RouteErrorBoundary() {
  const error = useRouteError()
  return <div>Error: {error.message}</div>
}

// Next.js — app/dashboard/error.tsx
"use client"
export default function Error({ error, reset }) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## 11. Breadcrumbs

**React Router:**
- attach metadata to routes: `handle: { breadcrumb: "Bookings" }`
- `useMatches()` returns all matched routes in the current hierarchy
- filter by `m.handle?.breadcrumb` to build the trail

**Next.js:**
- no built-in breadcrumb support
- parse `usePathname()` manually
- split by `/` and map each segment to a label

```tsx
// React Router — metadata on route config
{ path: "/bookings", handle: { breadcrumb: "Bookings" } }

function Breadcrumbs() {
  const matches = useMatches()
  const crumbs  = matches.filter(m => m.handle?.breadcrumb)
  // Home / Bookings / Booking Details
}

// Next.js — manual parsing
function Breadcrumbs() {
  const pathname = usePathname()                          // "/bookings/42"
  const segments = pathname.split("/").filter(Boolean)   // ["bookings", "42"]
  // build crumbs from segments manually
}
```

---

## When to use which?

**Use React Router when:**
- building a SPA (no server-side rendering needed)
- using Vite or CRA
- you want full manual control over routes
- this challenge

**Use Next.js when:**
- you need SSR or SSG for SEO
- file-based routing is simpler for your project
- building a full-stack React app
- challenge 06 (Next.js App Router)
