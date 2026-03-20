# VUE_TEST_04 — Vue Forms · v-model · Validation

**Time:** 25 minutes | **Stack:** Vue 3 · TypeScript · Composition API

---

## Setup

Build forms for the Tripz app: booking creation, trip administration, and filter
controls. Cover v-model on native inputs, custom component v-model, validation,
and composable extraction.

### Types

```typescript
// types/forms.ts

export interface BookingFormData {
  schoolName:    string
  contactEmail:  string
  tripId:        number | null
  studentCount:  number
  notes:         string
  agreedToTerms: boolean
}

export interface TripFormData {
  destination:      string
  departureDate:    string
  returnDate:       string
  pricePerStudent:  number
  maxCapacity:      number
  status:           'draft' | 'published' | 'cancelled'
  tags:             string[]
}

export type FormErrors<T> = Partial<Record<keyof T, string>>
```

---

## Problem 01 — v-model & Form Validation

### 1a. v-model on native inputs

```vue
<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { BookingFormData, FormErrors } from '@/types/forms'

const form = reactive<BookingFormData>({
  schoolName:    '',
  contactEmail:  '',
  tripId:        null,
  studentCount:  1,
  notes:         '',
  agreedToTerms: false,
})

const errors = reactive<FormErrors<BookingFormData>>({})

const isValid = computed(() =>
  Object.keys(errors).length === 0 &&
  form.schoolName.trim() !== '' &&
  form.contactEmail.trim() !== '' &&
  form.tripId !== null &&
  form.agreedToTerms
)
</script>

<template>
  <form @submit.prevent="submit" novalidate>

    <!-- Text input -->
    <input
      v-model.trim="form.schoolName"
      type="text"
      placeholder="School name"
    />
    <p v-if="errors.schoolName" class="text-red-500 text-sm">{{ errors.schoolName }}</p>

    <!-- Email input -->
    <input
      v-model.trim="form.contactEmail"
      type="email"
      placeholder="Contact email"
    />

    <!-- Number input — .number modifier coerces string → number -->
    <input
      v-model.number="form.studentCount"
      type="number"
      min="1"
      max="200"
    />

    <!-- Select -->
    <select v-model="form.tripId">
      <option :value="null" disabled>Select a trip</option>
      <option v-for="trip in trips" :key="trip.id" :value="trip.id">
        {{ trip.destination }} — {{ trip.departureDate }}
      </option>
    </select>

    <!-- Textarea — .lazy syncs on blur instead of every keystroke -->
    <textarea v-model.lazy="form.notes" rows="3" />

    <!-- Checkbox — binds to boolean -->
    <label>
      <input v-model="form.agreedToTerms" type="checkbox" />
      I agree to the terms
    </label>

    <button type="submit" :disabled="!isValid">Create Booking</button>

  </form>
</template>
```

### 1b. v-model modifiers

```vue
<!-- .trim — strips leading/trailing whitespace on sync -->
<input v-model.trim="form.schoolName" />
<!-- equivalent to: <input :value="form.schoolName" @input="form.schoolName = $event.target.value.trim()" /> -->

<!-- .number — coerces input string to number (uses parseFloat internally) -->
<input v-model.number="form.studentCount" type="number" />
<!-- without .number: form.studentCount would be a string even with type="number" -->

<!-- .lazy — sync on 'change' event (blur/enter) instead of 'input' (every keystroke) -->
<input v-model.lazy="form.notes" />
<!-- good for: expensive watchers, API calls on change, textarea fields -->

<!-- Combine modifiers -->
<input v-model.trim.lazy="form.schoolName" />
```

### 1c. Checkbox group — binding to array

```vue
<script setup lang="ts">
const selectedTags = ref<string[]>([])

const availableTags = ['outdoor', 'cultural', 'sport', 'language', 'science']
</script>

<template>
  <!-- Each checkbox adds/removes its value from the array -->
  <label v-for="tag in availableTags" :key="tag">
    <input
      v-model="selectedTags"
      type="checkbox"
      :value="tag"
    />
    {{ tag }}
  </label>
  <!-- selectedTags = ['outdoor', 'sport'] when those two are checked -->
</template>
```

### 1d. Radio group

