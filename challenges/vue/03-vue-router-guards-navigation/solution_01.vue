<!-- ============================================================ -->
<!-- Problem 01 — Vue Router Config & Navigation Guards          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- createRouter setup                                           -->
<!--                                                              -->
<!-- import { createRouter, createWebHistory, RouteRecordRaw }   -->
<!--   from 'vue-router'                                          -->
<!--                                                              -->
<!-- createRouter({                                               -->
<!--   history: createWebHistory()  ← HTML5 pushState (clean URLs)-->
<!--   routes,                                                    -->
<!--   scrollBehavior(to, from, savedPosition) { ... }           -->
<!-- })                                                           -->
<!--                                                              -->
<!-- history options:                                             -->
<!--   createWebHistory()    → /bookings/42  (needs server config)-->
<!--   createWebHashHistory()→ /#/bookings/42 (no server config) -->
<!--   createMemoryHistory() → no URL (tests, SSR)               -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Route record shape (RouteRecordRaw)                          -->
<!--                                                              -->
<!-- {                                                            -->
<!--   path:      '/bookings/:id(\\d+)'  ← regex constraint      -->
<!--   name:      'booking-detail'        ← named route           -->
<!--   component: () => import('./Page.vue')  ← lazy loaded      -->
<!--   meta:      { requiresAuth: true, title: 'Detail' }        -->
<!--   props:     true  ← params passed as component props       -->
<!--   redirect:  '/bookings'  or  { name: 'bookings' }          -->
<!--   children:  [...]  ← nested routes                         -->
<!--   beforeEnter: (to, from, next) => { ... }  ← per-route    -->
<!-- }                                                            -->
<!--                                                              -->
<!-- Catch-all:                                                   -->
<!--   path: '/:pathMatch(.*)*'  ← matches any unmatched path    -->
<!--   redirect: { name: 'not-found' }                           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- RouteMeta TypeScript extension                               -->
<!--                                                              -->
<!-- declare module 'vue-router' {                                -->
<!--   interface RouteMeta {                                      -->
<!--     requiresAuth?: boolean                                   -->
<!--     requiresRole?: 'admin' | 'school_admin'                  -->
<!--     title?:        string                                    -->
<!--   }                                                          -->
<!-- }                                                            -->
<!-- ← extends the RouteMeta interface globally                   -->
<!-- ← to.meta.requiresAuth now TypeScript-typed                  -->
<!-- ← put in env.d.ts or at top of router/index.ts              -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- scrollBehavior                                               -->
<!--                                                              -->
<!-- scrollBehavior(to, from, savedPosition) {                    -->
<!--   if (savedPosition) return savedPosition  ← back/forward   -->
<!--   if (to.hash)       return { el: to.hash, behavior:'smooth'}-->
<!--   return { top: 0 }  ← new navigation: scroll to top        -->
<!-- }                                                            -->
<!--                                                              -->
<!-- savedPosition: populated when browser back/forward pressed   -->
<!--   → restores user's previous scroll position                 -->
<!-- to.hash: anchor link (#section) → smooth scroll to element  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Global beforeEach guard                                      -->
<!--                                                              -->
<!-- router.beforeEach((to, from, next) => { ... })              -->
<!--                                                              -->
<!-- Flow:                                                        -->
<!--   1. Set document.title from to.meta.title                  -->
<!--   2. if !to.meta.requiresAuth → next()  (public route)      -->
<!--   3. if !auth.isAuthenticated →                              -->
<!--        next({ name: 'login', query: { redirect: to.fullPath }})-->
<!--      ← store intended URL in query for post-login redirect   -->
<!--   4. if to.meta.requiresRole && user.role !== requiresRole → -->
<!--        next({ name: 'not-found' })  ← wrong role            -->
<!--   5. next()  ← all checks passed                            -->
<!--                                                              -->
<!-- next() options:                                              -->
<!--   next()              → proceed                              -->
<!--   next(false)         → cancel (stay on current route)      -->
<!--   next('/path')       → redirect to string path             -->
<!--   next({ name: '...'})→ redirect to named route             -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Per-route beforeEnter guard                                  -->
<!--                                                              -->
<!-- { path: '/login', beforeEnter: (_to, _from, next) => {      -->
<!--   const auth = useAuthStore()                                -->
<!--   auth.isAuthenticated ? next('/bookings') : next()          -->
<!-- }}                                                           -->
<!--                                                              -->
<!-- ← runs after global beforeEach, before component setup      -->
<!-- ← use for route-specific logic (redirect if already authed) -->
<!-- ← same next() API as beforeEach                             -->
<!-- ← can be array of guards: beforeEnter: [guard1, guard2]     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- onBeforeRouteLeave — in-component guard                      -->
<!--                                                              -->
<!-- import { onBeforeRouteLeave } from 'vue-router'              -->
<!--                                                              -->
<!-- onBeforeRouteLeave((_to, _from) => {                         -->
<!--   if (isDirty.value && !isSaving.value) {                    -->
<!--     const ok = window.confirm('Leave? You have unsaved changes')-->
<!--     if (!ok) return false  ← cancel navigation              -->
<!--   }                                                          -->
<!--   // return undefined / nothing → allow navigation           -->
<!-- })                                                           -->
<!--                                                              -->
<!-- ← runs AFTER global beforeEach, before component unmounts   -->
<!-- ← return false cancels the navigation                        -->
<!-- ← isSaving flag prevents guard firing after intentional save -->
<!-- ← onBeforeRouteUpdate: same component, params change         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useRouter + useRoute                                          -->
<!--                                                              -->
<!-- const router = useRouter()  ← router instance               -->
<!-- const route  = useRoute()   ← current route (reactive)      -->
<!--                                                              -->
<!-- route.params.id          → string | string[]                 -->
<!-- route.query.page         → string | string[] | null          -->
<!-- route.name               → string | null | symbol            -->
<!-- route.path               → '/bookings/42'                    -->
<!-- route.fullPath           → '/bookings/42?status=pending'     -->
<!-- route.meta.requiresAuth  → typed via RouteMeta extension     -->
<!-- route.matched            → array of matched RouteRecord      -->
<!--   ← matched[0] = root layout, matched[-1] = current page    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Programmatic navigation                                      -->
<!--                                                              -->
<!-- router.push({ name: 'booking-detail', params: { id: 42 } }) -->
<!--   ← named route: safer than string paths (refactor-safe)    -->
<!--                                                              -->
<!-- router.push({ name: 'bookings', query: { status: 'pending' }})-->
<!--   ← query params appended: /bookings?status=pending         -->
<!--                                                              -->
<!-- router.replace({ name: 'bookings' })                         -->
<!--   ← no history entry: user can't press Back to return here  -->
<!--   ← use after login redirect, after form submit             -->
<!--                                                              -->
<!-- router.back()  /  router.go(-1)                              -->
<!--   ← equivalent: go back one entry in history                -->
<!--                                                              -->
<!-- await router.push(...)  ← returns NavigationFailure | undefined-->
<!--   ← undefined = success, NavigationFailure = aborted        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- RouterLink                                                    -->
<!--                                                              -->
<!-- <RouterLink :to="{ name: 'bookings' }">                      -->
<!--   Basic — resolves to href, applies router-link-active       -->
<!-- </RouterLink>                                                 -->
<!--                                                              -->
<!-- active-class="bg-blue-100"       ← any ancestor match       -->
<!-- exact-active-class="font-bold"   ← exact path match only    -->
<!--                                                              -->
<!-- v-slot for custom active styling:                            -->
<!-- <RouterLink v-slot="{ href, isActive, navigate }" :to="..." custom>-->
<!--   <a :href="href" :class="isActive && 'active'" @click="navigate">-->
<!--   ← 'custom' suppresses default <a> render                  -->
<!--   ← navigate() handles middle-click, ctrl-click correctly   -->
<!--                                                              -->
<!-- :to with params:                                              -->
<!-- <RouterLink :to="{ name: 'booking-detail', params: { id } }">-->
<!--   ← preferred over string template literals                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- props: true — params as component props                      -->
<!--                                                              -->
<!-- Route:     { path: '/bookings/:id', props: true, ... }      -->
<!-- Component: const props = defineProps<{ id: string }>()      -->
<!--            ← id is passed as prop, not via useRoute()        -->
<!--                                                              -->
<!-- When to use:                                                  -->
<!--   ✅ Component is reusable — doesn't depend on route         -->
<!--   ✅ Cleaner component API — props are explicit             -->
<!--                                                              -->
<!-- When to use useRoute() instead:                               -->
<!--   When you also need query params, meta, or route.name       -->
<!--   When the component is tightly coupled to routing           -->
<!-- ============================================================ -->
