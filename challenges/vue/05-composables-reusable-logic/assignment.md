# VUE_TEST_05 — Vue Composables · Reusable Logic · Custom Hooks

**Time:** 25 minutes | **Stack:** Vue 3 · TypeScript · Composition API

---

## Setup

Composables are functions that encapsulate reactive state + logic using the
Composition API. They are Vue's equivalent of React custom hooks. They must be
called inside `<script setup>` or another composable (not in event handlers).

```typescript
// Naming convention: always prefix with 'use'
// File: src/composables/useFetch.ts
// Usage: const { data, isLoading, error } = useFetch('/api/bookings')
```

---

## Problem 01 — Core Composables

### 1a. useFetch<T> — Generic data fetching

```typescript
// src/composables/useFetch.ts
import { ref, watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

interface UseFetchOptions {
  immediate?: boolean                       // fetch on mount (default: true)
  headers?:   Record<string, string>
}

interface UseFetchReturn<T> {
  data:      Ref<T | null>
  isLoading: Ref<boolean>
  error:     Ref<string | null>
  refresh:   () => void
}

export function useFetch<T>(
  url: MaybeRefOrGetter<string>,            // accepts string, ref, or getter fn
  options: UseFetchOptions = {}
): UseFetchReturn<T> {
  const data      = ref<T | null>(null)
  const isLoading = ref(false)
  const error     = ref<string | null>(null)

  let controller: AbortController | null = null

  async function fetchData() {
    // Cancel any in-flight request before starting new one
    controller?.abort()
    controller = new AbortController()

    isLoading.value = true
    error.value     = null

    try {
      const resolvedUrl = toValue(url)      // unwraps ref/getter to string
      const res = await fetch(resolvedUrl, {
        signal:  controller.signal,
        headers: options.headers,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

      data.value = await res.json() as T
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return   // cancelled — not an error
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  // watchEffect re-runs whenever url (if reactive) changes
  watchEffect((onCleanup) => {
    if (options.immediate !== false) fetchData()

    onCleanup(() => {
      controller?.abort()                   // abort when component unmounts or url changes
    })
  })

  return { data, isLoading, error, refresh: fetchData }
}
```

```vue
<!-- Usage in component: -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFetch } from '@/composables/useFetch'
import type { ApiResponse, Booking } from '@/types'

const route = useRoute()

// Reactive URL — re-fetches when route.params.id changes
const url = computed(() => `/api/v1/bookings/${route.params.id}`)

const { data, isLoading, error, refresh } = useFetch<ApiResponse<Booking>>(url)
const booking = computed(() => data.value?.data ?? null)
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error" class="text-red-500">{{ error }}</div>
  <BookingCard v-else-if="booking" :booking="booking" />
</template>
```

### 1b. useDebounce — Debounced reactive value

```typescript
// src/composables/useDebounce.ts
import { ref, watch, onUnmounted, type Ref } from 'vue'

export function useDebounce<T>(source: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref<T>(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout>

  watch(source, (newValue) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = newValue
    }, delay)
  })

  onUnmounted(() => clearTimeout(timer))   // cleanup pending timer

  return debounced
}
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { useFetch } from '@/composables/useFetch'
import { computed } from 'vue'

const search   = ref('')
const debounced = useDebounce(search, 400)  // only updates 400ms after typing stops

// useFetch reacts to debounced, not raw search → no API call on every keystroke
const url = computed(() =>
  `/api/v1/bookings?search=${encodeURIComponent(debounced.value)}`
)

const { data: bookings, isLoading } = useFetch<Booking[]>(url)
</script>

<template>
  <input v-model="search" placeholder="Search bookings..." />
  <!-- Shows debounced result — no spinner on every keystroke -->
  <div v-if="isLoading">Searching...</div>
</template>
```

### 1c. useLocalStorage<T> — Persistent reactive state

