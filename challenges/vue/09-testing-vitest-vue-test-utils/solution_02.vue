<!-- ============================================================ -->
<!-- Problem 02 — Pinia, Fetch, Router, Composable Testing       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- createTestingPinia — setup                                   -->
<!--                                                              -->
<!-- import { createTestingPinia } from '@pinia/testing'          -->
<!--                                                              -->
<!-- createTestingPinia replaces the real Pinia instance with a   -->
<!-- test-safe version:                                            -->
<!--   ← actions are stubbed (no-ops) by default                  -->
<!--   ← state is directly writable without actions               -->
<!--   ← all action stubs become vi.fn() when createSpy is set    -->
<!--                                                              -->
<!-- const pinia = createTestingPinia({                            -->
<!--   createSpy: vi.fn,           ← wrap every action in vi.fn() -->
<!--   initialState: {                                             -->
<!--     booking: {                ← store id must match exactly  -->
<!--       bookings: [...],        ← seed state directly           -->
<!--       isLoading: false,                                       -->
<!--       currentPage: 1,                                         -->
<!--     },                                                        -->
<!--   },                                                          -->
<!--   stubActions: true,          ← default: actions are no-ops  -->
<!-- })                                                            -->
<!--                                                              -->
<!-- mount(BookingList, { global: { plugins: [pinia] } })         -->
<!--                                                              -->
<!-- IMPORTANT: access the store AFTER mounting                   -->
<!--   const store = useBookingStore()  ← called after mount()    -->
<!--   ← pinia must be installed (via global.plugins) before      -->
<!--     useBookingStore() can return the testing instance         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- createTestingPinia — initialState                            -->
<!--                                                              -->
<!-- initialState sets the store's reactive state directly,        -->
<!-- bypassing all actions and getters                             -->
<!--                                                              -->
<!-- Key for the store must match the id in defineStore():         -->
<!--   defineStore('booking', ...)   → initialState.booking: {}   -->
<!--   defineStore('auth', ...)      → initialState.auth: {}      -->
<!--                                                              -->
<!-- Partial state is fine — only listed keys are overridden:      -->
<!--   initialState: { booking: { bookings: [...] } }             -->
<!--   ← isLoading, error, etc. keep their defineStore defaults   -->
<!--                                                              -->
<!-- Mutate state directly in tests after mounting:               -->
<!--   const store = useBookingStore()                             -->
<!--   store.isLoading = true        ← triggers reactive updates  -->
<!--   await nextTick()              ← DOM reflects new state     -->
<!--   expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true)-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Spying on store actions                                      -->
<!--                                                              -->
<!-- With createSpy: vi.fn, every action is wrapped in vi.fn()    -->
<!-- Actions still do nothing (stubActions: true) but are trackable-->
<!--                                                              -->
<!-- Test: action was called on mount:                             -->
<!--   const pinia = createTestingPinia({ createSpy: vi.fn })     -->
<!--   mount(BookingList, { global: { plugins: [pinia] } })       -->
<!--   const store = useBookingStore()                             -->
<!--   await flushPromises()                                       -->
<!--   expect(store.fetchBookings).toHaveBeenCalledOnce()          -->
<!--                                                              -->
<!-- Test: action called with correct arguments:                   -->
<!--   await wrapper.find('[data-testid="cancel-btn"]').trigger('click')-->
<!--   expect(store.cancelBooking).toHaveBeenCalledWith(9)        -->
<!--                                                              -->
<!-- Test: action NOT called (validation blocked it):             -->
<!--   await wrapper.find('form').trigger('submit')               -->
<!--   expect(store.createBooking).not.toHaveBeenCalled()         -->
<!--                                                              -->
<!-- Override a stubbed action to return a value:                  -->
<!--   store.createBooking = vi.fn().mockResolvedValue({ id: 99 })-->
<!--   ← now the action "succeeds" with that payload              -->
<!--   ← use to test UI behaviour after a successful action        -->
<!--                                                              -->
<!-- stubActions: false — run real action logic:                  -->
<!--   ← integration test mode: real Pinia logic executes         -->
<!--   ← still uses test pinia, but state mutates as in production -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- global.fetch mocking                                         -->
<!--                                                              -->
<!-- Replace global.fetch before each test:                       -->
<!--   beforeEach(() => {                                          -->
<!--     global.fetch = vi.fn().mockResolvedValue({               -->
<!--       ok: true,                                               -->
<!--       json: () => Promise.resolve([                           -->
<!--         { id: 1, destination: 'Paris', status: 'confirmed' }  -->
<!--       ]),                                                     -->
<!--     })                                                        -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Restore after each test:                                      -->
<!--   afterEach(() => { vi.restoreAllMocks() })                   -->
<!--   ← prevents leakage between tests                           -->
<!--   ← or set restoreMocks: true in vitest.config.ts globally   -->
<!--                                                              -->
<!-- Spy instead of replace:                                       -->
<!--   vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: ... })-->
<!--   ← lets you verify calls while still controlling the response-->
<!--                                                              -->
<!-- Test error handling:                                          -->
<!--   global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })-->
<!--   ← component should set error state and render error UI     -->
<!--                                                              -->
<!-- Test network failure:                                         -->
<!--   global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))-->
<!--   ← promise rejects — component catch block should handle it -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- vi.mock() — module-level mocking                             -->
<!--                                                              -->
<!-- vi.mock() is HOISTED to the top of the file by Vitest        -->
<!--   ← it runs before any import statements                     -->
<!--   ← all imports of the mocked module get the fake version    -->
<!--                                                              -->
<!-- Mock a composable:                                            -->
<!--   vi.mock('@/composables/useFetch', () => ({                  -->
<!--     useFetch: vi.fn(() => ({                                  -->
<!--       data:      ref([]),                                     -->
<!--       isLoading: ref(false),                                  -->
<!--       error:     ref(null),                                   -->
<!--     })),                                                      -->
<!--   }))                                                         -->
<!--   ← every component that imports useFetch gets this fake     -->
<!--                                                              -->
<!-- Change mock return value per test:                            -->
<!--   import { useFetch } from '@/composables/useFetch'          -->
<!--   vi.mocked(useFetch).mockReturnValue({ isLoading: ref(true), ... })-->
<!--   ← vi.mocked() types the function as a Mock for TS safety   -->
<!--                                                              -->
<!-- Mock a utility module:                                        -->
<!--   vi.mock('@/utils/formatDate', () => ({                      -->
<!--     formatDate: vi.fn(() => '01 Jan 2026'),                   -->
<!--   }))                                                         -->
<!--                                                              -->
<!-- Partial mock — keep real exports, replace one:               -->
<!--   vi.mock('@/services/bookingApi', async (importOriginal) => {-->
<!--     const real = await importOriginal()                       -->
<!--     return { ...real, deleteBooking: vi.fn() }               -->
<!--   })                                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue Router integration in tests                              -->
<!--                                                              -->
<!-- createRouter with createMemoryHistory:                        -->
<!--   import { createRouter, createMemoryHistory } from 'vue-router'-->
<!--   const router = createRouter({                               -->
<!--     history: createMemoryHistory(),  ← no real browser URL   -->
<!--     routes,                          ← import from @/router  -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Push to route before mounting:                               -->
<!--   await router.push('/bookings/1')  ← set URL params         -->
<!--   await router.isReady()           ← wait for navigation     -->
<!--                                                              -->
<!-- Install router in the wrapper:                               -->
<!--   mount(BookingDetailPage, {                                  -->
<!--     global: { plugins: [router, pinia] },                    -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Assert on current route:                                      -->
<!--   expect(router.currentRoute.value.path).toBe('/login')       -->
<!--   expect(router.currentRoute.value.params.id).toBe('42')     -->
<!--                                                              -->
<!-- Test navigation guard redirect:                               -->
<!--   await router.push('/dashboard')  ← guard fires             -->
<!--   await router.isReady()                                      -->
<!--   expect(router.currentRoute.value.path).toBe('/login')       -->
<!--                                                              -->
<!-- Test RouterLink rendering (shallowMount):                     -->
<!--   import { RouterLinkStub } from '@vue/test-utils'            -->
<!--   mount(NavBar, { global: { stubs: { RouterLink: RouterLinkStub } } })-->
<!--   wrapper.findComponent(RouterLinkStub).props('to')          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- withSetup pattern — testing composables                      -->
<!--                                                              -->
<!-- Problem: composables that call onMounted, onUnmounted,        -->
<!-- provide/inject, or useRoute MUST run inside a component's     -->
<!-- setup() context — you cannot call them in a plain test        -->
<!--                                                              -->
<!-- withSetup helper (define once, reuse everywhere):             -->
<!--   export function withSetup(composable) {                     -->
<!--     let result                                                -->
<!--     mount({                                                   -->
<!--       setup() {                                               -->
<!--         result = composable()                                 -->
<!--         return () => {}       ← render nothing                -->
<!--       },                                                      -->
<!--     })                                                        -->
<!--     return result                                             -->
<!--   }                                                           -->
<!--                                                              -->
<!-- Use in test:                                                   -->
<!--   const { filters, setFilter } = withSetup(() =>             -->
<!--     useBookingFilters()                                       -->
<!--   )                                                           -->
<!--   ← composable runs inside real setup() context              -->
<!--   ← lifecycle hooks are registered to the host component     -->
<!--   ← refs are reactive — mutations update .value              -->
<!--                                                              -->
<!-- withSetup with plugins (router, pinia):                       -->
<!--   const { data } = withSetup(() => useFetchBookings(), {      -->
<!--     global: { plugins: [router, pinia] },                    -->
<!--   })                                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- beforeEach / afterEach setup patterns                        -->
<!--                                                              -->
<!-- Standard test file structure:                                 -->
<!--                                                              -->
<!--   describe('BookingForm', () => {                             -->
<!--     let wrapper                                               -->
<!--     let store                                                 -->
<!--                                                              -->
<!--     beforeEach(() => {                                        -->
<!--       ← runs before each test — set up fresh state            -->
<!--       const pinia = createTestingPinia({ createSpy: vi.fn }) -->
<!--       wrapper = mount(BookingForm, {                          -->
<!--         global: { plugins: [pinia] },                        -->
<!--       })                                                      -->
<!--       store = useBookingStore()                               -->
<!--     })                                                        -->
<!--                                                              -->
<!--     afterEach(() => {                                         -->
<!--       ← runs after each test — clean up side effects          -->
<!--       vi.restoreAllMocks()    ← restore spied/replaced fns   -->
<!--       wrapper.unmount()       ← explicit cleanup (optional)  -->
<!--     })                                                        -->
<!--                                                              -->
<!--     test('...', async () => { ... })                          -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Fake timers:                                                   -->
<!--   beforeEach(() => { vi.useFakeTimers() })                    -->
<!--   afterEach(() => { vi.useRealTimers() })                     -->
<!--   ← needed when testing setInterval, setTimeout, polling      -->
<!--   vi.advanceTimersByTime(30_000)  ← fast-forward 30 seconds  -->
<!--                                                              -->
<!-- Global beforeEach (in test setup file):                       -->
<!--   ← vitest.config.ts → setupFiles: ['./src/test/setup.ts']   -->
<!--   ← import { server } from './mswServer'; server.listen()    -->
<!--   ← configure global mocks or test environment once          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue Testing vs React Testing Library — comparison            -->
<!--                                                              -->
<!-- PHILOSOPHY — same goal, different API:                        -->
<!--   Both: test from the user's perspective, not internals       -->
<!--   Both: prefer queries that survive refactors                 -->
<!--   Both: async utilities for handling promises / DOM updates   -->
<!--                                                              -->
<!-- MOUNTING:                                                     -->
<!--   Vue:   mount(Component, { props: {}, global: { plugins } })-->
<!--   React: render(<Component propA={val} />)                   -->
<!--          ← wraps with a Provider for context/store            -->
<!--                                                              -->
<!-- QUERYING:                                                     -->
<!--   Vue:   wrapper.find('[data-testid="x"]')                    -->
<!--   React: screen.getByTestId('x')         ← screen object     -->
<!--   React: screen.getByRole('button', { name: 'Cancel' })       -->
<!--          ← RTL encourages role/label queries over testid      -->
<!--                                                              -->
<!-- INTERACTION:                                                  -->
<!--   Vue:   await wrapper.trigger('click')                       -->
<!--   Vue:   await wrapper.setValue('Paris')                      -->
<!--   React: await userEvent.click(element)  ← @testing-library/user-event-->
<!--   React: await userEvent.type(input, 'Paris')                 -->
<!--                                                              -->
<!-- ASYNC:                                                        -->
<!--   Vue:   await flushPromises() + await nextTick()             -->
<!--   React: await waitFor(() => expect(...))  ← retries assertion-->
<!--   React: await screen.findByText('Paris') ← async getBy query-->
<!--                                                              -->
<!-- STATE/STORE:                                                  -->
<!--   Vue:   createTestingPinia with initialState                 -->
<!--   React: wrap with <Provider store={configureStore(...)}>     -->
<!--   React: or mock useSelector / useDispatch with vi.mock()     -->
<!--                                                              -->
<!-- EMITS / OUTPUT:                                               -->
<!--   Vue:   wrapper.emitted('cancel')[0][0]  ← first emission    -->
<!--   React: check prop callbacks were called:                    -->
<!--          const onCancel = vi.fn()                             -->
<!--          render(<BookingCard onCancel={onCancel} />)          -->
<!--          expect(onCancel).toHaveBeenCalledWith(7)             -->
<!--          ← no emits concept in React — parent passes handlers -->
<!--                                                              -->
<!-- KEY DIFFERENCE:                                               -->
<!--   Vue:   wrapper object wraps the component — imperative API  -->
<!--   React: screen object is global — queries search entire DOM  -->
<!--   ← RTL encourages accessibility queries (role, label)        -->
<!--   ← Vue Test Utils allows more structural queries (findComponent)-->
<!-- ============================================================ -->
