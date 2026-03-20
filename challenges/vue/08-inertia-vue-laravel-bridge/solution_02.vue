<!-- ============================================================ -->
<!-- Problem 04 — Persistent Layouts                             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- The problem: layout teardown on every navigation            -->
<!--                                                              -->
<!-- Without persistent layouts:                                  -->
<!--   User navigates /bookings → /trips → /bookings              -->
<!--   ← AppLayout is unmounted and remounted on each navigation  -->
<!--   ← sidebar scroll position resets                           -->
<!--   ← open dropdown menus close                                -->
<!--   ← any onMounted side effects in the layout re-run          -->
<!--   ← flash notifications in the layout get reset              -->
<!--                                                              -->
<!-- With persistent layouts:                                      -->
<!--   AppLayout stays mounted for all pages that declare it      -->
<!--   Only the inner page component (the <slot />) swaps         -->
<!--   ← preserves layout state across navigations                -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- defineOptions({ layout }) — declaring a persistent layout   -->
<!--                                                              -->
<!-- In every page component that should use AppLayout:           -->
<!--   import AppLayout from '@/Layouts/AppLayout.vue'            -->
<!--   defineOptions({ layout: AppLayout })                       -->
<!--                                                              -->
<!-- Inertia reads the layout option and wraps the page in it:   -->
<!--   ← AppLayout is mounted ONCE on first navigation           -->
<!--   ← subsequent navigations to pages with the SAME layout    -->
<!--     only swap the <slot /> content, not the layout           -->
<!--   ← navigating to a page with a DIFFERENT layout             -->
<!--     unmounts old layout, mounts new one                      -->
<!--   ← navigating to a page with NO layout                      -->
<!--     unmounts the layout entirely                             -->
<!--                                                              -->
<!-- In the layout component — <slot /> renders the page:         -->
<!--   <template>                                                  -->
<!--     <div class="min-h-screen">                               -->
<!--       <AppHeader />                                           -->
<!--       <main><slot /></main>   ← page component renders here  -->
<!--       <AppFooter />                                           -->
<!--     </div>                                                    -->
<!--   </template>                                                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Nested layouts — AdminLayout inside AppLayout               -->
<!--                                                              -->
<!-- Layouts can themselves declare a parent layout:              -->
<!--   // AdminLayout.vue                                          -->
<!--   import AppLayout from '@/Layouts/AppLayout.vue'            -->
<!--   defineOptions({ layout: AppLayout })                       -->
<!--                                                              -->
<!--   // Admin page component                                     -->
<!--   import AdminLayout from '@/Layouts/AdminLayout.vue'        -->
<!--   defineOptions({ layout: AdminLayout })                     -->
<!--                                                              -->
<!-- Resolution chain:                                            -->
<!--   AdminPage → AdminLayout → AppLayout                        -->
<!--   ← AppLayout renders AdminLayout in its slot                -->
<!--   ← AdminLayout renders the page in its slot                 -->
<!--   ← deepest (AppLayout) stays mounted the longest            -->
<!--                                                              -->
<!-- Array form (alternative, less common):                        -->
<!--   defineOptions({ layout: [AppLayout, AdminLayout] })         -->
<!--   ← Inertia wraps outermost first                            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- usePage() in the layout — shared data always available      -->
<!--                                                              -->
<!-- AppLayout.vue can read auth user without prop-drilling:       -->
<!--   const page = usePage()                                      -->
<!--   const user = computed(() => page.props.auth.user)          -->
<!--                                                              -->
<!-- ← page.props.auth.user updates reactively on every nav       -->
<!-- ← no need to pass user as a prop from each page component    -->
<!-- ← HandleInertiaRequests shares auth on every request         -->
<!--                                                              -->
<!-- Flash messages display in layout — visible on redirect:      -->
<!--   const flash = computed(() => page.props.flash)             -->
<!--   ← <p v-if="flash.success">{{ flash.success }}</p>          -->
<!--   ← layout stays mounted, so flash displays after redirect   -->
<!--     and clears on next navigation                            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Problem 05 — Shared Data & HandleInertiaRequests            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- HandleInertiaRequests::share() — the single source of truth -->
<!--                                                              -->
<!-- share() runs on EVERY Inertia request (full load or XHR nav)-->
<!-- Returns an array merged into page.props on every page        -->
<!--                                                              -->
<!-- What belongs in share():                                      -->
<!--   ← auth.user — who is logged in (from session)             -->
<!--   ← flash     — session flash messages                       -->
<!--   ← can       — permission flags (avoid exposing raw roles)  -->
<!--   ← ziggy     — route helper config (if using Ziggy)         -->
<!--   ← locale    — current app locale                           -->
<!--                                                              -->
<!-- What does NOT belong in share():                             -->
<!--   ← large datasets (full booking lists — put in controller)  -->
<!--   ← per-page data (trips dropdown — only needed on /create)  -->
<!--   ← sensitive data (API keys, private config)                -->
<!--                                                              -->
<!-- Lazy sharing (deferred until prop is accessed):              -->
<!--   'heavy_data' => fn() => expensiveQuery()  ← closure        -->
<!--   ← evaluated only when a page component accesses the key   -->
<!--   ← avoids running expensive queries on unrelated pages      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Problem 06 — Partial Reloads                                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- router.reload() with only — re-fetch specific props only    -->
<!--                                                              -->
<!-- router.reload({ only: ['bookings'] })                        -->
<!-- ← makes an XHR to the current URL                            -->
<!-- ← server executes the controller and returns ALL props       -->
<!-- ← Inertia client only applies the listed props               -->
<!-- ← other props (trips dropdown, shared auth) unchanged        -->
<!--                                                              -->
<!-- Use case — filter change:                                     -->
<!--   router.get('/bookings', { status: 'pending' }, {           -->
<!--     only:           ['bookings', 'total'],                   -->
<!--     preserveState:  true,   ← keep Vue component state       -->
<!--     preserveScroll: true,   ← keep scroll position           -->
<!--     replace:        true,   ← replace history entry          -->
<!--   })                                                          -->
<!--   ← trips dropdown not re-fetched (no need — it didn't change)-->
<!--   ← auth user not re-fetched (shared, stable between navs)  -->
<!--                                                              -->
<!-- Use case — live polling:                                      -->
<!--   setInterval(() => {                                         -->
<!--     router.reload({                                           -->
<!--       only:         ['bookings'],                             -->
<!--       preserveScroll: true,                                   -->
<!--     })                                                        -->
<!--   }, 30_000)                                                  -->
<!--   ← bookings list refreshes every 30s                        -->
<!--   ← user sees updated statuses without manual refresh        -->
<!--   ← scroll, open modals, form state all preserved            -->
<!--                                                              -->
<!-- except — the inverse of only:                                 -->
<!--   router.reload({ except: ['trips'] })                       -->
<!--   ← reload everything EXCEPT the trips dropdown              -->
<!--   ← use when one prop never changes (static reference data)  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- preserve-scroll and preserve-state — detailed rules         -->
<!--                                                              -->
<!-- preserveScroll: true                                         -->
<!--   ← Inertia stores scroll position before navigation         -->
<!--   ← restores it after new page/props are applied             -->
<!--   ← default: false (navigates to top of page)               -->
<!--   ← use for: pagination, filter changes, partial reloads     -->
<!--   ← use for: table row delete (list shouldn't jump to top)   -->
<!--                                                              -->
<!-- preserveState: true                                           -->
<!--   ← Vue component state (refs, reactive objects) NOT reset  -->
<!--   ← component is NOT unmounted and remounted                 -->
<!--   ← props are updated reactively                             -->
<!--   ← default: false (component remounts, state resets)        -->
<!--   ← use for: filter links where search text must be retained -->
<!--   ← use for: tabs where switching tab re-fetches props        -->
<!--              but you want the open accordion to stay open    -->
<!--                                                              -->
<!-- Combine both for best UX on filter/pagination:               -->
<!--   router.get('/bookings', filters, {                          -->
<!--     preserveScroll: true,                                     -->
<!--     preserveState:  true,                                     -->
<!--     replace:        true,   ← no browser history spam        -->
<!--   })                                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Problem 07 — form.transform() patterns                      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- transform() — common real-world transformations             -->
<!--                                                              -->
<!-- Strip empty optional fields:                                  -->
<!--   form.transform(data => ({                                   -->
<!--     ...data,                                                  -->
<!--     notes: data.notes.trim() || undefined,                    -->
<!--     ← undefined fields are omitted from JSON payload         -->
<!--   })).post('/bookings')                                       -->
<!--                                                              -->
<!-- Add computed metadata:                                        -->
<!--   form.transform(data => ({                                   -->
<!--     ...data,                                                  -->
<!--     submitted_at: new Date().toISOString(),                   -->
<!--     timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone-->
<!--   })).post('/bookings')                                       -->
<!--                                                              -->
<!-- Nest data for API consistency:                               -->
<!--   form.transform(data => ({                                   -->
<!--     booking: {                                                -->
<!--       school_name:   data.school_name.trim(),                 -->
<!--       student_count: Number(data.student_count),              -->
<!--       trip_id:       data.trip_id,                            -->
<!--     }                                                         -->
<!--   })).post('/bookings')                                       -->
<!--   ← Laravel: $request->validate(['booking.school_name' => ...])-->
<!--                                                              -->
<!-- Include file uploads:                                         -->
<!--   form.transform(data => ({                                   -->
<!--     ...data,                                                  -->
<!--     _method: 'PUT',   ← method spoofing for PUT with files   -->
<!--   })).post(`/bookings/${id}`)                                 -->
<!--   ← Inertia auto-uses FormData when files are present        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Problem 08 — Inertia vs API-first (Vue + REST) comparison  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Inertia vs API-first — core architectural difference        -->
<!--                                                              -->
<!-- INERTIA:                                                      -->
<!-- ← Laravel handles all routing (/bookings → controller)       -->
<!-- ← No Vue Router config (no routes array, no navigation guards)-->
<!-- ← No fetch() / Axios calls for page data                     -->
<!-- ← No Pinia store for remote data (props arrive as page props)-->
<!-- ← Auth via Laravel sessions — cookie-based, standard web     -->
<!-- ← One codebase, one team, one deploy                         -->
<!--                                                              -->
<!-- API-FIRST:                                                    -->
<!-- ← Vue Router owns client routing                             -->
<!-- ← Laravel serves JSON from /api/v1/* endpoints               -->
<!-- ← Pinia stores fetched data (useBookingStore.fetchBookings()) -->
<!-- ← Auth via Sanctum tokens or JWT — Authorization header      -->
<!-- ← Front end deployable to CDN separately from Laravel        -->
<!-- ← Multiple consumers: web app, mobile app, third-party API   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Validation errors — Inertia advantage                       -->
<!--                                                              -->
<!-- INERTIA:                                                      -->
<!-- ← Laravel returns 422 → Inertia maps to form.errors          -->
<!-- ← Zero glue code — no try/catch, no error parsing            -->
<!-- ← form.errors.school_name populated automatically            -->
<!-- ← form.processing goes false after 422                       -->
<!--                                                              -->
<!-- API-FIRST:                                                    -->
<!-- ← catch(err) → err.response.data.errors → parse manually     -->
<!--   or use VeeValidate / react-hook-form setError()            -->
<!-- ← must map Laravel field names to Vue field names manually   -->
<!-- ← extra boilerplate per form                                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Shared data — Inertia vs API-first                          -->
<!--                                                              -->
<!-- INERTIA:                                                      -->
<!-- ← HandleInertiaRequests::share() — one place, server-side   -->
<!-- ← auth.user, flash, can available on every page automatically-->
<!-- ← page.props.auth.user — reactive, zero extra requests       -->
<!--                                                              -->
<!-- API-FIRST:                                                    -->
<!-- ← fetch /api/v1/me on app boot → store in Pinia              -->
<!-- ← router.beforeEach guards re-check auth on every navigation -->
<!-- ← flash messages require a custom composable or notification -->
<!--   system (no built-in session flash equivalent)              -->
<!-- ← more code, more moving parts                               -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- When to choose Inertia                                       -->
<!--                                                              -->
<!-- ← Monolith: Laravel owns both routes and templates           -->
<!-- ← Team owns both front and back end                          -->
<!-- ← Standard CRUD: bookings, trips, user profiles              -->
<!-- ← Auth via sessions (no token management wanted)             -->
<!-- ← Rapid development over architectural purity                -->
<!-- ← No separate public API needed (no mobile app, no third party)-->
<!-- ← Want server-side validation wired to form UI with no glue  -->
<!--                                                              -->
<!-- When to choose API-first (Vue + Axios + Pinia):              -->
<!-- ← Multiple consumers: web + mobile + third parties share API -->
<!-- ← Front end deployed separately (CDN, Netlify, Vercel)       -->
<!-- ← Dedicated front-end and back-end teams work independently  -->
<!-- ← Real-time at scale (separate WebSocket server, SSE)        -->
<!-- ← Public API with versioning (/api/v1/, /api/v2/)            -->
<!-- ← Offline-first PWA with local state that syncs to server    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- router.reload() patterns — summary                          -->
<!--                                                              -->
<!-- Silent background refresh (no progress bar flash):           -->
<!--   router.reload({                                             -->
<!--     only:         ['bookings'],                              -->
<!--     showProgress: false,                                      -->
<!--   })                                                          -->
<!--                                                              -->
<!-- After a mutation (delete a row, keep the rest):              -->
<!--   form.delete(`/bookings/${id}`, {                            -->
<!--     preserveScroll: true,                                     -->
<!--     onSuccess: () => router.reload({ only: ['bookings', 'total'] })-->
<!--   })                                                          -->
<!--   ← row is removed, count updates, page stays in position    -->
<!--                                                              -->
<!-- Polling with Inertia (alternative to WebSockets for light use):-->
<!--   onMounted(() => {                                           -->
<!--     timer = setInterval(                                      -->
<!--       () => router.reload({ only: ['bookings'], preserveScroll: true }),-->
<!--       30_000                                                  -->
<!--     )                                                         -->
<!--   })                                                          -->
<!--   onUnmounted(() => clearInterval(timer))                     -->
<!--   ← no Echo/WebSocket setup needed for low-frequency updates -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Inertia progress bar — configuration                        -->
<!--                                                              -->
<!-- Configured in app.ts createInertiaApp({ progress: { ... } })-->
<!--                                                              -->
<!-- Options:                                                      -->
<!--   color:        '#6366f1'  ← bar colour (Tailwind indigo-500)-->
<!--   showSpinner:  true       ← spinner at the end of the bar   -->
<!--   delay:        250        ← ms before bar appears            -->
<!--                            ← avoids flicker on fast navs     -->
<!--                                                              -->
<!-- Disable per-navigation:                                       -->
<!--   router.reload({ only: ['bookings'], showProgress: false })  -->
<!--   ← background polls should be silent                        -->
<!--                                                              -->
<!-- The bar appears automatically on:                             -->
<!--   ← router.visit() / router.get() / router.post() etc.       -->
<!--   ← form.post() / form.put() / form.delete()                 -->
<!--   ← <Link> clicks                                             -->
<!-- ← nothing extra needed in component code                     -->
<!-- ============================================================ -->
