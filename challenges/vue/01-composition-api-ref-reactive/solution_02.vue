<!-- ============================================================ -->
<!-- Problem 02 — Vue vs React Comparison                        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Reactivity: automatic vs manual                             -->
<!--                                                              -->
<!-- VUE — dependencies tracked AUTOMATICALLY:                   -->
<!--   const search   = ref('')                                   -->
<!--   const bookings = ref<Booking[]>([])                       -->
<!--   const filtered = computed(() =>                           -->
<!--     bookings.value.filter(b =>                              -->
<!--       b.destination.toLowerCase().includes(search.value.toLowerCase()) -->
<!--     )                                                        -->
<!--   )                                                          -->
<!--   ← Vue reads search.value + bookings.value during computed  -->
<!--   ← tracks these reads automatically as dependencies        -->
<!--   ← search changes → filtered recomputes. No deps array.    -->
<!--                                                              -->
<!-- REACT — dependencies declared MANUALLY:                     -->
<!--   const filtered = useMemo(                                  -->
<!--     () => bookings.filter(b =>                              -->
<!--       b.destination.toLowerCase().includes(search.toLowerCase()) -->
<!--     ),                                                        -->
<!--     [bookings, search]  ← must list every dependency        -->
<!--   )                                                          -->
<!--   ← miss a dependency → stale closure bug                   -->
<!--   ← eslint-plugin-react-hooks warns but can't fully prevent -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Template vs JSX                                             -->
<!--                                                              -->
<!-- VUE: Single File Component (.vue)                            -->
<!--   <template> — declarative HTML with directives             -->
<!--     v-if="booking" — conditional (no ternary needed)        -->
<!--     v-for="b in list" :key="b.id" — list rendering          -->
<!--     :booking="b" — prop binding                             -->
<!--     @action="handler" — event binding                       -->
<!--     v-model="search" — two-way binding (one directive)      -->
<!--   ← familiar to HTML/PHP/backend devs                       -->
<!--   ← clear separation: template vs logic vs style            -->
<!--                                                              -->
<!-- REACT: JSX (JavaScript + HTML-like syntax)                  -->
<!--   {booking && <span>{booking.status}</span>} — conditional  -->
<!--   {list.map(b => <Card key={b.id} booking={b} />)} — list   -->
<!--   onChange={e => setSearch(e.target.value)} — controlled    -->
<!--   ← full JS power: any expression valid                     -->
<!--   ← more verbose: conditional and list rendering noisier    -->
<!--   ← template + logic + style can all be in same file        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- computed vs useMemo                                         -->
<!--                                                              -->
<!-- VUE computed():                                              -->
<!--   const formattedAmount = computed(() =>                    -->
<!--     new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }) -->
<!--       .format(props.booking.amount)                         -->
<!--   )                                                          -->
<!--   ← reruns when props.booking.amount changes (auto-tracked) -->
<!--   ← cached: reading .value many times doesn't recalculate  -->
<!--                                                              -->
<!-- REACT useMemo():                                             -->
<!--   const formattedAmount = useMemo(                           -->
<!--     () => new Intl.NumberFormat(...).format(booking.amount), -->
<!--     [booking.amount]   ← must list dependency               -->
<!--   )                                                          -->
<!--   ← same caching, but you manage the dependency array       -->
<!--                                                              -->
<!-- watch() vs useEffect():                                      -->
<!--                                                              -->
<!-- VUE watch():                                                  -->
<!--   let timer: ReturnType<typeof setTimeout>                   -->
<!--   watch(search, (newVal) => {                                 -->
<!--     clearTimeout(timer)                                      -->
<!--     timer = setTimeout(() => { debouncedSearch.value = newVal }, 300) -->
<!--   })                                                          -->
<!--   ← watch(source, callback) — explicit reactive source      -->
<!--   ← clear intent: "when search changes, do this"            -->
<!--   ← watchEffect(() => {...}) — like useEffect, auto-tracks  -->
<!--                                                              -->
<!-- REACT useEffect():                                            -->
<!--   useEffect(() => {                                           -->
<!--     const timer = setTimeout(() => setDebouncedSearch(search), 300) -->
<!--     return () => clearTimeout(timer)  ← cleanup function    -->
<!--   }, [search])                         ← dependency array   -->
<!--   ← cleanup returned as function (Vue: onWatcherCleanup())  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- defineProps vs interface Props + destructuring              -->
<!--                                                              -->
<!-- VUE defineProps:                                             -->
<!--   const props = defineProps<{                                -->
<!--     booking: Booking                                         -->
<!--     selected?: boolean                                       -->
<!--     variant?: 'compact' | 'full'                            -->
<!--   }>()                                                        -->
<!--   ← TypeScript generic: no runtime declaration needed       -->
<!--   ← access via props.booking (reactive — auto-tracked)      -->
<!--                                                              -->
<!--   With defaults:                                             -->
<!--   const props = withDefaults(defineProps<{ ... }>(), {       -->
<!--     selected: false,                                         -->
<!--     variant: 'full',                                         -->
<!--   })                                                          -->
<!--                                                              -->
<!-- REACT function props:                                        -->
<!--   function BookingCard({                                      -->
<!--     booking,                                                  -->
<!--     selected = false,   ← default inline                    -->
<!--     variant = 'full',                                        -->
<!--     onAction,                                                 -->
<!--   }: BookingCardProps) { ... }                               -->
<!--   ← props are just JS values, not reactive                  -->
<!--   ← default values inline in destructure                    -->
<!--   ← KEY: Vue props reactive → computed re-evaluates on change -->
<!--           React props = plain values → useMemo deps needed  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- v-model vs controlled inputs                                -->
<!--                                                              -->
<!-- VUE v-model (ONE directive, two-way):                        -->
<!--   <input v-model="search" />                                 -->
<!--   ← equivalent to: :value="search" @input="search = $event.target.value" -->
<!--                                                              -->
<!--   Modifiers:                                                  -->
<!--   <input v-model.number="count" type="number" />             -->
<!--     ← .number: auto-coerce to number                        -->
<!--   <input v-model.trim="name" />                              -->
<!--     ← .trim: auto-trim whitespace                           -->
<!--   <input v-model.lazy="search" />                            -->
<!--     ← .lazy: sync on 'change' not 'input'                   -->
<!--                                                              -->
<!--   On custom components:                                      -->
<!--   <BookingForm v-model="booking" />                          -->
<!--   ← :modelValue="booking" @update:modelValue="booking = $event" -->
<!--                                                              -->
<!-- REACT controlled input (TWO pieces always):                 -->
<!--   <input value={search} onChange={e => setSearch(e.target.value)} /> -->
<!--   ← explicit but verbose                                     -->
<!--   ← object update requires spread: {...prev, field: val}    -->
<!--   ← no modifier system — handle manually                    -->
<!--   ✅ explicit data flow easier to trace in large codebases  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- When to choose Vue vs React                                 -->
<!--                                                              -->
<!-- VUE — choose when:                                           -->
<!--   Team has HTML/backend (PHP/Laravel) background             -->
<!--   Forms-heavy app — v-model modifiers save boilerplate       -->
<!--   Smaller team, faster onboarding — less noise              -->
<!--   SFC keeps template + logic + styles cleanly together      -->
<!--   Official ecosystem (Pinia, Vue Router, Nuxt) is cohesive  -->
<!--   Laravel + Vue pairing (Inertia.js) — natural stack        -->
<!--                                                              -->
<!-- REACT — choose when:                                         -->
<!--   Larger ecosystem needed (more libraries, more answers)    -->
<!--   Team is JS-native — JSX feels natural                     -->
<!--   React Native for mobile — share logic between web + app   -->
<!--   Complex state machines — Redux/Zustand ecosystem richer   -->
<!--   Hiring: more React devs available globally                -->
<!--                                                              -->
<!-- Neither is "better" — both compile to same DOM operations   -->
<!--   Vue:   less boilerplate, gentler learning curve           -->
<!--   React: larger ecosystem, more explicit data flow          -->
<!--   Tripz: Laravel + Vue = classic stack, Inertia glues them  -->
<!-- ============================================================ -->
