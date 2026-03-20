# VUE_TEST_03 — Vue Router · Navigation Guards · Programmatic Navigation

**Time:** 25 minutes | **Stack:** Vue 3 · TypeScript · Vue Router 4 · Pinia

---

## Setup

The Tripz app uses Vue Router 4 for SPA navigation. Routes need auth guards,
role checks, unsaved-changes protection, lazy loading, and nested layouts.

### Types

```typescript
// types/auth.ts
export interface User {
  id:    number
  name:  string
  email: string
  role:  'admin' | 'school_admin' | 'parent'
}

// Extend RouteMeta for TypeScript — put in env.d.ts or router/index.ts
import 'vue-router'
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresRole?: 'admin' | 'school_admin'
    title?:        string
    transition?:   string
  }
}
```

---

## Problem 01 — Router Config & Navigation Guards

### 1a. Route Configuration

Create `src/router/index.ts`:

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/bookings',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),   // lazy loaded
    meta: { title: 'Sign In' },
    beforeEnter: (_to, _from, next) => {
      // Redirect if already authenticated
      const auth = useAuthStore()
      auth.isAuthenticated ? next('/bookings') : next()
    },
  },
  {
    path: '/bookings',
    name: 'bookings',
    component: () => import('@/pages/BookingsPage.vue'),
    meta: { requiresAuth: true, title: 'Bookings' },
  },
  {
    path: '/bookings/:id(\\d+)',               // regex: digits only
    name: 'booking-detail',
    component: () => import('@/pages/BookingDetailPage.vue'),
    meta: { requiresAuth: true, title: 'Booking Detail' },
    props: true,                              // passes :id as prop to component
  },
  {
    path: '/bookings/:id(\\d+)/edit',
    name: 'booking-edit',
    component: () => import('@/pages/BookingEditPage.vue'),
    meta: { requiresAuth: true, title: 'Edit Booking' },
    props: true,
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'admin' },  // guard applies to all children
    children: [
      {
        path: '',                             // /admin → redirect
        redirect: { name: 'admin-dashboard' },
      },
      {
        path: 'dashboard',                    // /admin/dashboard
        name: 'admin-dashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
        meta: { title: 'Admin Dashboard' },
      },
      {
        path: 'users',                        // /admin/users
        name: 'admin-users',
        component: () => import('@/pages/admin/UsersPage.vue'),
        meta: { title: 'Users' },
      },
    ],
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: 'Not Found' },
  },
  {
    path: '/:pathMatch(.*)*',                 // catch-all
    redirect: { name: 'not-found' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition   // browser back/forward
    if (to.hash)        return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }                         // new navigation → scroll to top
  },
})
```

### 1b. Global beforeEach Guard

```typescript
// Add BEFORE `export default router`

router.beforeEach((to, _from, next) => {
  // 1. Update document title
  document.title = to.meta.title ? `${to.meta.title} — Tripz` : 'Tripz'

  // 2. Public routes — no auth needed
  if (!to.meta.requiresAuth) return next()

  // 3. Unauthenticated — redirect to login, store intended path in query
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // 4. Role check — route requires specific role
  if (to.meta.requiresRole && auth.user?.role !== to.meta.requiresRole) {
    return next({ name: 'not-found' })        // or a '/forbidden' route
  }

  next()
})

export default router
```

### 1c. BookingEditPage — onBeforeRouteLeave (unsaved changes)

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useBookingStore } from '@/stores/booking'

const router = useRouter()
const route  = useRoute()
const store  = useBookingStore()

const id       = computed(() => Number(route.params.id))
const isDirty  = ref(false)
const isSaving = ref(false)

// In-component guard — fires before leaving this route instance
onBeforeRouteLeave((_to, _from) => {
  if (isDirty.value && !isSaving.value) {
    const confirmed = window.confirm('You have unsaved changes. Leave anyway?')
    if (!confirmed) return false              // return false = cancel navigation
  }
  // returning nothing (undefined) = allow navigation
})

async function save() {
  isSaving.value = true
  await store.updateBooking(id.value, form.value)
  isDirty.value = false
  router.push({ name: 'booking-detail', params: { id: id.value } })
}

function cancel() {
  router.back()
}
</script>
```

### 1d. Programmatic Navigation

