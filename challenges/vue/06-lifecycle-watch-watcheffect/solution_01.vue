<!-- ============================================================ -->
<!-- Problem 01 — Lifecycle Hooks & Watchers                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Lifecycle sequence                                           -->
<!--                                                              -->
<!-- setup()          ← Composition API runs here                 -->
<!-- onBeforeMount()  ← DOM not yet created (no refs yet)         -->
<!-- onMounted()      ← DOM ready, template refs attached          -->
<!--                                                              -->
<!-- [reactive state changes]                                     -->
<!-- onBeforeUpdate() ← DOM not yet patched                       -->
<!-- onUpdated()      ← DOM patched (don't mutate state here)     -->
<!--                                                              -->
<!-- [component removed]                                          -->
<!-- onBeforeUnmount()← component still accessible               -->
<!-- onUnmounted()    ← DOM removed, refs cleared                 -->
<!--                                                              -->
<!-- KeepAlive:                                                    -->
<!-- onActivated()    ← cached component enters view             -->
<!-- onDeactivated()  ← cached component leaves view             -->
<!--                                                              -->
<!-- Error handling:                                               -->
<!-- onErrorCaptured()← catches errors from child components     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- onMounted — what belongs here                                -->
<!--                                                              -->
<!-- ✅ Initial data fetch                                         -->
<!--   await store.fetchBookings()                                -->
<!--                                                              -->
<!-- ✅ Third-party lib that needs real DOM                        -->
<!--   chart = new Chart(chartRef.value, { ... })                 -->
<!--   ← chartRef.value is null before onMounted                  -->
<!--                                                              -->
<!-- ✅ Event listeners / polling                                  -->
<!--   pollTimer = setInterval(() => refresh(), 30_000)           -->
<!--   window.addEventListener('resize', handler)                 -->
<!--                                                              -->
<!-- ✅ DOM measurements                                           -->
<!--   containerWidth.value = el.value?.clientWidth ?? 0          -->
<!--                                                              -->
<!-- ← async onMounted is fine:                                   -->
<!--   onMounted(async () => { await store.fetchBookings() })     -->
<!--   ← component renders first, then fetch updates state        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- onUnmounted — cleanup rules                                  -->
<!--                                                              -->
<!-- EVERYTHING started in onMounted must be cleaned up:          -->
<!--   clearInterval(pollTimer)       ← stop polling              -->
<!--   chart?.destroy()               ← free Chart.js memory      -->
<!--   window.removeEventListener()   ← no leaks on re-mount      -->
<!--   controller?.abort()            ← cancel pending requests   -->
<!--   observer?.disconnect()         ← stop IntersectionObserver -->
<!--                                                              -->
<!-- Consequence of NOT cleaning up:                               -->
<!--   setInterval keeps firing even after component is gone       -->
<!--   ← tries to update unmounted component's refs               -->
<!--   ← memory leaks, ghost updates in devtools                  -->
<!--                                                              -->
<!-- Alternative: useEventListener composable auto-cleans up      -->
<!--   ← onUnmounted inside composable binds to same component    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- watch — source forms                                         -->
<!--                                                              -->
<!-- 1. Single ref:                                               -->
<!--   watch(myRef, (newVal, oldVal) => { ... })                  -->
<!--                                                              -->
<!-- 2. Getter function (computed value, route param, object prop):-->
<!--   watch(() => route.params.id, (newId) => fetchBooking(newId))-->
<!--   ← MUST be a function for non-ref sources                   -->
<!--   ← watch(route.params.id, ...) ← WRONG: watches static value-->
<!--                                                              -->
<!-- 3. Multiple sources (fires when ANY changes):                -->
<!--   watch([page, perPage], ([newPage, newPerPage]) => { ... }) -->
<!--   ← destructure new values from first arg, old from second   -->
<!--                                                              -->
<!-- 4. Reactive object — deep or snapshot:                       -->
<!--   watch(filters, handler, { deep: true })                    -->
<!--   watch(() => ({ ...filters }), handler)  ← snapshot getter  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- watch options                                                -->
<!--                                                              -->
<!-- immediate: true                                              -->
<!--   ← run callback immediately on setup (not just on change)  -->
<!--   ← equivalent to: handler(currentValue) + watch(...)        -->
<!--   ← common pattern: watch(id, fetchById, { immediate: true })-->
<!--                                                              -->
<!-- deep: true                                                    -->
<!--   ← traverse all nested properties of object/array           -->
<!--   ← fires when ANY nested value changes                      -->
<!--   ← can be expensive on large objects                        -->
<!--                                                              -->
<!-- once: true (Vue 3.4+)                                        -->
<!--   ← auto-stop after first trigger                            -->
<!--   ← watch(isLoaded, initLib, { once: true, immediate: true })-->
<!--                                                              -->
<!-- flush: 'pre' (default) | 'post' | 'sync'                    -->
<!--   pre:  runs before DOM update (stale DOM)                   -->
<!--   post: runs after DOM update (can read updated DOM)         -->
<!--   sync: runs synchronously, no batching                      -->
<!--                                                              -->
<!-- stop = watch(...)  ← call stop() to manually unsubscribe     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- watchEffect — auto-tracked, runs immediately                 -->
<!--                                                              -->
<!-- watchEffect(() => {                                           -->
<!--   document.title = `${bookings.value.length} — Tripz`        -->
<!-- })                                                            -->
<!-- ← reads bookings.value → tracked automatically               -->
<!-- ← runs immediately, re-runs when bookings changes            -->
<!-- ← no source array needed                                     -->
<!--                                                              -->
<!-- Cleanup with onCleanup parameter:                             -->
<!-- watchEffect(async (onCleanup) => {                            -->
<!--   const ctrl = new AbortController()                         -->
<!--   onCleanup(() => ctrl.abort())  ← register cleanup          -->
<!--   const res = await fetch(url, { signal: ctrl.signal })      -->
<!--   data.value = await res.json()                              -->
<!-- })                                                            -->
<!-- ← onCleanup fires BEFORE next run or on unmount              -->
<!-- ← aborts stale request before new fetch starts               -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- watch vs watchEffect — decision guide                        -->
<!--                                                              -->
<!-- USE watch WHEN:                                               -->
<!--   ← you need old value AND new value (oldVal, newVal)        -->
<!--   ← you want lazy (not immediate) by default                 -->
<!--   ← you need explicit control: only THIS ref triggers        -->
<!--   ← you want to stop the watcher manually                    -->
<!--                                                              -->
<!-- USE watchEffect WHEN:                                         -->
<!--   ← you want the effect to run immediately                   -->
<!--   ← you read multiple reactive sources inside                -->
<!--   ← you don't need old value                                 -->
<!--   ← cleanup is needed (onCleanup is cleaner than watch+stop) -->
<!--                                                              -->
<!-- watchPostEffect (alias for flush:'post') — after DOM update  -->
<!-- watchSyncEffect (alias for flush:'sync') — synchronous       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- nextTick — wait for DOM update after state change           -->
<!--                                                              -->
<!-- WHY: Vue batches DOM updates asynchronously                  -->
<!--   state.value = 'new'     ← schedules DOM update             -->
<!--   el.value.textContent    ← still shows OLD value            -->
<!--   await nextTick()        ← wait for flush                   -->
<!--   el.value.textContent    ← now shows 'new'                  -->
<!--                                                              -->
<!-- Pattern 1: focus after v-if renders                          -->
<!--   showForm.value = true                                       -->
<!--   await nextTick()                                           -->
<!--   inputRef.value?.focus()  ← input now exists in DOM        -->
<!--                                                              -->
<!-- Pattern 2: scroll to newly rendered item                     -->
<!--   items.value.unshift(newItem)                               -->
<!--   await nextTick()                                           -->
<!--   newItemRef.value?.scrollIntoView({ behavior: 'smooth' })  -->
<!--                                                              -->
<!-- Pattern 3: DOM measurement after data change                 -->
<!--   chartData.value = newData                                  -->
<!--   await nextTick()                                           -->
<!--   chart.resize()  ← chart reads updated container dimensions -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- onUpdated — post-DOM-patch hook                              -->
<!--                                                              -->
<!-- Fires after every reactive-change-triggered DOM patch        -->
<!--                                                              -->
<!-- ✅ Use for: sync non-Vue libraries after Vue re-renders      -->
<!--   onUpdated(() => {                                           -->
<!--     sortableInstance?.sort([...items.value.map(i => i.id)])  -->
<!--   })                                                          -->
<!--                                                              -->
<!-- ❌ DON'T mutate reactive state inside onUpdated:             -->
<!--   onUpdated(() => { count.value++ })  ← infinite loop        -->
<!--   ← mutation triggers update → onUpdated → mutation → ...   -->
<!--                                                              -->
<!-- Prefer watchPostEffect for most post-render work:            -->
<!--   watchPostEffect(() => { ... })  ← more explicit about deps -->
<!-- ============================================================ -->
