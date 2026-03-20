# VUE_TEST_10 — Vue vs React Interview Prep

**Time:** Reference material (no time limit) | **Stack:** Vue 3 · React 18 · TypeScript

---

## Context

You are a senior developer on the **Tripz** school booking platform, built on Laravel + Vue 3 (Inertia.js). Your team is interviewing for senior frontend roles and you need to articulate the precise differences between Vue 3 and React 18. This module is a deep comparison for interview preparation — not a coding exercise.

---

## 1. Reactivity System

### Vue: Proxy-based automatic dependency tracking

```typescript
// Vue tracks WHAT you READ, automatically, at runtime
import { ref, reactive, computed, watch, watchEffect } from 'vue'

const search   = ref('')
const bookings = ref<Booking[]>([])

// computed: cached, auto-tracked, re-runs only when deps change
const filtered = computed(() =>
  bookings.value.filter(b =>
    b.destination.toLowerCase().includes(search.value.toLowerCase())
  )
)
// Vue reads search.value and bookings.value inside the getter
// → Both are tracked automatically via ES Proxy
// → When either changes, filtered is invalidated and recomputed
// → Accessing filtered.value 1000× costs nothing (cached)
// → No dependency array to declare, no stale closure risk

// reactive: for grouped state objects
const filters = reactive({
  status:   '' as Booking['status'] | '',
  dateFrom: '',
  dateTo:   '',
})
// filters.status = 'pending'  ← direct mutation, Vue detects via Proxy
// ← NO setter function needed, NO spread/clone required
```

### React: useState + manual dependency declaration

```typescript
// React: you TELL IT what changed via setState, then re-renders the component
import { useState, useMemo, useEffect } from 'react'

const [search,   setSearch]   = useState('')
const [bookings, setBookings] = useState<Booking[]>([])

// useMemo: equivalent caching, but YOU declare the dependency array
const filtered = useMemo(
  () => bookings.filter(b =>
    b.destination.toLowerCase().includes(search.toLowerCase())
  ),
  [bookings, search]   // ← must list EVERY value used inside
  // Missing a dep → stale closure (value reads old data silently)
  // eslint-plugin-react-hooks/exhaustive-deps warns you, but can miss cases
)

// Object state: MUST clone on update (immutable pattern)
const [filters, setFilters] = useState({ status: '', dateFrom: '', dateTo: '' })
// setFilters(prev => ({ ...prev, status: 'pending' }))
// ← spread is required — direct mutation does NOT trigger re-render
```

### Vue computed vs React useMemo

```
SIMILARITY:
  Both cache a derived value and only recompute when dependencies change.
  Both are synchronous. Neither should have side effects.

VUE computed:
  ← dependencies tracked automatically at runtime (no array)
  ← lazy by default (not computed until first access)
  ← supports writable computed: get() + set()
  ← returns a Ref<T> — read via .value in <script setup>
  ← rendered directly in template: {{ formattedAmount }}

REACT useMemo:
  ← dependency array required: useMemo(() => ..., [dep1, dep2])
  ← missing dep = stale result (silent bug, easy to introduce)
  ← runs on mount always (no lazy option)
  ← returns the raw value (not a ref wrapper)
  ← must be called at top level of the component function (Rules of Hooks)

KEY DIFFERENCE:
  Vue: const total = computed(() => items.value.reduce(...))
       ← Vue tracks items.value automatically
  React: const total = useMemo(() => items.reduce(...), [items])
         ← you manage the array — if items is derived from other state,
           you must also add that state to the array
```

### Vue watch vs React useEffect

```typescript
// ============================================================
// WATCH: reactive source → runs on CHANGE only (lazy by default)
// ============================================================

// VUE watch
watch(search, (newVal, oldVal) => {
  console.log(`Changed from "${oldVal}" to "${newVal}"`)
  // ← old value available natively — no useRef workaround
})

watch(
  () => route.params.id,          // getter = watch non-ref reactive
  async (newId) => {
    await store.fetchBooking(Number(newId))
  },
  { immediate: true }             // run once on mount with current value
)

watch([page, perPage], ([newPage, newPerPage]) => {
  store.fetchBookings({ page: newPage, perPage: newPerPage })
})

// REACT useEffect (closest equivalent)
useEffect(() => {
  fetchBooking(Number(id))
}, [id])
// ← always runs on mount (no 'immediate' needed — it IS immediate)
// ← no old value — use useRef to track previous:
//   const prevId = useRef(id)
//   useEffect(() => { prevId.current = id }, [id])

// ============================================================
// WATCHEFFECT: auto-tracks, runs IMMEDIATELY
// ============================================================

// VUE watchEffect
watchEffect(async (onCleanup) => {
  const ctrl = new AbortController()
  onCleanup(() => ctrl.abort())   // cleanup before next run or unmount

  document.title = `${bookings.value.length} bookings — ${filters.status || 'All'}`
  // ← reads bookings.value AND filters.status → both tracked automatically
})

// REACT useEffect with auto-track equivalent (manual)
useEffect(() => {
  document.title = `${bookings.length} bookings — ${filters.status || 'All'}`
  // ← must list BOTH in deps array:
}, [bookings, filters.status])
// ← cleanup is the return value, not a callback parameter:
//   return () => controller.abort()

// ============================================================
// OLD VALUE — critical interview point
// ============================================================

// VUE: provided automatically by watch
watch(count, (newVal, oldVal) => {
  // both available in callback signature — no extra code
})

// REACT: must manually track with useRef
const prevCount = useRef(count)
useEffect(() => {
  console.log(`Changed from ${prevCount.current} to ${count}`)
  prevCount.current = count       // update ref AFTER reading old value
}, [count])
```

