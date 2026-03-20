# VUE_TEST_07 — Slots · Provide/Inject · Teleport

**Time:** 30 minutes | **Stack:** Vue 3 · TypeScript · Composition API

---

## Setup

Master Vue's component composition patterns: slots let parents inject template
content into children, provide/inject passes data down a deep component tree
without prop-drilling, and Teleport renders DOM outside the component hierarchy.
All examples use the Tripz school booking platform context.

---

## Problem 01 — Slots

### 1a. Default slot with fallback content

```vue
<!-- components/BookingCard.vue -->
<template>
  <div class="booking-card">
    <slot>
      <!-- Fallback content renders when parent provides no slot content -->
      <p class="text-gray-400">No booking details available.</p>
    </slot>
  </div>
</template>
```

```vue
<!-- Parent: slot content provided — fallback is ignored -->
<BookingCard>
  <p>Flight TZ-204 · London → Paris · 14:30</p>
</BookingCard>

<!-- Parent: no slot content — fallback renders -->
<BookingCard />
```

### 1b. Named slots

```vue
<!-- components/BookingPanel.vue -->
<template>
  <div class="booking-panel">
    <header class="panel-header">
      <slot name="header">
        <!-- Fallback header if parent does not supply it -->
        <h2>Booking Details</h2>
      </slot>
    </header>

    <main class="panel-body">
      <!-- Default (unnamed) slot for main body content -->
      <slot />
    </main>

    <footer class="panel-footer">
      <slot name="footer" />
      <slot name="actions">
        <!-- Fallback actions bar -->
        <button class="btn-secondary">Close</button>
      </slot>
    </footer>
  </div>
</template>
```

```vue
<!-- Parent using named slots with v-slot shorthand (#) -->
<BookingPanel>
  <!-- #header is shorthand for v-slot:header -->
  <template #header>
    <h2>TZ-204 · London → Paris</h2>
    <span class="badge badge-confirmed">Confirmed</span>
  </template>

  <!-- Default slot: no template wrapper needed for single content -->
  <BookingItinerary :booking="booking" />

  <template #footer>
    <span class="text-sm text-gray-500">Booked on {{ booking.createdAt }}</span>
  </template>

  <template #actions>
    <button @click="cancel(booking.id)" class="btn-danger">Cancel</button>
    <button @click="download(booking.id)" class="btn-primary">Download PDF</button>
  </template>
</BookingPanel>
```

### 1c. Scoped slots — child passes data to parent

Scoped slots let a child component expose data that the parent can consume in
its own template. The child controls the data, the parent controls the markup.

```vue
<!-- components/BookingTable.vue -->
<script setup lang="ts">
import type { Booking } from '@/types'

const props = defineProps<{ bookings: Booking[] }>()
</script>

<template>
  <table class="booking-table">
    <thead>
      <tr>
        <!-- Named slot for column headers — no slot props here -->
        <slot name="headers">
          <th>ID</th>
          <th>Destination</th>
          <th>Status</th>
        </slot>
      </tr>
    </thead>
    <tbody>
      <tr v-for="booking in bookings" :key="booking.id">
        <!--
          Scoped slot: child exposes { booking } as slot prop.
          Parent receives this object via v-slot="{ booking }".
          Child owns the data source; parent owns the column markup.
        -->
        <slot name="row" :booking="booking">
          <!-- Fallback row if parent does not provide a row slot -->
          <td>{{ booking.id }}</td>
          <td>{{ booking.destination }}</td>
          <td>{{ booking.status }}</td>
        </slot>
      </tr>
    </tbody>
  </table>
</template>
```

