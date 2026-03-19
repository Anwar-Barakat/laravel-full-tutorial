# VUE_TEST_01 — Composition API · ref · reactive · computed

**Time:** 25 minutes | **Stack:** Vue 3 + TypeScript

---

## Problem 01 — Booking Card & List Components (Medium)

Build typed Vue 3 components for the Tripz booking platform using Composition API with TypeScript.

---

### Booking type and BookingCard component

```vue
<!-- components/BookingCard.vue -->
<script setup lang="ts">
interface Booking {
  id: number
  schoolName: string
  destination: string
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'completed' | 'cancelled'
  tripDate: string
  studentCount: number
}

// defineProps with TypeScript generic — no runtime declaration needed
const props = defineProps<{
  booking: Booking
  selected?: boolean
}>()

// defineEmits with typed event payloads
const emit = defineEmits<{
  (e: 'action', action: 'confirm' | 'cancel' | 'view', id: number): void
  (e: 'select', id: number): void
}>()

// Computed derived from props
const statusColour = computed(() => {
  const map: Record<Booking['status'], string> = {
    pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    paid:      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return map[props.booking.status]
})

const formattedAmount = computed(() =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
    .format(props.booking.amount)
)

const formattedDate = computed(() =>
  new Date(props.booking.tripDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
)
</script>

<template>
  <div
    class="rounded-xl border bg-white dark:bg-gray-800 p-4 shadow-sm transition-all"
    :class="selected ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'"
    @click="emit('select', booking.id)"
  >
    <div class="flex items-start justify-between">
      <div>
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ booking.schoolName }}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ booking.destination }}</p>
      </div>
      <span :class="statusColour" class="rounded-full px-2 py-0.5 text-xs font-medium capitalize">
        {{ booking.status }}
      </span>
    </div>

    <div class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <span>📅 {{ formattedDate }}</span>
      <span>👥 {{ booking.studentCount }} students</span>
      <span class="ml-auto font-semibold text-gray-900 dark:text-white">{{ formattedAmount }}</span>
    </div>

    <div class="mt-3 flex gap-2">
      <button
        v-if="booking.status === 'pending'"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        @click.stop="emit('action', 'confirm', booking.id)"
      >
        Confirm
      </button>
      <button
        v-if="['pending', 'confirmed'].includes(booking.status)"
        class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        @click.stop="emit('action', 'cancel', booking.id)"
      >
        Cancel
      </button>
      <button
        class="ml-auto rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
        @click.stop="emit('action', 'view', booking.id)"
      >
        View →
      </button>
    </div>
  </div>
</template>
```

---

### BookingList — filtering, sorting, computed stats, watch debounce

```vue
<!-- components/BookingList.vue -->
<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import BookingCard from './BookingCard.vue'

interface Booking {
  id: number
  schoolName: string
  destination: string
  amount: number
  status: 'pending' | 'confirmed' | 'paid' | 'completed' | 'cancelled'
  tripDate: string
  studentCount: number
}

const props = defineProps<{ bookings: Booking[] }>()

const emit = defineEmits<{
  (e: 'action', action: string, id: number): void
}>()

// ── State ──────────────────────────────────────────────────────
// ref() for single primitive values
const search        = ref('')
const debouncedSearch = ref('')
const selectedId    = ref<number | null>(null)
const sortBy        = ref<'date' | 'amount' | 'school'>('date')
const sortDir       = ref<'asc' | 'desc'>('desc')

// reactive() for grouped object state (related config lives together)
const filters = reactive({
  status: '' as Booking['status'] | '',
  minAmount: 0,
  maxAmount: Infinity,
})

// ── watch: debounce search ─────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout>
watch(search, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val
  }, 300)
})

// ── computed: filter + sort pipeline ──────────────────────────
const filteredBookings = computed(() => {
  let result = props.bookings

  // Text search — uses debouncedSearch (not raw search) to avoid filtering on every keystroke
  if (debouncedSearch.value) {
    const q = debouncedSearch.value.toLowerCase()
    result = result.filter(b =>
      b.schoolName.toLowerCase().includes(q) ||
      b.destination.toLowerCase().includes(q)
    )
  }

  // Status filter
  if (filters.status) {
    result = result.filter(b => b.status === filters.status)
  }

  // Amount range
  result = result.filter(b =>
    b.amount >= filters.minAmount && b.amount <= filters.maxAmount
  )

  // Sort
  return [...result].sort((a, b) => {
    let diff = 0
    if (sortBy.value === 'date')   diff = new Date(a.tripDate).getTime() - new Date(b.tripDate).getTime()
    if (sortBy.value === 'amount') diff = a.amount - b.amount
    if (sortBy.value === 'school') diff = a.schoolName.localeCompare(b.schoolName)
    return sortDir.value === 'asc' ? diff : -diff
  })
})

// ── computed: stats ─────────────────────────────────────────────
const stats = computed(() => ({
  total:     props.bookings.length,
  filtered:  filteredBookings.value.length,
  revenue:   filteredBookings.value
               .filter(b => b.status === 'paid')
               .reduce((sum, b) => sum + b.amount, 0),
  pending:   props.bookings.filter(b => b.status === 'pending').length,
}))

// ── methods ─────────────────────────────────────────────────────
function toggleSort(col: typeof sortBy.value) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = col
    sortDir.value = 'desc'
  }
}

function clearFilters() {
  search.value     = ''
  filters.status   = ''
  filters.minAmount = 0
  filters.maxAmount = Infinity
}
</script>

<template>
  <div class="space-y-4">

    <!-- Stats bar -->
    <div class="grid grid-cols-4 gap-3">
      <div class="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
        <p class="text-xs text-gray-500">Total</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm text-center">
        <p class="text-2xl font-bold text-indigo-600">{{ stats.filtered }}</p>
        <p class="text-xs text-gray-500">Showing</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm text-center">
        <p class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</p>
        <p class="text-xs text-gray-500">Pending</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm text-center">
        <p class="text-2xl font-bold text-green-600">
          £{{ stats.revenue.toLocaleString('en-GB') }}
        </p>
        <p class="text-xs text-gray-500">Revenue</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 rounded-xl bg-white dark:bg-gray-800 p-3 shadow-sm">
      <input
        v-model="search"
        type="text"
        placeholder="Search school or destination..."
        class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      />

      <select
        v-model="filters.status"
        class="rounded-lg border px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="paid">Paid</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <button
        class="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="toggleSort('date')"
      >
        Date <span v-if="sortBy === 'date'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
      </button>
      <button
        class="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="toggleSort('amount')"
      >
        Amount <span v-if="sortBy === 'amount'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
      </button>

      <button
        v-if="search || filters.status"
        class="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        @click="clearFilters"
      >
        Clear ✕
      </button>
    </div>

    <!-- Empty state -->
    <p v-if="filteredBookings.length === 0" class="py-8 text-center text-gray-400">
      No bookings match your filters.
    </p>

    <!-- Booking cards -->
    <BookingCard
      v-for="booking in filteredBookings"
      :key="booking.id"
      :booking="booking"
      :selected="selectedId === booking.id"
      @select="selectedId = $event"
      @action="(action, id) => emit('action', action, id)"
    />
  </div>
</template>
```

