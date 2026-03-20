<!-- ============================================================ -->
<!-- Problem 01 — Inertia Page Components & usePage()           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Inertia page component structure                             -->
<!--                                                              -->
<!-- File lives in: resources/js/Pages/Bookings/Index.vue        -->
<!-- Laravel controller maps to this via:                         -->
<!--   Inertia::render('Bookings/Index', ['bookings' => ...])     -->
<!--                                                              -->
<!-- The component is a standard Vue SFC — no special base class  -->
<!-- or mixin required. Inertia delivers props at page load.      -->
<!--                                                              -->
<!-- defineProps receives exactly what the controller passes:     -->
<!--   const props = defineProps<{                                -->
<!--     bookings: Booking[]                                      -->
<!--     total:    number                                          -->
<!--   }>()                                                        -->
<!-- ← props are populated BEFORE the component mounts            -->
<!-- ← no onMounted fetch needed — data arrives with the page     -->
<!-- ← prop names must match the controller's array keys exactly  -->
<!--   (Laravel snake_case → keep snake_case or use camelCase     -->
<!--    consistently across controller and component)             -->
<!--                                                              -->
<!-- On first load:   props injected from full HTML payload       -->
<!-- On navigation:  Inertia XHR returns JSON, props re-injected  -->
<!-- ← component is re-mounted on each navigation (unless layout) -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- TypeScript interfaces for page and shared props             -->
<!--                                                              -->
<!-- Per-page props — typed per component:                        -->
<!--   interface BookingsIndexProps {                              -->
<!--     bookings: Booking[]                                      -->
<!--     total:    number                                          -->
<!--   }                                                           -->
<!--   const props = defineProps<BookingsIndexProps>()             -->
<!--                                                              -->
<!-- Shared props — available on every page via usePage():         -->
<!--   interface SharedProps {                                     -->
<!--     auth:  { user: User | null }                             -->
<!--     flash: { success: string | null; error: string | null }  -->
<!--     can:   { createBooking: boolean; manageTrips: boolean }  -->
<!--   }                                                           -->
<!--                                                              -->
<!-- Global augmentation — type usePage() across all components:  -->
<!--   // types/inertia.d.ts                                       -->
<!--   import '@inertiajs/vue3'                                    -->
<!--   declare module '@inertiajs/vue3' {                          -->
<!--     interface PageProps extends SharedProps {}                -->
<!--   }                                                           -->
<!--   ← after this, usePage().props.auth.user is typed everywhere -->
<!--   ← no generic needed: usePage() instead of usePage<SharedProps>()-->
<!--                                                              -->
<!-- BookingsIndex full typed example:                             -->
<!--   <script setup lang="ts">                                    -->
<!--   import type { Booking } from '@/types/inertia'             -->
<!--   const props = defineProps<{ bookings: Booking[]; total: number }>()-->
<!--   // props.bookings → Booking[]  (typed)                      -->
<!--   // props.total    → number     (typed)                      -->
<!--   </script>                                                    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- usePage() — accessing shared data on any page component     -->
<!--                                                              -->
<!-- import { usePage } from '@inertiajs/vue3'                    -->
<!-- const page = usePage()                                        -->
<!--                                                              -->
<!-- page.props         — merged object: page props + shared props-->
<!-- page.component     — string name: 'Bookings/Index'           -->
<!-- page.url           — current URL: '/bookings?status=pending' -->
<!-- page.version       — asset version string (for cache-busting)-->
<!--                                                              -->
<!-- Accessing shared auth user:                                   -->
<!--   const user = computed(() => page.props.auth.user)          -->
<!--   ← reactive: updates if auth state changes mid-session      -->
<!--                                                              -->
<!-- Accessing flash messages:                                     -->
<!--   const flash = computed(() => page.props.flash)             -->
<!--   ← set by Laravel: redirect()->with('success', 'Saved.')    -->
<!--   ← Inertia picks up session flash in HandleInertiaRequests  -->
<!--   ← flash is present on the first page load after redirect   -->
<!--                                                              -->
<!-- Accessing can-permissions:                                    -->
<!--   const canCreate = computed(() => page.props.can.createBooking)-->
<!--   ← set in HandleInertiaRequests::share() using Policy checks-->
<!--   ← use to conditionally show/hide UI (not replace server auth)-->
<!--                                                              -->
<!-- page.props is reactive — wraps Vue shallowReactive internally -->
<!-- ← do not destructure at top level (loses reactivity)         -->
<!-- ← always use computed() to derive values from page.props     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- usePage() — flash message display pattern                   -->
<!--                                                              -->
<!-- Flash messages appear in page.props.flash after a redirect:  -->
<!--   <p v-if="flash.success">{{ flash.success }}</p>            -->
<!--   <p v-if="flash.error">{{ flash.error }}</p>                 -->
<!--                                                              -->
<!-- Session flash is consumed on ONE request:                     -->
<!--   ← controller: redirect()->with('success', 'Booking saved.')-->
<!--   ← Inertia visit to /bookings → flash.success populated     -->
<!--   ← next navigation → flash.success is null again            -->
<!--                                                              -->
<!-- Auto-dismiss pattern (watch flash, clear after 4s):          -->
<!--   watch(() => page.props.flash.success, (msg) => {           -->
<!--     if (msg) setTimeout(() => (showFlash.value = false), 4000)-->
<!--   }, { immediate: true })                                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Problem 02 — useForm()                                       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useForm() — initial state and structure                      -->
<!--                                                              -->
<!-- import { useForm } from '@inertiajs/vue3'                    -->
<!--                                                              -->
<!-- const form = useForm({                                        -->
<!--   school_name:   '',                                          -->
<!--   contact_email: '',                                          -->
<!--   trip_id:       null as number | null,                       -->
<!--   student_count: 1,                                           -->
<!--   notes:         '',                                          -->
<!-- })                                                            -->
<!--                                                              -->
<!-- form.data()             — plain object of current values     -->
<!-- form.errors             — { school_name: 'Required', ... }   -->
<!-- form.processing         — true while XHR is in flight        -->
<!-- form.recentlySuccessful — true for ~2s after success         -->
<!-- form.wasSuccessful      — true after any success (stays true)-->
<!-- form.isDirty            — true if values differ from initial  -->
<!-- form.hasErrors          — true if any field has an error     -->
<!--                                                              -->
<!-- form is reactive — bind directly with v-model:               -->
<!--   <input v-model="form.school_name" />                       -->
<!--   ← no ref() wrapping needed                                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- form.errors — auto-populated from Laravel 422 response      -->
<!--                                                              -->
<!-- When Laravel returns a 422 Unprocessable Entity:            -->
<!--   {                                                           -->
<!--     "message": "The given data was invalid.",                 -->
<!--     "errors": {                                               -->
<!--       "school_name": ["The school name field is required."],  -->
<!--       "trip_id":     ["The selected trip is invalid."]        -->
<!--     }                                                         -->
<!--   }                                                           -->
<!--                                                              -->
<!-- Inertia automatically maps this to form.errors:              -->
<!--   form.errors.school_name → "The school name field is required."-->
<!--   form.errors.trip_id     → "The selected trip is invalid."  -->
<!--                                                              -->
<!-- Only the first error message per field is populated          -->
<!--                                                              -->
<!-- Template display:                                             -->
<!--   <input v-model="form.school_name" />                       -->
<!--   <p v-if="form.errors.school_name" class="text-red-500">   -->
<!--     {{ form.errors.school_name }}                             -->
<!--   </p>                                                        -->
<!--                                                              -->
<!-- No try/catch required — errors appear automatically          -->
<!-- form.processing goes false after the 422 response           -->
<!-- ← user can correct and resubmit immediately                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- form.post() / form.put() / form.delete() — submission       -->
<!--                                                              -->
<!-- POST — create resource:                                       -->
<!--   form.post('/bookings', {                                    -->
<!--     onSuccess: () => form.reset(),                           -->
<!--     onError:   (errors) => console.log(errors),              -->
<!--     onFinish:  () => console.log('request finished'),        -->
<!--   })                                                          -->
<!--                                                              -->
<!-- PUT — full update:                                            -->
<!--   form.put(`/bookings/${id}`, {                               -->
<!--     preserveScroll: true,   ← keep page scroll after success -->
<!--   })                                                          -->
<!--                                                              -->
<!-- PATCH — partial update:                                       -->
<!--   form.patch(`/bookings/${id}`)                              -->
<!--                                                              -->
<!-- DELETE:                                                       -->
<!--   form.delete(`/bookings/${id}`, {                            -->
<!--     onSuccess: () => router.visit('/bookings'),               -->
<!--   })                                                          -->
<!--                                                              -->
<!-- Callbacks:                                                    -->
<!--   onBefore:  (visit) => confirm('Sure?') || visit.cancel()   -->
<!--   onStart:   (visit) => ...                                   -->
<!--   onProgress:(event) => console.log(event.percentage)        -->
<!--   onSuccess: (page)  => form.reset()                         -->
<!--   onError:   (errors)=> form.setError(errors)  ← auto, but   -->
<!--                         can override here                     -->
<!--   onFinish:  ()      => cleanup regardless of outcome        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- form.reset() / form.setError() / form.clearErrors()         -->
<!--                                                              -->
<!-- reset() — back to initial values:                             -->
<!--   form.reset()                   ← all fields               -->
<!--   form.reset('school_name')      ← one field                 -->
<!--   form.reset('notes', 'trip_id') ← named fields             -->
<!--   ← also clears form.errors and form.wasSuccessful           -->
<!--                                                              -->
<!-- setError() — manually inject errors:                          -->
<!--   form.setError('trip_id', 'Fully booked.')                  -->
<!--   form.setError({ school_name: 'Duplicate.', trip_id: 'Full'})-->
<!--   ← useful for client-side async checks (e.g. capacity check)-->
<!--   ← merges with existing errors                              -->
<!--                                                              -->
<!-- clearErrors() — remove errors:                               -->
<!--   form.clearErrors()              ← all errors               -->
<!--   form.clearErrors('school_name') ← one field                -->
<!--   ← call on input focus to give user a clean slate           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- form.transform() — modify payload before send               -->
<!--                                                              -->
<!-- form.transform((data) => ({                                   -->
<!--   ...data,                                                    -->
<!--   school_name: data.school_name.trim().toUpperCase(),         -->
<!--   booking_ref: `TRP-${Date.now()}`,                          -->
<!--   notes:       data.notes || undefined,  ← omit if empty     -->
<!-- })).post('/bookings')                                         -->
<!--                                                              -->
<!-- ← form.school_name in the UI is unchanged                    -->
<!-- ← only the wire payload is transformed                       -->
<!-- ← transform() returns the same form instance (chainable)     -->
<!--                                                              -->
<!-- Use cases:                                                    -->
<!--   ← format dates before sending (ISO8601)                    -->
<!--   ← trim/uppercase strings                                    -->
<!--   ← add computed fields not tracked by the form              -->
<!--   ← strip empty optional fields (send undefined, not '')     -->
<!--   ← nest data: { booking: { ...data } } for API consistency  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Problem 03 — Link Component                                  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Link component — SPA navigation                              -->
<!--                                                              -->
<!-- import { Link } from '@inertiajs/vue3'                       -->
<!--                                                              -->
<!-- Replaces <a href> for all internal Laravel routes:           -->
<!--   <Link href="/bookings">All Bookings</Link>                  -->
<!--   ← intercepts click → XHR with X-Inertia header             -->
<!--   ← Laravel returns JSON (not full HTML)                     -->
<!--   ← Inertia swaps the page component                         -->
<!--   ← browser history entry added (pushState)                  -->
<!--                                                              -->
<!-- method — non-GET requests (uses hidden form spoofing):       -->
<!--   <Link href="/bookings/42" method="delete" as="button">     -->
<!--     Cancel                                                    -->
<!--   </Link>                                                     -->
<!--   ← as="button" renders a <button> instead of <a>            -->
<!--   ← use for DELETE/POST/PUT from nav links                    -->
<!--                                                              -->
<!-- :data — pass additional request data:                        -->
<!--   <Link href="/bookings/42" method="post"                     -->
<!--         :data="{ _action: 'confirm' }">Confirm</Link>         -->
<!--                                                              -->
<!-- preserve-scroll — don't scroll to top on navigation:         -->
<!--   <Link href="/bookings?page=2" preserve-scroll>Next</Link>   -->
<!--   ← useful for pagination, filter links                      -->
<!--                                                              -->
<!-- preserve-state — keep Vue component state (refs, open panels):-->
<!--   <Link href="/bookings?status=paid" preserve-state>Paid</Link>-->
<!--   ← useful when applying filters — keeps search input text   -->
<!--                                                              -->
<!-- replace — replace history entry instead of push:             -->
<!--   <Link href="/bookings" replace>Back</Link>                  -->
<!--   ← user can't go "forward" back to this link's origin       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Link vs router.visit() vs <a> — decision guide              -->
<!--                                                              -->
<!-- <a href="/bookings">                                          -->
<!--   ← full browser navigation (page reload, no Inertia)        -->
<!--   ← use ONLY for: external URLs, file downloads, force reload -->
<!--   ← session flash messages survive (they're in the session)  -->
<!--   ← Inertia shared state NOT preserved                       -->
<!--                                                              -->
<!-- <Link href="/bookings">                                       -->
<!--   ← Inertia SPA navigation (XHR, component swap)             -->
<!--   ← use for: all internal Laravel routes in templates        -->
<!--   ← layout stays mounted (if using persistent layouts)       -->
<!--                                                              -->
<!-- router.visit('/bookings')                                     -->
<!--   ← same as Link but called from JavaScript                  -->
<!--   ← use for: navigation inside event handlers, after promises-->
<!--   ← import { router } from '@inertiajs/vue3'                 -->
<!--                                                              -->
<!-- router.get / post / put / patch / delete                     -->
<!--   ← semantic HTTP method shortcuts                           -->
<!--   ← use when the method conveys intent clearly               -->
<!--   ← router.delete(`/bookings/${id}`) — explicit and readable -->
<!-- ============================================================ -->