---

## 2. Component Model

### Vue SFC (.vue): template + script + style in one file

```vue
<!-- components/BookingCard.vue — all concerns in one file -->
<script setup lang="ts">
// Typed props with TypeScript generic — no runtime declaration needed
const props = defineProps<{
  booking: Booking
  selected?: boolean
}>()

// Typed emits
const emit = defineEmits<{
  (e: 'action', action: 'confirm' | 'cancel', id: number): void
  (e: 'select', id: number): void
}>()

const statusColour = computed(() => ({
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  paid:      'bg-green-100 text-green-800',
}[props.booking.status] ?? 'bg-gray-100'))
</script>

<template>
  <!-- Declarative HTML: directives are attributes, not JS expressions -->
  <div
    :class="['card', selected ? 'ring-2 ring-indigo-500' : '']"
    @click="emit('select', booking.id)"
  >
    <span :class="statusColour">{{ booking.status }}</span>

    <!-- v-if: conditional rendering — removed from DOM when false -->
    <button v-if="booking.status === 'pending'" @click.stop="emit('action', 'confirm', booking.id)">
      Confirm
    </button>

    <!-- v-for: list rendering with required :key -->
    <!-- v-model: two-way binding in ONE directive -->
  </div>
</template>

<style scoped>
/* Scoped: styles apply only to this component's DOM -->
.card { border-radius: 0.75rem; }
</style>
```

### React: JSX — JavaScript with HTML-like syntax

```tsx
// components/BookingCard.tsx — logic and markup interleaved in .tsx
interface BookingCardProps {
  booking:  Booking
  selected?: boolean
  onAction: (action: 'confirm' | 'cancel', id: number) => void
  onSelect: (id: number) => void
}

// Props are plain function parameters — no special declaration syntax
function BookingCard({ booking, selected = false, onAction, onSelect }: BookingCardProps) {
  const statusColour = useMemo(() => ({
    pending:   'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    paid:      'bg-green-100 text-green-800',
  }[booking.status] ?? 'bg-gray-100'), [booking.status])

  return (
    // JSX: className not class, onClick not @click, camelCase events
    <div
      className={`card ${selected ? 'ring-2 ring-indigo-500' : ''}`}
      onClick={() => onSelect(booking.id)}
    >
      <span className={statusColour}>{booking.status}</span>

      {/* Conditional: inline ternary or && — JS expressions in {} */}
      {booking.status === 'pending' && (
        <button onClick={e => { e.stopPropagation(); onAction('confirm', booking.id) }}>
          Confirm
        </button>
      )}
    </div>
  )
}
// CSS: import './BookingCard.css' or CSS Modules or styled-components
// No scoped styles built in — must use external solution
```

### Vue template directives vs React JSX expressions

```
CONDITIONAL:
  Vue:   <div v-if="show">...</div>
         <div v-else-if="other">...</div>
         <div v-else>...</div>
         ← removed from DOM when false

  React: {show && <div>...</div>}
         {show ? <div>A</div> : <div>B</div>}
         ← JS ternary/&& in JSX
         ← for 3+ branches use an IIFE or extracted function

LIST RENDERING:
  Vue:   <li v-for="item in items" :key="item.id">{{ item.name }}</li>
         ← directive, template stays HTML-like
         ← :key is enforced by linting

  React: {items.map(item => <li key={item.id}>{item.name}</li>)}
         ← .map() call inside JSX
         ← key in .map() is easy to forget (runtime warning)

TWO-WAY BINDING:
  Vue:   <input v-model="search" />
         ← ONE directive — reads value, writes on input
         ← modifiers: v-model.trim, v-model.number, v-model.lazy

  React: <input value={search} onChange={e => setSearch(e.target.value)} />
         ← TWO attributes always — value + onChange handler
         ← modifiers are manual: setSearch(e.target.value.trim())

CLASS BINDING:
  Vue:   :class="{ active: isActive, 'text-red': hasError }"
         :class="[baseClass, isActive ? 'active' : '']"

  React: className={`base ${isActive ? 'active' : ''}`}
         ← string template literal (or clsx/classnames library)

EVENT MODIFIERS:
  Vue:   @click.stop   @submit.prevent   @keyup.enter
         ← built-in modifiers: no boilerplate in handler

  React: onClick={e => { e.stopPropagation(); ... }}
         onSubmit={e => { e.preventDefault(); ... }}
         ← call methods manually inside handler
```

### defineProps/defineEmits vs function props + callbacks

