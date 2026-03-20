<!-- ============================================================ -->
<!-- Problem 02 — Setup Store Syntax & Composable Stores        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Setup store syntax                                          -->
<!--                                                              -->
<!-- defineStore('booking', () => { ... })                       -->
<!--   ← arrow function = setup store (not options object)       -->
<!--   ← full Composition API inside: ref, computed, function    -->
<!--   ← identical mental model to <script setup lang="ts">     -->
<!--                                                              -->
<!-- State → ref():                                               -->
<!--   const bookings   = ref<Booking[]>([])                     -->
<!--   const isLoading  = ref(false)                             -->
<!--   const error      = ref<string | null>(null)               -->
<!--   const filters    = ref<BookingFilters>({ status:'', ... }) -->
<!--   const pagination = ref<Pagination>({ page:1, ... })       -->
<!--                                                              -->
<!-- Getters → computed():                                        -->
<!--   const paidBookings = computed(() =>                       -->
<!--     bookings.value.filter(b => b.status === 'paid')         -->
<!--   )                                                          -->
<!--   const totalRevenue = computed(() =>                       -->
<!--     paidBookings.value.reduce((sum, b) => sum + b.amount, 0) -->
<!--   )                                                          -->
<!--   ← computed uses another computed: paidBookings.value      -->
<!--   ← auto-tracked, no 'this' needed                          -->
<!--                                                              -->
<!-- Getter with argument → plain function (not computed):       -->
<!--   function bookingById(id: number): Booking | undefined {   -->
<!--     return bookings.value.find(b => b.id === id)            -->
<!--   }                                                          -->
<!--   ← not cached, but fine for single lookups                 -->
<!--                                                              -->
<!-- Actions → async functions:                                   -->
<!--   async function fetchBookings(override?) { ... }           -->
<!--   async function createBooking(data) { ... }                -->
<!--   function setFilter(key, value) { ... }                    -->
<!--                                                              -->
<!-- MUST return everything (unlike options syntax):             -->
<!--   return {                                                   -->
<!--     bookings, isLoading, error, filters, pagination,        -->
<!--     paidBookings, totalRevenue, formattedRevenue,           -->
<!--     bookingById,                                             -->
<!--     fetchBookings, createBooking, setFilter, clearFilters,  -->
<!--   }                                                          -->
<!--   ← anything NOT returned is private to the store          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Options vs Setup syntax comparison                          -->
<!--                                                              -->
<!-- Options syntax:                                              -->
<!--   defineStore('id', { state, getters, actions })            -->
<!--   ✅ Clear visual separation: state / getters / actions     -->
<!--   ✅ 'this' access within actions (access state/getters)    -->
<!--   ❌ 'this' typing complex → TS needs explicit return types  -->
<!--   ❌ Cannot use composables inside (no onMounted, useRoute)  -->
<!--                                                              -->
<!-- Setup syntax:                                                -->
<!--   defineStore('id', () => { ref, computed, function })      -->
<!--   ✅ Full Composition API power — any composable usable     -->
<!--   ✅ Better TypeScript inference — no 'this' problems       -->
<!--   ✅ Same mental model as <script setup lang="ts">          -->
<!--   ❌ Must explicitly return everything (easy to forget)     -->
<!--   ❌ Less visually structured — state/getters/actions       -->
<!--      all look the same without grouping                     -->
<!--                                                              -->
<!-- Recommendation: use SETUP syntax for new stores            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Composable: useBookingFilters                               -->
<!--                                                              -->
<!-- Extract reusable logic from store into composable           -->
<!-- Only possible with SETUP syntax (options syntax can't use)  -->
<!--                                                              -->
<!-- useBookingFilters(bookings: Ref<Booking[]>)                 -->
<!--   const search  = ref('')                                   -->
<!--   const status  = ref<Booking['status'] | ''>('')          -->
<!--   const sortBy  = ref<'date'|'amount'>('date')             -->
<!--   const sortDir = ref<'asc'|'desc'>('desc')                -->
<!--                                                              -->
<!--   const filtered = computed(() => {                         -->
<!--     filter by search (schoolName + destination)             -->
<!--     filter by status (if set)                               -->
<!--     [...result].sort: date diff or amount diff              -->
<!--     apply sortDir: asc → diff, desc → -diff                -->
<!--   })                                                         -->
<!--                                                              -->
<!--   function clear() { search.value = ''; status.value = '' } -->
<!--                                                              -->
<!--   return { search, status, sortBy, sortDir, filtered, clear } -->
<!--                                                              -->
<!-- Use in setup store:                                          -->
<!--   defineStore('booking', () => {                            -->
<!--     const bookings = ref<Booking[]>([])                     -->
<!--     const { search, status, filtered, clear } =             -->
<!--       useBookingFilters(bookings)  ← composable inside store -->
<!--     return { bookings, search, status,                      -->
<!--              filteredBookings: filtered, clearFilters: clear } -->
<!--   })                                                         -->
<!--                                                              -->
<!-- OR use directly in component (no store):                    -->
<!--   const { search, filtered } = useBookingFilters(bookingsRef) -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Pinia plugin — persist state to localStorage               -->
<!--                                                              -->
<!-- Plugin signature: (context: PiniaPluginContext) => void     -->
<!--   destructure: { store, options }                           -->
<!--   options = defineStore's second argument                   -->
<!--                                                              -->
<!-- piniaLocalStoragePlugin:                                     -->
<!--   const config = options.persist  ← custom option          -->
<!--   if !config → return early (not all stores persist)        -->
<!--   key  = config.key ?? store.$id                            -->
<!--   pick = config.pick (array of state keys to persist)       -->
<!--                                                              -->
<!--   Restore on init:                                           -->
<!--     const saved = localStorage.getItem(key)                 -->
<!--     if saved: store.$patch(JSON.parse(saved))               -->
<!--     ← $patch: partial state update (merge, not replace)     -->
<!--                                                              -->
<!--   Save on every change:                                      -->
<!--     store.$subscribe((mutation, state) => {                  -->
<!--       localStorage.setItem(key, JSON.stringify(toSave))     -->
<!--     })                                                        -->
<!--                                                              -->
<!-- Register: pinia.use(piniaLocalStoragePlugin)                -->
<!--   in main.ts before app.use(pinia)                          -->
<!--                                                              -->
<!-- Use on store:                                                -->
<!--   defineStore('auth', {                                      -->
<!--     persist: { key: 'tripz-auth', pick: ['token', 'user'] }, -->
<!--     state: () => ({ token: null, user: null, ... }),        -->
<!--   })                                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- $subscribe — react to store mutations                       -->
<!--                                                              -->
<!-- bookingStore.$subscribe((mutation, state) => {              -->
<!--   mutation.type:    'direct' | 'patch function' | 'patch object' -->
<!--   mutation.storeId: 'booking'                               -->
<!--   state:            full current state snapshot             -->
<!-- }, { detached: false })                                      -->
<!--   detached: false → auto-unsubscribe on component unmount   -->
<!--   detached: true  → subscription survives unmount           -->
<!--                                                              -->
<!-- Return value = unsubscribe function:                        -->
<!--   const unsub = store.$subscribe(...)                       -->
<!--   onUnmounted(() => unsub())  ← manual cleanup              -->
<!--                                                              -->
<!-- $onAction — intercept action calls:                         -->
<!--   bookingStore.$onAction(({ name, args, after, onError }) => { -->
<!--     console.log(`Action: ${name}`, args)                    -->
<!--     after((result) => console.log('succeeded', result))     -->
<!--     onError((err)  => Sentry.captureException(err))         -->
<!--   })                                                          -->
<!--   ← useful for: logging, Sentry integration, testing        -->
<!-- ============================================================ -->
