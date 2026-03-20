# VUE_TEST_09 — Testing with Vitest & Vue Test Utils

**Time:** 35 minutes | **Stack:** Vue 3 · TypeScript · Vitest · @vue/test-utils · Pinia

---

## Setup

Write reliable, maintainable component tests for the Tripz booking platform. Master
mounting strategies, DOM queries, user interaction simulation, async handling, and
dependency mocking with Pinia, fetch, and Vue Router.

---

## Problem 01 — Mounting, Querying & Interactions

### 1a. mount vs shallowMount

```typescript
import { mount, shallowMount } from '@vue/test-utils'
import BookingList from '@/components/BookingList.vue'
import BookingCard from '@/components/BookingCard.vue'

// mount — renders the full component tree (all children included)
// Use when: testing integration between parent and child components,
//           or when child output matters for the assertion
const wrapper = mount(BookingList, {
  props: { bookings: [{ id: 1, destination: 'Paris', status: 'confirmed' }] },
})
// BookingCard children are fully rendered — you can query inside them

// shallowMount — replaces child components with stubs (<booking-card-stub>)
// Use when: testing the parent in isolation (child behaviour is irrelevant),
//           or when children have complex dependencies that slow tests down
const shallow = shallowMount(BookingList, {
  props: { bookings: [] },
})
// <BookingCard> is replaced by <booking-card-stub> — no child logic runs

// Explicit stubs — replace specific children, keep others real
const withStub = mount(BookingList, {
  global: {
    stubs: {
      BookingCard: true,                // stub with generic tag
      AppPagination: { template: '<div class="pagination-stub" />' }, // custom stub
      RouterLink: RouterLinkStub,       // use test-utils built-in stubs
    },
  },
})
```

### 1b. Querying the DOM

```typescript
import { mount } from '@vue/test-utils'

const wrapper = mount(BookingCard, {
  props: { booking: { id: 5, destination: 'Tokyo', status: 'pending' } },
})

// Preferred: data-testid attribute — decoupled from class/text changes
const title   = wrapper.find('[data-testid="booking-destination"]')
const actions = wrapper.findAll('[data-testid="action-btn"]')  // returns DOMWrapper[]

// Find a Vue component instance within the tree
const card    = wrapper.findComponent(BookingCard)
const byName  = wrapper.findComponent({ name: 'BookingCard' })

// Reading DOM values
const text    = wrapper.find('[data-testid="status-badge"]').text()    // 'pending'
const html    = wrapper.find('[data-testid="card-body"]').html()       // raw HTML string
const disabled = wrapper.find('button[data-testid="cancel-btn"]').attributes('disabled')

// Existence checks
expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(false)
expect(wrapper.findAll('[data-testid="booking-row"]')).toHaveLength(3)

// Component props / emits via findComponent
const paginationWrapper = wrapper.findComponent(AppPagination)
expect(paginationWrapper.props('currentPage')).toBe(1)
```

### 1c. Interactions — trigger & setValue

```typescript
// trigger — dispatches a native DOM event
await wrapper.find('[data-testid="confirm-btn"]').trigger('click')
await wrapper.find('form[data-testid="booking-form"]').trigger('submit')
await wrapper.find('[data-testid="search-input"]').trigger('input')

// setValue — sets an input/select value AND triggers both input + change events
await wrapper.find('[data-testid="search-input"]').setValue('Paris')
await wrapper.find('[data-testid="status-select"]').setValue('cancelled')
await wrapper.find('[data-testid="seats-input"]').setValue('3')

// Keyboard events
await wrapper.find('[data-testid="search-input"]').trigger('keydown', { key: 'Enter' })

// Reading emitted events — wrapper.emitted() returns record of all emitted events
await wrapper.find('[data-testid="cancel-btn"]').trigger('click')
expect(wrapper.emitted('cancel')).toHaveLength(1)
expect(wrapper.emitted('cancel')![0]).toEqual([5])  // first emission, first arg = booking id

// v-if conditional rendering
expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
await wrapper.setProps({ bookings: [{ id: 1 }] })
expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)
```

### 1d. Testing BookingCard — renders booking data