```typescript
// ============================================================
// VUE: Props are REACTIVE — accessing props.x inside computed
// triggers automatic tracking
// ============================================================

const props = defineProps<{
  booking: Booking
  variant?: 'compact' | 'full'
}>()

// With defaults:
const props = withDefaults(defineProps<{
  booking: Booking
  variant?: 'compact' | 'full'
}>(), {
  variant: 'full',
})

// Emits: typed event contract between parent and child
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'action', action: string, id: number): void
}>()

// Calling emit:
emit('action', 'confirm', booking.id)

// ============================================================
// REACT: Props are plain JS values — no reactivity layer
// ============================================================

interface Props {
  booking: Booking
  variant?: 'compact' | 'full'
  onAction: (action: string, id: number) => void  // callbacks ARE props
}

function BookingCard({ booking, variant = 'full', onAction }: Props) {
  // booking.status here is a static read — no reactive tracking
  // calling onAction('confirm', booking.id) invokes the parent callback
}

// KEY DIFFERENCES:
// Vue: events are declared separately (defineEmits) — enforced typing
// React: events are just props named with 'on' prefix — no distinction
//
// Vue: props.booking.amount inside computed → auto-tracked
// React: booking.amount inside useMemo → must add booking to deps array
//
// Vue: two-way binding via v-model + defineModel() (Vue 3.4+)
// React: two-way binding via value prop + onChange callback (controlled input pattern)
```

---

## 3. State Management

### Pinia (Vue) vs Zustand vs Redux Toolkit (React)

```typescript
// ============================================================
// PINIA — Vue's official store (setup syntax)
// ============================================================
// src/stores/booking.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBookingStore = defineStore('booking', () => {
  // State: plain refs/reactive
  const bookings  = ref<Booking[]>([])
  const isLoading = ref(false)
  const error     = ref<string | null>(null)

  // Getters: computed values
  const confirmedBookings = computed(() =>
    bookings.value.filter(b => b.status === 'confirmed')
  )
  const totalRevenue = computed(() =>
    bookings.value.filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0)
  )

  // Actions: async or sync methods
  async function fetchBookings() {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/v1/bookings')
      bookings.value = await res.json()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      isLoading.value = false
    }
  }

  function setFilter(status: string) {
    // direct mutation — no action creators, no reducers
  }

  return { bookings, isLoading, error, confirmedBookings, totalRevenue, fetchBookings }
})

// Usage in component:
// const store = useBookingStore()
// const { bookings, isLoading } = storeToRefs(store)  ← preserve reactivity
// store.fetchBookings()

// ============================================================
// ZUSTAND — minimal React store
// ============================================================
// src/stores/bookingStore.ts
import { create } from 'zustand'

interface BookingStore {
  bookings:  Booking[]
  isLoading: boolean
  error:     string | null
  fetchBookings: () => Promise<void>
}

export const useBookingStore = create<BookingStore>((set) => ({
  bookings:  [],
  isLoading: false,
  error:     null,

  fetchBookings: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/v1/bookings')
      set({ bookings: await res.json(), isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },
}))

// Usage:
// const { bookings, isLoading, fetchBookings } = useBookingStore()
// ← re-renders only when subscribed slice changes (selector optimization)

// ============================================================
// REDUX TOOLKIT — structured, verbose, powerful
// ============================================================
// src/features/bookings/bookingSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchBookings = createAsyncThunk('bookings/fetchAll', async () => {
  const res = await fetch('/api/v1/bookings')
  return res.json()
})

const bookingSlice = createSlice({
  name: 'bookings',
  initialState: { bookings: [] as Booking[], isLoading: false, error: null as string | null },
  reducers: {
    setFilter: (state, action) => { state.activeFilter = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending,   (state) => { state.isLoading = true })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false
        state.bookings  = action.payload
      })
      .addCase(fetchBookings.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.error.message ?? 'Failed'
      })
  },
})

// Usage:
// const dispatch = useDispatch()
// const bookings = useSelector((s: RootState) => s.bookings.bookings)
// dispatch(fetchBookings())
```

### Comparison table

```
FEATURE              PINIA              ZUSTAND            REDUX TOOLKIT
─────────────────────────────────────────────────────────────────────────
Boilerplate          Low                Very low           High
Bundle size          ~1KB               ~1KB               ~12KB
Learning curve       Easy               Very easy          Steep
TypeScript           First-class        First-class        First-class
DevTools             Vue DevTools       Redux DevTools     Redux DevTools
Async actions        Direct async fn    Direct async fn    createAsyncThunk
Mutation style       Direct (Proxy)     set({...})         Immer (draft)
Composition          Store calls store  Zustand combines   RTK Query combiner
Persistence plugin   pinia-plugin-persist  zustand/middleware  redux-persist
Server state         Not included       Not included       RTK Query (built-in)
Vue integration      Official           N/A (React only)   N/A (React only)
React integration    N/A                Yes                Yes

VERDICT:
  Laravel + Vue → Pinia. Official, opinionated, minimal boilerplate.
  React (small-medium) → Zustand. Less code, just as capable.
  React (large/enterprise, server cache) → Redux Toolkit + RTK Query.
```

---

## 4. Routing

### Vue Router vs React Router v6