```typescript
// Named route + params (preferred over raw string paths — refactor-safe)
router.push({ name: 'booking-detail', params: { id: 42 } })

// With query params
router.push({ name: 'bookings', query: { status: 'pending', page: '2' } })

// replace — no history entry (user can't press Back to return here)
router.replace({ name: 'bookings' })

// After login: redirect back to intended page
const redirect = route.query.redirect as string | undefined
router.replace(redirect ?? { name: 'bookings' })

// Back / forward
router.back()
router.go(-1)   // equivalent

// router.push returns Promise<NavigationFailure | undefined>
const failure = await router.push({ name: 'booking-detail', params: { id } })
if (failure) console.warn('Navigation failed:', failure)
```

### 1e. useRoute() — reactive params & query

```vue
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBookingStore } from '@/stores/booking'

const route = useRoute()
const store = useBookingStore()

// route.params.id is always string | string[] — cast explicitly
const bookingId = computed(() => Number(route.params.id))

// Query params
const page   = computed(() => Number(route.query.page)   || 1)
const status = computed(() => route.query.status as string || '')

// Re-fetch when param changes (navigating between booking detail pages)
watch(bookingId, (newId) => {
  store.fetchBooking(newId)
}, { immediate: true })
</script>
```

### 1f. RouterLink

```vue
<template>
  <!-- Basic named link -->
  <RouterLink :to="{ name: 'bookings' }">Bookings</RouterLink>

  <!-- Custom active classes (Tailwind) -->
  <RouterLink
    :to="{ name: 'bookings' }"
    active-class="bg-blue-100 text-blue-700"
    exact-active-class="font-bold"
  >
    Bookings
  </RouterLink>

  <!-- v-slot for fully custom active styling -->
  <RouterLink
    v-slot="{ href, isActive, isExactActive, navigate }"
    :to="{ name: 'bookings' }"
    custom
  >
    <a
      :href="href"
      :class="['nav-link', isActive && 'nav-link--active', isExactActive && 'nav-link--exact']"
      @click="navigate"
    >
      Bookings
    </a>
  </RouterLink>

  <!-- Link with params -->
  <RouterLink :to="{ name: 'booking-detail', params: { id: booking.id } }">
    View #{{ booking.id }}
  </RouterLink>
</template>
```

---

## Problem 02 — Advanced Vue Router

### 2a. Nested Layouts with RouterView

```vue
<!-- src/layouts/AppLayout.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <AppNavbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <RouterView />      <!-- matched child route renders here -->
    </main>
    <AppFooter />
  </div>
</template>
```

```typescript
// Route config: wrap authenticated routes in AppLayout
{
  path: '/',
  component: () => import('@/layouts/AppLayout.vue'),
  meta: { requiresAuth: true },              // guard on parent = applies to all children
  children: [
    { path: 'bookings',           name: 'bookings',       component: () => import('@/pages/BookingsPage.vue') },
    { path: 'bookings/:id(\\d+)', name: 'booking-detail', component: () => import('@/pages/BookingDetailPage.vue'), props: true },
    { path: 'bookings/:id(\\d+)/edit', name: 'booking-edit', component: () => import('@/pages/BookingEditPage.vue'), props: true },
  ],
}
// AppLayout renders ONCE — only the inner <RouterView /> swaps per navigation
```

### 2b. RouterView v-slot: Transitions + KeepAlive

```vue
<!-- App.vue -->
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="route.meta.transition ?? 'fade'" mode="out-in">
      <KeepAlive :include="['BookingsPage']">       <!-- cache BookingsPage scroll position -->
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>

<style>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>
```

### 2c. useNavigation composable

```typescript
// src/composables/useNavigation.ts
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function useNavigation() {
  const router = useRouter()
  const route  = useRoute()
  const auth   = useAuthStore()

  const currentTitle = computed(() => route.meta.title ?? 'Tripz')

  // Breadcrumbs from matched route hierarchy
  const breadcrumbs = computed(() =>
    route.matched
      .filter(r => r.meta.title)
      .map(r => ({
        name:  r.name as string,
        title: r.meta.title as string,
      }))
  )

  const isAdminRoute = computed(() => route.meta.requiresRole === 'admin')

  async function goToBooking(id: number) {
    await router.push({ name: 'booking-detail', params: { id } })
  }

  async function goToEdit(id: number) {
    await router.push({ name: 'booking-edit', params: { id } })
  }

  async function logout() {
    await auth.logout()
    await router.replace({ name: 'login' })
  }

  return { currentTitle, breadcrumbs, isAdminRoute, goToBooking, goToEdit, logout }
}
```

