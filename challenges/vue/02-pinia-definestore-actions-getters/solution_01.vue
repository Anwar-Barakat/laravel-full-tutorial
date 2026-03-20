<!-- ============================================================ -->
<!-- Problem 01 — Booking Store with Pinia (Options Syntax)      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Pinia store structure — defineStore options syntax          -->
<!--                                                              -->
<!-- defineStore('booking', { state, getters, actions })         -->
<!--   'booking' = store ID: used in devtools + persist keys     -->
<!--                                                              -->
<!-- state: () => ({...})                                        -->
<!--   bookings:   [] as Booking[]                               -->
<!--   isLoading:  false                                          -->
<!--   error:      null as string | null                         -->
<!--   filters:    { status:'', search:'', dateFrom:'', dateTo:'' } as BookingFilters -->
<!--   pagination: { page:1, perPage:15, total:0, lastPage:1 }   -->
<!--   ← MUST be a function returning object (like Vue data())   -->
<!--   ← typed with 'as' to help TypeScript infer union types    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Getters                                                      -->
<!--                                                              -->
<!-- paidBookings(state): Booking[]                              -->
<!--   state.bookings.filter(b => b.status === 'paid')           -->
<!--                                                              -->
<!-- totalRevenue(state): number                                  -->
<!--   state.bookings.filter(paid).reduce(sum, b => sum + b.amount, 0) -->
<!--                                                              -->
<!-- bookingById: (state) => (id: number) => Booking|undefined   -->
<!--   ← getter WITH argument: return a function                 -->
<!--   ← state.bookings.find(b => b.id === id)                   -->
<!--   ← calling: bookingStore.bookingById(42)                   -->
<!--                                                              -->
<!-- pendingCount(state): number                                  -->
<!--   state.bookings.filter(pending).length                     -->
<!--                                                              -->
<!-- formattedRevenue(): string                                   -->
<!--   uses 'this' to access another getter: this.totalRevenue   -->
<!--   ← this = store instance in options getters                -->
<!--   ← Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }) -->
<!--   ← .format(this.totalRevenue)                              -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Async actions — loading/error state management              -->
<!--                                                              -->
<!-- fetchBookings(overrideFilters?: Partial<BookingFilters>)    -->
<!--   1. useAuthStore() ← store composition: get token          -->
<!--   2. this.isLoading = true; this.error = null               -->
<!--   3. build URLSearchParams from pagination + filters        -->
<!--      spread overrideFilters to allow ad-hoc filter override -->
<!--   4. fetch('/api/v1/bookings?{params}', { Authorization })  -->
<!--   5. if !response.ok → throw Error(status)                  -->
<!--   6. const json: ApiResponse<Booking[]> = await response.json() -->
<!--   7. this.bookings = json.data                              -->
<!--      this.pagination.total    = json.meta?.total    ?? 0    -->
<!--      this.pagination.lastPage = json.meta?.last_page ?? 1   -->
<!--   catch: this.error = err.message                           -->
<!--   finally: this.isLoading = false  ← ALWAYS runs           -->
<!--                                                              -->
<!-- createBooking(data: Omit<Booking, 'id'>): Promise<Booking|null> -->
<!--   this.isLoading = true; this.error = null                  -->
<!--   POST /api/v1/bookings with JSON body                      -->
<!--   on success: this.bookings.unshift(json.data) ← add to front -->
<!--               this.pagination.total++                        -->
<!--               return json.data                              -->
<!--   on error:   this.error = ...; return null                 -->
<!--                                                              -->
<!-- updateBooking(id, data) — optimistic update:                -->
<!--   1. find index in this.bookings                            -->
<!--   2. save original = { ...this.bookings[index] }            -->
<!--   3. this.bookings[index] = { ...original, ...data } ← apply immediately -->
<!--   4. PATCH /api/v1/bookings/{id}                            -->
<!--   5. if ok: this.bookings[index] = json.data ← server truth -->
<!--   6. if error: this.bookings[index] = original ← REVERT    -->
<!--                                                              -->
<!-- deleteBooking(id) — optimistic delete:                      -->
<!--   1. save original; this.bookings.splice(index, 1)          -->
<!--   2. DELETE /api/v1/bookings/{id}                           -->
<!--   3. if ok: this.pagination.total--                         -->
<!--   4. if error: this.bookings.splice(index, 0, original) ← REVERT -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Sync actions                                                 -->
<!--                                                              -->
<!-- setFilter<K extends keyof BookingFilters>(key, value)       -->
<!--   this.filters[key] = value                                 -->
<!--   this.pagination.page = 1  ← reset page on filter change  -->
<!--   ← generic key ensures type safety                         -->
<!--                                                              -->
<!-- setPage(page: number)                                        -->
<!--   this.pagination.page = page                               -->
<!--   this.fetchBookings()  ← immediately re-fetch              -->
<!--                                                              -->
<!-- clearFilters()                                               -->
<!--   this.filters = { status:'', search:'', dateFrom:'', dateTo:'' } -->
<!--   this.pagination.page = 1                                  -->
<!--                                                              -->
<!-- clearError()                                                 -->
<!--   this.error = null                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Store composition — useAuthStore inside useBookingStore     -->
<!--                                                              -->
<!-- Inside any action:                                           -->
<!--   const authStore = useAuthStore()  ← call inside action    -->
<!--   authStore.token  ← access auth state                      -->
<!--   ← DO NOT call at top level of defineStore — stores may    -->
<!--     not be registered yet when module loads                  -->
<!--   ← call inside actions (lazy): guaranteed store is ready   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- storeToRefs — destructure without losing reactivity         -->
<!--                                                              -->
<!-- const bookingStore = useBookingStore()                       -->
<!--                                                              -->
<!-- ❌ BAD — loses reactivity:                                   -->
<!--   const { bookings, isLoading } = bookingStore              -->
<!--   bookings is now a plain array, not a reactive ref          -->
<!--   template won't update when store changes                  -->
<!--                                                              -->
<!-- ✅ GOOD — storeToRefs preserves reactivity:                 -->
<!--   const { bookings, isLoading, error } = storeToRefs(bookingStore) -->
<!--   bookings remains a reactive ref → template updates        -->
<!--                                                              -->
<!-- Actions are NOT refs — destructure directly:                -->
<!--   const { fetchBookings, setFilter, clearError } = bookingStore -->
<!--   ← functions don't need to be reactive                     -->
<!-- ============================================================ -->
