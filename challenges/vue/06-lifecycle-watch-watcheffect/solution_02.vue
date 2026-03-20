<!-- ============================================================ -->
<!-- Problem 02 — Advanced Lifecycle & Watcher Patterns          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- onWatcherCleanup (Vue 3.5+)                                 -->
<!--                                                              -->
<!-- Before 3.5: only available via watchEffect's onCleanup arg  -->
<!--   watchEffect(async (onCleanup) => {                         -->
<!--     const ctrl = new AbortController()                       -->
<!--     onCleanup(() => ctrl.abort())                            -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Vue 3.5+: callable anywhere inside watch callback            -->
<!--   import { watch, onWatcherCleanup } from 'vue'              -->
<!--   watch(bookingId, async (newId) => {                        -->
<!--     const ctrl = new AbortController()                       -->
<!--     onWatcherCleanup(() => ctrl.abort())  ← inline cleanup   -->
<!--     const res = await fetch(`/api/${newId}`, { signal: ctrl.signal })-->
<!--     data.value = await res.json()                            -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Cleanup fires:                                                -->
<!--   ← before next watch invocation (new bookingId value)      -->
<!--   ← on component unmount                                     -->
<!--   ← aborts the stale fetch automatically                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- flush timing — pre / post / sync                             -->
<!--                                                              -->
<!-- flush: 'pre' (DEFAULT):                                      -->
<!--   ← runs before Vue patches the DOM                          -->
<!--   ← you see STALE DOM if you try to read refs                -->
<!--   ← use for: state calculations, API calls                   -->
<!--                                                              -->
<!-- flush: 'post':                                               -->
<!--   ← runs AFTER Vue has updated the DOM                       -->
<!--   ← safe to read updated element sizes/positions             -->
<!--   ← alias: watchPostEffect(() => { ... })                    -->
<!--   watchPostEffect(() => {                                     -->
<!--     console.log('height:', listRef.value?.clientHeight)       -->
<!--   })                                                          -->
<!--                                                              -->
<!-- flush: 'sync':                                               -->
<!--   ← runs synchronously when dep changes (bypasses batching)  -->
<!--   ← alias: watchSyncEffect(() => { ... })                    -->
<!--   ← use only for debugging — performance cost                 -->
<!--   ← fires multiple times if multiple deps change together    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- KeepAlive — onActivated / onDeactivated                     -->
<!--                                                              -->
<!-- <KeepAlive :include="['BookingsPage']">                       -->
<!--   <component :is="Component" />                              -->
<!-- </KeepAlive>                                                  -->
<!-- ← cached component is NOT unmounted between navigations      -->
<!--                                                              -->
<!-- onMounted:    fires ONCE (first load)                         -->
<!-- onUnmounted: fires ONCE (final destroy, e.g. exceed max)     -->
<!--                                                              -->
<!-- onActivated:   fires every time component enters the cache   -->
<!--   ← refresh stale data, restart polling, resume timers       -->
<!--   onActivated(() => {                                         -->
<!--     store.fetchBookings()                                     -->
<!--     timer = setInterval(refresh, 30_000)                     -->
<!--   })                                                          -->
<!--                                                              -->
<!-- onDeactivated: fires every time component leaves the cache   -->
<!--   ← pause polling, cancel in-flight requests                 -->
<!--   onDeactivated(() => {                                       -->
<!--     clearInterval(timer)                                      -->
<!--     controller?.abort()                                       -->
<!--   })                                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- onErrorCaptured — error boundary                             -->
<!--                                                              -->
<!-- onErrorCaptured((err, instance, info) => {                   -->
<!--   // err:      the Error object                              -->
<!--   // instance: the child component that threw               -->
<!--   // info:     Vue-specific info string (e.g. 'setup function')-->
<!--                                                              -->
<!--   childError.value = err.message  ← show fallback UI        -->
<!--   return false  ← stop propagation to parent / global handler-->
<!--                                                              -->
<!--   // Omit return (or return true) → propagates up            -->
<!-- })                                                            -->
<!--                                                              -->
<!-- Use case: wrap sections of UI in error-capturing components  -->
<!--   ← if BookingList crashes, show "retry" instead of blank page-->
<!--   ← report to Sentry inside onErrorCaptured                  -->
<!--                                                              -->
<!-- Propagation chain:                                            -->
<!--   child error → parent onErrorCaptured → grandparent → ...  -->
<!--   → app.config.errorHandler (global fallback)                -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- deep watch vs snapshot getter — performance                  -->
<!--                                                              -->
<!-- EXPENSIVE: deep watch on large object                         -->
<!--   watch(largeObject, handler, { deep: true })                -->
<!--   ← traverses every nested property recursively              -->
<!--                                                              -->
<!-- EFFICIENT: watch only what you need                          -->
<!--   watch(() => filters.status, handler)                       -->
<!--   ← only tracks filters.status, nothing else                 -->
<!--                                                              -->
<!-- SNAPSHOT: detect object change without deep traversal        -->
<!--   watch(() => ({ status: filters.status, search: filters.search }),-->
<!--     handler                                                   -->
<!--   )                                                           -->
<!--   ← creates new object each time → Vue detects by equality  -->
<!--   ← tracks only the two listed properties                   -->
<!--                                                              -->
<!-- ARRAY mutations vs replacement:                               -->
<!--   watch(items, handler, { deep: true })  ← push/splice trigger-->
<!--   watch(items, handler)                  ← only replacement  -->
<!--   ← prefer: watch(() => [...items.value], handler) for safety-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Lifecycle in composables — binding rules                     -->
<!--                                                              -->
<!-- Lifecycle hooks inside a composable bind to the CALLING      -->
<!-- component's lifecycle (not globally)                         -->
<!--                                                              -->
<!-- export function useBookingPolling() {                         -->
<!--   onMounted(() => { startTimer() })   ← binds to caller      -->
<!--   onUnmounted(() => { stopTimer() })  ← binds to caller      -->
<!--   return { lastUpdated }                                      -->
<!-- }                                                             -->
<!--                                                              -->
<!-- ComponentA: useBookingPolling() → timer starts/stops with A  -->
<!-- ComponentB: useBookingPolling() → independent timer          -->
<!--                                                              -->
<!-- ← MUST call composable at top level of <script setup>        -->
<!-- ← NOT inside onMounted (already past setup phase)            -->
<!-- ← NOT inside event handlers or conditionals                  -->
<!-- ← Same constraint as React's Rules of Hooks                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue lifecycle vs React lifecycle                             -->
<!--                                                              -->
<!-- MOUNT (once on DOM insertion):                               -->
<!--   Vue:   onMounted(() => { setup() })                        -->
<!--   React: useEffect(() => { setup() }, [])  ← empty deps     -->
<!--                                                              -->
<!-- UNMOUNT / CLEANUP:                                            -->
<!--   Vue:   onUnmounted(() => { cleanup() })                    -->
<!--          ← separate hook from setup                          -->
<!--   React: useEffect(() => { setup(); return cleanup }, [])    -->
<!--          ← cleanup is return value inside same hook          -->
<!--                                                              -->
<!-- UPDATE (every re-render):                                     -->
<!--   Vue:   onUpdated(() => { ... })                             -->
<!--   React: useEffect(() => { ... })  ← no deps array          -->
<!--                                                              -->
<!-- WATCH SPECIFIC VALUE:                                         -->
<!--   Vue:   watch(id, fetchById, { immediate: true })           -->
<!--   React: useEffect(() => { fetchById(id) }, [id])            -->
<!--          ← React always runs on mount, no 'immediate' needed -->
<!--                                                              -->
<!-- AUTO-TRACKING:                                               -->
<!--   Vue:   watchEffect(() => { reads ref.value automatically }) -->
<!--          ← no dependency list needed                         -->
<!--   React: useEffect(() => { ... }, [dep1, dep2])              -->
<!--          ← must declare every dependency in array            -->
<!--          ← missing dep = stale closure (silent bug)          -->
<!--                                                              -->
<!-- OLD VALUE:                                                    -->
<!--   Vue:   watch(src, (newVal, oldVal) => { })                 -->
<!--          ← both provided automatically                       -->
<!--   React: const prev = useRef(); useEffect(() => {            -->
<!--            prev.current = value  ← manual previous tracking  -->
<!--          })                                                   -->
<!--                                                              -->
<!-- KEEPALIVE:                                                     -->
<!--   Vue:   onActivated / onDeactivated — built in              -->
<!--   React: no equivalent (React doesn't cache components)      -->
<!--                                                              -->
<!-- ERROR BOUNDARY:                                               -->
<!--   Vue:   onErrorCaptured() — composition API hook            -->
<!--   React: class ErrorBoundary + componentDidCatch             -->
<!--          (no hooks equivalent for error boundaries in React) -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Testing lifecycle and watchers                               -->
<!--                                                              -->
<!-- flushPromises() — resolve all pending promises (fetch, watch)-->
<!--   import { flushPromises } from '@vue/test-utils'            -->
<!--   await flushPromises()                                       -->
<!--   ← needed after: async onMounted, immediate watch, watchEffect-->
<!--                                                              -->
<!-- Test watch re-runs on param change:                          -->
<!--   await router.push('/bookings/1')                            -->
<!--   await flushPromises()                                       -->
<!--   expect(store.fetchBooking).toHaveBeenCalledWith(1)         -->
<!--   await router.push('/bookings/42')                           -->
<!--   await flushPromises()                                       -->
<!--   expect(store.fetchBooking).toHaveBeenCalledWith(42)        -->
<!--                                                              -->
<!-- Test cleanup on unmount:                                      -->
<!--   vi.useFakeTimers()                                          -->
<!--   const spy = vi.spyOn(global, 'clearInterval')              -->
<!--   const wrapper = mount(DashboardPage, ...)                   -->
<!--   wrapper.unmount()                                           -->
<!--   expect(spy).toHaveBeenCalled()                             -->
<!--                                                              -->
<!-- Test nextTick focus:                                          -->
<!--   const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')-->
<!--   await wrapper.find('[data-testid="open"]').trigger('click') -->
<!--   await nextTick()                                            -->
<!--   expect(focusSpy).toHaveBeenCalled()                        -->
<!--                                                              -->
<!-- onErrorCaptured test:                                         -->
<!--   mount ErrorWrapper with child that throws in setup()        -->
<!--   await flushPromises()                                       -->
<!--   expect(wrapper.find('.error-message').exists()).toBe(true)  -->
<!-- ============================================================ -->
