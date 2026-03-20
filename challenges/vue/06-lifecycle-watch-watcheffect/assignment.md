# VUE_TEST_06 — Lifecycle Hooks · watch · watchEffect · nextTick

**Time:** 25 minutes | **Stack:** Vue 3 · TypeScript · Composition API

---

## Setup

Master Vue's reactivity system: when lifecycle hooks run, how `watch` and
`watchEffect` differ, when to use `nextTick`, and how to clean up side effects.
All examples use the Tripz booking dashboard context.

---

## Problem 01 — Lifecycle Hooks & Watchers

### 1a. Full lifecycle sequence

```
Creation
  setup()              ← Composition API entry point
  onBeforeMount()      ← DOM not yet created
  onMounted()          ← DOM ready, refs attached

Update (when reactive state changes)
  onBeforeUpdate()     ← DOM not yet patched
  onUpdated()          ← DOM patched (avoid state mutation here)

Teardown
  onBeforeUnmount()    ← component still accessible
  onUnmounted()        ← DOM removed, refs cleared

KeepAlive only
  onActivated()        ← component enters cache
  onDeactivated()      ← component leaves cache

Error handling
  onErrorCaptured()    ← catch errors from child components
```

### 1b. onMounted — real-world patterns

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useBookingStore } from '@/stores/booking'

const store     = useBookingStore()
const chartRef  = ref<HTMLCanvasElement | null>(null)
let   pollTimer: ReturnType<typeof setInterval>
let   chart:     Chart | null = null

onMounted(async () => {
  // 1. Initial data fetch
  await store.fetchBookings()

  // 2. Third-party library needs real DOM element
  if (chartRef.value) {
    chart = new Chart(chartRef.value, {
      type: 'bar',
      data: { /* ... */ },
    })
  }

  // 3. Live polling (dashboard updates every 30s)
  pollTimer = setInterval(() => store.fetchBookings(), 30_000)

  // 4. Page title
  document.title = 'Bookings — Tripz'
})

onUnmounted(() => {
  // Must clean up everything started in onMounted
  clearInterval(pollTimer)             // stop polling
  chart?.destroy()                     // destroy Chart.js instance
  document.title = 'Tripz'            // restore title
})
</script>

<template>
  <canvas ref="chartRef" />           <!-- ref is null until onMounted -->
</template>
```

### 1c. watch — specific source, old/new values

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBookingStore } from '@/stores/booking'

const store = useBookingStore()
const route = useRoute()

// 1. Watch a single ref
const searchQuery = ref('')
watch(searchQuery, (newVal, oldVal) => {
  console.log(`Search changed: "${oldVal}" → "${newVal}"`)
  store.setFilter('search', newVal)
})

// 2. Watch a computed / getter — use function form
watch(
  () => route.params.id,                  // source is a getter (not a ref)
  async (newId, oldId) => {
    if (newId === oldId) return
    await store.fetchBooking(Number(newId))
  },
  { immediate: true }                     // run once on mount with current value
)

// 3. Watch multiple sources — fires when ANY of them change
const page    = ref(1)
const perPage = ref(15)

watch([page, perPage], ([newPage, newPerPage], [oldPage, oldPerPage]) => {
  store.fetchBookings({ page: newPage, perPage: newPerPage })
})

// 4. Watch a reactive object — requires deep: true
import { reactive } from 'vue'
const filters = reactive({ status: '', search: '', dateFrom: '' })

watch(
  () => ({ ...filters }),                 // snapshot getter (avoids deep: true)
  () => store.fetchBookings(),
  { deep: false }                         // snapshot is a new object each time
)
// OR:
watch(filters, () => store.fetchBookings(), { deep: true })
//   ← deep: true traverses nested object, triggers on any property change
//   ← oldVal === newVal for objects (same reference) — use getter snapshot to avoid
```

### 1d. watch options

```typescript
// immediate: true — run callback immediately with current value (like onMounted + watch)
watch(source, handler, { immediate: true })

// deep: true — watch nested object properties
watch(filtersObject, handler, { deep: true })

// once: true — auto-stop after first trigger (Vue 3.4+)
watch(isLoaded, () => initThirdPartyLib(), { once: true })

// flush: 'pre' (default) — runs before DOM update
// flush: 'post'          — runs AFTER DOM update (can access updated DOM)
// flush: 'sync'          — runs synchronously (avoid unless necessary)
watch(source, handler, { flush: 'post' })  // equivalent to watchPostEffect for watchEffect

// Stop a watcher manually
const stop = watch(source, handler)
// ... later:
stop()  // unsubscribe — useful for watchers created conditionally
```