---

## Problem 02 — Vue vs React Comparison (Hard)

Show the same BookingCard in both frameworks. Explain the key differences.

---

### Reactivity: automatic vs manual dependency tracking

```
// ============================================================
// VUE — dependencies tracked AUTOMATICALLY
// ============================================================
const search    = ref('')
const bookings  = ref<Booking[]>([])

const filtered = computed(() =>
  bookings.value.filter(b =>
    b.destination.toLowerCase().includes(search.value.toLowerCase())
  )
)
// Vue reads search.value and bookings.value inside computed
// ← Vue's reactivity system tracks these reads automatically
// ← When search changes → filtered recomputes. Done.
// ← No dependency array to maintain, no stale closure bugs

// ============================================================
// REACT — dependencies declared MANUALLY
// ============================================================
const [search, setSearch]     = useState('')
const [bookings, setBookings] = useState<Booking[]>([])

const filtered = useMemo(
  () => bookings.filter(b =>
    b.destination.toLowerCase().includes(search.toLowerCase())
  ),
  [bookings, search]   // ← you MUST list every dependency here
  // Miss one → stale closure (bug that's hard to find)
  // eslint-plugin-react-hooks warns you but can't enforce correctness
)
```

---

### Template vs JSX

```vue
<!-- VUE: Single File Component — template, script, style in one .vue file -->
<template>
  <!-- Declarative HTML with directives — familiar to HTML/backend devs -->
  <div v-if="booking" class="card">
    <span :class="statusColour">{{ booking.status }}</span>

    <!-- v-for: list rendering with required :key -->
    <BookingCard
      v-for="b in filteredBookings"
      :key="b.id"
      :booking="b"
      @action="handleAction"
    />

    <!-- v-model: two-way binding in ONE directive -->
    <input v-model="search" />
    <!-- equivalent to: :value="search" @input="search = $event.target.value" -->
  </div>
</template>
```

```tsx
// REACT: JSX — JavaScript with HTML-like syntax
// Template and logic in the SAME file (no separation)
function BookingList() {
  return (
    <div>
      {/* Conditional: ternary or && operator */}
      {booking && <span className={statusColour}>{booking.status}</span>}

      {/* List: .map() → JSX elements */}
      {filteredBookings.map(b => (
        <BookingCard key={b.id} booking={b} onAction={handleAction} />
      ))}

      {/* Controlled input: always two pieces */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
    </div>
  )
}
// ✅ Full JS power in template — any expression is valid
// ❌ More verbose — conditional + list rendering is noisier
```

---

### computed vs useMemo / watch vs useEffect

