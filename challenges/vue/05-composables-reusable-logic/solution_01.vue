<!-- ============================================================ -->
<!-- Problem 01 — Vue Composables: Core Patterns                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- What is a composable                                         -->
<!--                                                              -->
<!-- Function that:                                               -->
<!--   1. Starts with 'use' (convention enforced by linters)      -->
<!--   2. Uses Composition API internally (ref, watch, onMounted) -->
<!--   3. Returns reactive state and/or functions                 -->
<!--   4. Must be called in <script setup> or another composable  -->
<!--      ← NOT in event handlers, onMounted, or conditionals    -->
<!--                                                              -->
<!-- Why: extract logic that's used across multiple components    -->
<!--   ← keeps components thin                                    -->
<!--   ← logic is independently testable                          -->
<!--   ← reactive state travels with the logic                   -->
<!--                                                              -->
<!-- Vue's equivalent of React custom hooks                       -->
<!--   ← same rules: call at top level, not conditionally         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useFetch<T> — generic data fetching                          -->
<!--                                                              -->
<!-- Returns: { data, isLoading, error, refresh }                 -->
<!--                                                              -->
<!-- url: MaybeRefOrGetter<string>                                 -->
<!--   ← accepts plain string, ref<string>, or computed           -->
<!--   ← toValue(url) unwraps it to a plain string at call time  -->
<!--                                                              -->
<!-- State:                                                        -->
<!--   data      = ref<T | null>(null)                            -->
<!--   isLoading = ref(false)                                     -->
<!--   error     = ref<string | null>(null)                       -->
<!--                                                              -->
<!-- AbortController pattern:                                      -->
<!--   controller?.abort()  ← cancel previous request            -->
<!--   controller = new AbortController()                         -->
<!--   fetch(url, { signal: controller.signal })                  -->
<!--   catch AbortError → return silently (not a real error)      -->
<!--                                                              -->
<!-- watchEffect re-runs when url (if reactive) changes:          -->
<!--   watchEffect((onCleanup) => {                               -->
<!--     fetchData()                                               -->
<!--     onCleanup(() => controller?.abort())                     -->
<!--   })                                                          -->
<!--   ← onCleanup: runs before next effect OR on unmount         -->
<!--   ← auto-cancels in-flight request when url changes          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- toValue() — unwrap MaybeRefOrGetter                          -->
<!--                                                              -->
<!-- import { toValue, type MaybeRefOrGetter } from 'vue'         -->
<!--                                                              -->
<!-- toValue('/api/bookings')         → '/api/bookings'           -->
<!-- toValue(ref('/api/bookings'))    → '/api/bookings'           -->
<!-- toValue(() => '/api/bookings')   → '/api/bookings'           -->
<!-- toValue(computed(() => '/api/'+id.value)) → resolved string  -->
<!--                                                              -->
<!-- ← lets callers pass static string or reactive ref/computed   -->
<!-- ← composable doesn't need to know which form it received     -->
<!-- ← watchEffect auto-tracks computed inside toValue()          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useDebounce — delayed reactive value                          -->
<!--                                                              -->
<!-- useDebounce<T>(source: Ref<T>, delay = 300): Ref<T>          -->
<!--                                                              -->
<!-- State:                                                        -->
<!--   const debounced = ref<T>(source.value)                     -->
<!--   let timer: ReturnType<typeof setTimeout>                   -->
<!--                                                              -->
<!-- Watch source → clear previous timer → set new timer:         -->
<!--   watch(source, (newValue) => {                              -->
<!--     clearTimeout(timer)                                       -->
<!--     timer = setTimeout(() => { debounced.value = newValue }, delay)-->
<!--   })                                                          -->
<!--                                                              -->
<!-- Cleanup: onUnmounted(() => clearTimeout(timer))              -->
<!--   ← prevent timer firing after component unmounts            -->
<!--                                                              -->
<!-- Usage pattern:                                                -->
<!--   const search   = ref('')           ← v-model target        -->
<!--   const debounced = useDebounce(search, 400)                 -->
<!--   const url = computed(() => `/api/bookings?q=${debounced.value}`)-->
<!--   useFetch(url)  ← re-fetches only 400ms after typing stops  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useLocalStorage<T> — persistent reactive state               -->
<!--                                                              -->
<!-- useLocalStorage<T>(key: string, defaultValue: T): Ref<T>     -->
<!--                                                              -->
<!-- Read on init:                                                  -->
<!--   const raw = localStorage.getItem(key)                      -->
<!--   return raw !== null ? JSON.parse(raw) : defaultValue        -->
<!--   ← wrap in try/catch: JSON.parse can throw on corrupt data  -->
<!--                                                              -->
<!-- Sync to storage on change:                                    -->
<!--   watch(storedValue, (v) => {                                -->
<!--     localStorage.setItem(key, JSON.stringify(v))             -->
<!--   }, { deep: true })                                          -->
<!--   ← deep: true to detect nested object mutations            -->
<!--   ← wrap setItem in try/catch: storage quota can throw       -->
<!--                                                              -->
<!-- Usage:                                                        -->
<!--   const filters = useLocalStorage('tripz:filters', {         -->
<!--     status: '', search: ''                                    -->
<!--   })                                                          -->
<!--   ← filters.value persists between page reloads              -->
<!--   ← v-model="filters.value.status" syncs to localStorage     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useToggle — boolean state helper                             -->
<!--                                                              -->
<!-- Returns: [state, toggle, set]                                -->
<!--   state  = ref(initial)                                      -->
<!--   toggle = () => { state.value = !state.value }              -->
<!--   set    = (v: boolean) => { state.value = v }               -->
<!--                                                              -->
<!-- Array return (not object):                                    -->
<!--   ← caller can rename: const [isOpen, toggleOpen] = useToggle()-->
<!--   ← destructure with rename, skip with comma:                -->
<!--     const [isLoading, , setLoading] = useToggle(false)       -->
<!--                                                              -->
<!-- Useful for: modals, dropdowns, mobile menus, loading states  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useEventListener — auto-cleaned event binding               -->
<!--                                                              -->
<!-- useEventListener(target, event, handler, options?)           -->
<!--                                                              -->
<!-- onMounted(()   => target.addEventListener(event, handler))   -->
<!-- onUnmounted(() => target.removeEventListener(event, handler))-->
<!--                                                              -->
<!-- ← lifecycle hooks work inside composables when called from   -->
<!--   <script setup> — they bind to the host component's lifecycle-->
<!--                                                              -->
<!-- Common uses:                                                  -->
<!--   useEventListener(window, 'scroll', handler)                -->
<!--   useEventListener(window, 'resize', handler)                -->
<!--   useEventListener(window, 'keydown', e => {                 -->
<!--     if (e.key === 'Escape') close()                          -->
<!--   })                                                          -->
<!--   useEventListener(document, 'click', closeOnOutsideClick)  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Lifecycle hooks inside composables                           -->
<!--                                                              -->
<!-- onMounted, onUnmounted, onBeforeUnmount work INSIDE          -->
<!-- composable functions — they register to the CALLING          -->
<!-- component's lifecycle (not globally)                         -->
<!--                                                              -->
<!-- ✅ Called from <script setup>:                                -->
<!--   const { data } = useFetch(url)  ← onMounted binds here    -->
<!--                                                              -->
<!-- ❌ Called from onMounted (already past setup phase):          -->
<!--   onMounted(() => { useFetch(url) })  ← onMounted inside    -->
<!--     composable does NOTHING here (no active component)        -->
<!--                                                              -->
<!-- ← Same rule as React hooks: call at top level of setup       -->
<!-- ============================================================ -->
