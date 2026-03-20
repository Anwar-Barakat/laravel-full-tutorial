# VUE_TEST_02 — Pinia · defineStore · Actions · Getters

**Time:** 25 minutes | **Stack:** Vue 3 + TypeScript

---

## Problem 01 — Booking Store with Pinia (Medium)

Build a type-safe Pinia store for managing bookings with CRUD, filters, pagination, and store composition.

---

### Types

```typescript
// types/booking.ts
export interface Booking {
  id: number
  schoolName: string
  destination: string
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'completed' | 'cancelled'
  tripDate: string
  studentCount: number
  paymentId?: string
}

export interface BookingFilters {
  status: Booking['status'] | ''
  search: string
  dateFrom: string
  dateTo: string
}

export interface Pagination {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export interface ApiResponse<T> {
  data: T
  meta?: { total: number; last_page: number; per_page: number }
}
```

---

### Options API syntax — useBookingStore

```typescript
// stores/bookingStore.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

export const useBookingStore = defineStore('booking', {

  // ── State ──────────────────────────────────────────────────
  state: () => ({
    bookings:  [] as Booking[],
    isLoading: false,
    error:     null as string | null,
    filters: {
      status:   '' as Booking['status'] | '',
      search:   '',
      dateFrom: '',
      dateTo:   '',
    } as BookingFilters,
    pagination: {
      page:     1,
      perPage:  15,
      total:    0,
      lastPage: 1,
    } as Pagination,
  }),

  // ── Getters (computed) ──────────────────────────────────────
  getters: {
    paidBookings(state): Booking[] {
      return state.bookings.filter(b => b.status === 'paid')
    },

    totalRevenue(state): number {
      return state.bookings
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + b.amount, 0)
    },

    // Getter with argument — return a function
    bookingById: (state) => (id: number): Booking | undefined => {
      return state.bookings.find(b => b.id === id)
    },

    pendingCount(state): number {
      return state.bookings.filter(b => b.status === 'pending').length
    },

    // Getter using another getter — 'this' refers to the store instance
    formattedRevenue(): string {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
        .format(this.totalRevenue)
    },
  },

  // ── Actions (methods + async) ───────────────────────────────
  actions: {
    // Fetch with filters + pagination
    async fetchBookings(overrideFilters?: Partial<BookingFilters>) {
      const authStore = useAuthStore()          // ← store composition: use auth inside booking

      this.isLoading = true
      this.error     = null

      try {
        const params = new URLSearchParams({
          page:     String(this.pagination.page),
          per_page: String(this.pagination.perPage),
          ...(this.filters.status   && { status:    this.filters.status }),
          ...(this.filters.search   && { search:    this.filters.search }),
          ...(this.filters.dateFrom && { date_from: this.filters.dateFrom }),
          ...(this.filters.dateTo   && { date_to:   this.filters.dateTo }),
          ...overrideFilters,
        })

        const response = await fetch(`/api/v1/bookings?${params}`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`,   // ← from auth store
            Accept:        'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const json: ApiResponse<Booking[]> = await response.json()

        this.bookings              = json.data
        this.pagination.total     = json.meta?.total    ?? 0
        this.pagination.lastPage  = json.meta?.last_page ?? 1

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch bookings'
      } finally {
        this.isLoading = false
      }
    },

    async createBooking(data: Omit<Booking, 'id'>): Promise<Booking | null> {
      const authStore = useAuthStore()
      this.isLoading  = true
      this.error      = null

      try {
        const response = await fetch('/api/v1/bookings', {
          method:  'POST',
          headers: {
            Authorization:  `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
            Accept:         'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const json = await response.json()
          throw new Error(json.message ?? `HTTP ${response.status}`)
        }

        const json: ApiResponse<Booking> = await response.json()
        this.bookings.unshift(json.data)           // ← optimistically add to front
        this.pagination.total++
        return json.data

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create booking'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async updateBooking(id: number, data: Partial<Booking>): Promise<boolean> {
      const authStore = useAuthStore()
      this.error      = null

      // Optimistic update — update in store immediately, revert on failure
      const index   = this.bookings.findIndex(b => b.id === id)
      const original = index !== -1 ? { ...this.bookings[index] } : null

      if (index !== -1) {
        this.bookings[index] = { ...this.bookings[index], ...data }
      }

      try {
        const response = await fetch(`/api/v1/bookings/${id}`, {
          method:  'PATCH',
          headers: {
            Authorization:  `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const json: ApiResponse<Booking> = await response.json()
        if (index !== -1) this.bookings[index] = json.data
        return true

      } catch (err) {
        // Revert optimistic update on failure
        if (index !== -1 && original) this.bookings[index] = original
        this.error = err instanceof Error ? err.message : 'Failed to update booking'
        return false
      }
    },

    async deleteBooking(id: number): Promise<boolean> {
      const authStore  = useAuthStore()
      const index      = this.bookings.findIndex(b => b.id === id)
      const original   = index !== -1 ? this.bookings[index] : null

      // Optimistic delete
      if (index !== -1) this.bookings.splice(index, 1)

      try {
        const response = await fetch(`/api/v1/bookings/${id}`, {
          method:  'DELETE',
          headers: { Authorization: `Bearer ${authStore.token}` },
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        this.pagination.total = Math.max(0, this.pagination.total - 1)
        return true

      } catch (err) {
        // Revert optimistic delete
        if (index !== -1 && original) this.bookings.splice(index, 0, original)
        this.error = err instanceof Error ? err.message : 'Failed to delete booking'
        return false
      }
    },

    // Sync actions — no async needed
    setFilter<K extends keyof BookingFilters>(key: K, value: BookingFilters[K]) {
      this.filters[key]     = value
      this.pagination.page  = 1        // reset to page 1 on filter change
    },

    setPage(page: number) {
      this.pagination.page = page
      this.fetchBookings()             // fetch immediately on page change
    },

    clearFilters() {
      this.filters    = { status: '', search: '', dateFrom: '', dateTo: '' }
      this.pagination.page = 1
    },

    clearError() {
      this.error = null
    },
  },
})
```

---

### useAuthStore — separate store, composed into booking store

```typescript
// stores/authStore.ts
import { defineStore } from 'pinia'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'school'
  schoolId?: number
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user:      null as User | null,
    token:     null as string | null,
    isLoading: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.token,
    isAdmin:         (state): boolean => state.user?.role === 'admin',
    currentSchoolId: (state): number | undefined => state.user?.schoolId,
  },

  actions: {
    async login(email: string, password: string): Promise<boolean> {
      this.isLoading = true
      try {
        const response = await fetch('/api/v1/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        })
        const json = await response.json()
        if (!response.ok) return false

        this.token = json.token
        this.user  = json.user
        return true
      } finally {
        this.isLoading = false
      }
    },

    logout() {
      this.token = null
      this.user  = null
    },
  },
})
```

---

### Using stores in components

```vue
<!-- components/BookingDashboard.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBookingStore } from '@/stores/bookingStore'