```vue
<!-- Parent: destructure slot props with v-slot -->
<BookingTable :bookings="bookings">
  <template #headers>
    <th>Booking #</th>
    <th>Route</th>
    <th>Departure</th>
    <th>Status</th>
    <th>Actions</th>
  </template>

  <!--
    #row="{ booking }" — destructure the slot prop object.
    TypeScript can narrow the type here if BookingTable uses defineSlots().
  -->
  <template #row="{ booking }">
    <td class="font-mono">#{{ booking.id }}</td>
    <td>{{ booking.origin }} → {{ booking.destination }}</td>
    <td>{{ formatDate(booking.departureAt) }}</td>
    <td><StatusBadge :status="booking.status" /></td>
    <td>
      <button @click="openDetail(booking)">View</button>
    </td>
  </template>
</BookingTable>
```

### 1d. v-slot directive forms

```vue
<!--
  All three are equivalent for the default slot:
    v-slot:default="slotProps"
    v-slot="slotProps"
    #default="slotProps"

  Named slots with props:
    v-slot:row="{ booking }"
    #row="{ booking }"

  Named slot without props (no data from child):
    v-slot:header
    #header

  Full destructuring with rename and default:
    #row="{ booking: b, index = 0 }"
-->

<!-- Inline on the component tag — only valid for the default slot -->
<MyList v-slot="{ item }">
  <span>{{ item.name }}</span>
</MyList>
```

### 1e. defineSlots — TypeScript slot typing (Vue 3.3+)

```vue
<!-- components/BookingTable.vue -->
<script setup lang="ts">
import type { Booking } from '@/types'

defineProps<{ bookings: Booking[] }>()

// defineSlots gives TypeScript full type information for slot props.
// Each key is the slot name; the function parameter is the slot props type.
defineSlots<{
  headers(): void                                     // no slot props
  row(props: { booking: Booking }): void              // exposes { booking }
  actions(props: { booking: Booking; index: number }): void
}>()
</script>
```

### 1f. useSlots() — check if slot is provided before rendering wrapper

```vue
<script setup lang="ts">
import { useSlots } from 'vue'

const slots = useSlots()
</script>

<template>
  <!--
    Avoid rendering an empty header container when no header content is given.
    slots.header is defined only when the parent actually fills the slot.
  -->
  <header v-if="slots.header" class="panel-header">
    <slot name="header" />
  </header>

  <slot />

  <!--
    Provide fallback actions only when no actions slot is supplied.
    Using useSlots() is cleaner than an empty fallback inside <slot>.
  -->
  <footer v-if="slots.actions" class="panel-footer">
    <slot name="actions" />
  </footer>
  <footer v-else class="panel-footer">
    <button @click="$emit('close')">Close</button>
  </footer>
</template>
```

### 1g. $slots in render functions

```typescript
// When writing a renderless component or a component with a render function,
// $slots.default?.() invokes the default slot and returns VNodes.
import { defineComponent, h } from 'vue'

export default defineComponent({
  setup(_, { slots }) {
    return () => {
      // slots.default?.()  → array of VNodes from parent
      // slots.header?.()   → array of VNodes for named slot
      const defaultContent = slots.default?.() ?? []
      const hasActions     = !!slots.actions

      return h('div', { class: 'panel' }, [
        h('main', defaultContent),
        hasActions ? h('footer', slots.actions!()) : null,
      ])
    }
  },
})
```

---

## Problem 02 — Provide / Inject

### 2a. Basic provide / inject

```typescript
// Parent component — provides value down to ALL descendants
import { provide, ref } from 'vue'

const currentUser = ref<User | null>(null)

// First arg: injection key (string or Symbol)
// Second arg: the value to provide (can be any type)
provide('currentUser', currentUser)
```

```typescript
// Deep child component — injects without prop-drilling
import { inject, ref } from 'vue'

// inject(key) returns the value if found, or undefined if not
const currentUser = inject<Ref<User | null>>('currentUser')
```

### 2b. InjectionKey\<T\> — TypeScript-safe provide/inject

Using a typed Symbol for the injection key links the provide and inject calls
at the type level. No casting required at the inject site.