### 1e. watchEffect — auto-tracked, immediate

```vue
<script setup lang="ts">
import { ref, watchEffect, onUnmounted } from 'vue'

const bookingId = ref<number | null>(null)
const booking   = ref<Booking | null>(null)
const isLoading = ref(false)
let   controller: AbortController | null = null

// watchEffect: auto-tracks ANY reactive ref read inside the function
// runs IMMEDIATELY on setup, re-runs whenever tracked deps change
watchEffect(async (onCleanup) => {
  if (bookingId.value === null) return

  controller = new AbortController()

  // Register cleanup — runs before next effect OR on component unmount
  onCleanup(() => { controller?.abort() })

  isLoading.value = true
  try {
    const res = await fetch(`/api/v1/bookings/${bookingId.value}`, {
      signal: controller.signal,
    })
    booking.value = await res.json()
  } catch (e) {
    if ((e as Error).name !== 'AbortError') console.error(e)
  } finally {
    isLoading.value = false
  }
})
// ← reads bookingId.value → tracked automatically
// ← bookingId changes → onCleanup runs (aborts old request) → effect re-runs
</script>
```

### 1f. watch vs watchEffect — when to use each

```typescript
// USE watch WHEN:
// 1. You need old value and new value
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})

// 2. You want lazy execution (NOT immediate by default)
watch(source, handler)              // doesn't run until source changes

// 3. You need explicit control over which source triggers the effect
watch(specificRef, handler)         // ONLY fires when specificRef changes

// 4. You want to stop the watcher
const stop = watch(source, handler)
stop()

// USE watchEffect WHEN:
// 1. You want the effect to run immediately and track multiple refs
watchEffect(() => {
  document.title = `${bookings.value.length} bookings — ${filters.status || 'All'}`
})
// ← auto-tracks bookings.value AND filters.status

// 2. You don't need old/new values
// 3. You want auto-cleanup registration (onCleanup param)
// 4. Multiple reactive reads that all should trigger the effect
```

### 1g. nextTick — wait for DOM update

```vue
<script setup lang="ts">
import { ref, nextTick } from 'vue'

const showForm    = ref(false)
const nameInput   = ref<HTMLInputElement | null>(null)
const bookings    = ref<Booking[]>([])
const newBookingEl = ref<HTMLElement | null>(null)

// Pattern 1: Focus input after showing form
async function openForm() {
  showForm.value = true
  await nextTick()                       // wait for v-if to render the input
  nameInput.value?.focus()               // input is now in the DOM
}

// Pattern 2: Scroll to newly added item
async function addBooking(data: BookingFormData) {
  const newBooking = await store.createBooking(data)
  bookings.value.unshift(newBooking)     // add to list
  await nextTick()                       // wait for new item to render
  newBookingEl.value?.scrollIntoView({ behavior: 'smooth' })
}

// Pattern 3: Read updated DOM measurement
async function onResize() {
  containerWidth.value = container.value?.clientWidth ?? 0
  await nextTick()
  chart?.resize()                        // chart reads updated container size
}
</script>

<template>
  <form v-if="showForm">
    <input ref="nameInput" type="text" />     <!-- null until v-if renders -->
  </form>
  <div v-for="b in bookings" :key="b.id" :ref="b.id === newest ? 'newBookingEl' : undefined">
</template>
```

### 1h. onUpdated — post-DOM-patch operations

```vue
<script setup lang="ts">
import { ref, onUpdated } from 'vue'

const listRef = ref<HTMLElement | null>(null)

// onUpdated fires after every reactive-change-triggered DOM patch
onUpdated(() => {
  // ✅ Use for: updating non-reactive third-party libs after Vue re-renders
  if (listRef.value) {
    sortableInstance?.sort(
      Array.from(listRef.value.children).map(el => el.getAttribute('data-id') ?? '')
    )
  }

  // ❌ DON'T mutate reactive state here — causes infinite update loop
  // bookings.value = []  // ← triggers update → onUpdated → update → ...
})
</script>
```

---