```typescript
// ============================================================
// VUE ROUTER — Navigation Guards
// ============================================================
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/bookings',
      name: 'bookings',
      component: () => import('@/pages/BookingsPage.vue'),  // lazy loaded
      meta: { requiresAuth: true, title: 'Bookings' },
    },
    {
      path: '/bookings/:id(\\d+)',
      name: 'booking-detail',
      component: () => import('@/pages/BookingDetailPage.vue'),
      props: true,          // params passed as component props
      meta: { requiresAuth: true },
    },
  ],
})

// Global guard: runs before EVERY navigation
router.beforeEach((to, from) => {
  const auth = useAuthStore()

  document.title = to.meta.title ? `${to.meta.title} — Tripz` : 'Tripz'

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Redirect to login, preserve intended destination
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // return nothing / return true → proceed
})

// In-component guard (blocks navigation away from dirty form)
// import { onBeforeRouteLeave } from 'vue-router'
// onBeforeRouteLeave(() => {
//   if (isDirty.value) return window.confirm('Leave with unsaved changes?')
// })

// ============================================================
// REACT ROUTER v6 — Loaders
// ============================================================
// src/router/routes.tsx
import { createBrowserRouter, redirect } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/bookings',
    element: <BookingsPage />,
    // loader: runs BEFORE component renders, blocks navigation
    loader: async ({ request }) => {
      const session = await getSession(request)
      if (!session) throw redirect('/login')

      const bookings = await fetch('/api/v1/bookings').then(r => r.json())
      return { bookings }           // available via useLoaderData() in component
    },
    errorElement: <ErrorPage />,   // renders if loader throws
  },
  {
    path: '/bookings/:id',
    element: <BookingDetailPage />,
    loader: async ({ params }) => {
      const booking = await fetch(`/api/v1/bookings/${params.id}`).then(r => r.json())
      return { booking }
    },
  },
])

// In component:
// const { bookings } = useLoaderData() as LoaderData
// const navigate = useNavigate()
// navigate('/bookings', { replace: true })
```

### Guards vs Loaders

```
VUE ROUTER — Navigation Guards:
  ← Run at navigation time (before URL changes)
  ← Can cancel, redirect, or proceed
  ← Guard types:
      router.beforeEach()       — global, before every route
      router.afterEach()        — global, after navigation (no cancel)
      route.beforeEnter         — per-route, in route definition
      onBeforeRouteLeave()      — in-component, when leaving
      onBeforeRouteUpdate()     — in-component, same component, params change
  ← Data fetching is IN the component (onMounted, watch)
  ← Guards handle AUTH; components handle DATA

REACT ROUTER v6 — Loaders:
  ← Data fetching happens IN the route definition (before render)
  ← Component receives pre-fetched data via useLoaderData()
  ← No separate "guard" concept — redirect in loader = guard
  ← Route transitions: useNavigation().state === 'loading'
  ← Actions: handle form submissions (POST, PUT, DELETE)
  ← Deferred: defer(promise) → Suspense/Await for streaming

ROUTE META vs LOADER DATA:
  Vue:   meta: { requiresAuth: true } → read in guards via to.meta
  React: loader return value → read in component via useLoaderData()
         ← React Router combines auth + data in same loader

ROUTERLINK vs NAVLINK:
  Vue:   <RouterLink :to="{ name: 'bookings' }">
         active-class="active"  exact-active-class="exact-active"
  React: <NavLink to="/bookings" className={({ isActive }) => isActive ? 'active' : ''}>
         ← className is a function receiving { isActive, isPending }
```

---

## 5. Forms

### v-model (automatic two-way) vs controlled inputs (manual)

```vue
<!-- VUE: v-model — two-way binding with ONE directive -->
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useBookingStore } from '@/stores/booking'

const form = reactive({
  schoolName:   '',
  destination:  '',
  studentCount: 0,
  tripDate:     '',
  status:       'pending' as Booking['status'],
})
</script>

<template>
  <!-- Primitive string -->
  <input v-model="form.schoolName" type="text" />

  <!-- Number: .number modifier auto-coerces string → number -->
  <input v-model.number="form.studentCount" type="number" />

  <!-- Trim whitespace automatically -->
  <input v-model.trim="form.schoolName" type="text" />

  <!-- Lazy: sync on 'change' not 'input' (fires on blur) -->
  <input v-model.lazy="form.destination" type="text" />

  <!-- Checkbox: boolean -->
  <input v-model="isConfirmed" type="checkbox" />

  <!-- Select -->
  <select v-model="form.status">
    <option value="pending">Pending</option>
    <option value="confirmed">Confirmed</option>
  </select>

  <!-- Custom component two-way binding (Vue 3.4+ defineModel) -->
  <BookingFormField v-model="form.schoolName" />
  <!-- ← parent passes modelValue prop, child emits update:modelValue -->
</template>
```

