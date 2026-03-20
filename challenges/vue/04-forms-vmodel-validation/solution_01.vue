<!-- ============================================================ -->
<!-- Problem 01 — Vue Forms, v-model & Validation               -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- v-model on native inputs                                     -->
<!--                                                              -->
<!-- Text:     <input v-model="form.name" />                      -->
<!-- Email:    <input v-model.trim="form.email" type="email" />   -->
<!-- Number:   <input v-model.number="form.count" type="number"/> -->
<!-- Textarea: <textarea v-model="form.notes" />                  -->
<!-- Select:   <select v-model="form.tripId">                     -->
<!--             <option :value="null">Select...</option>         -->
<!--             <option v-for="t in trips" :value="t.id">        -->
<!--           </select>                                          -->
<!-- Checkbox: <input v-model="form.agreed" type="checkbox" />   -->
<!--           ← binds to boolean (true/false)                    -->
<!--                                                              -->
<!-- v-model is syntactic sugar:                                  -->
<!--   :value="form.name" + @input="form.name = $event.target.value"-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- v-model modifiers                                            -->
<!--                                                              -->
<!-- .trim — strips whitespace on sync                            -->
<!--   <input v-model.trim="form.schoolName" />                   -->
<!--   ← good for name/email fields                               -->
<!--                                                              -->
<!-- .number — coerces string → number (parseFloat)               -->
<!--   <input v-model.number="form.studentCount" type="number" /> -->
<!--   ← without .number: value is a string even on type="number" -->
<!--   ← if value can't be parsed: remains as original string     -->
<!--                                                              -->
<!-- .lazy — syncs on 'change' event instead of 'input'           -->
<!--   <input v-model.lazy="form.notes" />                        -->
<!--   ← fires on blur or Enter, not every keystroke             -->
<!--   ← good for: expensive computed, API calls, textareas       -->
<!--                                                              -->
<!-- Combine: v-model.trim.lazy="form.schoolName"                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Checkbox group — binding to array                            -->
<!--                                                              -->
<!-- const selectedTags = ref<string[]>([])                       -->
<!--                                                              -->
<!-- <input v-model="selectedTags" type="checkbox" value="outdoor"/>-->
<!-- <input v-model="selectedTags" type="checkbox" value="sport" />-->
<!--                                                              -->
<!-- ← Vue automatically adds/removes value from array            -->
<!-- ← checking 'outdoor': selectedTags = ['outdoor']            -->
<!-- ← unchecking 'outdoor': selectedTags = []                    -->
<!-- ← :value for dynamic: <input v-model="tags" :value="tag" /> -->
<!-- ← v-for pattern: iterate tags array, bind each with :value  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Radio group                                                  -->
<!--                                                              -->
<!-- const status = ref<'draft' | 'published' | 'cancelled'>('draft')-->
<!--                                                              -->
<!-- <input v-model="status" type="radio" value="draft" />        -->
<!-- <input v-model="status" type="radio" value="published" />    -->
<!--                                                              -->
<!-- ← only one value selected at a time (unlike checkbox)        -->
<!-- ← value must match one of the literal values to be checked  -->
<!-- ← :value for dynamic options                                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Form state — reactive() for grouped object                   -->
<!--                                                              -->
<!-- const form = reactive<BookingFormData>({                      -->
<!--   schoolName:    '',                                          -->
<!--   contactEmail:  '',                                          -->
<!--   tripId:        null,                                        -->
<!--   studentCount:  1,                                           -->
<!--   notes:         '',                                          -->
<!--   agreedToTerms: false,                                       -->
<!-- })                                                            -->
<!--                                                              -->
<!-- WHY reactive() instead of ref():                              -->
<!--   ← related fields live together (one object)                -->
<!--   ← template: v-model="form.name" (not v-model="name.value") -->
<!--   ← easier to pass as a whole to the store                   -->
<!--                                                              -->
<!-- Reset: Object.assign(form, initialForm)                      -->
<!--   ← CANNOT do form = {...initialForm}: reactive() ref breaks -->
<!--   ← must mutate in-place: Object.assign or set each key      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Form-level validation                                        -->
<!--                                                              -->
<!-- const errors = reactive<FormErrors<BookingFormData>>({})     -->
<!--                                                              -->
<!-- function validate(): boolean {                               -->
<!--   Object.keys(errors).forEach(k => delete errors[k])        -->
<!--   ← clear previous errors first                             -->
<!--                                                              -->
<!--   if (!form.schoolName.trim())                               -->
<!--     errors.schoolName = 'School name is required'            -->
<!--   else if (form.schoolName.trim().length < 3)               -->
<!--     errors.schoolName = 'Minimum 3 characters'               -->
<!--                                                              -->
<!--   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))-->
<!--     errors.contactEmail = 'Invalid email'                    -->
<!--                                                              -->
<!--   if (form.tripId === null)                                  -->
<!--     errors.tripId = 'Select a trip'                          -->
<!--                                                              -->
<!--   return Object.keys(errors).length === 0                    -->
<!-- }                                                            -->
<!--                                                              -->
<!-- isValid = computed(() =>                                      -->
<!--   Object.keys(errors).length === 0 &&                        -->
<!--   form.schoolName.trim() !== '' && form.agreedToTerms        -->
<!-- )                                                            -->
<!-- ← disable submit button: :disabled="!isValid || isSubmitting"-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- @submit.prevent + async submit handler                       -->
<!--                                                              -->
<!-- <form @submit.prevent="submit" novalidate>                    -->
<!--   ← .prevent: calls event.preventDefault() — no page reload  -->
<!--   ← novalidate: disable browser's built-in validation UI     -->
<!--      (we do our own validation with better UX)               -->
<!--                                                              -->
<!-- async function submit() {                                     -->
<!--   if (!validate()) return  ← abort if invalid                -->
<!--   isSubmitting.value = true                                  -->
<!--   try {                                                       -->
<!--     await store.createBooking({ ...form })                    -->
<!--     router.push({ name: 'bookings' })                        -->
<!--   } catch (e) {                                               -->
<!--     serverError.value = 'Failed. Try again.'                 -->
<!--   } finally {                                                 -->
<!--     isSubmitting.value = false  ← ALWAYS reset               -->
<!--   }                                                           -->
<!-- }                                                             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Custom component v-model                                     -->
<!--                                                              -->
<!-- Child component MUST:                                         -->
<!--   1. Accept prop named 'modelValue':                         -->
<!--      const props = defineProps<{ modelValue: string }>()     -->
<!--   2. Emit 'update:modelValue' with new value:                -->
<!--      const emit = defineEmits<{ 'update:modelValue': [string] }>()-->
<!--                                                              -->
<!-- In template: bind :value (not v-model) + emit on change:     -->
<!--   <select                                                     -->
<!--     :value="props.modelValue"                                 -->
<!--     @change="emit('update:modelValue', $event.target.value)" -->
<!--   >                                                           -->
<!--                                                              -->
<!-- Parent usage:                                                  -->
<!--   <BookingStatusSelect v-model="booking.status" />           -->
<!--   ← Vue expands to:                                           -->
<!--     :modelValue="booking.status"                             -->
<!--     @update:modelValue="booking.status = $event"            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Multiple v-model on one component                            -->
<!--                                                              -->
<!-- Prop name = 'from' → v-model:from                           -->
<!-- Prop name = 'to'   → v-model:to                             -->
<!--                                                              -->
<!-- Child:                                                        -->
<!--   defineProps<{ from: string; to: string }>()               -->
<!--   defineEmits<{                                               -->
<!--     'update:from': [string]                                   -->
<!--     'update:to':   [string]                                   -->
<!--   }>()                                                        -->
<!--   <input :value="from" @change="$emit('update:from', ...)" />-->
<!--   <input :value="to"   @change="$emit('update:to',   ...)" />-->
<!--                                                              -->
<!-- Parent:                                                        -->
<!--   <DateRangePicker v-model:from="form.departureDate"          -->
<!--                    v-model:to="form.returnDate" />            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Error display pattern                                        -->
<!--                                                              -->
<!-- Show error below field when present:                          -->
<!-- <div>                                                          -->
<!--   <input v-model.trim="form.schoolName" ... />               -->
<!--   <p v-if="errors.schoolName"                                 -->
<!--      class="mt-1 text-sm text-red-600">                      -->
<!--     {{ errors.schoolName }}                                   -->
<!--   </p>                                                        -->
<!-- </div>                                                        -->
<!--                                                              -->
<!-- Highlight field on error:                                     -->
<!-- <input                                                         -->
<!--   :class="errors.schoolName ? 'border-red-500' : 'border-gray-300'"-->
<!--   v-model.trim="form.schoolName"                              -->
<!-- />                                                            -->
<!--                                                              -->
<!-- Server error (general):                                       -->
<!-- <div v-if="serverError" class="bg-red-50 text-red-700 p-3">  -->
<!--   {{ serverError }}                                           -->
<!-- </div>                                                        -->
<!-- ============================================================ -->