```typescript
// src/composables/useLocalStorage.ts
import { ref, watch, type Ref } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  // Read initial value from localStorage (or use default)
  function read(): T {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  }

  const storedValue = ref<T>(read()) as Ref<T>

  // Sync to localStorage whenever value changes
  watch(
    storedValue,
    (newValue) => {
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch {
        // Ignore: storage full or private browsing
      }
    },
    { deep: true }                          // deep: watch nested object changes
  )

  return storedValue
}
```

```vue
<script setup lang="ts">
import { useLocalStorage } from '@/composables/useLocalStorage'
import type { BookingFilters } from '@/types'

// Persists across page reloads — restored on next visit
const filters = useLocalStorage<BookingFilters>('tripz:filters', {
  status:   '',
  search:   '',
  dateFrom: '',
  dateTo:   '',
})

const pageSize = useLocalStorage<number>('tripz:pageSize', 15)
</script>

<template>
  <!-- Changes to filters.status auto-save to localStorage -->
  <select v-model="filters.status">
    <option value="">All statuses</option>
    <option value="pending">Pending</option>
    <option value="confirmed">Confirmed</option>
  </select>
</template>
```

### 1d. useToggle — Boolean state helper

```typescript
// src/composables/useToggle.ts
import { ref, type Ref } from 'vue'

export function useToggle(initial = false): [Ref<boolean>, () => void, (v: boolean) => void] {
  const state = ref(initial)

  function toggle()           { state.value = !state.value }
  function set(v: boolean)    { state.value = v }

  return [state, toggle, set]
}
```

```vue
<script setup lang="ts">
import { useToggle } from '@/composables/useToggle'

const [isOpen,    toggleOpen]    = useToggle(false)
const [isLoading, , setLoading] = useToggle(false)
</script>

<template>
  <button @click="toggleOpen">{{ isOpen ? 'Hide' : 'Show' }} Filters</button>
  <div v-show="isOpen">...</div>
</template>
```

### 1e. useEventListener — Auto-cleaned event binding

```typescript
// src/composables/useEventListener.ts
import { onMounted, onUnmounted } from 'vue'

export function useEventListener<K extends keyof WindowEventMap>(
  target: EventTarget | Window,
  event:  K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
) {
  onMounted(()   => target.addEventListener(event, handler as EventListener, options))
  onUnmounted(() => target.removeEventListener(event, handler as EventListener, options))
}
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useEventListener } from '@/composables/useEventListener'

const scrollY = ref(0)
const isScrolled = computed(() => scrollY.value > 64)

// Auto-removed on unmount — no manual cleanup
useEventListener(window, 'scroll', () => {
  scrollY.value = window.scrollY
})

// Keyboard shortcut
useEventListener(window, 'keydown', (e) => {
  if (e.key === 'Escape') closeModal()
})
</script>
```

---

## Problem 02 — Advanced Composables

### 2a. usePagination

```typescript
// src/composables/usePagination.ts
import { ref, computed, type Ref } from 'vue'

interface PaginationOptions {
  initialPage?:    number
  initialPerPage?: number
}

export function usePagination(total: Ref<number>, options: PaginationOptions = {}) {
  const page    = ref(options.initialPage    ?? 1)
  const perPage = ref(options.initialPerPage ?? 15)

  const lastPage   = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
  const hasNext    = computed(() => page.value < lastPage.value)
  const hasPrev    = computed(() => page.value > 1)
  const from       = computed(() => (page.value - 1) * perPage.value + 1)
  const to         = computed(() => Math.min(page.value * perPage.value, total.value))

  function goTo(n: number) {
    page.value = Math.max(1, Math.min(n, lastPage.value))
  }
  function next()  { if (hasNext.value) goTo(page.value + 1) }
  function prev()  { if (hasPrev.value) goTo(page.value - 1) }
  function reset() { page.value = 1 }

  // Reset to page 1 when perPage changes
  watch(perPage, reset)

  return { page, perPage, lastPage, hasNext, hasPrev, from, to, goTo, next, prev, reset }
}
```

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePagination } from '@/composables/usePagination'
import { useFetch } from '@/composables/useFetch'

const totalBookings = ref(0)
const { page, perPage, lastPage, next, prev, goTo, reset } = usePagination(totalBookings)