### 2d. useRouteParams composable

```typescript
// src/composables/useRouteParams.ts
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useRouteParams() {
  const route = useRoute()

  const id     = computed(() => Number(route.params.id) || null)
  const page   = computed(() => Number(route.query.page) || 1)
  const search = computed(() => route.query.search as string || '')
  const status = computed(() => route.query.status as string || '')

  return { id, page, search, status }
}

// Usage in any component:
// const { id, page, status } = useRouteParams()
```

### 2e. afterEach — analytics + progress bar

```typescript
import NProgress from 'nprogress'

router.beforeEach(() => {
  NProgress.start()
})

router.afterEach((to) => {
  NProgress.done()

  // Analytics: track page view on every navigation
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', 'GA_ID', { page_path: to.fullPath })
  }
})
```

### 2f. Vue Router vs React Router

```
ROUTE CONFIGURATION:
  Vue:   const router = createRouter({ routes })  ← central config array
  React: <Routes><Route path="..." element={...}/></Routes>  ← JSX in component tree

READING PARAMS:
  Vue:   useRoute().params.id        (string | string[])
  React: useParams().id              (string | undefined)

READING QUERY:
  Vue:   useRoute().query.page       (string | string[] | null)
  React: useSearchParams()[0].get('page')   (string | null)

PROGRAMMATIC NAVIGATION:
  Vue:   router.push({ name: 'booking-detail', params: { id } })
  React: navigate('/bookings/' + id)  or  navigate({ pathname: ... })

NAVIGATION GUARDS:
  Vue:   router.beforeEach((to, from, next) => { ... })  ← centralized guard
         onBeforeRouteLeave()  ← in-component guard
  React: No built-in guards — use loader() (v6.4+) before render
         or <Navigate to="..."> inside component (render-time redirect)

NESTED LAYOUTS:
  Vue:   parent route with <RouterView /> in template → children render inside
  React: parent route with <Outlet /> in JSX — same concept, different API

LAZY LOADING:
  Vue:   component: () => import('./Page.vue')  ← native dynamic import
  React: React.lazy(() => import('./Page'))  + <Suspense fallback={...}>

ACTIVE LINK STYLING:
  Vue:   <RouterLink> auto-applies router-link-active / router-link-exact-active
         active-class / exact-active-class props for custom classes
  React: <NavLink className={({ isActive }) => isActive ? 'active' : ''}>

SCROLL RESTORATION:
  Vue:   scrollBehavior(to, from, savedPosition) option in createRouter
  React: <ScrollRestoration /> component (v6.4+)

PROPS FROM PARAMS:
  Vue:   props: true on route → params passed as component props
  React: params always via useParams() — no direct prop injection
```

### 2g. Testing

```typescript
// vitest + @vue/test-utils + vue-router
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),          // no real URL — safe for tests
    routes: [
      { path: '/bookings', name: 'bookings', component: { template: '<div>bookings</div>' } },
      { path: '/login',    name: 'login',    component: { template: '<div>login</div>' } },
      { path: '/bookings/:id(\\d+)', name: 'booking-detail', component: BookingDetailPage },
    ],
  })
}

test('beforeEach redirects unauthenticated user to login', async () => {
  const router = makeRouter()
  const pinia  = createTestingPinia({ initialState: { auth: { token: null } } })

  mount(App, { global: { plugins: [router, pinia] } })

  await router.push('/bookings')
  await router.isReady()

  expect(router.currentRoute.value.name).toBe('login')
  expect(router.currentRoute.value.query.redirect).toBe('/bookings')
})

test('renders booking detail when authenticated', async () => {
  const router = makeRouter()
  const pinia  = createTestingPinia({ initialState: { auth: { token: 'tok_123', user: { role: 'parent' } } } })

  const wrapper = mount(App, { global: { plugins: [router, pinia] } })

  await router.push('/bookings/42')
  await router.isReady()

  expect(router.currentRoute.value.name).toBe('booking-detail')
  expect(router.currentRoute.value.params.id).toBe('42')
})
```
