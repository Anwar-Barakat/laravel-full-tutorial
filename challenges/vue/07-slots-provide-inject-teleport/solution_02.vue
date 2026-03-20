<!-- ============================================================ -->
<!-- Problem 02 — Provide / Inject · Teleport                   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- provide() / inject() — basic concept                        -->
<!--                                                              -->
<!-- provide() makes a value available to ALL descendants,        -->
<!-- regardless of how deep they are in the component tree.       -->
<!-- inject() retrieves that value without prop-drilling.         -->
<!--                                                              -->
<!-- In AppLayout.vue (ancestor):                                 -->
<!--   import { provide, ref } from 'vue'                         -->
<!--   const currentUser = ref<User | null>(null)                 -->
<!--   provide('currentUser', currentUser)                        -->
<!--   ← first arg: key (string or Symbol)                       -->
<!--   ← second arg: value to share (any type)                   -->
<!--                                                              -->
<!-- In BookingForm.vue (deep descendant):                        -->
<!--   import { inject } from 'vue'                               -->
<!--   const currentUser = inject<Ref<User | null>>('currentUser')-->
<!--   ← returns the provided value, or undefined if not found   -->
<!--                                                              -->
<!-- String keys work but have no type safety — see InjectionKey  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- InjectionKey<T> — Symbol-based type-safe keys               -->
<!--                                                              -->
<!-- Define keys in a shared file (e.g. src/injection-keys.ts).  -->
<!-- Both provider and consumer import the same key Symbol.       -->
<!-- TypeScript links the provide value type to inject return type.-->
<!--                                                              -->
<!-- In src/injection-keys.ts:                                    -->
<!--   import type { InjectionKey, Ref } from 'vue'               -->
<!--   import type { User, Theme, Notification } from '@/types'   -->
<!--                                                              -->
<!--   export const CurrentUserKey: InjectionKey<Ref<User | null>>-->
<!--     = Symbol('currentUser')                                  -->
<!--                                                              -->
<!--   export const ThemeKey: InjectionKey<Ref<Theme>>           -->
<!--     = Symbol('theme')                                        -->
<!--                                                              -->
<!--   export const NotificationsKey: InjectionKey<{             -->
<!--     items:   Ref<Notification[]>                             -->
<!--     add:     (n: Notification) => void                       -->
<!--     dismiss: (id: number) => void                            -->
<!--   }> = Symbol('notifications')                               -->
<!--                                                              -->
<!-- ← InjectionKey<T> is a branded Symbol — T is the value type -->
<!-- ← TypeScript ensures provide(key, value) matches T          -->
<!-- ← TypeScript infers inject(key) return type as T | undefined -->
<!-- ← Symbols are unique: no accidental key collision across libs-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Reactive provide — injected values stay live                 -->
<!--                                                              -->
<!-- Providing a ref (or reactive object) means the injected      -->
<!-- value updates in every consumer when the ancestor changes it.-->
<!-- Providing a raw unwrapped primitive is a static snapshot.    -->
<!--                                                              -->
<!-- In AppLayout.vue:                                            -->
<!--   const currentUser = ref<User | null>(null)                 -->
<!--                                                              -->
<!--   ✅ CORRECT — provide the ref itself:                       -->
<!--   provide(CurrentUserKey, currentUser)                       -->
<!--   ← consumers receive Ref<User | null>                      -->
<!--   ← when currentUser.value changes in AppLayout,            -->
<!--     every injector sees the new value immediately            -->
<!--                                                              -->
<!--   ❌ WRONG — unwrapping loses reactivity:                    -->
<!--   provide(CurrentUserKey, currentUser.value)                 -->
<!--   ← consumers receive a static User | null snapshot         -->
<!--   ← they never see future updates                           -->
<!--                                                              -->
<!-- Same rule applies to reactive():                             -->
<!--   const filters = reactive({ status: '', search: '' })      -->
<!--   provide(FiltersKey, filters)   ← reactive object = live   -->
<!--   provide(FiltersKey, { ...filters })  ← plain copy = dead  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- inject with default value                                    -->
<!--                                                              -->
<!-- inject() returns undefined when no ancestor provides the key.-->
<!-- Pass a second argument to provide a fallback.               -->
<!--                                                              -->
<!-- Without default — result may be undefined:                   -->
<!--   const theme = inject(ThemeKey)                             -->
<!--   ← TypeScript type: Ref<Theme> | undefined                 -->
<!--   ← must null-check before using theme.value               -->
<!--                                                              -->
<!-- With static default — never undefined:                       -->
<!--   const theme = inject(ThemeKey, ref<Theme>({ mode: 'light', accentColor: '#3B82F6' }))-->
<!--   ← TypeScript type: Ref<Theme>  (undefined removed)        -->
<!--   ← default is evaluated eagerly on every call              -->
<!--                                                              -->
<!-- With factory default (lazy) — use when default is expensive:-->
<!--   const theme = inject(ThemeKey,                             -->
<!--     () => ref<Theme>({ mode: 'light', accentColor: '#3B82F6' }),-->
<!--     true   ← third arg: treat second arg as factory         -->
<!--   )                                                          -->
<!--   ← factory only called when the key is not provided         -->
<!--   ← prevents unnecessary object creation on every render    -->
<!--                                                              -->
<!-- In Tripz context — BookingDetailPage.vue:                   -->
<!--   const currentUser = inject(CurrentUserKey,                 -->
<!--     readonly(ref<User | null>(null))                         -->
<!--   )                                                          -->
<!--   ← page still works even outside AppLayout (tests, Storybook)-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Symbol InjectionKey pattern — full flow summary             -->
<!--                                                              -->
<!-- STEP 1: Define shared key in src/injection-keys.ts          -->
<!--   export const CurrentUserKey: InjectionKey<Ref<User | null>>-->
<!--     = Symbol('currentUser')                                  -->
<!--                                                              -->
<!-- STEP 2: Provide in AppLayout.vue                             -->
<!--   import { CurrentUserKey } from '@/injection-keys'         -->
<!--   const user = ref<User | null>(null)                        -->
<!--   onMounted(() => auth.fetchCurrentUser().then(u => user.value = u))-->
<!--   provide(CurrentUserKey, user)                              -->
<!--                                                              -->
<!-- STEP 3: Inject in any descendant (e.g. BookingForm.vue)     -->
<!--   import { CurrentUserKey } from '@/injection-keys'         -->
<!--   const currentUser = inject(CurrentUserKey)                 -->
<!--   ← TypeScript: Ref<User | null> | undefined                -->
<!--   currentUser?.value?.id   ← safe access                    -->
<!--                                                              -->
<!-- KEY BENEFITS of InjectionKey<T> over string keys:           -->
<!--   ← TypeScript validates both sides automatically           -->
<!--   ← No typo risk (string 'currentUser' vs 'CurrentUser')    -->
<!--   ← Symbol guarantees uniqueness — safe in libs/plugins      -->
<!--   ← Rename refactoring is safe (import, not string match)   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Providing store-like data from AppLayout                     -->
<!--                                                              -->
<!-- AppLayout.vue acts as the root provider for cross-cutting    -->
<!-- concerns. Any component in the page tree can inject without  -->
<!-- receiving them as props through every intermediate layer.    -->
<!--                                                              -->
<!-- AppLayout provides three things:                             -->
<!--                                                              -->
<!-- 1. currentUser — from auth store, reactive ref              -->
<!--    provide(CurrentUserKey, auth.currentUser)                 -->
<!--    ← auth.currentUser is already a Ref from Pinia           -->
<!--                                                              -->
<!-- 2. theme — local reactive ref + expose setter               -->
<!--    const theme = ref<Theme>({ mode: 'light', ... })          -->
<!--    provide(ThemeKey, {                                        -->
<!--      theme: readonly(theme),   ← children read only         -->
<!--      setTheme: (t) => Object.assign(theme.value, t),         -->
<!--    })                                                         -->
<!--                                                              -->
<!-- 3. notifications — shared array + add/dismiss methods       -->
<!--    const notifications = ref<Notification[]>([])             -->
<!--    provide(NotificationsKey, {                               -->
<!--      items:   notifications,                                  -->
<!--      add:     (n) => notifications.value.unshift(n),         -->
<!--      dismiss: (id) => {                                       -->
<!--        notifications.value = notifications.value             -->
<!--          .filter(n => n.id !== id)                           -->
<!--      },                                                       -->
<!--    })                                                         -->
<!--                                                              -->
<!-- Any page component (BookingDetailPage, TripPage, etc.) can  -->
<!-- inject notifications and call .add() after a successful API  -->
<!-- action — no props needed from AppLayout to the page.         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- readonly() provide — prevent child mutations                 -->
<!--                                                              -->
<!-- By default a provided ref can be mutated by any injector.   -->
<!-- Wrapping in readonly() enforces unidirectional data flow.    -->
<!--                                                              -->
<!-- AppLayout.vue:                                               -->
<!--   const theme = ref<Theme>({ mode: 'light', accentColor: '#3B82F6' })-->
<!--   provide(ThemeKey, readonly(theme))                         -->
<!--   ← injectors receive ReadonlyRef<Theme>                    -->
<!--   ← TypeScript error if injector tries: theme.value.mode = 'dark'-->
<!--                                                              -->
<!-- Expose a mutator alongside the readonly value:               -->
<!--   provide(ThemeKey, {                                        -->
<!--     value:    readonly(theme),                               -->
<!--     setMode:  (m: 'light' | 'dark') => { theme.value.mode = m }-->
<!--   })                                                         -->
<!--   ← child calls setMode('dark') — AppLayout performs the    -->
<!--     actual mutation — child cannot bypass the setter         -->
<!--                                                              -->
<!-- This mirrors Pinia store pattern:                            -->
<!--   ← state exposed as readonly getters                       -->
<!--   ← mutations only via defined actions                       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Teleport — render to a different DOM node                    -->
<!--                                                              -->
<!-- <Teleport to="body"> renders its children as a direct child  -->
<!-- of <body>, regardless of where the component sits in the     -->
<!-- Vue component tree.                                          -->
<!--                                                              -->
<!-- WHY: modals inside deeply nested components with             -->
<!--   overflow: hidden or a stacking context (z-index) will be  -->
<!--   clipped. Teleporting to <body> escapes all ancestor styles.-->
<!--                                                              -->
<!-- COMPONENT TREE vs DOM TREE after Teleport:                   -->
<!--   Component tree:  AppLayout > BookingPage > BookingTable   -->
<!--                    > BookingRow > CancelModal               -->
<!--   DOM tree:        <body>                                    -->
<!--                      <div id="app">...</div>                 -->
<!--                      <div class="modal-backdrop">...</div>   -->
<!--                    ← modal is OUTSIDE #app in the DOM        -->
<!--                    ← but INSIDE CancelModal in the component tree-->
<!--                                                              -->
<!-- State, events, and v-model still belong to CancelModal.      -->
<!-- Teleport only moves the rendered DOM — not the component.   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Teleport `to` prop — target selectors                       -->
<!--                                                              -->
<!-- to="body"            — appends to document body              -->
<!-- to="#modals"         — dedicated portal div in index.html    -->
<!-- to="#toasts"         — separate stack for toast messages     -->
<!-- to=".drawer-host"    — CSS class selector (first match)      -->
<!-- :to="dynamicTarget"  — reactive: changes target when ref changes-->
<!--                                                              -->
<!-- Recommended index.html setup for layered portals:           -->
<!--   <body>                                                     -->
<!--     <div id="app"></div>                                     -->
<!--     <div id="modals"></div>   ← z-index: 100                -->
<!--     <div id="toasts"></div>   ← z-index: 200                -->
<!--     <div id="drawers"></div>  ← z-index: 150                -->
<!--   </body>                                                    -->
<!--                                                              -->
<!-- Toast component:                                             -->
<!--   <Teleport to="#toasts">                                    -->
<!--     <transition name="slide-up">                             -->
<!--       <ToastMessage v-if="toast.visible" :message="toast.message" />-->
<!--     </transition>                                            -->
<!--   </Teleport>                                                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Teleport `disabled` prop — render in-place when disabled    -->
<!--                                                              -->
<!-- :disabled="true"   → children render in the component's     -->
<!--                       normal DOM position (no teleport)      -->
<!-- :disabled="false"  → children teleport to the target        -->
<!--                                                              -->
<!-- USE CASES for disabled:                                      -->
<!--   ← vitest / @vue/test-utils: avoid attaching to <body>     -->
<!--     in jsdom test environment (causes leaking DOM nodes)     -->
<!--   ← Storybook: show modal inline in the story canvas        -->
<!--   ← responsive embed: render inline on mobile, teleport on  -->
<!--     desktop where overflow contexts are more complex         -->
<!--                                                              -->
<!-- In BaseModal.vue:                                            -->
<!--   defineProps<{ open: boolean; inline: boolean }>()          -->
<!--   <Teleport to="body" :disabled="props.inline">             -->
<!--     <div v-if="props.open" class="modal-backdrop">...</div>  -->
<!--   </Teleport>                                                 -->
<!--                                                              -->
<!-- In tests:                                                    -->
<!--   mount(BaseModal, { props: { open: true, inline: true } })  -->
<!--   ← modal renders inside the wrapper, not in document.body  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- v-if on Teleport content — two valid patterns               -->
<!--                                                              -->
<!-- PATTERN A — v-if on child (most common):                    -->
<!--   <Teleport to="body">                                       -->
<!--     <div v-if="showModal" class="modal-backdrop">           -->
<!--       <BaseModal @close="showModal = false" />               -->
<!--     </div>                                                    -->
<!--   </Teleport>                                                 -->
<!--   ← Teleport port remains mounted                            -->
<!--   ← only the backdrop div is toggled in/out of the DOM      -->
<!--   ← cheaper toggle: no Teleport teardown/rebuild             -->
<!--   ← recommended for modals that open/close frequently        -->
<!--                                                              -->
<!-- PATTERN B — v-if on <Teleport> itself:                      -->
<!--   <Teleport v-if="showModal" to="body">                      -->
<!--     <div class="modal-backdrop">                             -->
<!--       <BaseModal @close="showModal = false" />               -->
<!--     </div>                                                    -->
<!--   </Teleport>                                                 -->
<!--   ← entire Teleport is destroyed when showModal = false      -->
<!--   ← portal node removed from target entirely                 -->
<!--   ← use when full unmount is needed (e.g. for heavy children)-->
<!--   ← slightly more expensive toggle                           -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- BaseModal — named slots + Teleport combined                  -->
<!--                                                              -->
<!-- BaseModal.vue provides a reusable shell:                     -->
<!--   ← <Teleport to="body"> handles the DOM placement          -->
<!--   ← three named slots give consumers full layout control     -->
<!--   ← conditional footer wrapper avoids empty DOM node        -->
<!--                                                              -->
<!-- SLOT MAP:                                                     -->
<!--   #header  — modal title area; falls back to :title prop    -->
<!--   default  — modal body content (scrollable)                 -->
<!--   #footer  — action buttons; wrapper only renders if filled -->
<!--                                                              -->
<!-- SLOT EXISTENCE CHECK in BaseModal template:                  -->
<!--   <footer v-if="$slots.footer" class="modal-footer">        -->
<!--     <slot name="footer" />                                   -->
<!--   </footer>                                                  -->
<!--   ← $slots.footer is truthy only when parent fills it        -->
<!--   ← no empty <footer> rendered when parent omits it          -->
<!--                                                              -->
<!-- Consumer in BookingsPage.vue:                                -->
<!--   <BaseModal :open="cancelOpen" size="sm"                    -->
<!--              @close="cancelOpen = false">                    -->
<!--     <template #header>                                       -->
<!--       <h2>Cancel Booking #{{ booking.id }}</h2>              -->
<!--     </template>                                              -->
<!--                                                              -->
<!--     <p>Are you sure? This cannot be undone.</p>              -->
<!--                                                              -->
<!--     <template #footer>                                       -->
<!--       <button @click="cancelOpen = false">Keep It</button>   -->
<!--       <button @click="confirmCancel" class="btn-danger">     -->
<!--         Yes, Cancel                                           -->
<!--       </button>                                              -->
<!--     </template>                                              -->
<!--   </BaseModal>                                               -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Slots vs props vs provide/inject — when to use each         -->
<!--                                                              -->
<!-- PROPS:                                                        -->
<!--   ← direct parent → child data transfer                     -->
<!--   ← strong TypeScript typing with defineProps<T>            -->
<!--   ← best for scalars and simple configuration               -->
<!--   ← explicit: visible in template as :propName="..."        -->
<!--   ← avoid for deep trees (becomes prop drilling)            -->
<!--                                                              -->
<!-- SLOTS:                                                        -->
<!--   ← parent injects template/markup content into child       -->
<!--   ← child owns structure/data; parent owns visual markup    -->
<!--   ← scoped slots: share child data with parent template     -->
<!--   ← best for layout components: cards, modals, tables, tabs -->
<!--   ← does NOT pass data upward (use emits for that)          -->
<!--                                                              -->
<!-- PROVIDE / INJECT:                                             -->
<!--   ← implicit dependency injection across any tree depth     -->
<!--   ← avoids prop drilling through 3+ intermediate layers     -->
<!--   ← best for cross-cutting concerns: auth, theme, i18n,     -->
<!--     notifications, feature flags                             -->
<!--   ← creates implicit coupling: consumer silently depends    -->
<!--     on an ancestor providing the key                         -->
<!--   ← use InjectionKey<T> to make the coupling explicit       -->
<!--     and type-safe                                            -->
<!--   ← NOT a replacement for props in direct parent→child comm -->
<!--                                                              -->
<!-- DECISION GUIDE:                                              -->
<!--   Directly in the parent template? → props                   -->
<!--   Parent controls the markup of child's inner content? → slots-->
<!--   Same value needed 3+ levels deep? → provide/inject        -->
<!--   Need to render outside ancestor DOM constraints? → Teleport-->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Vue slots vs React children / render props                   -->
<!--                                                              -->
<!-- DEFAULT SLOT vs React children:                              -->
<!--   Vue:   <MyCard><p>Content</p></MyCard>                     -->
<!--          ← accessed in MyCard as <slot />                   -->
<!--   React: <MyCard><p>Content</p></MyCard>                     -->
<!--          ← accessed in MyCard as {children}                 -->
<!--   → Conceptually equivalent; syntax differs                 -->
<!--                                                              -->
<!-- NAMED SLOTS vs React render props / compound components:     -->
<!--   Vue:   <template #footer><SaveButton /></template>         -->
<!--   React: <MyCard footer={<SaveButton />} />  (prop approach) -->
<!--   OR:    <MyCard.Footer><SaveButton /></MyCard.Footer>        -->
<!--   → Vue named slots are more structured and declared on child-->
<!--   → React has no single standard pattern for this           -->
<!--                                                              -->
<!-- SCOPED SLOTS vs React render props:                          -->
<!--   Vue:   <template #row="{ booking }">                       -->
<!--            <td>{{ booking.id }}</td>                         -->
<!--          </template>                                          -->
<!--   React: <MyList renderItem={(item) => <li>{item.id}</li>} />-->
<!--   → Both: child owns data, parent owns markup                -->
<!--   → Vue scoped slot syntax is inline in template             -->
<!--   → React render prop is a callback function passed as prop  -->
<!--   → Vue is more ergonomic for designers; React is more pure JS-->
<!--                                                              -->
<!-- SLOT EXISTENCE CHECK:                                        -->
<!--   Vue:   const slots = useSlots(); if (slots.header) { ... } -->
<!--   React: if (headerProp !== undefined) { ... }               -->
<!--   OR:    if (React.Children.count(header) > 0) { ... }       -->
<!--                                                              -->
<!-- FALLBACK CONTENT:                                             -->
<!--   Vue:   <slot name="icon"><StarIcon /></slot>  ← in template-->
<!--   React: function MyComp({ icon = <StarIcon /> }) { return icon }-->
<!--          ← default value in destructured prop                -->
<!--                                                              -->
<!-- KEY ARCHITECTURAL DIFFERENCE:                                 -->
<!--   Vue slots are template constructs compiled to VNode factories-->
<!--   React children/render props are plain JavaScript values    -->
<!--   Vue's template compiler resolves slot content at compile time-->
<!--   React has no built-in slot concept beyond {children}       -->
<!--                                                              -->
<!-- PROVIDE/INJECT vs React Context:                             -->
<!--   Vue:   provide(CurrentUserKey, user)                       -->
<!--          inject(CurrentUserKey)                              -->
<!--   React: <UserContext.Provider value={user}>                 -->
<!--            <App />                                            -->
<!--          </UserContext.Provider>                             -->
<!--          const user = useContext(UserContext)                 -->
<!--   → Same concept: dependency injection down the tree         -->
<!--   → Vue: provide/inject API; React: Context + useContext hook-->
<!--   → Vue InjectionKey<T> ≈ React createContext<T>()           -->
<!--   → Both support reactive/live values                        -->
<!--                                                              -->
<!-- TELEPORT vs React createPortal:                              -->
<!--   Vue:   <Teleport to="body">...</Teleport>                  -->
<!--   React: ReactDOM.createPortal(<Modal />, document.body)     -->
<!--   → Same purpose: escape DOM hierarchy for modals/toasts     -->
<!--   → Vue: declarative component; React: imperative function   -->
<!--   → Vue has :disabled prop; React requires conditional logic -->
<!-- ============================================================ -->
