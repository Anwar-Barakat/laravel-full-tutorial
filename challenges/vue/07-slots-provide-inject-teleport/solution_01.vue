<!-- ============================================================ -->
<!-- Problem 01 — Slots                                          -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Default slot with fallback content                          -->
<!--                                                              -->
<!-- <slot> renders whatever the parent passes as slot content.   -->
<!-- Content between <slot> and </slot> is the FALLBACK:          -->
<!--   ← renders when the parent provides nothing                -->
<!--   ← ignored when parent provides slot content               -->
<!--                                                              -->
<!-- In BookingCard.vue:                                          -->
<!--   <div class="booking-card">                                 -->
<!--     <slot>                                                   -->
<!--       <p class="text-gray-400">No booking details.</p>       -->
<!--     </slot>                                                   -->
<!--   </div>                                                     -->
<!--                                                              -->
<!-- Parent with content — fallback is suppressed:               -->
<!--   <BookingCard>                                              -->
<!--     <p>TZ-204 · London → Paris</p>                          -->
<!--   </BookingCard>                                             -->
<!--                                                              -->
<!-- Parent without content — fallback renders:                  -->
<!--   <BookingCard />                                            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Named slots: <slot name="...">                              -->
<!--                                                              -->
<!-- Each named slot is an independent injection point.           -->
<!-- Child declares them with a name attribute:                   -->
<!--   <slot name="header" />                                     -->
<!--   <slot name="footer" />                                     -->
<!--   <slot name="actions" />                                    -->
<!--   <slot />  ← the unnamed default slot                       -->
<!--                                                              -->
<!-- Parent fills each slot using <template #slotName>:           -->
<!--   <BookingPanel>                                             -->
<!--     <template #header>                                       -->
<!--       <h2>TZ-204 · London → Paris</h2>                      -->
<!--       <StatusBadge status="confirmed" />                     -->
<!--     </template>                                              -->
<!--                                                              -->
<!--     <BookingItinerary :booking="booking" />                  -->
<!--                       ← this goes into the default slot      -->
<!--                                                              -->
<!--     <template #actions>                                      -->
<!--       <button>Cancel</button>                                -->
<!--       <button>Download PDF</button>                          -->
<!--     </template>                                              -->
<!--   </BookingPanel>                                            -->
<!--                                                              -->
<!-- Any named slot can also have a fallback:                     -->
<!--   <slot name="actions">                                      -->
<!--     <button>Close</button>  ← shown when no #actions given  -->
<!--   </slot>                                                    -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Scoped slots — child exposes data to parent via slot props   -->
<!--                                                              -->
<!-- CONCEPT: child owns the DATA, parent owns the MARKUP.       -->
<!-- The child binds values onto <slot> as attributes:            -->
<!--   <slot name="row" :booking="booking" :index="index" />      -->
<!--   ← booking and index become available to the parent        -->
<!--                                                              -->
<!-- Use case in BookingTable.vue:                               -->
<!--   The table component provides the v-for loop and booking    -->
<!--   data, but the parent decides how each row renders.         -->
<!--                                                              -->
<!--   Child iterates:                                            -->
<!--   <tr v-for="(booking, index) in bookings" :key="booking.id">-->
<!--     <slot name="row" :booking="booking" :index="index">      -->
<!--       <!-- fallback row rendered when #row not supplied --> -->
<!--       <td>{{ booking.id }}</td>                              -->
<!--       <td>{{ booking.destination }}</td>                     -->
<!--     </slot>                                                  -->
<!--   </tr>                                                      -->
<!--                                                              -->
<!-- Parent consumes the slot props:                              -->
<!--   <BookingTable :bookings="bookings">                        -->
<!--     <template #row="{ booking, index }">                     -->
<!--       <td>{{ index + 1 }}</td>                               -->
<!--       <td>{{ booking.origin }} → {{ booking.destination }}</td>-->
<!--       <td><StatusBadge :status="booking.status" /></td>      -->
<!--     </template>                                              -->
<!--   </BookingTable>                                            -->
<!--                                                              -->
<!-- The parent has full control of column markup while the       -->
<!-- child manages the data source and loop.                      -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- v-slot directive — all syntax forms                         -->
<!--                                                              -->
<!-- LONG FORM:  v-slot:slotName="slotProps"                     -->
<!-- SHORT FORM: #slotName="slotProps"                           -->
<!--                                                              -->
<!-- Default slot (all equivalent):                               -->
<!--   v-slot:default="{ item }"                                  -->
<!--   v-slot="{ item }"                                          -->
<!--   #default="{ item }"                                        -->
<!--                                                              -->
<!-- Named slot without props:                                    -->
<!--   v-slot:header  or  #header                                 -->
<!--   ← no ="" needed when child sends no slot props            -->
<!--                                                              -->
<!-- Named slot with props:                                       -->
<!--   v-slot:row="{ booking }"                                   -->
<!--   #row="{ booking }"                                         -->
<!--   #row="{ booking: b, index = 0 }"  ← rename + default val -->
<!--                                                              -->
<!-- Inline on component tag — ONLY valid for default slot:      -->
<!--   <MyList v-slot="{ item }">                                 -->
<!--     <span>{{ item.name }}</span>                             -->
<!--   </MyList>                                                  -->
<!--                                                              -->
<!-- With named slots, always use <template> wrappers:           -->
<!--   <BookingPanel>                                             -->
<!--     <template #header>...</template>                         -->
<!--     <template #footer>...</template>                         -->
<!--   </BookingPanel>                                            -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- defineSlots — TypeScript slot typing (Vue 3.3+)             -->
<!--                                                              -->
<!-- defineSlots() gives TypeScript precise types for each slot   -->
<!-- name and its slot props. The parent's v-slot="{ ... }"       -->
<!-- destructuring is fully type-checked.                         -->
<!--                                                              -->
<!-- In BookingTable.vue <script setup lang="ts">:               -->
<!--   defineSlots<{                                              -->
<!--     headers(): void                   // no slot props       -->
<!--     row(props: {                                             -->
<!--       booking: Booking                                       -->
<!--       index:   number                                        -->
<!--     }): void                                                 -->
<!--     actions(props: { booking: Booking }): void              -->
<!--   }>()                                                       -->
<!--                                                              -->
<!-- ← Function signature: parameter = slot props, return = void -->
<!-- ← Named slot with no props: () => void                      -->
<!-- ← TypeScript will error if parent tries to destructure a    -->
<!--   prop that the child did not declare                        -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- useSlots() — check if slot is provided before rendering     -->
<!--                                                              -->
<!-- Calling useSlots() inside <script setup> returns the $slots  -->
<!-- object. Each key is a slot name; it is defined only when the -->
<!-- parent actually provides that slot.                          -->
<!--                                                              -->
<!-- import { useSlots } from 'vue'                               -->
<!-- const slots = useSlots()                                     -->
<!--                                                              -->
<!-- Pattern 1 — avoid empty wrapper element:                    -->
<!--   <header v-if="slots.header" class="panel-header">         -->
<!--     <slot name="header" />                                   -->
<!--   </header>                                                  -->
<!--   ← if parent provides no #header, the <header> tag itself  -->
<!--     is not rendered — no empty DOM node in the output        -->
<!--                                                              -->
<!-- Pattern 2 — conditional fallback logic:                     -->
<!--   <footer v-if="slots.actions" class="panel-footer">        -->
<!--     <slot name="actions" />                                  -->
<!--   </footer>                                                  -->
<!--   <footer v-else class="panel-footer">                       -->
<!--     <button @click="$emit('close')">Close</button>           -->
<!--   </footer>                                                  -->
<!--   ← more flexible than slot fallback content when the        -->
<!--     fallback is complex or has its own reactive logic        -->
<!--                                                              -->
<!-- Pattern 3 — conditional styling based on slot presence:     -->
<!--   <div :class="{ 'has-actions': !!slots.actions }">         -->
<!--     <slot /><slot name="actions" />                          -->
<!--   </div>                                                     -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- $slots in render functions                                   -->
<!--                                                              -->
<!-- When writing a component with a render function instead of   -->
<!-- a <template>, access slots through the setup context:        -->
<!--                                                              -->
<!--   setup(props, { slots }) {                                  -->
<!--     return () => {                                           -->
<!--       // Invoke a slot to get its VNodes:                    -->
<!--       const body    = slots.default?.() ?? []                -->
<!--       const actions = slots.actions?.()                      -->
<!--                                                              -->
<!--       // Check existence before rendering a wrapper:         -->
<!--       const hasActions = !!slots.actions                     -->
<!--                                                              -->
<!--       return h('div', { class: 'panel' }, [                  -->
<!--         h('main', body),                                      -->
<!--         hasActions ? h('footer', actions) : null,            -->
<!--       ])                                                      -->
<!--     }                                                        -->
<!--   }                                                          -->
<!--                                                              -->
<!-- slots.default?.()  ← optional chain: safe when slot absent  -->
<!-- slots.header?.()   ← same for named slot                    -->
<!--                                                              -->
<!-- Scoped slot with props in render function:                   -->
<!--   const rows = slots.row?.({ booking: item, index: i }) ?? []-->
<!--   ← pass slot props as plain object argument                 -->
<!-- ============================================================ -->



<!-- ============================================================ -->
<!-- Slots vs props — when to use each                           -->
<!--                                                              -->
<!-- USE PROPS WHEN:                                              -->
<!--   ← value is data: string, number, boolean, object          -->
<!--   ← child owns all rendering decisions for that value       -->
<!--   ← strong TypeScript typing needed (defineProps<T>)        -->
<!--   ← simple: <StatusBadge :status="booking.status" />        -->
<!--                                                              -->
<!-- USE SLOTS WHEN:                                              -->
<!--   ← parent needs to inject template / markup into child      -->
<!--   ← child provides structure, parent provides content        -->
<!--   ← highly customisable layout: cards, modals, tables       -->
<!--   ← scoped slots: child exposes data, parent provides markup -->
<!--   ← <BookingTable><template #row="{ b }">...</template>     -->
<!--                    </BookingTable>                           -->
<!--                                                              -->
<!-- SLOTS ARE NOT FOR:                                           -->
<!--   ← passing data upward (use emits for that)                -->
<!--   ← cross-tree communication (use provide/inject)           -->
<!-- ============================================================ -->