```vue
<script setup lang="ts">
const status = ref<'draft' | 'published' | 'cancelled'>('draft')
</script>

<template>
  <label v-for="option in ['draft', 'published', 'cancelled']" :key="option">
    <input
      v-model="status"
      type="radio"
      :value="option"
    />
    {{ option }}
  </label>
  <!-- Only one value selected at a time -->
</template>
```

### 1e. Custom component v-model (BookingStatusSelect)

```vue
<!-- BookingStatusSelect.vue — receives v-model from parent -->
<script setup lang="ts">
import type { Booking } from '@/types'

const props = defineProps<{
  modelValue: Booking['status']           // ← 'modelValue' is the v-model prop name
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Booking['status']]  // ← emit this to update parent
}>()
</script>

<template>
  <select
    :value="props.modelValue"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as Booking['status'])"
  >
    <option value="pending">Pending</option>
    <option value="confirmed">Confirmed</option>
    <option value="paid">Paid</option>
    <option value="cancelled">Cancelled</option>
  </select>
</template>
```

```vue
<!-- Parent usage: -->
<BookingStatusSelect v-model="booking.status" />
<!-- equivalent to: <BookingStatusSelect :modelValue="booking.status" @update:modelValue="booking.status = $event" /> -->
```

### 1f. Multiple v-model on one component (DateRangePicker)

```vue
<!-- DateRangePicker.vue -->
<script setup lang="ts">
defineProps<{
  from: string                             // v-model:from
  to:   string                             // v-model:to
}>()

defineEmits<{
  'update:from': [value: string]
  'update:to':   [value: string]
}>()
</script>

<template>
  <div class="flex gap-2">
    <input
      type="date"
      :value="from"
      @change="$emit('update:from', ($event.target as HTMLInputElement).value)"
    />
    <input
      type="date"
      :value="to"
      @change="$emit('update:to', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
```

```vue
<!-- Parent usage: -->
<DateRangePicker
  v-model:from="form.departureDate"
  v-model:to="form.returnDate"
/>
```

### 1g. Form-level validation

```typescript
function validate(): boolean {
  // Clear previous errors
  Object.keys(errors).forEach(k => delete errors[k as keyof typeof errors])

  if (!form.schoolName.trim()) {
    errors.schoolName = 'School name is required'
  } else if (form.schoolName.trim().length < 3) {
    errors.schoolName = 'School name must be at least 3 characters'
  }

  if (!form.contactEmail.trim()) {
    errors.contactEmail = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
    errors.contactEmail = 'Enter a valid email address'
  }

  if (form.tripId === null) {
    errors.tripId = 'Please select a trip'
  }

  if (form.studentCount < 1 || form.studentCount > 200) {
    errors.studentCount = 'Student count must be between 1 and 200'
  }

  if (!form.agreedToTerms) {
    errors.agreedToTerms = 'You must agree to the terms'
  }

  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return

  isSubmitting.value = true
  try {
    await store.createBooking({ ...form })
    router.push({ name: 'bookings' })
  } catch (e) {
    serverError.value = 'Failed to create booking. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
```

### 1h. Reset form

```typescript
const initialForm: BookingFormData = {
  schoolName:    '',
  contactEmail:  '',
  tripId:        null,
  studentCount:  1,
  notes:         '',
  agreedToTerms: false,
}

// reactive() — can reset by assigning each key
function reset() {
  Object.assign(form, initialForm)
  Object.keys(errors).forEach(k => delete errors[k as keyof typeof errors])
}

// ⚠️ Cannot do: form = { ...initialForm }  — reactive() ref breaks
// ✅ Must use: Object.assign(form, initialForm)
```

---

## Problem 02 — Advanced Vue Forms

### 2a. defineModel() macro (Vue 3.4+)

```vue
<!-- Before (verbose): -->
<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit  = defineEmits<{ 'update:modelValue': [string] }>()
// in template: :value="props.modelValue" @input="emit('update:modelValue', $event.target.value)"
</script>

<!-- After (Vue 3.4+): -->
<script setup lang="ts">
const model = defineModel<string>()           // wraps modelValue + update:modelValue
// model.value reads the prop
// model.value = 'x' emits update:modelValue automatically
</script>

<template>
  <input v-model="model" />                   <!-- works directly — model IS a ref -->
</template>
```

