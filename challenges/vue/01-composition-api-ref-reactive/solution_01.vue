<!-- ============================================================ -->
<!-- Problem 01 — Booking Card & List Components                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- BookingCard.vue                                              -->
<!--                                                              -->
<!-- <script setup lang="ts"> — modern Vue 3 syntax              -->
<!--   no need for export default, component name auto-inferred  -->
<!--                                                              -->
<!-- defineProps<{ booking: Booking; selected?: boolean }>()     -->
<!--   TypeScript generic = compile-time type checking           -->
<!--   no runtime declaration needed                             -->
<!--   access via props.booking (reactive proxy)                 -->
<!--                                                              -->
<!-- defineEmits<{                                                -->
<!--   (e: 'action', action: 'confirm'|'cancel'|'view', id: number): void -->
<!--   (e: 'select', id: number): void                           -->
<!-- }>()                                                         -->
<!--   typed event payloads — TypeScript errors on wrong args    -->
<!--   call: emit('action', 'confirm', booking.id)               -->
<!--                                                              -->
<!-- computed(() => ...) — derived from props, auto-tracked:     -->
<!--   statusColour: Record<status, tailwind string>             -->
<!--   formattedAmount: Intl.NumberFormat GBP                    -->
<!--   formattedDate: toLocaleDateString en-GB                   -->
<!--   ← re-runs only when props.booking.status/amount changes   -->
<!--   ← cached: reading .value 100× doesn't recalculate        -->
<!--                                                              -->
<!-- Template:                                                    -->
<!--   :class — dynamic class binding (object or string)         -->
<!--   @click="emit('select', booking.id)" — click handler       -->
<!--   @click.stop — stop propagation (don't bubble to parent)   -->
<!--   v-if="booking.status === 'pending'" — conditional render  -->
<!--   v-if="['pending','confirmed'].includes(booking.status)"   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- BookingList.vue                                              -->
<!--                                                              -->
<!-- ref() — for single primitive values:                        -->
<!--   const search = ref('')                                     -->
<!--   const debouncedSearch = ref('')                           -->
<!--   const selectedId = ref<number | null>(null)               -->
<!--   const sortBy = ref<'date'|'amount'|'school'>('date')      -->
<!--   const sortDir = ref<'asc'|'desc'>('desc')                 -->
<!--   access value via search.value (NOT search)                -->
<!--                                                              -->
<!-- reactive() — for grouped object state:                      -->
<!--   const filters = reactive({                                 -->
<!--     status: '' as Booking['status'] | '',                   -->
<!--     minAmount: 0,                                            -->
<!--     maxAmount: Infinity,                                     -->
<!--   })                                                         -->
<!--   access directly: filters.status (no .value needed)        -->
<!--   WHY reactive vs ref: related config lives together,        -->
<!--   one reactive object vs multiple refs                       -->
<!--                                                              -->
<!-- watch(search, (newVal) => {...}, { /* options */ })         -->
<!--   debounce pattern:                                          -->
<!--     let debounceTimer: ReturnType<typeof setTimeout>         -->
<!--     watch(search, (val) => {                                  -->
<!--       clearTimeout(debounceTimer)                            -->
<!--       debounceTimer = setTimeout(() => {                     -->
<!--         debouncedSearch.value = val                          -->
<!--       }, 300)                                                 -->
<!--     })                                                        -->
<!--   ← only update debouncedSearch 300ms after typing stops    -->
<!--   ← filteredBookings uses debouncedSearch (not raw search)  -->
<!--   ← avoids filtering on every keystroke                     -->
<!--                                                              -->
<!-- computed filteredBookings: filter + sort pipeline           -->
<!--   1. text search: filter by debouncedSearch.value           -->
<!--      q = debouncedSearch.value.toLowerCase()                 -->
<!--      schoolName.includes(q) || destination.includes(q)      -->
<!--   2. status filter: filter by filters.status (if set)       -->
<!--   3. amount range: filters.minAmount / maxAmount            -->
<!--   4. sort: [...result].sort((a,b) => ...)                   -->
<!--      spread to avoid mutating original array                 -->
<!--      match(sortBy.value): date/amount/school                 -->
<!--      apply sortDir: asc → diff, desc → -diff                -->
<!--                                                              -->
<!-- computed stats:                                              -->
<!--   total:    props.bookings.length                           -->
<!--   filtered: filteredBookings.value.length                   -->
<!--   revenue:  filteredBookings.filter(paid).reduce sum amount  -->
<!--   pending:  props.bookings.filter(pending).length           -->
<!--                                                              -->
<!-- Template:                                                    -->
<!--   v-for="booking in filteredBookings" :key="booking.id"     -->
<!--   v-model="search" — two-way bind to ref                    -->
<!--   v-model="filters.status" — two-way bind to reactive prop  -->
<!--   @select="selectedId = $event" — update selected on card   -->
<!--   @action="(action, id) => emit('action', action, id)"      -->
<!--   v-if="filteredBookings.length === 0" — empty state        -->
<!--   v-if="search || filters.status" — clear button visibility -->
<!-- ============================================================ -->