const bookingStore = useBookingStore()

// storeToRefs: destructure reactive refs WITHOUT losing reactivity
// bookings, isLoading, error remain reactive (linked to store)
const { bookings, isLoading, error, filters, pagination } = storeToRefs(bookingStore)

// Actions are NOT refs — destructure directly (they're just functions)
const { fetchBookings, setFilter, setPage, clearError } = bookingStore

onMounted(() => fetchBookings())

// Re-fetch when filters change
watch(filters, () => fetchBookings(), { deep: true })

// Getters accessed directly (reactive via store proxy):
// bookingStore.paidBookings
// bookingStore.totalRevenue
// bookingStore.bookingById(42)
// bookingStore.formattedRevenue
</script>

<template>
  <div>
    <p v-if="isLoading">Loading...</p>
    <p v-if="error" class="text-red-500" @click="clearError">{{ error }} ✕</p>

    <select :value="filters.status" @change="setFilter('status', ($event.target as HTMLSelectElement).value as any)">
      <option value="">All</option>
      <option value="paid">Paid</option>
      <option value="pending">Pending</option>
    </select>

    <BookingCard
      v-for="booking in bookings"
      :key="booking.id"
      :booking="booking"
      @action="(action, id) => bookingStore.updateBooking(id, { status: action as any })"
    />

    <p>Revenue: {{ bookingStore.formattedRevenue }}</p>

    <!-- Pagination -->
    <button :disabled="pagination.page <= 1" @click="setPage(pagination.page - 1)">Prev</button>
    <span>{{ pagination.page }} / {{ pagination.lastPage }}</span>
    <button :disabled="pagination.page >= pagination.lastPage" @click="setPage(pagination.page + 1)">Next</button>
  </div>