## Problem 02 — Advanced Lifecycle & Watcher Patterns

### 2a. onWatcherCleanup (Vue 3.5+) — cleanup inside watch callback

```typescript
import { watch, onWatcherCleanup } from 'vue'

// Vue 3.5+: onWatcherCleanup() inside watch callback (no need for watchEffect)
watch(bookingId, async (newId) => {
  const controller = new AbortController()

  onWatcherCleanup(() => controller.abort())    // ← registers cleanup inline

  const res = await fetch(`/api/bookings/${newId}`, { signal: controller.signal })
  booking.value = await res.json()
})

// Before Vue 3.5 — only available via watchEffect's onCleanup parameter:
watchEffect(async (onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  // ...
})
```

### 2b. flush options — when effect runs relative to DOM

```typescript
// flush: 'pre' (default):
//   ← runs before DOM is updated
//   ← you see STALE DOM if you try to read it
//   ← best for: pure data operations (API calls, state updates)

// flush: 'post':
//   ← runs AFTER Vue has updated the DOM
//   ← you can access updated DOM refs
//   ← alias: watchPostEffect(() => { ... })

// flush: 'sync':
//   ← runs synchronously as soon as reactive dep changes
//   ← bypasses batching — use only for debugging or very specific timing
//   ← alias: watchSyncEffect(() => { ... })

// Example: read updated DOM after Vue re-renders
import { watchPostEffect } from 'vue'

watchPostEffect(() => {
  // DOM is updated here — safe to measure
  if (listRef.value) {
    console.log('List height:', listRef.value.clientHeight)
  }
})
```

### 2c. KeepAlive lifecycle hooks

```vue
<script setup lang="ts">
import { onActivated, onDeactivated } from 'vue'

// onActivated: fires when cached component enters the view
onActivated(() => {
  // Refresh stale data (component was cached, not re-mounted)
  store.fetchBookings()

  // Restart polling that was stopped on deactivation
  pollTimer = setInterval(() => store.fetchBookings(), 30_000)

  console.log('BookingsPage activated from cache')
})

// onDeactivated: fires when cached component leaves the view
onDeactivated(() => {
  clearInterval(pollTimer)          // pause polling while cached
  controller?.abort()              // cancel in-flight requests
})

// onMounted/onUnmounted also fire — but ONLY on first mount / final destroy
// onActivated/onDeactivated fire every time cache is entered/exited
</script>
```

### 2d. onErrorCaptured — catch child component errors

```vue
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const childError = ref<string | null>(null)

onErrorCaptured((err: Error, instance, info) => {
  console.error(`Error in ${info}:`, err)
  childError.value = err.message

  // Return false to stop propagation to parent / global handler
  return false

  // Return true (or nothing) to let it propagate up
})
</script>

<template>
  <div v-if="childError" class="bg-red-50 border border-red-200 p-4">
    Something went wrong: {{ childError }}
    <button @click="childError = null">Retry</button>
  </div>
  <slot v-else />
</template>
```

### 2e. Watcher in composable — lifecycle binding

```typescript
// src/composables/useBookingPolling.ts
import { ref, onMounted, onUnmounted, watch } from 'vue'

export function useBookingPolling(intervalMs = 30_000) {
  const lastUpdated = ref<Date | null>(null)
  let   timer: ReturnType<typeof setInterval>

  async function refresh() {
    await store.fetchBookings()
    lastUpdated.value = new Date()
  }

  // These lifecycle hooks bind to the CALLING component's lifecycle
  // ← not global — each component instance gets its own timer
  onMounted(() => {
    refresh()                              // initial fetch
    timer = setInterval(refresh, intervalMs)
  })

  onUnmounted(() => clearInterval(timer))  // cleanup on component destroy

  return { lastUpdated, refresh }
}

// Usage in component:
// const { lastUpdated, refresh } = useBookingPolling(30_000)
// ← timer starts on mount, stops on unmount — component doesn't manage cleanup
```

### 2f. watch deep vs shallow — performance considerations