```typescript
// src/components/__tests__/BookingCard.test.ts
import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BookingCard from '@/components/BookingCard.vue'

const booking = {
  id: 7,
  destination: 'Bali',
  departureDate: '2026-06-15',
  seats: 2,
  status: 'confirmed',
  totalPrice: 1840.00,
}

describe('BookingCard', () => {
  test('renders destination and status', () => {
    const wrapper = mount(BookingCard, { props: { booking } })
    expect(wrapper.find('[data-testid="booking-destination"]').text()).toBe('Bali')
    expect(wrapper.find('[data-testid="status-badge"]').text()).toBe('confirmed')
  })

  test('shows cancel button only for pending/confirmed bookings', async () => {
    const wrapper = mount(BookingCard, { props: { booking: { ...booking, status: 'pending' } } })
    expect(wrapper.find('[data-testid="cancel-btn"]').exists()).toBe(true)

    await wrapper.setProps({ booking: { ...booking, status: 'cancelled' } })
    expect(wrapper.find('[data-testid="cancel-btn"]').exists()).toBe(false)
  })

  test('emits cancel event with booking id on cancel click', async () => {
    const wrapper = mount(BookingCard, { props: { booking } })
    await wrapper.find('[data-testid="cancel-btn"]').trigger('click')
    expect(wrapper.emitted('cancel')![0]).toEqual([7])
  })
})
```

---

## Problem 02 — Async Testing

### 2a. nextTick vs flushPromises

```typescript
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

// nextTick() — waits for Vue to process ONE round of reactive DOM updates
// Use when: you changed reactive state and want to assert the updated DOM
const wrapper = mount(BookingList, { props: { bookings: [] } })
await wrapper.setProps({ bookings: [{ id: 1, destination: 'Rome' }] })
await nextTick()
// DOM now reflects new props — safe to query updated elements

// flushPromises() — resolves ALL pending promises in the microtask queue
// Use when: component calls fetch/axios, dispatches async Pinia actions,
//           or has async setup() / onMounted that returns a promise
await flushPromises()
// All async operations (API calls, store actions) have settled

// In practice:
// ← nextTick: sufficient for synchronous reactive updates
// ← flushPromises: needed any time promises are involved
// ← they can be combined: await nextTick() then await flushPromises()
```

### 2b. Testing BookingList — filters & pagination

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import BookingList from '@/components/BookingList.vue'
import { useBookingStore } from '@/stores/booking'

describe('BookingList', () => {
  test('renders all bookings returned by store', async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        booking: {
          bookings: [
            { id: 1, destination: 'Paris',  status: 'confirmed' },
            { id: 2, destination: 'Berlin', status: 'pending'   },
            { id: 3, destination: 'Tokyo',  status: 'cancelled' },
          ],
        },
      },
    })
    const wrapper = mount(BookingList, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.findAll('[data-testid="booking-row"]')).toHaveLength(3)
  })

  test('filters bookings by status', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn,
      initialState: { booking: { bookings: [
        { id: 1, destination: 'Paris',  status: 'confirmed' },
        { id: 2, destination: 'Berlin', status: 'pending'   },
      ]}}
    })
    const wrapper = mount(BookingList, { global: { plugins: [pinia] } })
    await wrapper.find('[data-testid="status-filter"]').setValue('confirmed')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="booking-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="booking-row"]').text()).toContain('Paris')
  })
})
```

---

## Problem 03 — Pinia Mocking with createTestingPinia

### 3a. createTestingPinia — setup & options

```typescript
import { createTestingPinia } from '@pinia/testing'
import { vi } from 'vitest'

// createTestingPinia replaces Pinia with a test-safe version:
//   ← actions are stubbed (no-ops) by default — they do NOT run real logic
//   ← state is directly writable (no need to call actions to set it)
//   ← all actions are replaced with vi.fn() spies when createSpy is provided

const pinia = createTestingPinia({
  createSpy: vi.fn,       // wrap all actions in vi.fn() — enables toHaveBeenCalled()
  initialState: {
    booking: {            // store id matches defineStore('booking', ...)
      bookings: [{ id: 1, destination: 'Paris', status: 'confirmed' }],
      isLoading: false,
      currentPage: 1,
    },
  },
  stubActions: true,      // default: true — actions are no-ops, returning undefined
  // stubActions: false   // runs real action logic (integration test mode)
})

const wrapper = mount(BookingList, {
  global: { plugins: [pinia] },
})