</template>
```

---

## Problem 02 — Setup Store Syntax & Composable Stores (Hard)

---

### Setup store syntax — Composition API inside defineStore

```typescript
// stores/bookingStore.setup.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

// Setup syntax: defineStore('id', () => { ... })
// Uses ref/computed/functions directly — identical to script setup
export const useBookingStore = defineStore('booking', () => {

  // ── State: ref() ───────────────────────────────────────────
  const bookings    = ref<Booking[]>([])
  const isLoading   = ref(false)
  const error       = ref<string | null>(null)
  const filters     = ref<BookingFilters>({ status: '', search: '', dateFrom: '', dateTo: '' })
  const pagination  = ref<Pagination>({ page: 1, perPage: 15, total: 0, lastPage: 1 })

  // ── Getters: computed() ────────────────────────────────────
  const paidBookings = computed(() =>
    bookings.value.filter(b => b.status === 'paid')
  )

  const totalRevenue = computed(() =>
    paidBookings.value.reduce((sum, b) => sum + b.amount, 0)
  )

  const pendingCount = computed(() =>
    bookings.value.filter(b => b.status === 'pending').length
  )

  const formattedRevenue = computed(() =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
      .format(totalRevenue.value)
  )

  // Getter with argument: return a function (same as options syntax)
  function bookingById(id: number): Booking | undefined {
    return bookings.value.find(b => b.id === id)
  }

  // ── Actions: plain async functions ─────────────────────────
  async function fetchBookings(overrideFilters?: Partial<BookingFilters>) {
    const authStore = useAuthStore()
    isLoading.value = true
    error.value     = null

    try {
      const params = new URLSearchParams({
        page:     String(pagination.value.page),
        per_page: String(pagination.value.perPage),
        ...(filters.value.status && { status: filters.value.status }),
        ...(filters.value.search && { search: filters.value.search }),
        ...overrideFilters,
      })

      const res = await fetch(`/api/v1/bookings?${params}`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json: ApiResponse<Booking[]> = await res.json()
      bookings.value             = json.data
      pagination.value.total    = json.meta?.total    ?? 0
      pagination.value.lastPage = json.meta?.last_page ?? 1

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Fetch failed'
    } finally {
      isLoading.value = false
    }
  }

  async function createBooking(data: Omit<Booking, 'id'>): Promise<Booking | null> {
    const authStore = useAuthStore()
    isLoading.value = true
    error.value     = null

    try {
      const res = await fetch('/api/v1/bookings', {
        method:  'POST',
        headers: { Authorization: `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json: ApiResponse<Booking> = await res.json()
      bookings.value.unshift(json.data)
      return json.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Create failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  function setFilter<K extends keyof BookingFilters>(key: K, value: BookingFilters[K]) {
    filters.value[key]        = value
    pagination.value.page     = 1
  }

  function clearFilters() {
    filters.value     = { status: '', search: '', dateFrom: '', dateTo: '' }
    pagination.value.page = 1
  }

  // ── MUST return everything to expose to components ─────────
  return {
    // State
    bookings, isLoading, error, filters, pagination,
    // Getters (computed refs + function getter)
    paidBookings, totalRevenue, pendingCount, formattedRevenue, bookingById,
    // Actions
    fetchBookings, createBooking, setFilter, clearFilters,
  }
})
```

---

### Options vs Setup syntax — comparison

```typescript
// ============================================================
// Options syntax:  defineStore('id', { state, getters, actions })
// Setup syntax:    defineStore('id', () => { ref, computed, function })
// ============================================================

// OPTIONS:
defineStore('booking', {
  state:   () => ({ bookings: [] as Booking[] }),
  getters: { paidBookings: (state) => state.bookings.filter(b => b.status === 'paid') },
  actions: { async fetchBookings() { this.bookings = await api.get() } },
})
// ✅ Clear structure — state/getters/actions visually separated
// ✅ 'this' access in actions (access other state/getters/actions)
// ❌ 'this' typing complex — TS needs explicit return types on getters
// ❌ Can't use composables inside (no onMounted, no useRoute etc.)

// SETUP:
defineStore('booking', () => {
  const bookings    = ref<Booking[]>([])
  const paidBookings = computed(() => bookings.value.filter(b => b.status === 'paid'))
  async function fetchBookings() { bookings.value = await api.get() }
  return { bookings, paidBookings, fetchBookings }
})
// ✅ Full Composition API power — use ANY composable inside store
// ✅ Better TypeScript inference — no 'this' typing problems
// ✅ Consistent mental model — same pattern as script setup
// ❌ Must explicitly return everything (easy to forget)
// ❌ Less visually structured — state/getters/actions all look the same

// Recommendation: use SETUP syntax for new stores
```

---

### Extracted composable: useBookingFilters

```typescript
// composables/useBookingFilters.ts
// Extract reusable filter logic into a composable — use in store OR component
import { ref, computed } from 'vue'

export function useBookingFilters(bookings: Ref<Booking[]>) {
  const search   = ref('')
  const status   = ref<Booking['status'] | ''>('')
  const sortBy   = ref<'date' | 'amount'>('date')
  const sortDir  = ref<'asc' | 'desc'>('desc')

  const filtered = computed(() => {
    let result = bookings.value

    if (search.value) {
      const q = search.value.toLowerCase()
      result  = result.filter(b =>
        b.schoolName.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q)
      )
    }

    if (status.value) {
      result = result.filter(b => b.status === status.value)
    }

    return [...result].sort((a, b) => {
      const diff = sortBy.value === 'date'
        ? new Date(a.tripDate).getTime() - new Date(b.tripDate).getTime()
        : a.amount - b.amount
      return sortDir.value === 'asc' ? diff : -diff
    })
  })

  function clear() {
    search.value = ''
    status.value = ''
  }

  return { search, status, sortBy, sortDir, filtered, clear }
}

// Use in setup store:
defineStore('booking', () => {
  const bookings = ref<Booking[]>([])
  const { search, status, filtered, clear } = useBookingFilters(bookings)
  // ← composable used INSIDE store — impossible with options syntax
  return { bookings, search, status, filteredBookings: filtered, clearFilters: clear }
})

// OR use directly in component (without store):
// const { search, filtered } = useBookingFilters(computedBookingsRef)
```

---

### Pinia plugin — persist state to localStorage

```typescript
// plugins/piniaPersist.ts
import type { PiniaPlugin, PiniaPluginContext } from 'pinia'

interface PersistOptions {
  persist?: boolean | { key?: string; pick?: string[] }
}

export const piniaLocalStoragePlugin: PiniaPlugin = ({ store, options }: PiniaPluginContext) => {
  const config = (options as PersistOptions).persist
  if (!config) return

  const key    = typeof config === 'object' ? (config.key ?? store.$id) : store.$id
  const pick   = typeof config === 'object' ? config.pick : undefined

  // Restore on store init
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      store.$patch(pick ? Object.fromEntries(pick.map(k => [k, parsed[k]])) : parsed)
    } catch {}
  }

  // Save on every state change
  store.$subscribe((mutation, state) => {
    const toSave = pick
      ? Object.fromEntries(pick.map(k => [k, (state as Record<string, unknown>)[k]]))
      : state
    localStorage.setItem(key, JSON.stringify(toSave))
  })
}

// Register in main.ts:
const pinia = createPinia()
pinia.use(piniaLocalStoragePlugin)
app.use(pinia)

// Use in store (options syntax):
defineStore('auth', {
  persist: { key: 'tripz-auth', pick: ['token', 'user'] },
  state: () => ({ token: null, user: null }),
  // ...
})
```

---

### $subscribe — react to store state changes

```typescript
// In component: watch for external store changes
const bookingStore = useBookingStore()

// Subscribe to any state mutation
const unsubscribe = bookingStore.$subscribe((mutation, state) => {
  console.log('Mutation type:', mutation.type)     // 'direct' | 'patch function' | 'patch object'
  console.log('Store ID:',      mutation.storeId)  // 'booking'
  console.log('New state:',     state.bookings.length)

  // Sync to external system:
  if (mutation.type === 'direct') {
    analytics.track('booking_store_changed', { count: state.bookings.length })
  }
}, { detached: false })  // detached: true = subscription survives component unmount

// Unsubscribe manually (or Vue auto-cleans on component unmount)
onUnmounted(() => unsubscribe())

// $onAction — intercept action calls (useful for logging, testing)
bookingStore.$onAction(({ name, args, after, onError }) => {
  console.log(`Action: ${name}`, args)

  after((result) => {
    console.log(`${name} succeeded`, result)
  })

  onError((error) => {
    console.error(`${name} failed`, error)
    // Send to Sentry, etc.
  })
})
```
