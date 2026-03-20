<!-- ============================================================ -->
<!-- Problem 02 — Advanced Vue Router                             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Nested layouts with RouterView                               -->
<!--                                                              -->
<!-- AppLayout.vue has <RouterView /> in its template             -->
<!--   → renders the matched CHILD route component inside it      -->
<!--   → AppLayout renders once; only child swaps on navigation  -->
<!--                                                              -->
<!-- Route config:                                                 -->
<!-- {                                                            -->
<!--   path: '/',                                                  -->
<!--   component: AppLayout,   ← outer shell                     -->
<!--   meta: { requiresAuth: true },  ← guard applies to children-->
<!--   children: [                                                 -->
<!--     { path: 'bookings',   name: 'bookings',   component: ...}-->
<!--     { path: 'bookings/:id', name: '...',      component: ...}-->
<!--   ]                                                           -->
<!-- }                                                            -->
<!--                                                              -->
<!-- Guard inheritance:                                            -->
<!--   meta on PARENT is NOT automatically read for children      -->
<!--   but beforeEach checks to.meta.requiresAuth                 -->
<!--   → child inherits parent meta via route.matched             -->
<!--     if you merge matched meta: route.matched.some(r => r.meta.requiresAuth)-->
<!--   ← OR: set requiresAuth on each child explicitly            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- RouterView v-slot: Transition + KeepAlive                    -->
<!--                                                              -->
<!-- <RouterView v-slot="{ Component, route }">                   -->
<!--   <Transition :name="route.meta.transition ?? 'fade'" mode="out-in">-->
<!--     <KeepAlive :include="['BookingsPage']">                   -->
<!--       <component :is="Component" :key="route.path" />        -->
<!--     </KeepAlive>                                              -->
<!--   </Transition>                                               -->
<!-- </RouterView>                                                 -->
<!--                                                              -->
<!-- Component: the matched component class                        -->
<!-- route:     current route object (has meta.transition etc.)  -->
<!--                                                              -->
<!-- :key="route.path"                                             -->
<!--   ← forces re-mount when path changes (even same component) -->
<!--   ← /bookings/42 → /bookings/99: same component, new key    -->
<!--   ← without :key: Vue reuses instance, only props change     -->
<!--                                                              -->
<!-- mode="out-in": old component fades out BEFORE new fades in  -->
<!--   ← prevents overlap during transition                       -->
<!--                                                              -->
<!-- KeepAlive :include: cache component by name (defineOptions)  -->
<!--   ← BookingsPage stays mounted, scroll position preserved   -->
<!--   ← detail pages NOT kept alive (fresh fetch on each visit) -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useNavigation composable                                     -->
<!--                                                              -->
<!-- Extract routing logic from components into composable        -->
<!--                                                              -->
<!-- useNavigation() returns:                                      -->
<!--   currentTitle  = computed(() => route.meta.title ?? 'Tripz')-->
<!--   breadcrumbs   = computed(() =>                             -->
<!--     route.matched                                            -->
<!--       .filter(r => r.meta.title)                             -->
<!--       .map(r => ({ name: r.name, title: r.meta.title }))    -->
<!--   )                                                           -->
<!--   isAdminRoute  = computed(() => route.meta.requiresRole === 'admin')-->
<!--   goToBooking(id) → router.push({ name:'booking-detail', params:{id}})-->
<!--   goToEdit(id)    → router.push({ name:'booking-edit', params:{id}})-->
<!--   logout()        → auth.logout() + router.replace('login') -->
<!--                                                              -->
<!-- breadcrumbs uses route.matched:                              -->
<!--   /admin/dashboard → matched = [AdminLayout, DashboardPage] -->
<!--   ← each has meta.title → ['Admin', 'Dashboard']            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useRouteParams composable                                    -->
<!--                                                              -->
<!-- Centralises param/query parsing from route                   -->
<!--                                                              -->
<!-- const id     = computed(() => Number(route.params.id) || null)-->
<!-- const page   = computed(() => Number(route.query.page) || 1) -->
<!-- const search = computed(() => route.query.search as string || '')-->
<!-- const status = computed(() => route.query.status as string || '')-->
<!--                                                              -->
<!-- Why computed (not direct read):                               -->
<!--   ← route.params/query are reactive                          -->
<!--   ← component re-renders when URL changes                   -->
<!--   ← computed caches the cast value                           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- afterEach — progress bar + analytics                         -->
<!--                                                              -->
<!-- router.beforeEach(() => { NProgress.start() })              -->
<!-- router.afterEach((to) => {                                    -->
<!--   NProgress.done()                                           -->
<!--   window.gtag?.('config', 'GA_ID', { page_path: to.fullPath })-->
<!-- })                                                            -->
<!--                                                              -->
<!-- afterEach runs after every navigation (success OR failure)   -->
<!--   ← always safe to call NProgress.done() here               -->
<!--   ← to.fullPath includes query string for analytics          -->
<!--                                                              -->
<!-- Guard execution order:                                        -->
<!--   beforeEach (global) → beforeEnter (route) →               -->
<!--   component beforeRouteEnter → afterEach (global)           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue Router vs React Router                                    -->
<!--                                                              -->
<!-- ROUTE CONFIG:                                                 -->
<!--   Vue:   createRouter({ routes: [...] })  ← central array   -->
<!--   React: <Routes><Route .../></Routes>  ← JSX in component  -->
<!--                                                              -->
<!-- PARAMS:                                                       -->
<!--   Vue:   useRoute().params.id    (string | string[])         -->
<!--   React: useParams().id          (string | undefined)        -->
<!--                                                              -->
<!-- QUERY:                                                        -->
<!--   Vue:   useRoute().query.page   (string | string[] | null)  -->
<!--   React: useSearchParams()[0].get('page')   (string | null)  -->
<!--                                                              -->
<!-- NAVIGATION:                                                   -->
<!--   Vue:   router.push({ name: 'booking-detail', params:{id}})-->
<!--   React: navigate('/bookings/' + id)                         -->
<!--                                                              -->
<!-- GUARDS:                                                       -->
<!--   Vue:   router.beforeEach()  ← centralized, runs before all-->
<!--          onBeforeRouteLeave() ← in-component                 -->
<!--   React: No built-in guards                                  -->
<!--          v6.4+ loader() runs before render (data-only)       -->
<!--          Common pattern: <Navigate to="/login" /> in render  -->
<!--                                                              -->
<!-- NESTED LAYOUTS:                                               -->
<!--   Vue:   parent has <RouterView />  → children render inside -->
<!--   React: parent has <Outlet />      → same concept, diff API -->
<!--                                                              -->
<!-- LAZY LOADING:                                                  -->
<!--   Vue:   component: () => import('./Page.vue')               -->
<!--          ← no Suspense needed (Vue handles internally)       -->
<!--   React: React.lazy(() => import('./Page'))                  -->
<!--          ← must wrap in <Suspense fallback={...}>            -->
<!--                                                              -->
<!-- ACTIVE LINKS:                                                  -->
<!--   Vue:   <RouterLink active-class="..." exact-active-class>  -->
<!--          auto-applies router-link-active to all ancestors    -->
<!--   React: <NavLink className={({ isActive }) => ...}>         -->
<!--          isActive only true for exact match by default       -->
<!--                                                              -->
<!-- SCROLL:                                                        -->
<!--   Vue:   scrollBehavior() in createRouter config             -->
<!--   React: <ScrollRestoration /> component (v6.4+)             -->
<!--                                                              -->
<!-- PROPS FROM PARAMS:                                             -->
<!--   Vue:   props: true → params injected as component props    -->
<!--   React: always via useParams() — no direct prop injection   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Testing with createMemoryHistory                             -->
<!--                                                              -->
<!-- createMemoryHistory()                                         -->
<!--   ← no real URL/browser — safe in JSDOM (vitest/jest)       -->
<!--   ← navigation still works, currentRoute updates            -->
<!--                                                              -->
<!-- Pattern:                                                      -->
<!--   const router = createRouter({ history: createMemoryHistory(), routes })-->
<!--   await router.push('/bookings/42')                           -->
<!--   await router.isReady()  ← wait for async guards/components -->
<!--   expect(router.currentRoute.value.name).toBe('booking-detail')-->
<!--                                                              -->
<!-- With Pinia (createTestingPinia):                              -->
<!--   initialState: { auth: { token: null } }  ← unauthenticated-->
<!--   initialState: { auth: { token: 'tok', user: {...} } }  ← authed-->
<!--                                                              -->
<!-- mount(App, { global: { plugins: [router, pinia] } })         -->
<!--   ← both router and pinia must be provided as plugins        -->
<!--   ← order matters: router before pinia                       -->
<!--                                                              -->
<!-- Testing onBeforeRouteLeave:                                   -->
<!--   mount component at /bookings/42/edit with isDirty = true   -->
<!--   attempt router.push('/bookings')                            -->
<!--   mock window.confirm to return false                         -->
<!--   expect router.currentRoute.value.name === 'booking-edit'   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Dynamic route matching edge cases                            -->
<!--                                                              -->
<!-- path: '/bookings/:id(\\d+)'                                   -->
<!--   ← regex \\d+ means ONLY digits match                       -->
<!--   ← /bookings/42  → matches, id = '42'                      -->
<!--   ← /bookings/abc → does NOT match → falls through to next  -->
<!--                                                              -->
<!-- onBeforeRouteUpdate (same component, params change):         -->
<!--   /bookings/42 → /bookings/99                                -->
<!--   ← component NOT re-mounted (Vue reuses instance)           -->
<!--   ← onBeforeRouteUpdate fires instead of full mount cycle    -->
<!--   ← or: watch(route.params, ...) to react to changes        -->
<!--   ← or: :key="route.path" on <component> to force re-mount  -->
<!--                                                              -->
<!-- route.matched vs route.meta:                                  -->
<!--   route.meta = ONLY the current matched route's meta         -->
<!--   route.matched = array of ALL matched records (parent + child)-->
<!--   ← to check if ANY ancestor has requiresAuth:               -->
<!--     route.matched.some(r => r.meta.requiresAuth)             -->
<!-- ============================================================ -->