// Access the store instance AFTER mounting (pinia must be installed first)
const store = useBookingStore()
```

### 3b. Spying on store actions

```typescript
test('fetches bookings on mount', async () => {
  const pinia = createTestingPinia({ createSpy: vi.fn })
  mount(BookingList, { global: { plugins: [pinia] } })
  const store = useBookingStore()

  await flushPromises()

  // Action was called — stubbed, so no real fetch happened
  expect(store.fetchBookings).toHaveBeenCalledOnce()
})

test('calls cancelBooking with correct id', async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    initialState: {
      booking: { bookings: [{ id: 9, destination: 'Lima', status: 'confirmed' }] },
    },
  })
  const wrapper = mount(BookingList, { global: { plugins: [pinia] } })
  const store   = useBookingStore()

  await wrapper.find('[data-testid="cancel-btn"]').trigger('click')
  await flushPromises()

  expect(store.cancelBooking).toHaveBeenCalledWith(9)
})

test('mutates store state directly to test loading UI', async () => {
  const pinia = createTestingPinia({ createSpy: vi.fn, initialState: { booking: { isLoading: true } } })
  const wrapper = mount(BookingList, { global: { plugins: [pinia] } })

  expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
})
```

---

## Problem 04 — Mocking fetch & Modules

### 4a. Global fetch mocking

```typescript
import { vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Replace global.fetch before the test
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([
      { id: 1, destination: 'Paris', status: 'confirmed' },
    ]),
  })
})

afterEach(() => {
  vi.restoreAllMocks()  // restore global.fetch to original
})

test('renders data from fetch response', async () => {
  const wrapper = mount(BookingList)
  await flushPromises()  // let onMounted fetch complete

  expect(global.fetch).toHaveBeenCalledWith('/api/v1/bookings')
  expect(wrapper.findAll('[data-testid="booking-row"]')).toHaveLength(1)
})

// Error response
test('shows error state on failed fetch', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })
  const wrapper = mount(BookingList)
  await flushPromises()

  expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true)
})
```

### 4b. vi.mock() — module-level mocking

```typescript
// Mock the entire module — runs BEFORE imports are resolved
// vi.mock is hoisted to the top of the file automatically by Vitest
import { ref } from 'vue'
import { vi, describe, test, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BookingList from '@/components/BookingList.vue'

vi.mock('@/composables/useFetch', () => ({
  useFetch: vi.fn(() => ({
    data:      ref([{ id: 1, destination: 'Paris', status: 'confirmed' }]),
    isLoading: ref(false),
    error:     ref(null),
  })),
}))

test('renders data from useFetch composable', async () => {
  const wrapper = mount(BookingList)
  await flushPromises()

  expect(wrapper.findAll('[data-testid="booking-row"]')).toHaveLength(1)
})

// Dynamic mock return per test
import { useFetch } from '@/composables/useFetch'

test('shows loading spinner while fetching', () => {
  vi.mocked(useFetch).mockReturnValue({
    data:      ref([]),
    isLoading: ref(true),
    error:     ref(null),
  })
  const wrapper = mount(BookingList)
  expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
})
```

---

## Problem 05 — Vue Router Integration

### 5a. Router setup in tests

```typescript
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount, flushPromises } from '@vue/test-utils'
import BookingDetailPage from '@/pages/BookingDetailPage.vue'
import { routes } from '@/router'

test('loads booking when route param changes', async () => {
  // createMemoryHistory — no real browser URL, perfect for tests
  const router = createRouter({ history: createMemoryHistory(), routes })

  await router.push('/bookings/1')
  await router.isReady()  // wait for initial navigation to complete

  const pinia = createTestingPinia({ createSpy: vi.fn })
  const wrapper = mount(BookingDetailPage, {
    global: { plugins: [router, pinia] },
  })
  const store = useBookingStore()

  await flushPromises()
  expect(store.fetchBooking).toHaveBeenCalledWith(1)

  // Simulate navigation to a different booking
  await router.push('/bookings/42')
  await flushPromises()

  expect(store.fetchBooking).toHaveBeenCalledWith(42)
  expect(store.fetchBooking).toHaveBeenCalledTimes(2)
})

test('redirects unauthenticated users to /login', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const wrapper = mount(App, { global: { plugins: [router] } })

  await router.push('/dashboard')
  await router.isReady()
  await flushPromises()

  expect(router.currentRoute.value.path).toBe('/login')
})
```

---

## Problem 06 — Testing Composables with withSetup

### 6a. withSetup pattern

```typescript
// withSetup — lets you test a composable that uses lifecycle hooks or provide/inject
// by wrapping it in a real component's setup() context

