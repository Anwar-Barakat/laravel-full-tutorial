<!-- ============================================================ -->
<!-- VUE_TEST_10 — Solution 02                                    -->
<!-- Vue vs React: State · Routing · Performance · TypeScript     -->
<!-- KeepAlive · Slots · provide/inject · Ecosystem · Decision    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 1: STATE MANAGEMENT — Pinia vs Zustand vs Redux      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Pinia (Vue) — setup syntax store                             -->
<!--                                                              -->
<!-- defineStore('id', setupFunction):                            -->
<!--   ← 'id' = unique store name (used in DevTools + persist)   -->
<!--   ← setupFunction = just like <script setup>                 -->
<!--   ← return object = public API (state, getters, actions)    -->
<!--                                                              -->
<!-- STATE: plain refs                                             -->
<!--   const bookings  = ref<Booking[]>([])                       -->
<!--   const isLoading = ref(false)                               -->
<!--   const error     = ref<string | null>(null)                 -->
<!--                                                              -->
<!-- GETTERS: computed values                                      -->
<!--   const confirmedBookings = computed(() =>                   -->
<!--     bookings.value.filter(b => b.status === 'confirmed')     -->
<!--   )                                                           -->
<!--   const totalRevenue = computed(() =>                        -->
<!--     bookings.value.reduce((sum, b) => sum + b.amount, 0)     -->
<!--   )                                                           -->
<!--   ← auto-cached, only recompute when bookings changes        -->
<!--                                                              -->
<!-- ACTIONS: direct async functions — no createAsyncThunk needed -->
<!--   async function fetchBookings() {                           -->
<!--     isLoading.value = true                                   -->
<!--     try {                                                     -->
<!--       const res = await fetch('/api/v1/bookings')            -->
<!--       bookings.value = await res.json()                      -->
<!--     } catch (e) {                                            -->
<!--       error.value = (e as Error).message                     -->
<!--     } finally {                                              -->
<!--       isLoading.value = false                                 -->
<!--     }                                                         -->
<!--   }                                                           -->
<!--   ← direct mutation (Vue Proxy) — no immutable pattern       -->
<!--   ← no action creators, no reducers, no dispatch             -->
<!--                                                              -->
<!-- USAGE IN COMPONENT:                                           -->
<!--   const store = useBookingStore()                             -->
<!--   const { bookings, isLoading, error } = storeToRefs(store)  -->
<!--   ← storeToRefs: preserves reactivity when destructuring     -->
<!--   ← actions NOT refs — destructure directly: const { fetch } = store-->
<!--   store.fetchBookings()                                       -->
<!--                                                              -->
<!-- STORE COMPOSITION: call another store inside an action:      -->
<!--   async function fetchBookings() {                           -->
<!--     const auth = useAuthStore()  ← call inside action        -->
<!--     headers: { Authorization: `Bearer ${auth.token}` }       -->
<!--   }                                                           -->
<!--   ← DO NOT call at module level (stores not registered yet)  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Zustand (React) — minimal, selector-based                    -->
<!--                                                              -->
<!-- create<StoreType>((set, get) => ({                           -->
<!--   bookings:  [] as Booking[],                                -->
<!--   isLoading: false,                                           -->
<!--   error:     null as string | null,                          -->
<!--                                                              -->
<!--   fetchBookings: async () => {                               -->
<!--     set({ isLoading: true, error: null })                    -->
<!--     try {                                                     -->
<!--       const bookings = await fetch('/api/v1/bookings').then(r => r.json())-->
<!--       set({ bookings, isLoading: false })                    -->
<!--     } catch (e) {                                            -->
<!--       set({ error: (e as Error).message, isLoading: false }) -->
<!--     }                                                         -->
<!--   },                                                          -->
<!-- }))                                                           -->
<!--                                                              -->
<!-- SET function: partial update (Immer built-in for deep):      -->
<!--   set({ isLoading: true })   ← merges partial state         -->
<!--   set(state => ({ bookings: [...state.bookings, newB] }))    -->
<!--                                                              -->
<!-- SELECTOR USAGE — prevents unnecessary re-renders:            -->
<!--   const bookings  = useBookingStore(s => s.bookings)         -->
<!--   const isLoading = useBookingStore(s => s.isLoading)        -->
<!--   ← component re-renders ONLY when selected slice changes    -->
<!--   ← without selector: re-renders on any store change         -->
<!--                                                              -->
<!-- DEVTOOLS: Zustand + Redux DevTools browser extension         -->
<!--   import { devtools } from 'zustand/middleware'              -->
<!--   create(devtools((set) => ({ ... })))                       -->
<!--                                                              -->
<!-- PERSIST MIDDLEWARE:                                           -->
<!--   import { persist } from 'zustand/middleware'               -->
<!--   ← localStorage sync with one middleware wrapper            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Redux Toolkit (React) — structured, verbose, powerful        -->
<!--                                                              -->
<!-- SLICE — combines reducer + action creators:                  -->
<!--   createSlice({                                              -->
<!--     name: 'bookings',                                        -->
<!--     initialState: { bookings: [], isLoading: false, error: null },-->
<!--     reducers: {                                              -->
<!--       setFilter: (state, action) => { state.status = action.payload }-->
<!--       ← Immer wraps state: looks mutable but produces new obj-->
<!--     },                                                        -->
<!--     extraReducers: (builder) => {                            -->
<!--       builder                                                -->
<!--         .addCase(fetchBookings.pending,   state => { state.isLoading = true })-->
<!--         .addCase(fetchBookings.fulfilled, (state, action) => {-->
<!--           state.isLoading = false                            -->
<!--           state.bookings  = action.payload                   -->
<!--         })                                                    -->
<!--         .addCase(fetchBookings.rejected, (state, action) => {-->
<!--           state.isLoading = false                            -->
<!--           state.error     = action.error.message ?? 'Failed'-->
<!--         })                                                    -->
<!--     },                                                        -->
<!--   })                                                          -->
<!--                                                              -->
<!-- ASYNC THUNK: createAsyncThunk('namespace/name', async fn):   -->
<!--   const fetchBookings = createAsyncThunk(                    -->
<!--     'bookings/fetchAll',                                     -->
<!--     async (_, { rejectWithValue }) => {                      -->
<!--       const res = await fetch('/api/v1/bookings')            -->
<!--       if (!res.ok) return rejectWithValue('Failed')          -->
<!--       return res.json()                                       -->
<!--     }                                                         -->
<!--   )                                                           -->
<!--                                                              -->
<!-- USAGE:                                                        -->
<!--   const dispatch  = useDispatch()                            -->
<!--   const bookings  = useSelector((s: RootState) => s.bookings.bookings)-->
<!--   dispatch(fetchBookings())                                   -->
<!--   dispatch(setFilter('pending'))                             -->
<!--                                                              -->
<!-- RTK QUERY — server state with caching (no Pinia equivalent):  -->
<!--   const api = createApi({ baseQuery: fetchBaseQuery({ baseUrl: '/api' }),-->
<!--     endpoints: (build) => ({                                 -->
<!--       getBookings: build.query<Booking[], void>({            -->
<!--         query: () => '/v1/bookings',                         -->
<!--       }),                                                     -->
<!--     }),                                                       -->
<!--   })                                                          -->
<!--   const { data, isLoading } = useGetBookingsQuery()          -->
<!--   ← caching, polling, invalidation, optimistic updates built in-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- State management decision guide                              -->
<!--                                                              -->
<!-- USE PINIA when:                                               -->
<!--   ← Building a Vue 3 app (it's the official choice)         -->
<!--   ← You want composable-style stores (low boilerplate)       -->
<!--   ← Laravel + Inertia.js stack (Tripz)                       -->
<!--   ← Small-to-large apps: scales well without complexity      -->
<!--                                                              -->
<!-- USE ZUSTAND when:                                             -->
<!--   ← Building a React app that doesn't need server caching   -->
<!--   ← You want minimal boilerplate (no action creators)        -->
<!--   ← Team prefers simple mental model (set = update)          -->
<!--   ← Less opinionated: flexible, composable                   -->
<!--                                                              -->
<!-- USE REDUX TOOLKIT when:                                       -->
<!--   ← Large enterprise React app with complex state machines   -->
<!--   ← You need RTK Query for server state caching              -->
<!--   ← Strict action logging / time-travel debugging required  -->
<!--   ← Large team: slice structure provides predictable layout  -->
<!--   ← You need to audit every state change (finance/compliance)-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 2: ROUTING — Vue Router vs React Router v6           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue Router — navigation guards                               -->
<!--                                                              -->
<!-- GUARD TYPES (execution order):                               -->
<!--   1. router.beforeEach()      ← global, fires on ALL navs   -->
<!--   2. route.beforeEnter        ← per-route, after beforeEach  -->
<!--   3. Component onBeforeRouteUpdate ← same component, params change-->
<!--   4. router.afterEach()       ← global, AFTER nav (no cancel)-->
<!--   5. Component onBeforeRouteLeave ← when leaving (dirty check)-->
<!--                                                              -->
<!-- GLOBAL GUARD PATTERN (auth + role):                          -->
<!--   router.beforeEach((to, from) => {                          -->
<!--     document.title = to.meta.title ?? 'Tripz'               -->
<!--                                                              -->
<!--     if (to.meta.requiresAuth && !auth.isAuthenticated) {    -->
<!--       return { name: 'login', query: { redirect: to.fullPath } }-->
<!--       ← return route object = redirect                       -->
<!--     }                                                         -->
<!--     if (to.meta.requiresRole && user.role !== to.meta.requiresRole) {-->
<!--       return { name: 'not-found' }                           -->
<!--     }                                                         -->
<!--     return true  ← or just: return (nothing)                 -->
<!--   })                                                          -->
<!--                                                              -->
<!-- DIRTY-FORM LEAVE GUARD (in component):                       -->
<!--   onBeforeRouteLeave((_to, _from) => {                       -->
<!--     if (isDirty.value) return window.confirm('Leave?')       -->
<!--     ← return false = cancel, return true = allow             -->
<!--   })                                                          -->
<!--                                                              -->
<!-- ROUTE META — typed via module augmentation:                   -->
<!--   declare module 'vue-router' {                              -->
<!--     interface RouteMeta {                                    -->
<!--       requiresAuth?: boolean                                 -->
<!--       requiresRole?: 'admin' | 'school_admin'                -->
<!--       title?:        string                                   -->
<!--     }                                                         -->
<!--   }                                                           -->
<!--   ← to.meta.requiresAuth now TypeScript-typed everywhere     -->
<!--                                                              -->
<!-- ROUTERLINK vs NAVLINK:                                        -->
<!--   Vue:   <RouterLink :to="{ name: 'bookings' }" active-class="active">-->
<!--   React: <NavLink to="/bookings" className={({ isActive }) =>-->
<!--            isActive ? 'active' : ''}>                        -->
<!--   ← Vue: active-class / exact-active-class as string prop     -->
<!--   ← React: className is a function receiving state object    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React Router v6 — loader + action model                      -->
<!--                                                              -->
<!-- LOADER — runs before component renders (blocks navigation):  -->
<!--   {                                                           -->
<!--     path: '/bookings',                                       -->
<!--     element: <BookingsPage />,                               -->
<!--     loader: async ({ request }) => {                         -->
<!--       const session = await getSession(request)              -->
<!--       if (!session) throw redirect('/login')  ← guard inline -->
<!--       const data = await fetch('/api/v1/bookings')           -->
<!--       return { bookings: await data.json() }                 -->
<!--     },                                                        -->
<!--     errorElement: <ErrorPage />,  ← renders if loader throws -->
<!--   }                                                           -->
<!--                                                              -->
<!-- USELOADERDATA — read pre-fetched data in component:          -->
<!--   const { bookings } = useLoaderData() as BookingsLoaderData -->
<!--   ← data is available synchronously (loader resolved first)  -->
<!--   ← no loading state needed in component (handled by router) -->
<!--   ← Vue equivalent: onMounted fetch + isLoading ref          -->
<!--                                                              -->
<!-- ACTION — handle form mutations (POST/PUT/DELETE):             -->
<!--   {                                                           -->
<!--     path: '/bookings/new',                                   -->
<!--     element: <NewBookingPage />,                             -->
<!--     action: async ({ request }) => {                         -->
<!--       const formData = await request.formData()              -->
<!--       await createBooking(Object.fromEntries(formData))       -->
<!--       return redirect('/bookings')                           -->
<!--     },                                                        -->
<!--   }                                                           -->
<!--   ← Form with method="post" auto-calls the action            -->
<!--                                                              -->
<!-- NAVIGATION STATE (replaces Vue isLoading):                   -->
<!--   const navigation = useNavigation()                         -->
<!--   navigation.state === 'loading'   ← loader in progress      -->
<!--   navigation.state === 'submitting' ← action in progress     -->
<!--                                                              -->
<!-- KEY DIFFERENCE FROM VUE ROUTER:                              -->
<!--   Vue: guards = auth/redirect; components = data fetch       -->
<!--   React Router v6: loaders = auth + data (combined in route) -->
<!--   ← React Router blends the two concerns into loader function -->
<!--   ← Vue keeps them separate: guards for auth, hooks for data -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 3: PERFORMANCE                                       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue: fine-grained reactivity — surgical updates              -->
<!--                                                              -->
<!-- COMPONENT-LEVEL TRACKING:                                     -->
<!--   ← Each component has its own reactive effect               -->
<!--   ← Vue tracks which reactive data each component READ        -->
<!--   ← When data changes, ONLY components that read it re-render-->
<!--   ← Sibling components, parent, layout: unaffected           -->
<!--                                                              -->
<!-- WHAT VUE AVOIDS AUTOMATICALLY:                               -->
<!--   ← bookings[0].status changes → only BookingCard[0] updates -->
<!--   ← All other BookingCards, BookingList, Sidebar: unchanged  -->
<!--   ← No React.memo equivalent needed for most cases           -->
<!--   ← No useMemo for most derived values (computed covers it)  -->
<!--   ← No useCallback for event handlers in templates           -->
<!--     (Vue template handlers are stable, not recreated per render)-->
<!--                                                              -->
<!-- COMPILER OPTIMISATIONS (Vue compile-time):                    -->
<!--   ← Static nodes HOISTED: created once, reused               -->
<!--   ← Dynamic bindings FLAGGED: only patched attributes        -->
<!--   ← Template compiler knows at build time what is static     -->
<!--   ← React: VDOM must diff entire tree at runtime             -->
<!--                                                              -->
<!-- VUE EXPLICIT OPTIMISATIONS (when needed):                     -->
<!--   v-once:  <StaticHeader v-once />  ← render once, skip updates-->
<!--   v-memo:  <BookingRow v-memo="[booking.status]" />          -->
<!--            ← only re-patch if booking.status changes (Vue 3.2+)-->
<!--   shallowRef / shallowReactive: skip deep tracking on large objects-->
<!--   markRaw(obj): tell Vue to never make this object reactive   -->
<!--   <KeepAlive>: cache component instances between navigations  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React: VDOM diffing — explicit memoisation required          -->
<!--                                                              -->
<!-- DEFAULT BEHAVIOUR — re-render downward on state change:      -->
<!--   ← Dashboard state changes → Dashboard re-renders          -->
<!--   ← ALL children of Dashboard also re-render                 -->
<!--   ← Even children whose props haven't changed               -->
<!--   ← React.memo is how you opt OUT of this                   -->
<!--                                                              -->
<!-- REACT.MEMO — prevent re-render when props unchanged:         -->
<!--   const BookingCard = React.memo(function BookingCard(props) {-->
<!--     // Only re-renders when props change (shallow comparison) -->
<!--   })                                                          -->
<!--   ← Caveats: new object/array props break shallow comparison -->
<!--   ← Fix: stabilise with useMemo + useCallback               -->
<!--                                                              -->
<!-- USECALLBACK — stabilise function references:                  -->
<!--   const handleAction = useCallback((action, id) => {         -->
<!--     dispatch({ type: action, id })                           -->
<!--   }, [dispatch])  ← stable: only recreated when deps change  -->
<!--   ← Without useCallback: new function on every render        -->
<!--   ← React.memo's prop check sees new function → always renders-->
<!--                                                              -->
<!-- USEMEMO — stabilise derived array/object references:          -->
<!--   const confirmedBookings = useMemo(                         -->
<!--     () => bookings.filter(b => b.status === 'confirmed'),     -->
<!--     [bookings]                                               -->
<!--   )                                                           -->
<!--   ← Without useMemo: new array every render → memo breaks   -->
<!--                                                              -->
<!-- REACT 19 COMPILER — automated memoisation:                    -->
<!--   ← React Compiler (formerly React Forget) analyses your code-->
<!--   ← Automatically inserts memo/useMemo/useCallback           -->
<!--   ← Closer to Vue's automatic reactivity model               -->
<!--   ← Still opt-in: not default in React 18                    -->
<!--                                                              -->
<!-- USETRANSITION — mark low-priority state update:              -->
<!--   const [isPending, startTransition] = useTransition()       -->
<!--   startTransition(() => setSearch(value))                    -->
<!--   ← search re-render is non-urgent: UI stays responsive      -->
<!--   ← Vue: no equivalent (reactivity is always synchronous)    -->
<!--                                                              -->
<!-- USEDEFERREDVALUE — defer expensive derived computation:       -->
<!--   const deferredQuery = useDeferredValue(query)              -->
<!--   ← deferred value lags by one render (old value shown first)-->
<!--   ← Vue computed equivalent: always synchronous (no lag API) -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- KeepAlive (Vue) vs React manual caching                      -->
<!--                                                              -->
<!-- VUE <KEEPALIVE>:                                              -->
<!--   <KeepAlive :include="['BookingsPage']" :max="5">           -->
<!--     <component :is="Component" />                            -->
<!--   </KeepAlive>                                               -->
<!--                                                              -->
<!--   WHAT IT DOES:                                              -->
<!--   ← Component instance (DOM + reactive state + watchers) is  -->
<!--     PRESERVED in memory between route navigations            -->
<!--   ← Navigating away → onDeactivated() fires (NOT onUnmounted)-->
<!--   ← Navigating back  → onActivated()   fires (NOT onMounted) -->
<!--                                                              -->
<!--   LIFECYCLE WITH KEEPALIVE:                                   -->
<!--   onMounted():     fires ONCE on first load                  -->
<!--   onUnmounted():   fires ONCE on final destroy (max exceeded) -->
<!--   onActivated():   fires every time component enters view    -->
<!--   onDeactivated(): fires every time component leaves view    -->
<!--                                                              -->
<!--   PATTERNS IN onActivated:                                    -->
<!--   ← store.fetchBookings() — refresh data (may be stale)     -->
<!--   ← timer = setInterval(refresh, 30_000) — restart polling   -->
<!--   ← scrollToTop() — restore scroll if needed                 -->
<!--                                                              -->
<!--   PATTERNS IN onDeactivated:                                  -->
<!--   ← clearInterval(timer) — pause polling (save resources)    -->
<!--   ← controller?.abort() — cancel in-flight requests          -->
<!--                                                              -->
<!--   OPTIONS:                                                    -->
<!--   :include="['BookingsPage', 'DashboardPage']"  ← whitelist  -->
<!--   :exclude="['AdminPage']"                      ← blacklist   -->
<!--   :max="5"  ← LRU eviction (oldest destroyed when full)      -->
<!--                                                              -->
<!-- REACT: NO BUILT-IN EQUIVALENT                                 -->
<!--   Option 1: Always-mount + CSS hide                          -->
<!--   ← keep component in DOM, toggle display:none               -->
<!--   ← state preserved (never unmounts)                         -->
<!--   ← DOM cost: hidden components still consume memory          -->
<!--   ← no cache entry/exit lifecycle hooks                       -->
<!--                                                              -->
<!--   Option 2: Lift state to parent                             -->
<!--   ← parent holds the state, child is pure display            -->
<!--   ← child unmounts/remounts but state survives in parent      -->
<!--   ← loses local component state (refs, scroll position)      -->
<!--                                                              -->
<!--   Option 3: External store (Zustand / Redux)                 -->
<!--   ← persist page state in global store                       -->
<!--   ← restore on mount from store                              -->
<!--   ← manual: requires explicit save/restore code              -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 4: TYPESCRIPT                                        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue TypeScript generics                                      -->
<!--                                                              -->
<!-- DEFINEPROPS<T>() — compile-time type, no runtime:            -->
<!--   const props = defineProps<{                                -->
<!--     booking:  Booking                                        -->
<!--     selected?: boolean                                       -->
<!--   }>()                                                        -->
<!--   ← TypeScript only — no runtime prop declaration overhead   -->
<!--   ← optional props: ? suffix                                  -->
<!--   ← complex types: interface, union, intersection            -->
<!--                                                              -->
<!-- WITHDEFAULTS — defaults for optional generic props:           -->
<!--   const props = withDefaults(defineProps<{                   -->
<!--     variant?: 'compact' | 'full'                            -->
<!--     maxItems?: number                                        -->
<!--   }>(), {                                                     -->
<!--     variant:  'full',                                        -->
<!--     maxItems: 10,                                            -->
<!--   })                                                          -->
<!--   ← required because TS generics can't embed runtime defaults-->
<!--                                                              -->
<!-- DEFINEEMITS<T>() — typed event signatures:                    -->
<!--   const emit = defineEmits<{                                 -->
<!--     (e: 'action', action: 'confirm' | 'cancel', id: number): void-->
<!--     (e: 'update:modelValue', value: string): void            -->
<!--   }>()                                                        -->
<!--   ← TypeScript enforces correct emit call sites              -->
<!--   ← parent @action handler also inferred correctly           -->
<!--                                                              -->
<!-- DEFINEMODEL<T>() — Vue 3.4+ typed two-way:                   -->
<!--   const modelValue = defineModel<string>({ required: true }) -->
<!--   const count      = defineModel<number>('count', { default: 0 })-->
<!--   ← replaces defineProps + defineEmits for modelValue pattern-->
<!--                                                              -->
<!-- TEMPLATE REF TYPES:                                           -->
<!--   const inputRef  = ref<HTMLInputElement | null>(null)       -->
<!--   const cardRef   = ref<InstanceType<typeof BookingCard> | null>(null)-->
<!--   ← InstanceType<typeof Component> = type of component instance-->
<!--   ← exposes methods declared via defineExpose()              -->
<!--                                                              -->
<!-- DEFINEEXPOSE — explicit public API (no forwardRef needed):    -->
<!--   defineExpose({                                              -->
<!--     open:  () => { isOpen.value = true },                    -->
<!--     close: () => { isOpen.value = false },                   -->
<!--     reset: () => { form.value = initialForm },               -->
<!--   })                                                          -->
<!--   ← parent ref.open() — typed via InstanceType<typeof Comp> -->
<!--   ← simpler than React's forwardRef + useImperativeHandle    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React TypeScript generics                                    -->
<!--                                                              -->
<!-- FUNCTION COMPONENT TYPING — prefer over FC<Props>:           -->
<!--   function BookingCard(props: BookingCardProps): React.ReactElement-->
<!--   ← FC<Props> is legacy (implicit children, no memo-compat)  -->
<!--   ← explicit return type: JSX.Element / React.ReactElement  -->
<!--                                                              -->
<!-- REACT.COMPONENTPROPS<T> — reuse existing component props:    -->
<!--   type ButtonProps = React.ComponentProps<'button'>          -->
<!--   type CardProps   = React.ComponentProps<typeof BookingCard> -->
<!--   type WithExtra   = CardProps & { extra: string }           -->
<!--   ← extract and extend native element or component prop types-->
<!--                                                              -->
<!-- FORWARDREF — pass ref to child DOM element:                   -->
<!--   const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(-->
<!--     function TextInput({ label, ...rest }, ref) {            -->
<!--       return <input ref={ref} {...rest} />                    -->
<!--     }                                                         -->
<!--   )                                                           -->
<!--   ← generic params: <RefType, PropsType>                     -->
<!--   ← parent: const inputRef = useRef<HTMLInputElement>(null)  -->
<!--     <TextInput ref={inputRef} />                              -->
<!--   ← Vue equivalent: defineExpose({ focus }) — no wrapper     -->
<!--                                                              -->
<!-- USEIMPERATIVEHANDLE — control exposed ref API:               -->
<!--   const Modal = React.forwardRef<ModalHandle, ModalProps>(   -->
<!--     (props, ref) => {                                         -->
<!--       useImperativeHandle(ref, () => ({                      -->
<!--         open:  () => setIsOpen(true),                        -->
<!--         close: () => setIsOpen(false),                       -->
<!--       }))                                                     -->
<!--     }                                                         -->
<!--   )                                                           -->
<!--   interface ModalHandle { open: () => void; close: () => void }-->
<!--                                                              -->
<!-- EVENT HANDLER TYPES:                                          -->
<!--   React.ChangeEvent<HTMLInputElement>      ← input onChange  -->
<!--   React.FormEvent<HTMLFormElement>         ← form onSubmit   -->
<!--   React.MouseEvent<HTMLButtonElement>      ← button onClick  -->
<!--   React.KeyboardEvent<HTMLInputElement>    ← onKeyDown       -->
<!--   ← Vue: event type inferred from element by Volar extension -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 5: SLOTS vs CHILDREN/RENDER PROPS                   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue slots — template-driven content projection               -->
<!--                                                              -->
<!-- DEFAULT SLOT — unnamed content:                               -->
<!--   Child:  <div class="card"><slot /></div>                   -->
<!--   Parent: <Card>  <p>Content here</p>  </Card>               -->
<!--   ← content inserted where <slot /> is                       -->
<!--                                                              -->
<!-- NAMED SLOTS — multiple content areas:                         -->
<!--   Child:                                                      -->
<!--     <div class="modal">                                      -->
<!--       <header><slot name="header" /></header>                -->
<!--       <main><slot />  ← default slot                        -->
<!--       <footer><slot name="footer" /></footer>                -->
<!--     </div>                                                    -->
<!--   Parent:                                                     -->
<!--     <Modal>                                                   -->
<!--       <template #header>Booking Details</template>           -->
<!--       <BookingForm />   ← default slot content               -->
<!--       <template #footer><button @click="close">Close</button></template>-->
<!--     </Modal>                                                  -->
<!--                                                              -->
<!-- SCOPED SLOTS — slot exposes data to parent:                   -->
<!--   Child:  <slot :booking="booking" :index="i" />             -->
<!--   Parent: <template #default="{ booking, index }">           -->
<!--             <BookingCard :booking="booking" />                -->
<!--           </template>                                         -->
<!--   ← Child controls the data, parent controls the template    -->
<!--   ← React equivalent: render props                           -->
<!--                                                              -->
<!-- SLOT FALLBACK — default content if slot not provided:         -->
<!--   <slot name="empty"><p>No bookings found.</p></slot>        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React children / render props — JS-function approach         -->
<!--                                                              -->
<!-- CHILDREN — implicit default slot equivalent:                  -->
<!--   interface CardProps { children: React.ReactNode }          -->
<!--   function Card({ children }: CardProps) {                   -->
<!--     return <div className="card">{children}</div>            -->
<!--   }                                                           -->
<!--   <Card><p>Content</p></Card>                                 -->
<!--   ← children is a prop — explicit in TypeScript              -->
<!--                                                              -->
<!-- NAMED "SLOTS" — use specific props:                           -->
<!--   interface ModalProps {                                      -->
<!--     header:   React.ReactNode                                 -->
<!--     children: React.ReactNode  ← default content             -->
<!--     footer:   React.ReactNode                                 -->
<!--   }                                                           -->
<!--   <Modal                                                      -->
<!--     header={<h2>Booking</h2>}                                -->
<!--     footer={<button onClick={close}>Close</button>}          -->
<!--   >                                                           -->
<!--     <BookingForm />                                           -->
<!--   </Modal>                                                    -->
<!--   ← less ergonomic than Vue's <template #slot> syntax        -->
<!--                                                              -->
<!-- RENDER PROPS — scoped slot equivalent (data flows to parent): -->
<!--   interface TableProps<T> {                                   -->
<!--     data:      T[]                                            -->
<!--     renderRow: (item: T, index: number) => React.ReactNode   -->
<!--   }                                                           -->
<!--   function Table<T>({ data, renderRow }: TableProps<T>) {    -->
<!--     return <tbody>{data.map(renderRow)}</tbody>               -->
<!--   }                                                           -->
<!--   <Table data={bookings} renderRow={(b, i) => (              -->
<!--     <tr key={b.id}><td>{b.schoolName}</td></tr>               -->
<!--   )} />                                                       -->
<!--   ← TypeScript: generics flow through render prop            -->
<!--   ← Vue scoped slot: same capability, template syntax cleaner-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 6: provide/inject vs Context API                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue provide/inject — dependency injection                    -->
<!--                                                              -->
<!-- PROVIDE in ancestor:                                          -->
<!--   import { provide, ref } from 'vue'                         -->
<!--                                                              -->
<!--   const theme = ref<'light' | 'dark'>('light')               -->
<!--   provide('theme', theme)                                     -->
<!--   ← can provide a ref: inject receives a reactive Ref<T>     -->
<!--   ← can provide a readonly ref: provide('theme', readonly(theme))-->
<!--   ← with InjectionKey for type safety:                       -->
<!--     import { InjectionKey } from 'vue'                       -->
<!--     const ThemeKey: InjectionKey<Ref<'light'|'dark'>> = Symbol('theme')-->
<!--     provide(ThemeKey, theme)                                  -->
<!--                                                              -->
<!-- INJECT in descendant (any depth):                             -->
<!--   const theme = inject('theme')  ← returns T | undefined     -->
<!--   const theme = inject('theme', ref('light'))  ← with default-->
<!--   const theme = inject(ThemeKey)  ← typed via InjectionKey   -->
<!--   ← no wrapper component needed                              -->
<!--   ← composable version: export function useTheme() { inject(...) }-->
<!--                                                              -->
<!-- USE CASES IN TRIPZ:                                           -->
<!--   ← Toast notification system (provide from App.vue)         -->
<!--   ← Current user (provide once, inject in any component)     -->
<!--   ← Theme / dark mode                                         -->
<!--   ← Page-level context (form state shared with sub-components)-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React Context API — provider + consumer                      -->
<!--                                                              -->
<!-- CREATE CONTEXT:                                               -->
<!--   const ThemeContext = createContext<'light' | 'dark'>('light')-->
<!--   ← default value used when no Provider is in tree           -->
<!--                                                              -->
<!-- PROVIDE — wrap component tree in Provider:                    -->
<!--   function App() {                                            -->
<!--     const [theme, setTheme] = useState<'light'|'dark'>('light')-->
<!--     return (                                                  -->
<!--       <ThemeContext.Provider value={theme}>                  -->
<!--         <Router />                                            -->
<!--       </ThemeContext.Provider>                                -->
<!--     )                                                         -->
<!--   }                                                           -->
<!--   ← must wrap tree — more ceremony than Vue's provide()      -->
<!--                                                              -->
<!-- CONSUME — useContext in any descendant:                       -->
<!--   const theme = useContext(ThemeContext)                      -->
<!--   ← component re-renders when context value changes          -->
<!--   ← common pattern: wrap in custom hook:                     -->
<!--     function useTheme() { return useContext(ThemeContext) }   -->
<!--                                                              -->
<!-- PERFORMANCE CAVEAT:                                           -->
<!--   ← ALL consumers re-render when context value changes       -->
<!--   ← Even if consumer only reads one property of a large context-->
<!--   ← Solution: split contexts by update frequency             -->
<!--   ← Or use external store (Zustand) for frequently-changing data-->
<!--   ← Vue provide/inject: only components that READ the inject re-render-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 7: ECOSYSTEM & HIRING DECISIONS                      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue ecosystem — official, cohesive, opinionated              -->
<!--                                                              -->
<!-- OFFICIAL STACK (all by core team):                           -->
<!--   Vue 3          ← framework                                  -->
<!--   Pinia          ← state (replaced Vuex)                     -->
<!--   Vue Router     ← routing                                   -->
<!--   Vite           ← build tool (created by Evan You)           -->
<!--   Nuxt 3         ← SSR/SSG framework (Next.js equivalent)    -->
<!--   VueUse         ← 200+ composables (unofficial but endorsed) -->
<!--   Vue DevTools   ← browser extension                          -->
<!--   Vitest         ← testing (Vue-native, Vite-powered)        -->
<!--                                                              -->
<!-- ADVANTAGES OF COHESION:                                       -->
<!--   ← One official answer for each concern                     -->
<!--   ← No version compatibility matrix to maintain              -->
<!--   ← DevTools deeply integrated (timeline, component tree, store)-->
<!--   ← Migration guides between major versions (Vue 2 → 3)      -->
<!--   ← Community speaks same language (no Zustand vs Redux debate)-->
<!--                                                              -->
<!-- INERTIA.JS + LARAVEL + VUE = TRIPZ STACK:                    -->
<!--   ← Inertia bridges server-rendered Laravel routes to Vue pages-->
<!--   ← Shared session auth (no JWT/API token management)        -->
<!--   ← Server-side validation errors returned as Inertia props  -->
<!--   ← Vue Router not needed (Laravel routes = page routes)     -->
<!--   ← useForm() from Inertia handles loading/error state       -->
<!--   ← Natural team split: Laravel devs + Vue devs, shared codebase-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- React ecosystem — vast, fragmented, powerful                 -->
<!--                                                              -->
<!-- META-FRAMEWORK: Next.js (dominant) / Remix / Gatsby         -->
<!--   ← Next.js App Router (RSC) = significant paradigm shift   -->
<!--   ← Server Components vs Client Components                  -->
<!--   ← New mental model: not just React anymore                 -->
<!--                                                              -->
<!-- STATE: Redux Toolkit / Zustand / Jotai / Recoil / MobX       -->
<!--   ← No single official answer — team must choose             -->
<!--   ← Server state: TanStack Query / RTK Query / SWR           -->
<!--   ← Client state + server state: different tools             -->
<!--                                                              -->
<!-- ROUTING: React Router v6 / TanStack Router                   -->
<!--   ← React Router v5 → v6 was a breaking API change           -->
<!--   ← TanStack Router: newer, TypeScript-first, file-based     -->
<!--                                                              -->
<!-- MOBILE: React Native — share logic between web and native    -->
<!--   ← Only React can do this (Vue has no mobile equivalent)    -->
<!--   ← Expo: managed React Native workflow                       -->
<!--                                                              -->
<!-- ANIMATION: Framer Motion — best-in-class                     -->
<!--   ← No Vue equivalent matches its quality/API                -->
<!--   ← Vue Transition + TransitionGroup for basic transitions   -->
<!--                                                              -->
<!-- JOB MARKET (2025):                                            -->
<!--   React: ~65% of frontend postings                           -->
<!--   Vue:   ~15% of frontend postings                           -->
<!--   ← React: more jobs, more candidates                        -->
<!--   ← Vue: fewer jobs, fewer qualified candidates (less diluted)-->
<!--   ← Laravel shops: Vue dominant                              -->
<!--   ← Startups / product companies: React default              -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- SECTION 8: WHEN TO CHOOSE VUE vs REACT                      -->
<!-- ← Definitive decision framework for senior developer role    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- CHOOSE VUE 3 when:                                           -->
<!--                                                              -->
<!-- 1. TEAM BACKGROUND — HTML/PHP/Laravel developers             -->
<!--    ← SFC template feels like Blade extended with reactivity  -->
<!--    ← v-if, v-for, @click read like enhanced HTML             -->
<!--    ← Lower learning curve: productive in days, not weeks     -->
<!--                                                              -->
<!-- 2. FORMS-HEAVY APPLICATION                                    -->
<!--    ← v-model + modifiers (.trim, .number, .lazy) reduce code -->
<!--    ← Reactive form objects with reactive() + direct mutation -->
<!--    ← VeeValidate integrates cleanly with Vue's reactivity    -->
<!--    ← Much less boilerplate than React controlled inputs       -->
<!--                                                              -->
<!-- 3. LARAVEL STACK                                              -->
<!--    ← Laravel + Inertia.js + Vue = natural pairing            -->
<!--    ← Inertia uses Laravel routes directly (no API needed)    -->
<!--    ← CSRF, session auth, redirect all handled server-side    -->
<!--    ← Laravel devs can read Vue templates without JS expertise -->
<!--                                                              -->
<!-- 4. SMALLER TEAM / FASTER ONBOARDING                          -->
<!--    ← Official ecosystem = fewer decisions                    -->
<!--    ← Pinia + Vue Router + VueUse covers 90% of needs        -->
<!--    ← Less configuration, less bikeshedding                   -->
<!--                                                              -->
<!-- 5. ADMIN / DASHBOARD / CMS APPLICATIONS                      -->
<!--    ← Data-heavy UIs with many filter/sort controls            -->
<!--    ← v-model on tables, forms, modals is ergonomic           -->
<!--    ← KeepAlive preserves page state (filters, scroll) for free-->
<!--                                                              -->
<!-- 6. PERFORMANCE BY DEFAULT                                     -->
<!--    ← Fine-grained reactivity: fewer re-renders without effort-->
<!--    ← No React.memo/useMemo/useCallback boilerplate           -->
<!--    ← Vue compiler optimises templates at build time           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- CHOOSE REACT 18 when:                                        -->
<!--                                                              -->
<!-- 1. MOBILE APPLICATION NEEDED                                  -->
<!--    ← React Native: share business logic between web + native -->
<!--    ← Expo: managed RN workflow, push notifications, OTA updates-->
<!--    ← Vue: no viable mobile story (Weex is abandoned)         -->
<!--                                                              -->
<!-- 2. LARGE TEAM / LARGE ECOSYSTEM NEEDED                        -->
<!--    ← More libraries, more StackOverflow answers               -->
<!--    ← More third-party UI kits with React support             -->
<!--    ← Framer Motion, TanStack Table, react-pdf, etc.          -->
<!--    ← Hiring: larger global pool of React developers          -->
<!--                                                              -->
<!-- 3. COMPLEX STATE MACHINES                                     -->
<!--    ← useReducer + XState for complex workflow states          -->
<!--    ← Redux DevTools: time-travel, action log for compliance  -->
<!--    ← RTK Query: server state caching, polling, optimistic updates-->
<!--                                                              -->
<!-- 4. NEXT.JS FULL-STACK                                         -->
<!--    ← App Router: Server Components, streaming, partial prerender-->
<!--    ← Vercel deployment: edge functions, ISR, image optimisation-->
<!--    ← Server Actions: direct server calls from components     -->
<!--    ← Nuxt 3 matches most of this, but Next.js has more momentum-->
<!--                                                              -->
<!-- 5. JS-NATIVE TEAM                                             -->
<!--    ← JSX feels natural to JS-first developers                -->
<!--    ← Everything is JS: conditional, list, event = same syntax-->
<!--    ← Easier to extract component: function = component        -->
<!--                                                              -->
<!-- 6. META / ENTERPRISE INVESTMENT                               -->
<!--    ← Meta, Airbnb, Netflix, LinkedIn use React               -->
<!--    ← Long-term support confidence                             -->
<!--    ← React 19: Compiler, Server Actions, improved Suspense   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- CHOOSE NEITHER / CONSIDER ALTERNATIVES when:                 -->
<!--                                                              -->
<!-- STATIC SITE / CONTENT: Astro (ships zero JS by default)      -->
<!--   ← Use Vue or React components as "islands" where needed   -->
<!--   ← Best for: blogs, docs, marketing pages                   -->
<!--                                                              -->
<!-- SVELTE / SVELTEKIT: compile-time reactivity, no VDOM         -->
<!--   ← Smallest bundle size, no framework runtime              -->
<!--   ← Growing ecosystem but smaller than Vue or React          -->
<!--                                                              -->
<!-- HTMX + LARAVEL: progressive enhancement for simple UIs       -->
<!--   ← No JS framework: HTML attributes drive AJAX              -->
<!--   ← Appropriate for: simple CRUD with few interactive parts  -->
<!--   ← Tripz: too much interactivity for this approach          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- DEFINITIVE DECISION TREE (for interviews):                   -->
<!--                                                              -->
<!-- Q: Is mobile (iOS/Android) required?                         -->
<!--   YES → React (React Native)                                 -->
<!--   NO  → continue                                              -->
<!--                                                              -->
<!-- Q: Is the team PHP/Laravel-native with limited JS background?-->
<!--   YES → Vue 3 (gentler curve, template syntax, v-model)     -->
<!--   NO  → continue                                              -->
<!--                                                              -->
<!-- Q: Is this a Laravel application (Inertia pairing)?          -->
<!--   YES → Vue 3 (natural pairing, Tripz pattern)               -->
<!--   NO  → continue                                              -->
<!--                                                              -->
<!-- Q: Does the app need SSR/SSG at scale (marketing, SEO)?      -->
<!--   YES → React + Next.js (larger ecosystem, Vercel integration)-->
<!--         OR Vue + Nuxt 3 (equally capable)                    -->
<!--   NO  → continue                                              -->
<!--                                                              -->
<!-- Q: Is this a large enterprise with complex state / audit needs?-->
<!--   YES → React + Redux Toolkit + RTK Query                    -->
<!--   NO  → continue                                              -->
<!--                                                              -->
<!-- Q: Does the team have equal experience in both?              -->
<!--   Bias towards VUE for: forms-heavy, admin/dashboard, small team-->
<!--   Bias towards REACT for: component library, large ecosystem, hiring pool-->
<!--                                                              -->
<!-- BOTTOM LINE:                                                  -->
<!--   Both compile to the same DOM operations.                   -->
<!--   Vue: less boilerplate, gentler curve, cohesive ecosystem.  -->
<!--   React: larger ecosystem, more explicit, more jobs globally. -->
<!--   For TRIPZ (Laravel + school bookings): Vue 3 is the right choice.-->
<!-- ============================================================ -->
