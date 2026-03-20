<!-- ============================================================ -->
<!-- VUE_TEST_10 — Solution 01                                   -->
<!-- Vue vs React: Reactivity · Component Model · Props/Emits    -->
<!-- v-model · computed vs useMemo · watch vs useEffect          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 1: REACTIVITY SYSTEM — AUTO-TRACK vs useState       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue reactivity — Proxy-based automatic tracking             -->
<!--                                                              -->
<!-- PRIMITIVES: ref()                                            -->
<!--   const search    = ref('')         ← string                 -->
<!--   const count     = ref(0)          ← number                 -->
<!--   const isLoading = ref(false)      ← boolean                -->
<!--   const booking   = ref<Booking | null>(null)  ← nullable    -->
<!--   ← read/write via .value in <script setup>                  -->
<!--   ← template reads automatically (no .value in template)     -->
<!--                                                              -->
<!-- OBJECTS: reactive()                                          -->
<!--   const filters = reactive({                                 -->
<!--     status:   '' as Booking['status'] | '',                  -->
<!--     search:   '',                                             -->
<!--     dateFrom: '',                                             -->
<!--   })                                                          -->
<!--   ← direct mutation: filters.status = 'pending'             -->
<!--   ← Vue Proxy intercepts the write and notifies dependents  -->
<!--   ← NO setter function, NO immutable spread required        -->
<!--                                                              -->
<!-- HOW VUE TRACKS:                                              -->
<!--   1. Vue wraps reactive data in ES Proxy                     -->
<!--   2. When computed/watchEffect/watch runs, it records every  -->
<!--      .value access via the Proxy getter trap                 -->
<!--   3. When data changes, Proxy setter trap fires              -->
<!--   4. Vue notifies ALL recorded dependents to re-run          -->
<!--   ← No dependency array. No stale closure risk.             -->
<!--   ← Tracking is per-access at runtime, not per-component    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React equivalent — useState + manual dependency arrays       -->
<!--                                                              -->
<!-- PRIMITIVES: useState()                                        -->
<!--   const [search,   setSearch]   = useState('')               -->
<!--   const [count,    setCount]    = useState(0)                -->
<!--   const [booking,  setBooking]  = useState<Booking|null>(null)-->
<!--   ← destructured [value, setter] pair                        -->
<!--   ← MUST use setter to trigger re-render                     -->
<!--   ← direct mutation (booking.status = 'paid') = silent bug  -->
<!--                                                              -->
<!-- OBJECTS: useState with immutable update                       -->
<!--   const [filters, setFilters] = useState({                  -->
<!--     status: '', search: '', dateFrom: '',                    -->
<!--   })                                                          -->
<!--   ← update: setFilters(prev => ({ ...prev, status: 'paid' }))-->
<!--   ← spread clones the object: React checks reference equality-->
<!--   ← same reference = no re-render (direct mutation missed)  -->
<!--                                                              -->
<!-- OBJECT WITH REDUCER: useReducer()                            -->
<!--   const [state, dispatch] = useReducer(reducer, initialState)-->
<!--   dispatch({ type: 'SET_FILTER', payload: 'pending' })       -->
<!--   ← for complex state with many transitions                  -->
<!--   ← reducer: (state, action) => newState (must return new obj)-->
<!--   ← Vue equivalent: reactive() + direct mutation — simpler   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 2: computed vs useMemo                               -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue computed — lazy, auto-tracked, cached                   -->
<!--                                                              -->
<!-- const filtered = computed(() =>                              -->
<!--   bookings.value.filter(b =>                                 -->
<!--     b.destination.toLowerCase().includes(search.value.toLowerCase()) -->
<!--   )                                                           -->
<!-- )                                                             -->
<!-- ← reads bookings.value AND search.value inside the getter   -->
<!-- ← Vue's Proxy records both as dependencies automatically     -->
<!-- ← result is cached: access filtered.value 100× = 1 compute  -->
<!-- ← invalidated when EITHER dependency changes                 -->
<!-- ← lazy: not computed until first access (not on setup)       -->
<!--                                                              -->
<!-- WRITABLE computed — has both getter and setter:              -->
<!--   const fullName = computed({                                -->
<!--     get:  () => `${first.value} ${last.value}`,              -->
<!--     set:  (val) => {                                          -->
<!--       [first.value, last.value] = val.split(' ')             -->
<!--     },                                                        -->
<!--   })                                                          -->
<!--   fullName.value = 'Jane Smith'  ← triggers setter          -->
<!--                                                              -->
<!-- COMPUTED FROM PROPS — auto-tracks prop changes:              -->
<!--   const statusColour = computed(() => colourMap[props.booking.status]) -->
<!--   ← when parent passes a new booking with different status,  -->
<!--     statusColour recomputes automatically                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React useMemo — manual deps, runs immediately                -->
<!--                                                              -->
<!-- const filtered = useMemo(                                    -->
<!--   () => bookings.filter(b =>                                  -->
<!--     b.destination.toLowerCase().includes(search.toLowerCase())-->
<!--   ),                                                           -->
<!--   [bookings, search]   ← must list EVERY value read inside   -->
<!-- )                                                             -->
<!-- ← missing a dep: stale cached value (silent bug)            -->
<!-- ← extra dep: unnecessary recomputation (performance waste)   -->
<!-- ← eslint-plugin-react-hooks/exhaustive-deps warns but misses -->
<!--   indirect dependencies via closures                         -->
<!--                                                              -->
<!-- RUNS ON MOUNT: unlike Vue computed (lazy), useMemo always    -->
<!--   runs immediately on first render                           -->
<!--                                                              -->
<!-- NOT EQUIVALENT TO COMPUTED IN ALL CASES:                     -->
<!--   useMemo does NOT support a setter — use useState alongside  -->
<!--   ← for computed + setter pattern, use controlled state:     -->
<!--     const [fullName, setFullName] = useState('')             -->
<!--     const [first, last] = useMemo(() => fullName.split(' '), [fullName]) -->
<!--                                                              -->
<!-- RULES OF HOOKS: must call useMemo at top level of component  -->
<!--   ← not inside conditions, loops, or nested functions        -->
<!--   ← Vue computed has no such restriction                      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 3: watch vs useEffect                                -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue watch — explicit source, lazy, old+new values            -->
<!--                                                              -->
<!-- SINGLE REF:                                                   -->
<!--   watch(search, (newVal, oldVal) => {                        -->
<!--     console.log(`"${oldVal}" → "${newVal}"`)                 -->
<!--   })                                                          -->
<!--   ← does NOT run on setup (lazy by default)                  -->
<!--   ← BOTH old and new value available automatically           -->
<!--                                                              -->
<!-- GETTER (for non-ref reactive / object property):             -->
<!--   watch(() => route.params.id, async (newId) => {            -->
<!--     await store.fetchBooking(Number(newId))                   -->
<!--   }, { immediate: true })                                     -->
<!--   ← immediate: true = run once on setup with current value   -->
<!--   ← MUST use getter function — not: watch(route.params.id)   -->
<!--     (would watch the static value, not reactive access)       -->
<!--                                                              -->
<!-- MULTIPLE SOURCES:                                             -->
<!--   watch([page, perPage], ([newP, newPP], [oldP, oldPP]) => { -->
<!--     store.fetch({ page: newP, perPage: newPP })              -->
<!--   })                                                          -->
<!--   ← fires when ANY of the listed sources changes             -->
<!--   ← old values also destructured from second arg             -->
<!--                                                              -->
<!-- OPTIONS:                                                      -->
<!--   { immediate: true }  ← run now with current value          -->
<!--   { deep: true }       ← traverse nested object properties   -->
<!--   { once: true }       ← auto-stop after first trigger (3.4+)-->
<!--   { flush: 'post' }    ← run after DOM update (read DOM refs)-->
<!--                                                              -->
<!-- CLEANUP: Vue 3.5+ onWatcherCleanup inside watch callback:    -->
<!--   watch(bookingId, async (newId) => {                        -->
<!--     const ctrl = new AbortController()                       -->
<!--     onWatcherCleanup(() => ctrl.abort())  ← inline cleanup   -->
<!--     const data = await fetch(`/api/${newId}`, { signal: ctrl.signal }) -->
<!--   })                                                          -->
<!--   ← cleanup fires before next watch invocation or on unmount -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React useEffect — runs after render, manual deps             -->
<!--                                                              -->
<!-- MOUNT ONLY (empty deps):                                     -->
<!--   useEffect(() => {                                          -->
<!--     store.fetchBookings()                                     -->
<!--   }, [])                                                      -->
<!--   ← equivalent to Vue's onMounted (but after render, not sync)-->
<!--                                                              -->
<!-- WATCH SPECIFIC VALUE:                                         -->
<!--   useEffect(() => {                                           -->
<!--     fetchBooking(Number(id))                                  -->
<!--   }, [id])                                                    -->
<!--   ← runs on mount AND every time id changes                  -->
<!--   ← Vue equivalent: watch(id, fetchBooking, { immediate: true })-->
<!--   ← React always "immediate" — no lazy option by default    -->
<!--                                                              -->
<!-- CLEANUP — return function:                                    -->
<!--   useEffect(() => {                                           -->
<!--     const ctrl = new AbortController()                       -->
<!--     fetch(`/api/${id}`, { signal: ctrl.signal })             -->
<!--       .then(r => r.json()).then(setBooking)                   -->
<!--     return () => ctrl.abort()  ← cleanup = return value      -->
<!--   }, [id])                                                    -->
<!--   ← cleanup runs before next effect AND on unmount           -->
<!--   ← Vue watchEffect: cleanup is onCleanup callback parameter -->
<!--                                                              -->
<!-- NO OLD VALUE — must use useRef:                              -->
<!--   const prevId = useRef(id)                                  -->
<!--   useEffect(() => {                                           -->
<!--     console.log(`${prevId.current} → ${id}`)                 -->
<!--     prevId.current = id                                       -->
<!--   }, [id])                                                    -->
<!--   ← verbose — Vue provides old value natively in watch()     -->
<!--                                                              -->
<!-- AUTO-TRACKING (closest to watchEffect):                      -->
<!--   useEffect(() => {                                           -->
<!--     document.title = `${count} bookings — ${filter}`         -->
<!--   }, [count, filter])  ← must list manually                  -->
<!--   ← missing dep = effect reads stale value (silent bug)     -->
<!--   ← Vue watchEffect auto-tracks: no list, no bug risk        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 4: COMPONENT MODEL — SFC vs JSX                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue SFC (.vue) — template + script + style separation        -->
<!--                                                              -->
<!-- THREE BLOCKS:                                                 -->
<!--   <script setup lang="ts">  ← logic (Composition API)       -->
<!--   <template>                ← HTML-like markup with directives-->
<!--   <style scoped>            ← CSS scoped to this component   -->
<!--                                                              -->
<!-- TEMPLATE ADVANTAGES:                                          -->
<!--   ← Familiar to HTML/PHP/Blade devs (Tripz team background) -->
<!--   ← Compiler optimisations: static nodes hoisted, patched only-->
<!--   ← Directives read as attributes (v-if, v-for, v-model)    -->
<!--   ← Editor tooling: Volar highlights, auto-complete, type-check-->
<!--                                                              -->
<!-- DIRECTIVES vs JSX EXPRESSIONS:                               -->
<!--   CONDITIONAL:                                               -->
<!--     Vue:   <div v-if="show">  <div v-else>                   -->
<!--     React: {show && <div>}   {show ? <A/> : <B/>}           -->
<!--     ← Vue: removed from DOM when false                       -->
<!--     ← v-show: toggles display:none (stays in DOM)            -->
<!--                                                              -->
<!--   LIST:                                                       -->
<!--     Vue:   <li v-for="item in items" :key="item.id">         -->
<!--     React: {items.map(item => <li key={item.id}>)}           -->
<!--     ← Vue: directive attribute approach, key enforced by lint -->
<!--     ← React: JS .map() call, key easy to forget              -->
<!--                                                              -->
<!--   TWO-WAY:                                                    -->
<!--     Vue:   <input v-model="search" />  (one directive)       -->
<!--     React: <input value={s} onChange={e => setS(e.target.value)} />-->
<!--     ← Vue: one directive handles read + write                 -->
<!--     ← React: always two attributes — explicit but verbose    -->
<!--                                                              -->
<!--   EVENT MODIFIERS:                                            -->
<!--     Vue:   @click.stop  @submit.prevent  @keyup.enter        -->
<!--     React: onClick={e => { e.stopPropagation(); ... }}       -->
<!--     ← Vue modifiers eliminate boilerplate in handlers        -->
<!--                                                              -->
<!--   CLASS BINDING:                                              -->
<!--     Vue:   :class="{ active: isActive, 'text-red': hasError }"-->
<!--     React: className={`base ${isActive ? 'active' : ''}`}    -->
<!--     ← Vue: object/array syntax built into :class binding     -->
<!--     ← React: template literal or clsx() library              -->
<!--                                                              -->
<!-- SCOPED STYLES:                                                -->
<!--   <style scoped> → Vue adds data-v-[hash] attribute to DOM   -->
<!--   .card { } → compiled to .card[data-v-abc123] { }           -->
<!--   ← styles cannot leak to child components                   -->
<!--   React: no built-in scoped styles                           -->
<!--   ← CSS Modules: import styles from './Card.module.css'       -->
<!--   ← styled-components / Emotion: CSS-in-JS                   -->
<!--   ← Tailwind: utility classes eliminate scoping need         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React JSX — JavaScript with HTML-like syntax                 -->
<!--                                                              -->
<!-- ONE FILE: logic + markup interleaved in .tsx                 -->
<!--   ← function body holds state, effects, derived values        -->
<!--   ← return() block holds the JSX (markup)                    -->
<!--   ← no separation of concerns by file type                   -->
<!--                                                              -->
<!-- JSX RULES:                                                    -->
<!--   ← className not class (class is a JS reserved word)       -->
<!--   ← htmlFor not for                                           -->
<!--   ← camelCase event names: onClick, onChange, onSubmit       -->
<!--   ← self-close all tags: <input />  <br />  <Component />   -->
<!--   ← JS expressions inside {}: {count} {isActive ? 'y' : 'n'}-->
<!--   ← comments: {/* like this */}                              -->
<!--                                                              -->
<!-- FRAGMENTS: no wrapper div needed                              -->
<!--   return (<>  <Component />  <Component />  </>)             -->
<!--   ← Vue: <template> can have multiple root elements (Vue 3+) -->
<!--                                                              -->
<!-- ADVANTAGES OF JSX:                                            -->
<!--   ← Full JS power: any expression valid                       -->
<!--   ← Easier to extract components (just extract a function)  -->
<!--   ← TypeScript types flow naturally through JSX              -->
<!--   ← Testing: same paradigm as runtime (no template compiler) -->
<!--                                                              -->
<!-- DISADVANTAGES OF JSX:                                         -->
<!--   ← More verbose conditionals (no v-if shorthand)           -->
<!--   ← .map() for lists noisier than v-for                      -->
<!--   ← No built-in event modifiers → handler verbosity          -->
<!--   ← Higher learning curve for HTML-first developers          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 5: PROPS/EMITS vs FUNCTION PROPS/CALLBACKS           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue: defineProps + defineEmits — typed, reactive props        -->
<!--                                                              -->
<!-- DEFINEPROPS (TypeScript generic):                            -->
<!--   const props = defineProps<{                                -->
<!--     booking:  Booking                                        -->
<!--     selected?: boolean                                       -->
<!--     variant?: 'compact' | 'full'                            -->
<!--   }>()                                                        -->
<!--   ← no runtime overhead — TypeScript only                    -->
<!--   ← optional props: append ? to the key                     -->
<!--                                                              -->
<!-- WITHDEFAULTS (required for defaults with generic defineProps):-->
<!--   const props = withDefaults(defineProps<{                   -->
<!--     selected?: boolean                                       -->
<!--     variant?:  'compact' | 'full'                            -->
<!--   }>(), {                                                     -->
<!--     selected: false,                                         -->
<!--     variant:  'full',                                        -->
<!--   })                                                          -->
<!--                                                              -->
<!-- DEFINEEMITS (typed event contracts):                          -->
<!--   const emit = defineEmits<{                                 -->
<!--     (e: 'action', action: 'confirm' | 'cancel', id: number): void -->
<!--     (e: 'select', id: number): void                          -->
<!--     (e: 'close'): void                                       -->
<!--   }>()                                                        -->
<!--   emit('action', 'confirm', booking.id)                      -->
<!--   ← events declared separately from props — clear distinction-->
<!--   ← parent listens: @action="handleAction"                   -->
<!--                                                              -->
<!-- DEFINEMODEL (Vue 3.4+) — replaces modelValue + emit pattern: -->
<!--   const modelValue = defineModel<string>({ required: true }) -->
<!--   const count      = defineModel<number>('count', { default: 0 })-->
<!--   modelValue.value = 'new value'  ← auto-emits update:modelValue-->
<!--   ← parent: <MyInput v-model="search" v-model:count="qty" /> -->
<!--                                                              -->
<!-- REACTIVITY OF PROPS:                                          -->
<!--   props.booking.status inside computed → auto-tracked        -->
<!--   ← when parent passes new booking, computed re-evaluates    -->
<!--   ← destructuring loses reactivity:                          -->
<!--     const { booking } = props  ← booking is now static      -->
<!--     toRef(props, 'booking')    ← preserves reactivity        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React: function props + callback pattern                      -->
<!--                                                              -->
<!-- PROPS = FUNCTION PARAMETERS:                                  -->
<!--   interface BookingCardProps {                               -->
<!--     booking:  Booking                                        -->
<!--     selected?: boolean                                       -->
<!--     onAction: (action: string, id: number) => void  ← callback-->
<!--     onSelect: (id: number) => void                  ← callback-->
<!--   }                                                           -->
<!--   function BookingCard({ booking, selected = false, onAction, onSelect }: BookingCardProps) -->
<!--   ← events and props are ALL props — no separate emit system -->
<!--   ← naming convention: on + PascalCase for callback props    -->
<!--                                                              -->
<!-- NO REACTIVITY WRAPPER:                                        -->
<!--   booking.status → plain JS property access                  -->
<!--   ← no Proxy, no tracking                                    -->
<!--   ← if parent re-renders with new booking, React passes new  -->
<!--     object reference → component re-renders                  -->
<!--   ← no computed equivalent: use useMemo with [booking] dep   -->
<!--                                                              -->
<!-- CHILDREN PROP — implicit slot equivalent:                     -->
<!--   interface CardProps { children: React.ReactNode }          -->
<!--   function Card({ children }: CardProps) {                   -->
<!--     return <div className="card">{children}</div>             -->
<!--   }                                                           -->
<!--   ← Vue: <slot /> in template, parent puts content between tags-->
<!--   ← React: children is a prop — same pattern, different syntax-->
<!--                                                              -->
<!-- RENDER PROPS — named slot equivalent:                         -->
<!--   interface TableProps<T> {                                  -->
<!--     data:       T[]                                           -->
<!--     renderRow:  (item: T) => React.ReactNode                 -->
<!--     renderHeader: () => React.ReactNode                      -->
<!--   }                                                           -->
<!--   ← Vue equivalent: named slots <slot name="header" />       -->
<!--   ← render props: more explicit, TypeScript-friendly         -->
<!--   ← Vue slots: cleaner template syntax for consumers         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 6: v-model vs CONTROLLED INPUTS                      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue v-model — one directive, two-way binding                 -->
<!--                                                              -->
<!-- PRIMITIVE VALUES:                                             -->
<!--   <input v-model="search" type="text" />                    -->
<!--   ← shorthand for: :value="search" @input="search = $event.target.value"-->
<!--                                                              -->
<!-- MODIFIERS:                                                    -->
<!--   v-model.trim     ← auto-trim whitespace on write          -->
<!--   v-model.number   ← auto-coerce string → number (parseFloat)-->
<!--   v-model.lazy     ← sync on 'change' event (on blur) not 'input'-->
<!--   ← stacking: v-model.trim.lazy                              -->
<!--                                                              -->
<!-- SELECT / CHECKBOX / RADIO:                                    -->
<!--   <select v-model="status">                                  -->
<!--   <input type="checkbox" v-model="isConfirmed" />            -->
<!--   <input type="radio" v-model="role" value="admin" />        -->
<!--   ← v-model adapts automatically to input type              -->
<!--                                                              -->
<!-- OBJECT PROPERTY:                                              -->
<!--   const form = reactive({ name: '', count: 0 })              -->
<!--   <input v-model="form.name" />                              -->
<!--   <input v-model.number="form.count" type="number" />        -->
<!--   ← Vue Proxy tracks the nested write automatically          -->
<!--                                                              -->
<!-- CUSTOM COMPONENT:                                             -->
<!--   <DatePicker v-model="form.tripDate" />                     -->
<!--   ← component must accept: props.modelValue                  -->
<!--     and emit: emit('update:modelValue', newDate)             -->
<!--   ← or use defineModel() inside the component (Vue 3.4+)    -->
<!--                                                              -->
<!-- FORM ARRAY (v-for + v-model):                                -->
<!--   <input v-for="(item, i) in items" :key="i"                -->
<!--          v-model="items[i].name" />                          -->
<!--   ← each input binds to its array slot directly             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React controlled inputs — value + onChange everywhere         -->
<!--                                                              -->
<!-- EVERY INPUT NEEDS TWO ATTRIBUTES:                            -->
<!--   <input value={search} onChange={e => setSearch(e.target.value)} />-->
<!--   ← value: what to display (controlled by state)             -->
<!--   ← onChange: how to update state when user types            -->
<!--                                                              -->
<!-- NO MODIFIER SYSTEM — handle manually in onChange:            -->
<!--   Trim:   onChange={e => setVal(e.target.value.trim())}      -->
<!--   Number: onChange={e => setVal(Number(e.target.value))}     -->
<!--   Lazy:   use onBlur instead of onChange                     -->
<!--           <input defaultValue={val} onBlur={e => setVal(e.target.value)} />-->
<!--                                                              -->
<!-- OBJECT STATE — must spread (immutable update):               -->
<!--   <input                                                      -->
<!--     value={form.schoolName}                                  -->
<!--     onChange={e => setForm(prev => ({                        -->
<!--       ...prev,                                               -->
<!--       schoolName: e.target.value                             -->
<!--     }))}                                                      -->
<!--   />                                                          -->
<!--   ← every field needs its own spread update                  -->
<!--   ← helper: const field = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))-->
<!--                                                              -->
<!-- UNCONTROLLED INPUT — defaultValue (no state binding):        -->
<!--   <input defaultValue="initial" ref={inputRef} />            -->
<!--   ← React doesn't control the value — DOM owns it           -->
<!--   ← read via ref.current.value on submit                    -->
<!--   ← react-hook-form uses this pattern for performance        -->
<!--                                                              -->
<!-- ARRAY OF INPUTS:                                              -->
<!--   {items.map((item, i) => (                                  -->
<!--     <input key={i}                                           -->
<!--       value={item.name}                                      -->
<!--       onChange={e => setItems(prev => prev.map((it, j) =>   -->
<!--         j === i ? { ...it, name: e.target.value } : it      -->
<!--       ))}                                                     -->
<!--     />                                                        -->
<!--   ))}                                                         -->
<!--   ← much more verbose than Vue's v-for + v-model approach    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 7: KEY INTERVIEW COMPARISON POINTS                   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Reactivity — the most important conceptual difference         -->
<!--                                                              -->
<!-- VUE: "Pull" dependency tracking at runtime                   -->
<!--   ← Vue READS what you access and tracks it                  -->
<!--   ← Changes PUSH notifications to dependents                 -->
<!--   ← Developer writes: const x = computed(() => a.value + b.value)-->
<!--   ← Vue does the rest: tracks a and b, updates x when needed -->
<!--                                                              -->
<!-- REACT: "Push" state updates trigger re-renders               -->
<!--   ← Developer calls setState/setter to signal change         -->
<!--   ← React schedules re-render from that component down       -->
<!--   ← Developer must PREVENT unnecessary re-renders manually   -->
<!--   ← React Compiler (v19) attempts to automate memoisation    -->
<!--                                                              -->
<!-- CONSEQUENCE: Vue requires LESS explicit optimisation          -->
<!--   ← Most Vue apps need no React.memo equivalent              -->
<!--   ← React apps in complex trees REQUIRE memo/useMemo/useCallback-->
<!--                                                              -->
<!-- CONSEQUENCE: React data flow is MORE visible                  -->
<!--   ← Every state change is an explicit setter call            -->
<!--   ← Easier to trace: where does this re-render come from?   -->
<!--   ← Vue's Proxy tracking can be opaque in debugging          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Template vs JSX — team and project fit                        -->
<!--                                                              -->
<!-- TEMPLATE (Vue SFC) better for:                               -->
<!--   ← HTML/backend dev background (Blade, PHP, Laravel team)  -->
<!--   ← Forms-heavy apps (v-model + modifiers reduce boilerplate)-->
<!--   ← Smaller teams: less framework knowledge needed           -->
<!--   ← Tripz: Laravel + Inertia + Vue is a curated stack        -->
<!--                                                              -->
<!-- JSX (React) better for:                                       -->
<!--   ← JS-native developers: everything is JS                  -->
<!--   ← Complex conditional rendering: full expression power     -->
<!--   ← Refactoring components: extract function = extract component-->
<!--   ← TypeScript type flow: JSX types checked exactly like TS  -->
<!--   ← Testing: no template compiler in test — direct function call-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Props/Emits vs function callbacks — API contract style        -->
<!--                                                              -->
<!-- VUE: defineEmits separates INPUTS (props) from OUTPUTS (emits)-->
<!--   ← component's interface is: "what I receive" + "what I emit"-->
<!--   ← parent uses: :prop="value" and @event="handler"         -->
<!--   ← emits are typed independently: clear contract per event  -->
<!--   ← Vue validates: emitting an undeclared event = warning    -->
<!--                                                              -->
<!-- REACT: callbacks are just props with 'on' prefix convention  -->
<!--   ← everything flows in one direction: parent → child via props-->
<!--   ← child "emits" by calling the callback prop               -->
<!--   ← no runtime validation: wrong callback name = no error   -->
<!--   ← refactoring: rename a prop and update all call sites     -->
<!-- ============================================================ -->