import { mount, flushPromises } from '@vue/test-utils'
import { withSetup } from '@/test-utils/withSetup'  // helper below
import { useBookingFilters } from '@/composables/useBookingFilters'

// Helper (create once in test-utils/withSetup.ts):
// export function withSetup(composable) {
//   let result
//   mount({
//     setup() { result = composable(); return () => {} },
//   })
//   return result
// }

test('useBookingFilters — initial state', () => {
  const { filters, setFilter, resetFilters } = withSetup(() => useBookingFilters())

  expect(filters.value.status).toBe('')
  expect(filters.value.search).toBe('')
})

test('useBookingFilters — setFilter updates state', () => {
  const { filters, setFilter } = withSetup(() => useBookingFilters())

  setFilter('status', 'confirmed')
  expect(filters.value.status).toBe('confirmed')
})

test('useBookingFilters — resetFilters clears all', () => {
  const { filters, setFilter, resetFilters } = withSetup(() => useBookingFilters())

  setFilter('status', 'pending')
  setFilter('search', 'Paris')
  resetFilters()

  expect(filters.value.status).toBe('')
  expect(filters.value.search).toBe('')
})
```

---

## Problem 07 — BookingForm: Validation & Submit

### 7a. Form validation and submit testing

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import BookingForm from '@/components/BookingForm.vue'
import { useBookingStore } from '@/stores/booking'

describe('BookingForm', () => {
  let wrapper: ReturnType<typeof mount>
  let store:   ReturnType<typeof useBookingStore>

  beforeEach(() => {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    wrapper = mount(BookingForm, { global: { plugins: [pinia] } })
    store   = useBookingStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('shows validation errors when submitted empty', async () => {
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.find('[data-testid="destination-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="date-error"]').exists()).toBe(true)
    expect(store.createBooking).not.toHaveBeenCalled()
  })

  test('submits form with valid data', async () => {
    await wrapper.find('[data-testid="destination-input"]').setValue('Lisbon')
    await wrapper.find('[data-testid="date-input"]').setValue('2026-08-20')
    await wrapper.find('[data-testid="seats-input"]').setValue('2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.createBooking).toHaveBeenCalledWith({
      destination: 'Lisbon',
      departureDate: '2026-08-20',
      seats: 2,
    })
  })

  test('disables submit button while submitting', async () => {
    // Make createBooking take time (never resolves in this tick)
    store.createBooking = vi.fn(() => new Promise(() => {}))

    await wrapper.find('[data-testid="destination-input"]').setValue('Oslo')
    await wrapper.find('[data-testid="date-input"]').setValue('2026-09-01')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.find('[data-testid="submit-btn"]').attributes('disabled')).toBeDefined()
  })

  test('emits booking-created after successful submission', async () => {
    store.createBooking = vi.fn().mockResolvedValue({ id: 99, destination: 'Oslo' })

    await wrapper.find('[data-testid="destination-input"]').setValue('Oslo')
    await wrapper.find('[data-testid="date-input"]').setValue('2026-09-01')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('booking-created')).toHaveLength(1)
    expect(wrapper.emitted('booking-created')![0]).toEqual([{ id: 99, destination: 'Oslo' }])
  })
})
```

---

## Key Rules

```
SELECTOR PREFERENCE:
  1st choice: wrapper.find('[data-testid="..."]')    ← immune to class/text refactors
  2nd choice: wrapper.find('button[type="submit"]')  ← semantic HTML attributes
  Avoid:      wrapper.find('.btn-primary')           ← CSS class = implementation detail

ASYNC RULE:
  ← nextTick: one reactive flush — use after setProps, setValue, or state mutation
  ← flushPromises: all pending promises — use after any async component logic

PINIA RULE:
  ← createTestingPinia stubs actions by default (stubActions: true)
  ← access store AFTER mounting — pinia must be installed first
  ← set initialState to control what the store returns without running actions

MOCK CLEANUP:
  ← always call vi.restoreAllMocks() in afterEach
  ← or configure vitest with restoreMocks: true in vitest.config.ts

DATA-TESTID CONVENTION (Tripz):
  ← add data-testid to every interactive element and key display element
  ← format: kebab-case, descriptive noun — 'booking-destination', 'cancel-btn'
  ← strip data-testid in production builds via babel-plugin-jsx-remove-data-testid
```
