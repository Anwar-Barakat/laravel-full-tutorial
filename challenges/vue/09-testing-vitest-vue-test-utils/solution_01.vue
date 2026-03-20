<!-- ============================================================ -->
<!-- Problem 01 — Mounting Strategies                            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- mount vs shallowMount                                        -->
<!--                                                              -->
<!-- mount:                                                       -->
<!--   ← renders the full component tree (all children included)  -->
<!--   ← child components execute their own setup(), fetch, etc.  -->
<!--   ← use when: child output is part of what you are testing   -->
<!--   ← use when: testing parent ↔ child integration             -->
<!--                                                              -->
<!-- shallowMount:                                                -->
<!--   ← replaces every child component with a stub tag           -->
<!--   ← <BookingCard> becomes <booking-card-stub>                -->
<!--   ← child setup() / fetch / watchers do NOT run              -->
<!--   ← use when: testing the parent component in isolation       -->
<!--   ← use when: children have heavy deps (router, pinia, fetch) -->
<!--                                                              -->
<!-- Explicit stubs (mix and match):                              -->
<!--   global.stubs: { BookingCard: true }         ← generic stub -->
<!--   global.stubs: { BookingCard: MyFakeCard }   ← custom stub  -->
<!--   global.stubs: { RouterLink: RouterLinkStub } ← test-utils  -->
<!--                                                              -->
<!-- RouterLinkStub — test-utils built-in:                        -->
<!--   import { RouterLinkStub } from '@vue/test-utils'           -->
<!--   stubs: { RouterLink: RouterLinkStub }                      -->
<!--   ← renders an <a> tag without needing a real router         -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Querying the DOM — find, findAll, findComponent             -->
<!--                                                              -->
<!-- wrapper.find('[data-testid="booking-destination"]')          -->
<!--   ← preferred selector — survives class/text/HTML refactors  -->
<!--   ← returns DOMWrapper (single element or throws if missing) -->
<!--   ← .exists() to safely check before reading                 -->
<!--                                                              -->
<!-- wrapper.findAll('[data-testid="booking-row"]')               -->
<!--   ← returns DOMWrapper[] (array, never throws)               -->
<!--   ← .toHaveLength(3) to assert count                         -->
<!--                                                              -->
<!-- wrapper.findComponent(BookingCard)                           -->
<!--   ← finds Vue component instance (not DOM element)           -->
<!--   ← can also use: findComponent({ name: 'BookingCard' })     -->
<!--   ← .props() — read the component's current prop values      -->
<!--   ← .emitted() — events emitted by that child                -->
<!--                                                              -->
<!-- Selector priority (best → worst):                            -->
<!--   1. [data-testid="..."]   ← decoupled from implementation   -->
<!--   2. [type="submit"]       ← semantic HTML attribute          -->
<!--   3. tagName               ← only if element is unique       -->
<!--   4. .class-name           ← avoid — tied to styling         -->
<!--   5. text content          ← avoid — tied to copy/i18n       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Reading DOM values                                           -->
<!--                                                              -->
<!-- wrapper.text()                                               -->
<!--   ← innerText of the element (trimmed, no HTML tags)         -->
<!--   ← wrapper.find('[data-testid="status"]').text() → 'pending'-->
<!--                                                              -->
<!-- wrapper.html()                                               -->
<!--   ← full outerHTML string of the element                     -->
<!--   ← useful for snapshot-style assertions                     -->
<!--   ← wrapper.html() includes the root element itself          -->
<!--                                                              -->
<!-- wrapper.attributes('disabled')                               -->
<!--   ← returns attribute string value or undefined              -->
<!--   ← presence only: wrapper.attributes('disabled') !== undefined-->
<!--   ← .attributes() returns all attributes as a plain object   -->
<!--                                                              -->
<!-- wrapper.classes()                                            -->
<!--   ← returns string[] of all class names                      -->
<!--   ← wrapper.classes('is-active') → boolean                   -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Interactions — trigger                                       -->
<!--                                                              -->
<!-- wrapper.trigger('click')                                     -->
<!--   ← dispatches a MouseEvent on the element                   -->
<!--   ← MUST await — returns a promise (Vue flushes DOM)         -->
<!--   await wrapper.find('[data-testid="cancel-btn"]').trigger('click')-->
<!--                                                              -->
<!-- wrapper.trigger('submit')                                     -->
<!--   ← dispatches submit event on the form element              -->
<!--   ← triggers @submit.prevent handler                         -->
<!--   await wrapper.find('form').trigger('submit')               -->
<!--                                                              -->
<!-- wrapper.trigger('input')                                     -->
<!--   ← dispatches input event (used with v-model on raw inputs) -->
<!--   ← does NOT change the element's value on its own           -->
<!--   ← combine with element.value assignment if needed          -->
<!--                                                              -->
<!-- wrapper.trigger('keydown', { key: 'Enter' })                 -->
<!--   ← second arg merges into the Event init object             -->
<!--   ← also: { key: 'Escape' }, { ctrlKey: true, key: 'a' }    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Interactions — setValue                                      -->
<!--                                                              -->
<!-- wrapper.setValue('Paris')                                    -->
<!--   ← sets element.value = 'Paris'                             -->
<!--   ← then triggers both 'input' and 'change' events           -->
<!--   ← works for: <input>, <textarea>, <select>                 -->
<!--   ← MUST await — triggers DOM updates                        -->
<!--                                                              -->
<!-- await wrapper.find('[data-testid="search-input"]').setValue('Rome')-->
<!--   ← v-model syncs: searchQuery.value === 'Rome' after await  -->
<!--                                                              -->
<!-- await wrapper.find('[data-testid="status-select"]').setValue('cancelled')-->
<!--   ← selects the matching <option> value                      -->
<!--   ← triggers @change / v-model update                        -->
<!--                                                              -->
<!-- setValue vs trigger('input'):                                 -->
<!--   ← setValue: sets value + fires events (prefer this)        -->
<!--   ← trigger('input'): fires event only — value unchanged     -->
<!--   ← trigger useful when you need precise event control       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- nextTick vs flushPromises                                    -->
<!--                                                              -->
<!-- nextTick()                                                   -->
<!--   import { nextTick } from 'vue'                             -->
<!--   await nextTick()                                           -->
<!--   ← waits for Vue to flush ONE round of reactive DOM updates -->
<!--   ← use after: setProps, setValue, direct state mutation      -->
<!--   ← DOM is updated synchronously in that flush               -->
<!--   ← does NOT resolve promises (fetch, async actions)         -->
<!--                                                              -->
<!-- flushPromises()                                               -->
<!--   import { flushPromises } from '@vue/test-utils'            -->
<!--   await flushPromises()                                       -->
<!--   ← drains the entire microtask queue                        -->
<!--   ← resolves ALL pending promises recursively                -->
<!--   ← use after: onMounted fetch, async store actions           -->
<!--   ← includes a Vue DOM flush at the end                      -->
<!--                                                              -->
<!-- Decision guide:                                               -->
<!--   ← state change only → await nextTick()                     -->
<!--   ← async component logic (fetch, actions) → await flushPromises()-->
<!--   ← not sure → await flushPromises() (superset of nextTick)  -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Testing v-if conditional rendering                           -->
<!--                                                              -->
<!-- v-if removes the element from the DOM entirely               -->
<!--   ← .find().exists() returns false when condition is false   -->
<!--   ← .find().exists() returns true when condition is true     -->
<!--                                                              -->
<!-- Test pattern — empty state:                                  -->
<!--   const wrapper = mount(BookingList, { props: { bookings: [] } })-->
<!--   expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)-->
<!--   expect(wrapper.find('[data-testid="booking-row"]').exists()).toBe(false)-->
<!--                                                              -->
<!-- Test pattern — condition changes via setProps:               -->
<!--   await wrapper.setProps({ bookings: [{ id: 1 }] })          -->
<!--   await nextTick()                                            -->
<!--   expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)-->
<!--   expect(wrapper.find('[data-testid="booking-row"]').exists()).toBe(true) -->
<!--                                                              -->
<!-- v-show vs v-if:                                               -->
<!--   v-show: element exists in DOM but is hidden (display:none) -->
<!--   ← .exists() is ALWAYS true with v-show                     -->
<!--   ← check visibility: .isVisible() returns false when hidden -->
<!--   ← wrapper.find('[data-testid="tooltip"]').isVisible()       -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Testing emitted events — wrapper.emitted()                   -->
<!--                                                              -->
<!-- wrapper.emitted()                                            -->
<!--   ← returns a record of all events emitted by this component -->
<!--   ← shape: { 'event-name': [ [arg1, arg2], [arg1, arg2] ] }  -->
<!--   ← each emission is stored as an array of its arguments     -->
<!--                                                              -->
<!-- Check an event was emitted:                                   -->
<!--   expect(wrapper.emitted('cancel')).toBeTruthy()             -->
<!--   expect(wrapper.emitted('cancel')).toHaveLength(1)          -->
<!--                                                              -->
<!-- Check event payload (first emission):                         -->
<!--   expect(wrapper.emitted('cancel')![0]).toEqual([7])         -->
<!--   ← [0] = first emission, the array contains its arguments   -->
<!--   ← emit('cancel', bookingId) → payload is [bookingId]       -->
<!--                                                              -->
<!-- Check event was NOT emitted:                                  -->
<!--   await wrapper.find('form').trigger('submit')               -->
<!--   expect(wrapper.emitted('booking-created')).toBeUndefined() -->
<!--   ← undefined means the event key was never emitted at all   -->
<!--                                                              -->
<!-- Multiple emissions:                                           -->
<!--   wrapper.emitted('update:modelValue')![1][0]                -->
<!--   ← [1] = second emission, [0] = first argument              -->
<!-- ============================================================ -->