```typescript
// src/injection-keys.ts  — shared between provider and consumer
import type { InjectionKey, Ref } from 'vue'
import type { User, Notification, Theme } from '@/types'

export const CurrentUserKey: InjectionKey<Ref<User | null>> = Symbol('currentUser')
export const ThemeKey:       InjectionKey<Ref<Theme>>       = Symbol('theme')
export const NotificationsKey: InjectionKey<{
  items: Ref<Notification[]>
  add: (n: Notification) => void
  dismiss: (id: number) => void
}> = Symbol('notifications')
```

```typescript
// AppLayout.vue — provider
import { provide, ref } from 'vue'
import { CurrentUserKey, ThemeKey, NotificationsKey } from '@/injection-keys'
import type { User, Notification } from '@/types'

const currentUser  = ref<User | null>(null)
const theme        = ref<Theme>({ mode: 'light', accentColor: '#3B82F6' })
const notifications = ref<Notification[]>([])

// TypeScript validates the value type against InjectionKey<T>
provide(CurrentUserKey, currentUser)
provide(ThemeKey, theme)
provide(NotificationsKey, {
  items: notifications,
  add:     (n) => notifications.value.push(n),
  dismiss: (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  },
})
```

```typescript
// BookingForm.vue — deep child consumer
import { inject } from 'vue'
import { CurrentUserKey, NotificationsKey } from '@/injection-keys'

// Return type is Ref<User | null> — fully typed, no cast
const currentUser   = inject(CurrentUserKey)
const notifications = inject(NotificationsKey)

async function submitBooking(data: BookingFormData) {
  const booking = await api.createBooking({
    ...data,
    userId: currentUser?.value?.id,
  })
  notifications?.add({ id: Date.now(), type: 'success', message: `Booking #${booking.id} confirmed` })
}
```

### 2c. Reactive provide — injected values stay reactive

The injected value is reactive when you provide a `ref` or `reactive` object.
Providing a raw primitive snapshot is NOT reactive.

```typescript
// AppLayout.vue
import { provide, ref } from 'vue'
import { CurrentUserKey } from '@/injection-keys'

const currentUser = ref<User | null>(null)

// ✅ CORRECT: provide the ref itself — inject receives a live Ref<User | null>
provide(CurrentUserKey, currentUser)

// ❌ WRONG: unwrapping loses reactivity — inject receives a static snapshot
provide(CurrentUserKey, currentUser.value)
```

```typescript
// Child component
import { inject } from 'vue'
import { CurrentUserKey } from '@/injection-keys'

const currentUser = inject(CurrentUserKey)
// currentUser is Ref<User | null>
// currentUser.value updates in the template automatically when AppLayout changes it
```

### 2d. inject with default value

```typescript
import { inject } from 'vue'
import { ThemeKey } from '@/injection-keys'

// Without default — value may be undefined if no ancestor provides it
const theme = inject(ThemeKey)                     // Ref<Theme> | undefined

// With default value — never undefined
const theme = inject(ThemeKey, ref<Theme>({ mode: 'light', accentColor: '#3B82F6' }))
// ← TypeScript infers Ref<Theme>, not Ref<Theme> | undefined

