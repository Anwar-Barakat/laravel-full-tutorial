<!-- ============================================================ -->
<!-- Problem 02 — Advanced Composables                           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- usePagination                                                -->
<!--                                                              -->
<!-- usePagination(total: Ref<number>, options?)                  -->
<!--   ← total is a Ref so lastPage recomputes when total changes -->
<!--                                                              -->
<!-- State (refs):                                                 -->
<!--   page    = ref(1)                                           -->
<!--   perPage = ref(15)                                          -->
<!--                                                              -->
<!-- Computed:                                                     -->
<!--   lastPage = Math.max(1, Math.ceil(total.value / perPage.value))-->
<!--   hasNext  = page.value < lastPage.value                     -->
<!--   hasPrev  = page.value > 1                                  -->
<!--   from     = (page - 1) * perPage + 1                        -->
<!--   to       = Math.min(page * perPage, total.value)           -->
<!--                                                              -->
<!-- Actions:                                                      -->
<!--   goTo(n): page = clamp(n, 1, lastPage)                      -->
<!--   next():  if hasNext → goTo(page + 1)                       -->
<!--   prev():  if hasPrev → goTo(page - 1)                       -->
<!--   reset(): page = 1                                          -->
<!--                                                              -->
<!-- watch(perPage, reset): reset to page 1 when page size changes-->
<!--                                                              -->
<!-- Composition with useFetch:                                    -->
<!--   const url = computed(() => `/api/bookings?page=${page.value}`)-->
<!--   watch(data, d => { totalBookings.value = d?.meta?.total })  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useIntersectionObserver — infinite scroll trigger            -->
<!--                                                              -->
<!-- useIntersectionObserver(target: Ref<HTMLElement|null>, cb, opts?)-->
<!--                                                              -->
<!-- watch(target, (el) => {                                       -->
<!--   observer?.disconnect()                                      -->
<!--   if (!el) return                                             -->
<!--   observer = new IntersectionObserver(entries => {           -->
<!--     isIntersecting.value = entries[0]?.isIntersecting        -->
<!--     callback(entries, observer)                               -->
<!--   }, options)                                                  -->
<!--   observer.observe(el)                                        -->
<!-- }, { immediate: true })                                       -->
<!--                                                              -->
<!-- onUnmounted(() => observer?.disconnect())                    -->
<!--                                                              -->
<!-- Infinite scroll usage:                                        -->
<!--   const sentinel = ref<HTMLElement | null>(null)  ← template ref-->
<!--   useIntersectionObserver(sentinel, ([entry]) => {            -->
<!--     if (!entry.isIntersecting || isLoading.value) return      -->
<!--     loadNextPage()                                             -->
<!--   }, { threshold: 0.1 })                                      -->
<!--   ← sentinel is a <div ref="sentinel"> at list bottom         -->
<!--   ← threshold 0.1: fires when 10% of sentinel is visible     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useAsyncAction — wrap any async operation                    -->
<!--                                                              -->
<!-- useAsyncAction<TArgs[], TReturn>(action: fn): {              -->
<!--   isLoading, error, result, execute                           -->
<!-- }                                                             -->
<!--                                                              -->
<!-- execute(...args):                                             -->
<!--   isLoading = true; error = null                             -->
<!--   try { result = await action(...args); return result }       -->
<!--   catch { error = err.message; return null }                  -->
<!--   finally { isLoading = false }                               -->
<!--                                                              -->
<!-- Pattern: one composable per API action in a component:        -->
<!--   const deleteAction = useAsyncAction((id: number) =>        -->
<!--     store.deleteBooking(id)                                    -->
<!--   )                                                           -->
<!--   const confirmAction = useAsyncAction((id: number) =>       -->
<!--     store.confirmBooking(id)                                   -->
<!--   )                                                           -->
<!--                                                              -->
<!-- Each has independent isLoading/error — no shared state clash -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useMediaQuery — responsive breakpoints                        -->
<!--                                                              -->
<!-- const matches = ref(false)                                    -->
<!--                                                              -->
<!-- onMounted(() => {                                             -->
<!--   mql = window.matchMedia(query)                              -->
<!--   matches.value = mql.matches  ← initial value               -->
<!--   mql.addEventListener('change', () => matches.value=mql.matches)-->
<!-- })                                                            -->
<!-- onUnmounted(() => mql?.removeEventListener(...))             -->
<!--                                                              -->
<!-- Convenience wrapper:                                          -->
<!--   export function useBreakpoints() {                          -->
<!--     return {                                                   -->
<!--       isMobile:  useMediaQuery('(max-width: 639px)'),         -->
<!--       isTablet:  useMediaQuery('(min-width: 640px)...'),      -->
<!--       isDesktop: useMediaQuery('(min-width: 1024px)'),        -->
<!--     }                                                          -->
<!--   }                                                           -->
<!--                                                              -->
<!-- Usage:                                                        -->
<!--   const { isMobile, isDesktop } = useBreakpoints()           -->
<!--   ← reactive: updates when viewport resizes                  -->
<!--   ← v-if="isMobile" / v-if="isDesktop" in templates          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Shared state (module-level singleton) vs per-instance        -->
<!--                                                              -->
<!-- PER-INSTANCE (state inside function):                         -->
<!--   export function useCounter() {                              -->
<!--     const count = ref(0)  ← new ref on each call             -->
<!--     return { count }                                          -->
<!--   }                                                           -->
<!--   ComponentA: useCounter() → count = 0 (own instance)        -->
<!--   ComponentB: useCounter() → count = 0 (own instance)        -->
<!--   ← NOT shared: each caller gets isolated state              -->
<!--                                                              -->
<!-- SHARED STATE (state outside function):                        -->
<!--   const theme = ref('light')  ← module-level singleton       -->
<!--   export function useTheme() {                                -->
<!--     return { theme, toggle }                                   -->
<!--   }                                                           -->
<!--   ComponentA: useTheme() → same theme ref                    -->
<!--   ComponentB: useTheme() → same theme ref                    -->
<!--   ← SHARED: all callers see same state                       -->
<!--   ← persists across component mounts/unmounts                -->
<!--   ← like a mini-store (simpler than Pinia for tiny state)    -->
<!--                                                              -->
<!-- Use Pinia when: multiple shared pieces of state + devtools   -->
<!-- Use module-level when: 1-2 refs, no devtools needed          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Composables calling composables                               -->
<!--                                                              -->
<!-- Composables can freely call other composables:               -->
<!--   export function useBookingSearch() {                        -->
<!--     const search    = ref('')                                 -->
<!--     const debounced = useDebounce(search, 400)  ← composable -->
<!--     const url       = computed(() => `/api?q=${debounced.value}`)-->
<!--     const { data, isLoading, error } = useFetch(url)  ← composable-->
<!--     return { search, data, isLoading, error }                 -->
<!--   }                                                           -->
<!--                                                              -->
<!-- ← lifecycle hooks from inner composables bind to the same    -->
<!--   host component (the one calling useBookingSearch)           -->
<!-- ← chain composables to build complex, reusable behaviors     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue composables vs React custom hooks                        -->
<!--                                                              -->
<!-- STATE:                                                        -->
<!--   Vue:   ref() → mutable assignment: value.value = 'x'       -->
<!--   React: useState() → [val, setter]: setter('x')             -->
<!--          ← must use setter, direct mutation won't re-render  -->
<!--                                                              -->
<!-- SIDE EFFECTS + CLEANUP:                                       -->
<!--   Vue:   onMounted + onUnmounted (explicit lifecycle hooks)  -->
<!--          watchEffect(onCleanup => { onCleanup(() => {}) })   -->
<!--   React: useEffect(() => { return () => cleanup() }, [deps]) -->
<!--          ← one hook covers mount + cleanup                   -->
<!--                                                              -->
<!-- DEPENDENCY TRACKING:                                          -->
<!--   Vue:   automatic — watch/computed find deps at runtime     -->
<!--          no deps array needed                                  -->
<!--   React: manual — [deps] array on every hook                  -->
<!--          missing dep = stale closure (silent bug)             -->
<!--                                                              -->
<!-- REACTIVE URL REFETCH:                                         -->
<!--   Vue:   const url = computed(() => `/api/${id.value}`)       -->
<!--          watchEffect(() => fetch(toValue(url)))               -->
<!--          ← auto-tracks id.value change                       -->
<!--   React: useEffect(() => { fetch(`/api/${id}`) }, [id])       -->
<!--          ← must list id in deps                               -->
<!--                                                              -->
<!-- SHARED STATE:                                                  -->
<!--   Vue:   ref/reactive outside function body = module singleton-->
<!--   React: useContext() + Context provider                      -->
<!--          or external store (Zustand/Jotai/Redux)              -->
<!--                                                              -->
<!-- CALL RULES:                                                    -->
<!--   Vue:   call in <script setup> or composable (not in events) -->
<!--   React: call in component or hook (Rules of Hooks)           -->
<!--          ← both: no calls inside conditionals or loops       -->
<!--                                                              -->
<!-- ECOSYSTEM:                                                     -->
<!--   Vue:   VueUse (vueuse.org) — 200+ ready composables         -->
<!--   React: react-use, ahooks, usehooks.com — similar coverage  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Testing composables — withSetup pattern                      -->
<!--                                                              -->
<!-- Composables need an active component instance for lifecycle  -->
<!-- hooks — mount a wrapper component to provide that context    -->
<!--                                                              -->
<!-- function withSetup<T>(composable: () => T): [T, VueWrapper] {-->
<!--   let result!: T                                              -->
<!--   const Cmp = defineComponent({                              -->
<!--     setup() { result = composable() },                       -->
<!--     template: '<div />'                                       -->
<!--   })                                                          -->
<!--   const wrapper = mount(Cmp)                                  -->
<!--   return [result, wrapper]                                    -->
<!-- }                                                             -->
<!--                                                              -->
<!-- Test useDebounce:                                             -->
<!--   vi.useFakeTimers()                                          -->
<!--   source.value = 'new'                                        -->
<!--   await nextTick()                                            -->
<!--   expect(debounced.value).toBe('initial')  ← not yet         -->
<!--   vi.advanceTimersByTime(300)                                  -->
<!--   await nextTick()                                            -->
<!--   expect(debounced.value).toBe('new')  ← now updated         -->
<!--                                                              -->
<!-- Test useFetch:                                                -->
<!--   global.fetch = vi.fn().mockResolvedValue({ ok: true, json: ... })-->
<!--   await flushPromises()  ← resolve all pending promises       -->
<!--   expect(data.value).toEqual(...)                             -->
<!--                                                              -->
<!-- wrapper.unmount() triggers onUnmounted:                       -->
<!--   ← test that cleanup (abort, removeEventListener) runs      -->
<!-- ============================================================ -->