```tsx
// REACT: controlled input — always value + onChange (two attributes)
function BookingForm() {
  const [form, setForm] = useState({
    schoolName:   '',
    destination:  '',
    studentCount: 0,
    tripDate:     '',
    status:       'pending' as Booking['status'],
  })

  // Helper to avoid spreading on every field
  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value
      setForm(prev => ({ ...prev, [field]: value }))
    }

  return (
    <>
      {/* Every input needs value + onChange */}
      <input value={form.schoolName}   onChange={handleChange('schoolName')} />
      <input value={form.studentCount} onChange={handleChange('studentCount')} type="number" />

      {/* Trim: manual */}
      <input
        value={form.destination}
        onChange={e => setForm(prev => ({ ...prev, destination: e.target.value.trim() }))}
      />

      {/* Lazy: use onBlur instead of onChange */}
      <input
        defaultValue={form.destination}
        onBlur={e => setForm(prev => ({ ...prev, destination: e.target.value }))}
      />

      <select value={form.status} onChange={handleChange('status')}>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
      </select>
    </>
  )
}
```

### VeeValidate vs react-hook-form

```typescript
// ============================================================
// VUE: VeeValidate + Zod
// ============================================================
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = z.object({
  schoolName:   z.string().min(2, 'School name required'),
  studentCount: z.number().min(1).max(500),
  tripDate:     z.string().min(1, 'Trip date required'),
})

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(schema),
})

const [schoolName, schoolNameAttrs] = defineField('schoolName')
// schoolName: ref (v-model target), schoolNameAttrs: { onBlur, onChange }

const onSubmit = handleSubmit(async (values) => {
  await store.createBooking(values)
})

// In template:
// <input v-model="schoolName" v-bind="schoolNameAttrs" />
// <span>{{ errors.schoolName }}</span>
// <form @submit="onSubmit">

// ============================================================
// REACT: react-hook-form + Zod
// ============================================================
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  schoolName:   z.string().min(2),
  studentCount: z.number().min(1).max(500),
})

type FormData = z.infer<typeof schema>

function BookingForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async (data) => {
    await createBooking(data)
  })

  return (
    <form onSubmit={onSubmit}>
      <input {...register('schoolName')} />
      {errors.schoolName && <span>{errors.schoolName.message}</span>}
    </form>
  )
}
```

```
COMPARISON:
  VeeValidate           react-hook-form
  ─────────────────────────────────────────────────────
  v-model compatible    register() spreads HTML attrs
  Yup / Zod support     Zod / Yup / custom resolvers
  Fine-grained errors   formState.errors object
  isSubmitting ref      formState.isSubmitting
  Field arrays: useFieldArray   useFieldArray
  Performance: only re-renders on error/submit
  ← vue-validate designed for Vue's reactivity model
  ← react-hook-form designed to minimise re-renders
```

---

## 6. Performance

### Vue: fine-grained reactivity

```
VUE PERFORMANCE MODEL:
  ← Vue's reactivity system tracks exactly WHICH components depend on
    which reactive data.
  ← When data changes, ONLY components that read that specific data re-render.
  ← Most components never need explicit optimisation.

  Example:
    bookings[0].status changes
    → Only the BookingCard for bookings[0] re-renders
    → BookingList, Dashboard, Sidebar — unchanged

  NO NEED for:
    ← React.memo (components don't re-render without cause)
    ← useMemo for most derived values (computed handles this)
    ← useCallback to stabilise function references (not needed for
      Vue template event handlers)

  BUILT-IN OPTIMISATIONS:
    ← v-once:   render element once, never re-render
    ← v-memo:   memoize sub-tree with deps array (Vue 3.2+)
    ← <KeepAlive>: cache entire component tree between navigations

REACT PERFORMANCE MODEL:
  ← React re-renders the ENTIRE component tree from the changed component
    downward, unless you explicitly prevent it.
  ← Any state change re-renders that component AND ALL its children.
  ← Performance optimisation is REQUIRED in complex trees.
```

### React: VDOM diffing + explicit memoization

```tsx
// REACT: Without memoization — re-renders on every parent update
function BookingList({ bookings, onAction }: Props) {
  // This component re-renders every time its parent renders
  // Even if bookings and onAction haven't changed
}

// REACT.MEMO: prevent re-render if props haven't changed
const BookingList = React.memo(function BookingList({ bookings, onAction }: Props) {
  // Only re-renders when bookings or onAction reference changes
})

// USECALLBACK: stabilise function reference so React.memo works
function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])

  // Without useCallback: new function reference on every render
  // → BookingList's React.memo check fails → always re-renders
  const handleAction = useCallback((action: string, id: number) => {
    // handle it
  }, [])  // stable reference: empty deps = created once
  //     ← if it reads state, add that state to deps array

  // USEMEMO: stabilise expensive computed value
  const confirmedBookings = useMemo(
    () => bookings.filter(b => b.status === 'confirmed'),
    [bookings]
  )

  return <BookingList bookings={confirmedBookings} onAction={handleAction} />
}

// SUMMARY:
// React.memo    → prevent component re-render when props unchanged
// useMemo       → prevent recomputation of derived value
// useCallback   → prevent new function reference on each render
// useTransition → mark state update as non-urgent (keep UI responsive)
// useDeferredValue → defer expensive derived value computation
```

### KeepAlive vs React manual caching