// With factory function — default is computed lazily (use when construction is expensive)
const theme = inject(ThemeKey, () => ref<Theme>({ mode: 'light', accentColor: '#3B82F6' }), true)
//                                                                                            ^^^^
//                                               third arg: true = treat second arg as factory
```

### 2e. Providing store-like data from AppLayout

```vue
<!-- src/layouts/AppLayout.vue -->
<script setup lang="ts">
import { provide, ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { CurrentUserKey, ThemeKey, NotificationsKey } from '@/injection-keys'
import type { Notification } from '@/types'

// ── Auth ────────────────────────────────────────────────────────────────────
const auth = useAuthStore()

onMounted(() => auth.fetchCurrentUser())

// ── Theme ───────────────────────────────────────────────────────────────────
const theme = ref<Theme>({ mode: 'light', accentColor: '#3B82F6' })
function toggleTheme() {
  theme.value.mode = theme.value.mode === 'light' ? 'dark' : 'light'
}

// ── Notifications ────────────────────────────────────────────────────────────
const notifications = ref<Notification[]>([])

// ── Provide all three down the tree ─────────────────────────────────────────
provide(CurrentUserKey, auth.currentUser)     // Ref<User | null> from store
provide(ThemeKey, theme)
provide(NotificationsKey, {
  items:   notifications,
  add:     (n) => notifications.value.unshift(n),
  dismiss: (id) => { notifications.value = notifications.value.filter(n => n.id !== id) },
})
</script>

<template>
  <div :class="['app-layout', `theme-${theme.mode}`]">
    <AppNavbar @toggle-theme="toggleTheme" />
    <NotificationStack :notifications="notifications" />
    <main>
      <slot />
    </main>
  </div>
</template>
```

### 2f. Readonly provide — prevent child mutations

```typescript
import { provide, ref, readonly } from 'vue'
import { ThemeKey } from '@/injection-keys'

const theme = ref<Theme>({ mode: 'light', accentColor: '#3B82F6' })

// Wrap in readonly() so children cannot mutate the value directly.
// Expose a setter function alongside it if children need to trigger changes.
provide(ThemeKey, readonly(theme))

// Or provide the setter explicitly as part of the inject contract:
export const ThemeKey: InjectionKey<{
  theme:       Readonly<Ref<Theme>>
  setTheme:    (t: Partial<Theme>) => void
}> = Symbol('theme')

provide(ThemeKey, {
  theme:    readonly(theme),
  setTheme: (t) => Object.assign(theme.value, t),
})
```

---

## Problem 03 — Teleport

### 3a. Basic Teleport — render modal to \<body\>

The `<Teleport>` component renders its children into a different DOM node from
where the component logically lives. The component tree and the DOM tree are
decoupled. The component state and event bindings remain in place.

```vue
<!-- components/BookingCancelModal.vue -->
<script setup lang="ts">
import type { Booking } from '@/types'

const props  = defineProps<{ booking: Booking; open: boolean }>()
const emit   = defineEmits<{ close: []; confirmed: [id: number] }>()
</script>

<template>
  <!--
    to="body"   — target DOM selector or element reference
    All slot content renders as a direct child of <body>,
    regardless of where BookingCancelModal appears in the component tree.
    This avoids z-index and overflow:hidden parent issues.
  -->
  <Teleport to="body">
    <div v-if="props.open" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true">
        <h2>Cancel Booking #{{ booking.id }}?</h2>
        <p>This action cannot be undone.</p>
        <div class="modal-actions">
          <button @click="emit('close')">Keep Booking</button>
          <button @click="emit('confirmed', booking.id)" class="btn-danger">
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

### 3b. Teleport `to` prop — target selectors

```vue
<!--
  to="body"            — appends to document body (most common for modals/toasts)
  to="#modals"         — dedicated mount point in index.html: <div id="modals"></div>
  to="#app"            — back inside the app root (unusual but valid)
  to=".drawer-host"    — CSS class selector (first match)
  :to="dynamicTarget"  — reactive: changes target when the bound ref changes
-->

<!-- Dedicated mount point in public/index.html (preferred for z-index control) -->
<!-- <div id="app"></div>                                                          -->
<!-- <div id="modals"></div>                                                        -->
<!-- <div id="toasts"></div>                                                        -->

<!-- Toast notification teleported to its own container -->
<Teleport to="#toasts">
  <transition name="slide-up">
    <ToastMessage v-if="toast.visible" :message="toast.message" :type="toast.type" />
  </transition>
</Teleport>
```

### 3c. Teleport `disabled` prop — render in-place when disabled

```vue
<script setup lang="ts">
const props = defineProps<{
  open:   boolean
  inline: boolean    // when true, render modal inline (e.g. inside a test harness)
}>()
</script>

<template>
  <!--
    disabled={true}   → children render in the component's normal DOM position
    disabled={false}  → children teleport to <body>
    Useful for: testing (avoid body teleport in vitest), Storybook, responsive embed
  -->
  <Teleport to="body" :disabled="props.inline">
    <div v-if="props.open" class="modal-backdrop">
      <slot />
    </div>
  </Teleport>
</template>
```

### 3d. v-if on Teleport content

```vue
<!--
  v-if on the INNER content vs v-if on the <Teleport> itself:

  Option A — v-if on child: Teleport target always mounted; content is toggled.
  This is the most common pattern.
-->
<Teleport to="body">
  <div v-if="showModal" class="modal-backdrop">
    <BaseModal @close="showModal = false" />
  </div>
</Teleport>

<!--
  Option B — v-if on <Teleport> itself: entire Teleport (including port) is
  destroyed and recreated. Use when you want to fully unmount the portal.
  Slightly heavier than toggling inner content.
-->
<Teleport v-if="showModal" to="body">
  <div class="modal-backdrop">
    <BaseModal @close="showModal = false" />
  </div>
</Teleport>
```

### 3e. BaseModal with named slots + Teleport

```vue
<!-- components/BaseModal.vue -->
<script setup lang="ts">
const props = defineProps<{
  open:  boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
}>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="props.open"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="props.title ? 'modal-title' : undefined"
        @keydown.esc="emit('close')"
        @click.self="emit('close')"
      >
        <div :class="['modal', `modal-${props.size ?? 'md'}`]">

          <!-- Named header slot with fallback to title prop -->
          <header class="modal-header">
            <slot name="header">
              <h2 id="modal-title" class="modal-title">{{ props.title }}</h2>
            </slot>
            <button class="modal-close" @click="emit('close')" aria-label="Close">×</button>
          </header>

          <!-- Default (body) slot -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Named footer slot — only renders wrapper when slot is filled -->
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

```vue
<!-- Parent using BaseModal with all named slots -->
<BaseModal :open="cancelModalOpen" size="sm" @close="cancelModalOpen = false">
  <template #header>
    <h2>Cancel Booking #{{ selectedBooking?.id }}</h2>
  </template>

  <!-- default body slot — no <template> wrapper needed -->
  <p>Are you sure you want to cancel this booking?</p>
  <p class="text-sm text-gray-500">This action cannot be undone.</p>

  <template #footer>
    <button @click="cancelModalOpen = false">Keep It</button>
    <button @click="confirmCancel" class="btn-danger">Yes, Cancel</button>
  </template>
</BaseModal>
```

### 3f. Drawer component with Teleport

```vue
<!-- components/BookingDrawer.vue -->
<template>
  <Teleport to="body">
    <Transition name="slide-right">
      <aside
        v-if="props.open"
        class="drawer"
        role="complementary"
        aria-label="Booking details"
      >
        <div class="drawer-header">
          <slot name="header">
            <h3>Booking Details</h3>
          </slot>
          <button @click="emit('close')">✕</button>
        </div>

        <div class="drawer-body">
          <!-- Scoped slot exposes close() so body content can close the drawer -->
          <slot :close="() => emit('close')" />
        </div>

        <div v-if="$slots.actions" class="drawer-footer">
          <slot name="actions" />
        </div>
      </aside>
    </Transition>

    <!-- Backdrop overlay — separate from drawer so animations are independent -->
    <Transition name="fade">
      <div v-if="props.open" class="drawer-backdrop" @click="emit('close')" />
    </Transition>
  </Teleport>
</template>
```

---

## Problem 04 — Comparison: Slots vs Props vs Provide/Inject

### 4a. Slots vs props for component composition

```
PROPS — pass data and callbacks to a direct child
  ✅ Simple scalar values: strings, numbers, booleans
  ✅ When the child owns all rendering decisions
  ✅ When type safety is critical (defineProps<T>)
  ❌ Poor for passing template/markup into a child
  ❌ Awkward for highly customisable UI structures

  Example: <StatusBadge :status="booking.status" :size="'lg'" />

SLOTS — inject template content from parent into child
  ✅ When parent controls part of the child's visual structure
  ✅ Composition: layout components, cards, modals, tables
  ✅ Scoped slots: child exposes data, parent provides markup
  ❌ Not for passing data upward (use emits for that)
  ❌ Heavier indirection than props for simple values

  Example: <BookingTable :bookings="b"><template #row="{ booking }">...</template></BookingTable>

PROVIDE / INJECT — implicit dependency injection down the tree
  ✅ Cross-cutting concerns shared by many components: auth user, theme, i18n
  ✅ Avoid prop-drilling through 3-5 layers of intermediate components
  ✅ Plugin/library APIs (Vue Router, Pinia all use provide/inject internally)
  ❌ Creates implicit coupling — child silently depends on ancestor providing a key
  ❌ Harder to trace than props (no visible data flow in template)
  ❌ Not for one-off parent→child communication (use props for that)

  Example: provide(CurrentUserKey, user) in AppLayout;
           inject(CurrentUserKey) in BookingForm three levels deep
```

### 4b. Vue slots vs React children/render props

```
DEFAULT SLOT vs React children:
  Vue:   <MyCard><p>Content</p></MyCard>
         → accessed in MyCard as <slot />
  React: <MyCard><p>Content</p></MyCard>
         → accessed in MyCard as {children}
  → Equivalent concept; Vue uses a DOM-based slot mechanism

NAMED SLOTS vs named render props / compound components:
  Vue:   <template #footer><SaveButton /></template>
  React: <MyCard footer={<SaveButton />} />  (prop approach)
  OR:    <MyCard.Footer><SaveButton /></MyCard.Footer>  (compound component)
  → Vue named slots are more structured than React's prop approach

SCOPED SLOTS vs render props:
  Vue:   <template #row="{ booking }"><td>{{ booking.id }}</td></template>
  React: <MyList renderItem={(item) => <li>{item.id}</li>} />
  → Both patterns: child owns data, parent owns markup
  → Vue syntax is more ergonomic (inline in template vs callback prop)

SLOT EXISTENCE CHECK vs React pattern:
  Vue:   const slots = useSlots(); if (slots.header) { ... }
  React: if (React.Children.count(headerProp) > 0) { ... }
         OR: if (headerProp !== undefined) { ... }

FALLBACK CONTENT vs defaultProps:
  Vue:   <slot name="icon"><StarIcon /></slot>  ← inline fallback in template
  React: function MyComp({ icon = <StarIcon /> }) { return icon }
         ← default in destructured props

KEY DIFFERENCE:
  Vue slots are resolved at render time on the consumer side.
  React children/render props are plain JavaScript values passed as props.
  Vue slot content is compiled into virtual DOM functions by the template compiler.
  React has no built-in slot concept — everything is either a prop or children.
```

---

## Practice Tasks

**Task 1** — Build `BookingTable.vue` that:
- Renders a list of `Booking[]` via props
- Exposes a scoped `#row` slot with `{ booking, index }` as slot props
- Uses `useSlots()` to conditionally render a `<caption>` wrapper only when the `#caption` slot is filled
- Provides a sensible fallback row when `#row` is not provided

**Task 2** — Build `AppLayout.vue` that:
- `provide()`s `CurrentUserKey`, `ThemeKey`, and `NotificationsKey` using typed `InjectionKey<T>` Symbols
- Exposes the `currentUser` ref reactively so child components see live updates
- Wraps provided notifications in `readonly()` and exposes `add` / `dismiss` functions

**Task 3** — Build `BaseModal.vue` that:
- Uses `<Teleport to="body">` to escape the component tree
- Has three named slots: `#header`, default body, `#footer`
- Accepts a `disabled` prop that passes through to `<Teleport :disabled="disabled">`
- Conditionally renders the `<footer>` wrapper only when `$slots.footer` is filled
- Emits `close` on backdrop click and `Escape` keydown

**Task 4** — In a `BookingDetailPage.vue`:
- Inject `CurrentUserKey` with a `readonly(ref(null))` default value
- Inject `NotificationsKey` and call `notifications.add(...)` after a successful booking action
- Inject `ThemeKey` and apply the theme mode as a CSS class on the page root element