const url = computed(() =>
  `/api/v1/bookings?page=${page.value}&per_page=${perPage.value}`
)

const { data, isLoading } = useFetch<ApiResponse<Booking[]>>(url)
watch(data, (d) => { if (d?.meta) totalBookings.value = d.meta.total })
</script>
```

### 2b. useIntersectionObserver — Infinite scroll

```typescript
// src/composables/useIntersectionObserver.ts
import { ref, watch, onUnmounted, type Ref } from 'vue'

export function useIntersectionObserver(
  target:  Ref<HTMLElement | null>,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const isIntersecting = ref(false)
  let observer: IntersectionObserver | null = null

  function disconnect() {
    observer?.disconnect()
    observer = null
  }

  watch(target, (el) => {
    disconnect()
    if (!el) return

    observer = new IntersectionObserver((entries, obs) => {
      isIntersecting.value = entries[0]?.isIntersecting ?? false
      callback(entries, obs)
    }, options)

    observer.observe(el)
  }, { immediate: true })

  onUnmounted(disconnect)

  return { isIntersecting }
}
```

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useIntersectionObserver } from '@/composables/useIntersectionObserver'

const bookings   = ref<Booking[]>([])
const page       = ref(1)
const hasMore    = ref(true)
const isLoading  = ref(false)
const sentinel   = ref<HTMLElement | null>(null)  // bottom sentinel div

useIntersectionObserver(sentinel, async ([entry]) => {
  if (!entry.isIntersecting || isLoading.value || !hasMore.value) return
  isLoading.value = true
  const res = await fetch(`/api/v1/bookings?page=${++page.value}`)
  const json = await res.json()
  bookings.value.push(...json.data)
  hasMore.value = json.meta.current_page < json.meta.last_page
  isLoading.value = false
}, { threshold: 0.1 })
</script>

<template>
  <div v-for="b in bookings" :key="b.id">...</div>
  <div ref="sentinel" class="h-4" />           <!-- trigger point at bottom of list -->
  <div v-if="isLoading">Loading more...</div>
</template>
```

### 2c. useAsyncAction — Wraps any async operation

```typescript
// src/composables/useAsyncAction.ts
import { ref } from 'vue'

export function useAsyncAction<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>
) {
  const isLoading = ref(false)
  const error     = ref<string | null>(null)
  const result    = ref<TReturn | null>(null)

  async function execute(...args: TArgs): Promise<TReturn | null> {
    isLoading.value = true
    error.value     = null
    try {
      result.value = await action(...args)
      return result.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Action failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, result, execute }
}
```

```vue
<script setup lang="ts">
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useBookingStore } from '@/stores/booking'

const store = useBookingStore()

const deleteAction = useAsyncAction((id: number) => store.deleteBooking(id))
// deleteAction.execute(42)
// deleteAction.isLoading.value
// deleteAction.error.value
</script>

<template>
  <button
    @click="deleteAction.execute(booking.id)"
    :disabled="deleteAction.isLoading.value"
  >
    {{ deleteAction.isLoading.value ? 'Deleting...' : 'Delete' }}
  </button>
  <p v-if="deleteAction.error.value" class="text-red-500">{{ deleteAction.error.value }}</p>
</template>
```

### 2d. useMediaQuery — Responsive breakpoints

```typescript
// src/composables/useMediaQuery.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  function update() { matches.value = mql?.matches ?? false }

  onMounted(() => {
    mql = window.matchMedia(query)
    update()
    mql.addEventListener('change', update)
  })

  onUnmounted(() => mql?.removeEventListener('change', update))

  return matches
}

// Convenience composable for Tailwind breakpoints
export function useBreakpoints() {
  return {
    isMobile:  useMediaQuery('(max-width: 639px)'),
    isTablet:  useMediaQuery('(min-width: 640px) and (max-width: 1023px)'),
    isDesktop: useMediaQuery('(min-width: 1024px)'),
  }
}
```

### 2e. Shared state composable (module-level singleton)