```vue
<!-- VUE: <KeepAlive> — built-in component cache -->
<!-- App.vue or layout -->
<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :include="['BookingsPage', 'DashboardPage']" :max="5">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>

<!-- KeepAlive behaviour:
  ← Component instance (DOM + state + watchers) is CACHED in memory
  ← Navigating away: onDeactivated() fires, component stays in memory
  ← Navigating back:  onActivated() fires, component restored from cache
  ← :include — whitelist (component name or regex)
  ← :exclude — blacklist
  ← :max — LRU eviction when cache is full (triggers onUnmounted on evicted)

  onActivated(() => {
    store.fetchBookings()        // refresh stale data
    timer = setInterval(refresh, 30_000)
  })
  onDeactivated(() => {
    clearInterval(timer)
    controller?.abort()
  })
-->
```

```tsx
// REACT: no built-in equivalent — must implement manually
// Option 1: Always-mounted approach (keep in DOM, hide with CSS)
function App() {
  const location = useLocation()
  return (
    <>
      {/* Always mounted, hidden when not on /bookings */}
      <div style={{ display: location.pathname === '/bookings' ? 'block' : 'none' }}>
        <BookingsPage />
      </div>
      {/* Other pages render normally */}
    </>
  )
}
// ← State preserved (component never unmounts)
// ← DOM cost: hidden components still in memory
// ← No lifecycle hooks for cache entry/exit

// Option 2: Manual state preservation in parent (lift state up)
// Option 3: External store (Zustand/Redux) to persist page state
// ← Neither matches Vue's seamless KeepAlive lifecycle hooks
```

---

## 7. TypeScript

### Vue: generics in Composition API

```typescript
// ============================================================
// PROPS with TypeScript generics
// ============================================================
const props = defineProps<{
  booking:  Booking
  variant?: 'compact' | 'full'
  onAction: (action: string) => void
}>()

// With defaults (required because generics can't have runtime defaults):
const props = withDefaults(defineProps<{
  variant?: 'compact' | 'full'
  maxItems?: number
}>(), {
  variant:  'full',
  maxItems: 10,
})

// ============================================================
// EMITS with TypeScript generics
// ============================================================
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'action', action: 'confirm' | 'cancel', id: number): void
  (e: 'close'): void
}>()

// ============================================================
// DEFINEMODEL — Vue 3.4+ (replaces modelValue + emit pattern)
// ============================================================
const modelValue = defineModel<string>({ required: true })
const count      = defineModel<number>('count', { default: 0 })
// ← In parent: <MyInput v-model="search" v-model:count="quantity" />

// ============================================================
// TEMPLATE REFS with types
// ============================================================
const inputRef   = ref<HTMLInputElement | null>(null)
const cardRef    = ref<InstanceType<typeof BookingCard> | null>(null)
// ← InstanceType<typeof Component> gives access to exposed methods

// ============================================================
// COMPOSABLE return type
// ============================================================
export function useBookings(): {
  bookings:  Ref<Booking[]>
  isLoading: Ref<boolean>
  error:     Ref<string | null>
  fetch:     () => Promise<void>
} {
  // ...
}
```

### React: TypeScript patterns

```typescript
// ============================================================
// FC<Props> vs function declaration
// ============================================================
// FC<Props> is legacy — prefer explicit function + return type:
function BookingCard(props: BookingCardProps): React.ReactElement { ... }

// ============================================================
// React.ComponentProps<T> — extract props from existing component
// ============================================================
type ButtonProps = React.ComponentProps<'button'>
type CardProps   = React.ComponentProps<typeof BookingCard>
//                 ← reuse another component's prop types

// ============================================================
// forwardRef — pass ref to child component DOM element
// ============================================================
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, ...props }, ref) {
    return <input ref={ref} {...props} />
  }
)
// ← Vue equivalent: defineExpose({ focus, clear }) — explicit API

// ============================================================
// useImperativeHandle — control what ref exposes
// ============================================================
const MyModal = React.forwardRef<{ open: () => void; close: () => void }, ModalProps>(
  function MyModal(props, ref) {
    useImperativeHandle(ref, () => ({
      open:  () => setIsOpen(true),
      close: () => setIsOpen(false),
    }))
    // ...
  }
)
// Vue equivalent:
// defineExpose({ open: () => { isOpen.value = true } })
// ← much simpler — no forwardRef wrapper needed

// ============================================================
// EVENT HANDLER TYPES
// ============================================================
const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { ... }
const handleClick  = (e: React.MouseEvent<HTMLButtonElement>) => { ... }
// Vue: @input, @submit, @click — event type inferred from element

// ============================================================
// CHILDREN types
// ============================================================
interface Props {
  children:  React.ReactNode        // any renderable content
  className?: string
}
// Vue: uses slots — no children prop needed (template-driven)
// <slot /> or named slots: <slot name="header" />
```

---

## 8. Ecosystem & Hiring

### Vue official ecosystem