```vue
<!-- Multiple v-model with defineModel: -->
<script setup lang="ts">
const from = defineModel<string>('from')      // v-model:from
const to   = defineModel<string>('to')        // v-model:to
</script>

<template>
  <input type="date" v-model="from" />
  <input type="date" v-model="to" />
</template>

<!-- Parent: <DateRangePicker v-model:from="..." v-model:to="..." /> -->
```

### 2b. useField composable

```typescript
// src/composables/useField.ts
import { ref, computed } from 'vue'

type Validator<T> = (value: T) => string | null   // return null = valid

export function useField<T>(initial: T, validators: Validator<T>[] = []) {
  const value   = ref<T>(initial) as Ref<T>
  const touched = ref(false)
  const error   = ref<string | null>(null)

  function validate(): boolean {
    for (const v of validators) {
      const result = v(value.value)
      if (result !== null) {
        error.value = result
        return false
      }
    }
    error.value = null
    return true
  }

  function touch() {
    touched.value = true
    validate()
  }

  const showError = computed(() => touched.value && error.value !== null)

  return { value, touched, error, showError, validate, touch }
}

// Common validators
export const required  = (msg = 'Required') =>
  (v: string) => v.trim() ? null : msg

export const minLength = (n: number) =>
  (v: string) => v.trim().length >= n ? null : `Minimum ${n} characters`

export const isEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email address'

export const isPositive = (v: number) =>
  v > 0 ? null : 'Must be greater than 0'
```

### 2c. useBookingForm composable

```typescript
// src/composables/useBookingForm.ts
import { reactive, computed, ref } from 'vue'
import { useField, required, minLength, isEmail, isPositive } from './useField'

export function useBookingForm() {
  const schoolName   = useField('',   [required(), minLength(3)])
  const contactEmail = useField('',   [required(), isEmail])
  const studentCount = useField(1,    [isPositive])
  const tripId       = useField<number | null>(null, [(v) => v === null ? 'Select a trip' : null])

  const isSubmitting = ref(false)
  const serverError  = ref<string | null>(null)

  const fields = [schoolName, contactEmail, studentCount, tripId]

  const isValid = computed(() => fields.every(f => f.error.value === null))

  function validateAll(): boolean {
    return fields.every(f => f.validate())
  }

  function reset() {
    schoolName.value.value   = ''
    contactEmail.value.value = ''
    studentCount.value.value = 1
    tripId.value.value       = null
    fields.forEach(f => { f.touched.value = false; f.error.value = null })
    serverError.value = null
  }

  // isDirty: has user changed anything from initial values?
  const isDirty = computed(() =>
    schoolName.value.value !== '' ||
    contactEmail.value.value !== '' ||
    studentCount.value.value !== 1 ||
    tripId.value.value !== null
  )

  async function submit(handler: (data: object) => Promise<void>) {
    if (!validateAll()) return
    isSubmitting.value = true
    serverError.value  = null
    try {
      await handler({
        schoolName:   schoolName.value.value,
        contactEmail: contactEmail.value.value,
        studentCount: studentCount.value.value,
        tripId:       tripId.value.value,
      })
    } catch (e: unknown) {
      serverError.value = e instanceof Error ? e.message : 'Submission failed'
    } finally {
      isSubmitting.value = false
    }
  }

  return { schoolName, contactEmail, studentCount, tripId, isValid, isDirty, isSubmitting, serverError, reset, submit }
}
```

### 2d. Async validation (email uniqueness)

```typescript
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'   // or manual debounce

const emailExists  = ref(false)
const emailChecking = ref(false)

// Debounced async check — runs 500ms after typing stops
const checkEmailUnique = useDebounceFn(async (email: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return  // skip invalid
  emailChecking.value = true
  try {
    const res = await fetch(`/api/v1/users/check-email?email=${encodeURIComponent(email)}`)
    const { exists } = await res.json()
    emailExists.value = exists
  } finally {
    emailChecking.value = false
  }
}, 500)

watch(() => contactEmail.value, checkEmailUnique)
```

### 2e. File input with preview

```vue
<script setup lang="ts">
const fileInput = ref<HTMLInputElement | null>(null)
const preview   = ref<string | null>(null)
const file      = ref<File | null>(null)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  if (!selected) return

  // Validate size (2MB) and type
  if (selected.size > 2 * 1024 * 1024) {
    fileError.value = 'File must be under 2MB'
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
    fileError.value = 'Only JPEG, PNG, and WebP allowed'
    return
  }

  file.value    = selected
  preview.value = URL.createObjectURL(selected)
}

// Cleanup object URL to prevent memory leak
onUnmounted(() => { if (preview.value) URL.revokeObjectURL(preview.value) })
</script>

<template>
  <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  <button type="button" @click="fileInput?.click()">Upload Photo</button>
  <img v-if="preview" :src="preview" class="w-24 h-24 object-cover rounded" />
</template>
```