```typescript
// src/composables/useTheme.ts
import { ref, watch } from 'vue'

// State declared OUTSIDE the function = shared across ALL component instances
const theme = ref<'light' | 'dark'>('light')

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }

  // State is shared — all components using useTheme() see the same ref
  return { theme, toggle }
}

// ← CONTRAST with per-instance composables (state inside function body):
// export function useCounter() {
//   const count = ref(0)  // ← new ref for every call → NOT shared
//   return { count, increment: () => count.value++ }
// }
```

### 2f. Vue composables vs React custom hooks

```
MENTAL MODEL:
  Vue:   composable = function using ref/computed/watch/onMounted
  React: custom hook = function using useState/useEffect/useMemo

CALL RULES:
  Vue:   call inside <script setup> or another composable
         (not in onMounted, event handlers, or conditionals)
  React: call inside function components or other hooks
         (not in conditionals, loops, or callbacks — Rules of Hooks)

STATE:
  Vue:   ref()/reactive() → mutable, no setter needed
         composable.value = 'x'  ← direct assignment
  React: useState() → [value, setter] pair
         setValue('x')  ← always use setter

SIDE EFFECTS + CLEANUP:
  Vue:   watchEffect(onCleanup => { onCleanup(() => cleanup()) })
         onUnmounted(() => cleanup())  ← lifecycle hook
         ← cleanup registered declaratively, runs automatically
  React: useEffect(() => { return () => cleanup() }, [deps])
         ← cleanup is return value of effect function

DEPENDENCY TRACKING:
  Vue:   automatic — watch/computed track deps at runtime
         no dependency array needed
  React: manual — useEffect/useMemo/useCallback require [deps] array
         missing dep = stale closure bug

SHARED STATE:
  Vue:   declare ref/reactive OUTSIDE composable function body
         → module-level singleton, shared across all callers
  React: React Context + useContext()
         or external store (Zustand/Jotai)
         ← no module-level singleton pattern (causes React warnings)

LIFECYCLE:
  Vue:   onMounted, onUnmounted inside composable — work when called
         from <script setup>
  React: useEffect(() => { /* mount */ return /* unmount */ }, [])
         ← one hook for both mount and unmount

REACTIVE URL (re-fetch on change):
  Vue:   const url = computed(() => `/api/${id.value}`)
         watchEffect(() => fetch(toValue(url)))  ← auto-tracks url
  React: useEffect(() => { fetch(`/api/${id}`) }, [id])
         ← must list id in deps array

VueUse LIBRARY:
  Vue:   VueUse (vueuse.org) — 200+ composables
         useFetch, useLocalStorage, useDebounce, useIntersectionObserver...
  React: react-use, ahooks, usehooks.com — similar ecosystem
```

### 2g. Testing composables

```typescript
// vitest
import { ref, nextTick } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { useFetch } from '@/composables/useFetch'

// Mount composable in an isolated component for lifecycle hooks to work
import { mount } from '@vue/test-utils'

function withSetup<T>(composable: () => T): [T, ReturnType<typeof mount>] {
  let result!: T
  const TestComponent = defineComponent({
    setup() { result = composable() },
    template: '<div />',
  })
  const wrapper = mount(TestComponent)
  return [result, wrapper]
}

test('useDebounce delays value update', async () => {
  vi.useFakeTimers()
  const [{ debounced, source }] = withSetup(() => {
    const source   = ref('initial')
    const debounced = useDebounce(source, 300)
    return { source, debounced }
  })

  source.value = 'changed'
  await nextTick()
  expect(debounced.value).toBe('initial')        // not yet updated

  vi.advanceTimersByTime(300)
  await nextTick()
  expect(debounced.value).toBe('changed')        // now updated

  vi.useRealTimers()
})

test('useFetch returns data on success', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: [{ id: 1 }] }),
  })

  const [{ data, isLoading }] = withSetup(() => useFetch('/api/bookings'))

  expect(isLoading.value).toBe(true)
  await flushPromises()
  expect(isLoading.value).toBe(false)
  expect(data.value).toEqual({ data: [{ id: 1 }] })
})
```