```typescript
// DEEP watch — traverses every nested property (expensive on large objects)
watch(largeObject, handler, { deep: true })
//   ← avoids for: large arrays, deeply nested store state

// GETTER SNAPSHOT — only watches what you extract (preferred)
watch(
  () => ({ status: filters.status, search: filters.search }),
  handler
)
// ← Vue creates new object each time — detects change by value comparison
// ← only tracks filters.status and filters.search (not entire filters object)

// SPECIFIC GETTER — most efficient
watch(() => filters.status, (newStatus) => {
  store.setFilter('status', newStatus)
})

// ARRAY — watch for mutations (push, splice) vs replacement
const items = ref<number[]>([])
watch(items, handler, { deep: true })   // detects push/splice
watch(items, handler)                   // only detects items.value = [...] replacement

// ONCE — auto-stops after first trigger (avoids manual stop())
watch(isDataLoaded, () => initChart(), { once: true, immediate: true })
```

### 2g. Vue lifecycle vs React lifecycle

```
MOUNT (run once on DOM insertion):
  Vue:   onMounted(() => { fetchData(); setupChart() })
  React: useEffect(() => { fetchData(); setupChart() }, [])
         ← empty deps array = mount only

UNMOUNT (cleanup):
  Vue:   onUnmounted(() => { clearInterval(timer); chart.destroy() })
  React: useEffect(() => {
           setupChart()
           return () => chart.destroy()   ← cleanup is return value
         }, [])
         ← cleanup is INSIDE the same useEffect as setup

UPDATE (run on every re-render):
  Vue:   onUpdated(() => { ... })
  React: useEffect(() => { ... })  ← no deps array = every render

WATCH SPECIFIC VALUE:
  Vue:   watch(id, (newId) => fetchBooking(newId), { immediate: true })
  React: useEffect(() => { fetchBooking(id) }, [id])
         ← immediate is not needed: deps-array effect always runs on mount

WATCH MULTIPLE VALUES:
  Vue:   watch([page, perPage], ([p, pp]) => fetch(p, pp))
  React: useEffect(() => { fetch(page, perPage) }, [page, perPage])

AUTO-TRACKING (watchEffect):
  Vue:   watchEffect(() => {
           document.title = `${count.value} - ${filter.value}`
         })  ← count and filter auto-tracked
  React: useEffect(() => {
           document.title = `${count} - ${filter}`
         }, [count, filter])  ← must list deps manually

CLEANUP INSIDE WATCH:
  Vue 3.5+: onWatcherCleanup(() => controller.abort())  ← inside watch cb
  Vue 3.0:  watchEffect(onCleanup => { onCleanup(() => controller.abort()) })
  React:    useEffect(() => { return () => controller.abort() }, [id])

KEEPALIVE:
  Vue:   onActivated / onDeactivated  ← fire on cache entry/exit
  React: no built-in equivalent (React doesn't cache components by default)

ERROR BOUNDARY:
  Vue:   onErrorCaptured in parent component
  React: class ErrorBoundary with componentDidCatch (no hooks equivalent)

OLD VALUE:
  Vue:   watch(src, (newVal, oldVal) => { /* both available */ })
  React: use useRef to store previous: const prev = useRef(val)
         ← React's useEffect does not provide previous value natively
```

### 2h. Testing lifecycle and watchers

```typescript
// vitest + @vue/test-utils

test('fetches booking when id param changes', async () => {
  const store  = useBookingStore(createTestingPinia({ createSpy: vi.fn }))
  const router = createRouter({ history: createMemoryHistory(), routes })

  await router.push('/bookings/1')
  const wrapper = mount(BookingDetailPage, { global: { plugins: [router, pinia] } })
  await flushPromises()                          // resolve onMounted / immediate watch

  expect(store.fetchBooking).toHaveBeenCalledWith(1)

  // Simulate param change
  await router.push('/bookings/42')
  await flushPromises()

  expect(store.fetchBooking).toHaveBeenCalledWith(42)
  expect(store.fetchBooking).toHaveBeenCalledTimes(2)
})

test('clears interval on unmount', () => {
  vi.useFakeTimers()
  const clearSpy = vi.spyOn(global, 'clearInterval')

  const wrapper = mount(DashboardPage, { ... })
  wrapper.unmount()

  expect(clearSpy).toHaveBeenCalled()
  vi.useRealTimers()
})

test('nextTick: focuses input after showForm becomes true', async () => {
  const wrapper = mount(BookingFormWrapper)
  const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')

  await wrapper.find('[data-testid="open-form"]').trigger('click')
  await nextTick()

  expect(focusSpy).toHaveBeenCalled()
})
```
