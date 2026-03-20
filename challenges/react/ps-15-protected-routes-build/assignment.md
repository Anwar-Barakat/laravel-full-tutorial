# Challenge 15: Protected Routes (BUILD)

**Topic:** Build protected routes with authentication guards

**Context:** Tripz — Laravel + React school booking platform

---

## Task

Build a complete authentication routing system for Tripz using React Router v6 and Zustand.

---

## Requirements

1. **Public routes** — accessible without authentication: `/login`, `/register`, `/trips`
2. **Protected routes** — require a logged-in user: `/dashboard`, `/bookings/*`, `/profile`
3. **Admin-only routes** — require `role === 'admin'`: `/admin/*`
4. If **unauthenticated** and visiting a protected route → redirect to `/login?redirect=/intended-path`
5. If **already authenticated** and visiting `/login` → redirect to `/dashboard`
6. If **authenticated but wrong role** on `/admin/*` → show a `ForbiddenPage` (403)
7. After login → redirect to the original intended path stored in `?redirect` query param
8. Auth state comes from a **Zustand store** (not React Context)

---

## Types

```typescript
interface User {
  id:    number
  email: string
  role:  'admin' | 'school_admin' | 'parent'
  token: string
}

interface LoginCredentials {
  email:    string
  password: string
}

interface AuthStore {
  user:            User | null
  isAuthenticated: boolean
  login:           (credentials: LoginCredentials) => Promise<void>
  logout:          () => void
}
```

---

## Starter Code

```tsx
// App.tsx — complete the routing setup
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* TODO: public routes — no guard */}
        {/* TODO: guest-only routes — redirect if already logged in */}
        {/* TODO: protected routes — redirect to login if not authenticated */}
        {/* TODO: admin routes — show 403 if authenticated but not admin */}
      </Routes>
    </BrowserRouter>
  )
}
```

---

## Components to Build

You need to implement:

- `ProtectedRoute` — renders `<Outlet />` if authenticated, otherwise redirects
- `AdminRoute` — renders `<Outlet />` if authenticated AND admin role, otherwise 403
- `GuestRoute` — renders `<Outlet />` if NOT authenticated, otherwise redirects to dashboard
- `LoginPage` — reads `?redirect` param and navigates there after successful login
- `ForbiddenPage` — static 403 message page

---

## Expected Behaviour

| Path | Unauthenticated | Authenticated (parent) | Authenticated (admin) |
|------|----------------|------------------------|----------------------|
| `/login` | Shows login form | Redirects to `/dashboard` | Redirects to `/dashboard` |
| `/trips` | Shows trips | Shows trips | Shows trips |
| `/dashboard` | Redirects to `/login?redirect=/dashboard` | Shows dashboard | Shows dashboard |
| `/bookings/5` | Redirects to `/login?redirect=/bookings/5` | Shows booking | Shows booking |
| `/admin/users` | Redirects to `/login?redirect=/admin/users` | Shows 403 Forbidden | Shows admin page |

---

## Constraints

- Use React Router v6 (`<Outlet />`, nested routes, `useNavigate`, `useLocation`, `useSearchParams`)
- Auth state from Zustand — use `useAuthStore` hook
- No third-party auth library (no NextAuth, no Clerk)
- TypeScript throughout