```
PINIA          — official state management (replaces Vuex)
               — setup syntax (feels like composables)
               — TypeScript first-class

VUE ROUTER     — official routing, part of core team
               — navigation guards, lazy loading, route meta
               — no community fragmentation (one library)

VUEUSE         — 200+ composables (useFetch, useLocalStorage, ...)
               — community maintained, excellent TS support
               — equivalent of react-use / ahooks

NUXT 3         — Vue's Next.js equivalent (SSR / SSG / hybrid)
               — file-based routing, server routes, auto-imports
               — first-class Laravel API integration

VITE           — Vue-native build tool (created by Evan You, Vue's author)

INERTIA.JS     — Laravel + Vue bridge (replaces full API + SPA)
               — shared session auth, server-side validation
               — Tripz uses this stack

VITEST         — unit testing, same config as Vite, native Vue support

PRIMEVUE /     — component libraries with Vue 3 + TypeScript support
NAIVE UI /
VUETIFY 3

VERDICT: Vue's official ecosystem is curated and cohesive.
  Fewer choices → less decision fatigue → faster team onboarding.
  Everything interoperates without configuration.
```

### React ecosystem

```
STATE:         Redux Toolkit, Zustand, Jotai, Recoil, MobX, XState
               ← breadth is power AND confusion — must choose carefully

ROUTING:       React Router v6, TanStack Router
               ← React Router v6 broke API from v5 (significant migration)

DATA FETCHING: TanStack Query (formerly React Query) — dominant choice
               RTK Query (Redux), SWR (Vercel)
               ← Vue has no direct equivalent (Pinia + useFetch covers it)

SSR/FULLSTACK: Next.js (App Router), Remix, Gatsby
               ← Next.js App Router (RSC) changes mental model significantly

TESTING:       React Testing Library + Jest / Vitest
               ← RTL philosophy: test user behaviour, not implementation

FORMS:         react-hook-form, Formik (legacy)
               ← react-hook-form is the clear winner (performance)

ANIMATION:     Framer Motion — excellent, no Vue equivalent in quality
TABLES:        TanStack Table — also available for Vue
UI LIBS:       shadcn/ui, MUI, Chakra, Mantine, Radix UI
               ← larger variety than Vue

NATIVE:        React Native — share logic with React web
               ← Vue has no equivalent mobile story (Weex is abandoned)

VERDICT: Larger ecosystem = more options + more fragmentation.
  Senior React devs must know WHICH library to choose and WHY.
  More learning surface area. Higher hiring pool globally.
```

### Market & hiring

```
JOB MARKET (2024-2025):
  React:   ~65% of frontend job postings require React
  Vue:     ~15% of frontend job postings require Vue
  Angular: ~15%
  Others:  ~5%

  ← React has more jobs, more candidates
  ← Vue has fewer jobs BUT also fewer qualified candidates
  ← Laravel shops: Vue is dominant (natural pairing)
  ← Enterprise .NET/Java: often React or Angular
  ← Startups: React by default (ecosystem, React Native option)
  ← UAE/Gulf market: React dominant in tech companies, Vue in web agencies

SALARY:
  React developers command slightly higher salaries (market demand)
  Vue expertise valued in specific stacks (Laravel, Nuxt SSR)
  Both are strong options — specialisation matters more than framework choice

INTERVIEW TIP:
  React interviewers ask about: hooks rules, memoisation, Context vs Redux,
    React.memo, virtual DOM, reconciliation, controlled vs uncontrolled
  Vue interviewers ask about: reactivity (Proxy vs Object.defineProperty),
    composition vs options API, SFC advantages, Pinia vs Vuex, KeepAlive
```

---

## 9. Common Interview Questions with Answers

### Q1: "What is Vue's reactivity system and how does it differ from React?"

```
ANSWER:

Vue 3 uses ES Proxy to intercept reads and writes on reactive objects.
When you access ref.value or reactive.property inside a computed, watch,
or watchEffect, Vue records that access in a dependency tracker. When the
value later changes, Vue automatically notifies every dependent effect.

This is "automatic dependency tracking" — you never declare what a
computed depends on. Vue figures it out at runtime.

React uses a completely different model. State is immutable — you call
setState/useState setter to signal that something changed. React then
schedules a re-render of the affected component and all its children.
There is no proxy tracking. The developer manually declares dependencies
via useMemo/useCallback dependency arrays, or accepts the cost of
re-rendering the full subtree.

Practical consequence:
  Vue:   const total = computed(() => items.value.reduce(...))
         ← just works, no array needed, cached, auto-invalidates

  React: const total = useMemo(() => items.reduce(...), [items])
         ← must list items in array, or risk stale cached value

Vue's system results in fewer re-renders by default.
React's system is more explicit — easier to reason about in large codebases
because the data flow is always visible.
```

### Q2: "When would you use watchEffect vs watch in Vue?"

```
ANSWER:

Use watch when:
  1. You need BOTH new and old values in the callback:
       watch(count, (newVal, oldVal) => { ... })
  2. You want lazy execution (NOT immediate) — watch doesn't run on setup
  3. You need explicit control: fire only when THIS specific source changes
  4. You need to stop the watcher manually: const stop = watch(...)

Use watchEffect when:
  1. You want the effect to run IMMEDIATELY on setup, then on changes
  2. You read multiple reactive values and all should trigger the effect —
     Vue tracks them automatically (no source list)
  3. You need cleanup that runs before the next effect execution:
       watchEffect(async (onCleanup) => {
         const ctrl = new AbortController()
         onCleanup(() => ctrl.abort())
         const data = await fetch(url, { signal: ctrl.signal })
       })
  4. You don't need the old value

watchEffect is Vue's equivalent of React's useEffect (with auto-tracking).
watch is more like a focused useEffect with a specific deps array, plus
the old value provided natively.
```