```typescript
// ============================================================
// COMPUTED vs useMemo
// ============================================================

// VUE:
const formattedAmount = computed(() =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
    .format(props.booking.amount)
)
// ← re-runs only when props.booking.amount changes (auto-tracked)
// ← cached: accessing formattedAmount.value 100× doesn't recalculate

// REACT:
const formattedAmount = useMemo(
  () => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
    .format(booking.amount),
  [booking.amount]   // ← must list dependency
)
// ← same caching behaviour, but you manage the dependency array

// ============================================================
// WATCH vs useEffect
// ============================================================

// VUE: watch() — explicit reactive source, clear intent
let timer: ReturnType<typeof setTimeout>
watch(search, (newVal) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedSearch.value = newVal
  }, 300)
})
// watch(source, callback) — runs when source changes
// watchEffect(() => { ... }) — like useEffect, auto-tracks inside

// REACT: useEffect — runs after render, deps control re-runs
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search)
  }, 300)
  return () => clearTimeout(timer)   // ← cleanup function
}, [search])                          // ← deps: re-run when search changes
// ← cleanup is explicit (return function)
// ← Vue watch cleanup: onWatcherCleanup() or stop handle
```

---

### defineProps vs interface Props + Props type

```typescript
// ============================================================
// VUE — props declared with TypeScript generics (no runtime overhead)
// ============================================================
interface Booking { /* ... */ }

const props = defineProps<{
  booking: Booking
  selected?: boolean        // optional — no default
}>()

// With defaults (withDefaults wraps defineProps):
const props = withDefaults(defineProps<{
  booking: Booking
  selected?: boolean
  variant?: 'compact' | 'full'
}>(), {
  selected: false,
  variant: 'full',
})

// ============================================================
// REACT — props as function parameter type annotation
// ============================================================
interface Booking { /* ... */ }

interface BookingCardProps {
  booking: Booking
  selected?: boolean
  variant?: 'compact' | 'full'
  onAction: (action: string, id: number) => void
}

function BookingCard({
  booking,
  selected = false,      // default value inline
  variant = 'full',
  onAction,
}: BookingCardProps) {
  // ...
}

// Key difference: Vue props are REACTIVE — access via props.booking
//                 React props are just JS values — no reactivity system
// Vue: props.booking.amount → triggers computed re-evaluation automatically
// React: props.booking.amount → just a value, useMemo deps manage updates
```

---

### v-model vs controlled inputs

```vue
<!-- VUE: v-model — two-way binding with ONE directive -->
<script setup lang="ts">
const search = ref('')
const booking = reactive({ schoolName: '', studentCount: 0 })
</script>

<template>
  <!-- Primitive: v-model on input -->
  <input v-model="search" type="text" />

  <!-- Object property: v-model on reactive property -->
  <input v-model="booking.schoolName" type="text" />
  <input v-model.number="booking.studentCount" type="number" />
  <!-- .number modifier: auto-coerce to number -->
  <!-- .trim modifier:   auto-trim whitespace -->
  <!-- .lazy modifier:   sync on change not input -->

  <!-- v-model on custom component (emits update:modelValue): -->
  <BookingForm v-model="booking" />
  <!-- equivalent to: :modelValue="booking" @update:modelValue="booking = $event" -->
</template>
```

```tsx
// REACT: controlled input — always two pieces of code
const [search, setSearch] = useState('')
const [booking, setBooking] = useState({ schoolName: '', studentCount: 0 })

return (
  <>
    {/* Primitive */}
    <input value={search} onChange={e => setSearch(e.target.value)} />

    {/* Object property — must spread to avoid mutation */}
    <input
      value={booking.schoolName}
      onChange={e => setBooking(prev => ({ ...prev, schoolName: e.target.value }))}
    />

    {/* No modifier system — handle manually */}
    <input
      value={booking.studentCount}
      onChange={e => setBooking(prev => ({ ...prev, studentCount: Number(e.target.value) }))}
    />
  </>
)
// More verbose, but: explicit data flow is easier to trace in large apps
```

---

### When to choose Vue vs React

```
VUE — choose when:
  ✅ Team has HTML/backend background (PHP/Laravel) — template feels natural
  ✅ Building forms-heavy apps — v-model + .trim/.number/.lazy modifiers
  ✅ Smaller team, faster onboarding — less boilerplate
  ✅ SFC (Single File Component) keeps template + logic + styles co-located cleanly
  ✅ Official ecosystem (Pinia, Vue Router, Nuxt) is cohesive and opinionated
  ✅ Tripz: Laravel + Vue is a classic pairing (Inertia.js handles the glue)

REACT — choose when:
  ✅ Large ecosystem needed (more libraries, more StackOverflow answers)
  ✅ Team is JS-native — JSX feels natural
  ✅ React Native for mobile — share logic between web and app
  ✅ Complex state machines — useReducer/Zustand/Redux ecosystem richer
  ✅ Meta / large company investment — long-term support confidence
  ✅ Hiring: more React devs available globally

Neither is "better" — both compile to the same DOM operations.
Vue: less boilerplate, gentler learning curve
React: larger ecosystem, more explicit data flow
```