### 2f. Vue v-model vs React controlled inputs

```
SINGLE INPUT:
  Vue:   <input v-model="name" />
         ← one directive, two-way binding
  React: <input value={name} onChange={e => setName(e.target.value)} />
         ← always two explicit pieces (value + onChange)

MODIFIERS:
  Vue:   v-model.trim   → auto-trim on sync
         v-model.number → auto-coerce to number
         v-model.lazy   → sync on 'change' not 'input'
  React: no modifier system — handle manually in onChange

OBJECT STATE:
  Vue:   const form = reactive({ name: '', email: '' })
         <input v-model="form.name" />  ← direct mutation OK
  React: const [form, setForm] = useState({ name: '', email: '' })
         onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
         ← must spread to create new object (immutable update)

CUSTOM COMPONENT v-model:
  Vue 3.4+: const model = defineModel<string>()
  Vue 3.0:  props: { modelValue: String }, emit: update:modelValue
  React:    just a prop + callback: value={x} onChange={setX}
            ← no special protocol, any name works

MULTIPLE v-model:
  Vue:   v-model:from="..." v-model:to="..."
  React: just separate props — no special syntax needed

VALIDATION:
  Vue:   DIY or VeeValidate / Zod integration
  React: DIY or react-hook-form / Formik / Zod integration
  ← both ecosystems have mature form libraries

CHECKBOX GROUP (array binding):
  Vue:   v-model="selectedTags" on multiple checkboxes with :value
         ← Vue manages add/remove from array automatically
  React: checked={tags.includes(tag)} onChange={() => toggleTag(tag)}
         ← manage array update manually

PERFORMANCE:
  Vue:   reactive() form object — fine-grained reactivity per field
         ← only changed field re-renders
  React: useState object — entire form re-renders on any field change
         ← use useReducer or separate useState per field to optimize
```

### 2g. VeeValidate (library alternative)

```vue
<script setup lang="ts">
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = toTypedSchema(z.object({
  schoolName:   z.string().min(3, 'Min 3 characters'),
  contactEmail: z.string().email('Invalid email'),
  studentCount: z.number().min(1).max(200),
}))

const { handleSubmit, errors, resetForm } = useForm({ validationSchema: schema })

const { value: schoolName }   = useField<string>('schoolName')
const { value: contactEmail } = useField<string>('contactEmail')
const { value: studentCount } = useField<number>('studentCount')

const onSubmit = handleSubmit(async (values) => {
  await store.createBooking(values)
})
</script>
```

### 2h. Testing forms

```typescript
// vitest + @vue/test-utils
import { mount } from '@vue/test-utils'
import BookingForm from '@/components/BookingForm.vue'

test('shows validation error when school name is empty', async () => {
  const wrapper = mount(BookingForm, {
    global: { plugins: [createTestingPinia()] },
  })

  // Submit without filling form
  await wrapper.find('form').trigger('submit')

  expect(wrapper.find('[data-testid="error-schoolName"]').text())
    .toBe('School name is required')
})

test('enables submit button when form is valid', async () => {
  const wrapper = mount(BookingForm, ...)

  await wrapper.find('[data-testid="input-schoolName"]').setValue('Greenwood School')
  await wrapper.find('[data-testid="input-email"]').setValue('admin@green.edu')
  await wrapper.find('[data-testid="select-trip"]').setValue('42')
  await wrapper.find('[data-testid="checkbox-terms"]').setValue(true)

  expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
})

test('calls store.createBooking with form data on submit', async () => {
  const pinia = createTestingPinia({ createSpy: vi.fn })
  const store = useBookingStore(pinia)

  const wrapper = mount(BookingForm, { global: { plugins: [pinia] } })

  // fill and submit...
  await wrapper.find('form').trigger('submit')

  expect(store.createBooking).toHaveBeenCalledWith(
    expect.objectContaining({ schoolName: 'Greenwood School' })
  )
})
```