### Q3: "How does Vue handle performance compared to React?"

```
ANSWER:

Vue has fine-grained reactivity: when booking.status changes, only the
BookingCard component that reads booking.status re-renders. Vue's compiler
statically analyses the template to identify dynamic bindings and avoids
traversing static parts of the tree entirely.

React uses a virtual DOM with reconciliation. When state changes in any
component, React re-renders that component and ALL its descendants (unless
you explicitly prevent it). React.memo, useMemo, and useCallback are
standard tools to prevent unnecessary work.

In Vue you do NOT need React.memo equivalents for normal use. You might use:
  v-once  — render this sub-tree once, freeze it (equivalent to React.memo
             with an empty deps array)
  v-memo  — memoize sub-tree with an explicit condition array (Vue 3.2+)
  <KeepAlive> — cache entire component instances between navigations

In React, failing to memoize can cause real performance issues in large
component trees. React 19's React Compiler (formerly React Forget) aims
to automate memoisation — closer to Vue's model — but requires opt-in.

Interview verdict: Vue wins on performance-by-default. React requires more
deliberate optimisation, but gives you more control.
```

### Q4: "What is Pinia and how does it compare to Redux?"

```
ANSWER:

Pinia is Vue's official state management library (replaced Vuex in Vue 3).
It uses the Composition API pattern — stores look and feel like composables.

KEY DIFFERENCES vs Redux:

1. NO BOILERPLATE:
   Pinia:  defineStore('booking', () => { const x = ref(0); return { x } })
   Redux:  createSlice + createAsyncThunk + configureStore + useSelector +
           useDispatch + connect + Provider

2. MUTATION STYLE:
   Pinia:  Direct mutation (Proxy-backed): this.bookings.push(b)
   Redux:  Immutable updates via Immer (in RTK): state.bookings.push(b)
           ← RTK wraps in Immer so it LOOKS mutable but isn't

3. ASYNC ACTIONS:
   Pinia:  async function fetchBookings() { ... }
           ← just an async function in the store, no middleware needed
   Redux:  createAsyncThunk('bookings/fetch', async () => { ... })
           ← must define thunk + handle pending/fulfilled/rejected cases

4. DEVTOOLS:
   Pinia: Vue DevTools browser extension — time travel, state inspection
   Redux: Redux DevTools browser extension — time travel, action log

5. TYPESCRIPT:
   Both are first-class TypeScript. Pinia requires less ceremony.

6. SIZE:
   Pinia: ~1KB gzip
   Redux Toolkit: ~12KB gzip

When to use Redux over Pinia:
  ← React app (Pinia is Vue-only)
  ← Complex action replay / undo-redo requirements
  ← RTK Query for server state caching (no Pinia equivalent)
  ← Large team with strict action logging requirements
```

---

## Side-by-Side Quick Reference

```
FEATURE                    VUE 3                      REACT 18
──────────────────────────────────────────────────────────────────────────
Reactive primitive         ref(0)                     useState(0)
Reactive object            reactive({})               useState({}) / useReducer
Derived value              computed(() => ...)        useMemo(() => ..., [deps])
Side effect (auto-track)   watchEffect(() => ...)     useEffect(() => ..., [deps])
Side effect (specific)     watch(src, cb)             useEffect(() => ..., [src])
Old value in watch         watch(s, (new, old) => {}) useRef(prev); effect updates it
Two-way binding            v-model                    value + onChange (two attrs)
v-model modifier           v-model.trim / .number     manual in onChange handler
Template file              .vue (SFC)                 .tsx / .jsx
Conditional render         v-if / v-else-if / v-else  {cond && <X />} / ternary
List render                v-for                      .map()
Event listener             @click.stop                onClick={e => e.stopPropagation()}
Component scoped styles    <style scoped>             CSS Modules / styled-components
Props                      defineProps<T>()           function(props: T)
Emits                      defineEmits<T>()           onEvent callback props
Two-way component binding  defineModel<T>()           value + onChange pattern
Template ref               ref<HTMLInputElement>()    useRef<HTMLInputElement>()
Expose methods             defineExpose({ open })     forwardRef + useImperativeHandle
State management           Pinia                      Zustand / Redux Toolkit
Routing                    Vue Router                 React Router v6 / TanStack Router
SSR framework              Nuxt 3                     Next.js (App Router)
Testing                    Vitest + Vue Test Utils    Jest / Vitest + RTL
Composable / custom hook   useBookings() composable   useBookings() custom hook
Component cache            <KeepAlive>                Manual (no built-in)
Error boundary             onErrorCaptured()          class ErrorBoundary
Provide/inject             provide() + inject()       createContext + useContext
Slots                      <slot> / named slots       children / render props
Transition/animation       <Transition> / <TransitionGroup>  Framer Motion
Performance memo           v-memo / v-once            React.memo / useMemo / useCallback
Build tool                 Vite (by Vue creator)      Vite or webpack (Next.js)
```
