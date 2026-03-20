<!-- ============================================================ -->
<!-- Problem 02 — Advanced Vue Forms                             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- defineModel() macro — Vue 3.4+                              -->
<!--                                                              -->
<!-- const model = defineModel<string>()                          -->
<!--   ← creates a writable ref backed by modelValue prop        -->
<!--   ← reading model.value = reading modelValue prop           -->
<!--   ← writing model.value = emitting update:modelValue        -->
<!--   ← no more manual defineProps + defineEmits needed          -->
<!--                                                              -->
<!-- Use directly in template:                                     -->
<!--   <input v-model="model" />                                  -->
<!--   ← works because model IS a ref                             -->
<!--                                                              -->
<!-- Named v-model (multiple per component):                      -->
<!--   const from = defineModel<string>('from')                   -->
<!--   const to   = defineModel<string>('to')                     -->
<!--   <input v-model="from" /> <input v-model="to" />            -->
<!--   Parent: <DateRangePicker v-model:from="..." v-model:to="..." />-->
<!--                                                              -->
<!-- With options:                                                  -->
<!--   const model = defineModel<number>({ default: 1 })          -->
<!--   const model = defineModel<string>({ required: true })      -->
<!--   ← options same as defineProps validator syntax             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useField composable                                          -->
<!--                                                              -->
<!-- useField<T>(initial, validators[]):                           -->
<!--   value    = ref<T>(initial)  ← the field's current value    -->
<!--   touched  = ref(false)       ← has user interacted?         -->
<!--   error    = ref<string|null>(null)                          -->
<!--   showError = computed(() => touched.value && error !== null) -->
<!--   validate() → runs validators, sets error, returns boolean  -->
<!--   touch()    → sets touched = true, calls validate()          -->
<!--                                                              -->
<!-- Common validators (return null = valid, string = error msg): -->
<!--   required  = (msg?) => (v: string) => v.trim() ? null : msg -->
<!--   minLength = (n)    => (v: string) => v.length >= n ? null : ...-->
<!--   isEmail   = (v)    => regex.test(v) ? null : 'Invalid email'-->
<!--   isPositive = (v)   => v > 0 ? null : 'Must be > 0'         -->
<!--                                                              -->
<!-- Usage:                                                        -->
<!--   const schoolName = useField('', [required(), minLength(3)])-->
<!--   schoolName.value.value = 'Greenwood'  ← set value          -->
<!--   schoolName.touch()                     ← mark touched       -->
<!--   schoolName.showError.value             ← show in template  -->
<!--   schoolName.error.value                 ← error message     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useBookingForm composable                                    -->
<!--                                                              -->
<!-- Encapsulates entire form logic:                              -->
<!--   const {                                                     -->
<!--     schoolName, contactEmail, studentCount, tripId,          -->
<!--     isValid, isDirty, isSubmitting, serverError,             -->
<!--     reset, submit                                             -->
<!--   } = useBookingForm()                                        -->
<!--                                                              -->
<!-- isValid = computed(() => fields.every(f => f.error === null))-->
<!--                                                              -->
<!-- isDirty = computed(() =>                                      -->
<!--   schoolName.value !== '' || contactEmail.value !== '' || ...-->
<!-- )                                                             -->
<!-- ← block navigation if isDirty + onBeforeRouteLeave           -->
<!--                                                              -->
<!-- validateAll(): run validate() on every field                  -->
<!--   ← also marks all as touched (shows all errors at once)     -->
<!--                                                              -->
<!-- submit(handler):                                              -->
<!--   if (!validateAll()) return                                  -->
<!--   isSubmitting = true                                         -->
<!--   try { await handler(formData) }                            -->
<!--   catch { serverError = err.message }                        -->
<!--   finally { isSubmitting = false }                           -->
<!--                                                              -->
<!-- reset(): restore all fields to initial, clear touched/errors -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Async validation — email uniqueness check                    -->
<!--                                                              -->
<!-- const emailExists   = ref(false)                             -->
<!-- const emailChecking = ref(false)                             -->
<!--                                                              -->
<!-- Debounced watcher (500ms after typing stops):                -->
<!--   watch(contactEmail.value, async (email) => {               -->
<!--     if (!isValidEmail(email)) return                         -->
<!--     emailChecking.value = true                               -->
<!--     const { exists } = await checkEmailApi(email)            -->
<!--     emailExists.value = exists                               -->
<!--     emailChecking.value = false                              -->
<!--   }, { debounce: 500 })  ← or manual setTimeout/clearTimeout -->
<!--                                                              -->
<!-- Template feedback:                                            -->
<!--   <span v-if="emailChecking">Checking...</span>              -->
<!--   <span v-else-if="emailExists" class="text-red-500">        -->
<!--     Email already registered                                  -->
<!--   </span>                                                     -->
<!--   <span v-else-if="emailTouched" class="text-green-500">✓</span>-->
<!--                                                              -->
<!-- Block submit while checking or if exists:                     -->
<!--   :disabled="!isValid || emailChecking || emailExists"       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- File input with preview                                      -->
<!--                                                              -->
<!-- v-model does NOT work on <input type="file">                 -->
<!--   ← file inputs are uncontrolled by design                  -->
<!--   ← use ref + @change event handler instead                  -->
<!--                                                              -->
<!-- const fileInput = ref<HTMLInputElement | null>(null)          -->
<!-- const preview   = ref<string | null>(null)                   -->
<!-- const file      = ref<File | null>(null)                     -->
<!--                                                              -->
<!-- onFileChange(event):                                          -->
<!--   const selected = event.target.files?.[0]                   -->
<!--   validate: selected.size > 2MB → error                      -->
<!--   validate: type not in allowed list → error                  -->
<!--   file.value    = selected                                    -->
<!--   preview.value = URL.createObjectURL(selected)              -->
<!--   ← createObjectURL creates a local blob URL for the preview -->
<!--                                                              -->
<!-- onUnmounted: URL.revokeObjectURL(preview.value)              -->
<!--   ← IMPORTANT: prevent memory leak, free the object URL      -->
<!--                                                              -->
<!-- Hidden input + custom button:                                 -->
<!--   <input ref="fileInput" type="file" class="hidden" @change="onFileChange"/>-->
<!--   <button @click="fileInput?.click()">Upload</button>        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- VeeValidate + Zod (library alternative)                      -->
<!--                                                              -->
<!-- Define schema once with Zod:                                  -->
<!--   const schema = toTypedSchema(z.object({                    -->
<!--     schoolName: z.string().min(3, 'Min 3 characters'),       -->
<!--     contactEmail: z.string().email('Invalid email'),         -->
<!--     studentCount: z.number().min(1).max(200),                -->
<!--   }))                                                         -->
<!--                                                              -->
<!-- useForm({ validationSchema: schema })                         -->
<!--   → handleSubmit, errors (reactive), resetForm               -->
<!--                                                              -->
<!-- useField<string>('schoolName')                                -->
<!--   → { value, errorMessage, handleBlur }                      -->
<!--                                                              -->
<!-- When to use VeeValidate:                                      -->
<!--   ✅ Large forms with complex rules                          -->
<!--   ✅ Zod schema shared between frontend and backend          -->
<!--   ✅ Field arrays (dynamic fields), nested objects           -->
<!--   ❌ Simple forms — DIY useField is lighter                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue v-model vs React controlled inputs                        -->
<!--                                                              -->
<!-- SINGLE INPUT:                                                 -->
<!--   Vue:   <input v-model="name" />  ← one directive           -->
<!--   React: <input value={name} onChange={e=>setName(e.target.value)}/>-->
<!--          ← always two pieces: value + onChange               -->
<!--                                                              -->
<!-- MODIFIERS:                                                    -->
<!--   Vue:   v-model.trim / .number / .lazy  ← built-in          -->
<!--   React: handle manually in onChange handler                 -->
<!--                                                              -->
<!-- OBJECT STATE:                                                  -->
<!--   Vue:   reactive() — direct mutation OK (form.name = 'x')  -->
<!--   React: useState — must spread: setForm({...prev, name:'x'})-->
<!--                                                              -->
<!-- CHECKBOX ARRAY:                                               -->
<!--   Vue:   v-model="selectedTags" + :value="tag"               -->
<!--          ← Vue manages add/remove automatically              -->
<!--   React: checked={tags.includes(tag)} + manual toggle fn     -->
<!--                                                              -->
<!-- CUSTOM v-model:                                               -->
<!--   Vue 3.4+: defineModel() — writable ref, just works         -->
<!--   Vue 3.0:  modelValue prop + update:modelValue emit         -->
<!--   React:    any prop + any callback — no special protocol    -->
<!--                                                              -->
<!-- RE-RENDER ON CHANGE:                                          -->
<!--   Vue:   fine-grained reactivity — only changed field updates-->
<!--   React: entire component re-renders when any state changes  -->
<!--          optimize with useReducer or separate state per field -->
<!--                                                              -->
<!-- FORM RESET:                                                    -->
<!--   Vue:   Object.assign(form, initialForm) — mutate in-place  -->
<!--   React: setForm(initialForm) — replaces entire state object -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Testing forms                                                 -->
<!--                                                              -->
<!-- setValue() — set input value and trigger events:             -->
<!--   await wrapper.find('input[name="schoolName"]').setValue('Greenwood')-->
<!--   ← triggers both 'input' and 'change' events               -->
<!--                                                              -->
<!-- trigger('submit') — trigger form submission:                  -->
<!--   await wrapper.find('form').trigger('submit')               -->
<!--                                                              -->
<!-- Check validation error message:                               -->
<!--   expect(wrapper.find('[data-testid="error-schoolName"]').text())-->
<!--     .toBe('School name is required')                          -->
<!--                                                              -->
<!-- Check button disabled state:                                  -->
<!--   expect(wrapper.find('button[type="submit"]').attributes('disabled'))-->
<!--     .toBeDefined()  / .toBeUndefined()                       -->
<!--                                                              -->
<!-- Spy on store action:                                          -->
<!--   const pinia = createTestingPinia({ createSpy: vi.fn })     -->
<!--   const store = useBookingStore(pinia)                        -->
<!--   // after submit...                                          -->
<!--   expect(store.createBooking).toHaveBeenCalledWith(           -->
<!--     expect.objectContaining({ schoolName: 'Greenwood' })     -->
<!--   )                                                           -->
<!--                                                              -->
<!-- Test onBeforeRouteLeave unsaved changes:                      -->
<!--   mock window.confirm to return false                         -->
<!--   attempt router.push to a different route                   -->
<!--   expect router.currentRoute.value.name unchanged             -->
<!-- ============================================================ -->
