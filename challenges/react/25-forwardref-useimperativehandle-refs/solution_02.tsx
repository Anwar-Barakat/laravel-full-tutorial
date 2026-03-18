// ============================================================
// Problem 02 — Compound Component with Shared Ref
// ============================================================



// ============================================================
// components/Accordion/types.ts
//
// interface AccordionHandle:
//   openPanel(id), closePanel(id), closeAll(), getOpenPanels(): string[]
//
// interface AccordionContextValue:
//   openPanels: Set<string>, togglePanel(id), multiple: boolean
//
// interface AccordionItemContextValue:
//   id: string, isOpen: boolean, disabled: boolean
//
// AccordionProps: children, multiple?=false, defaultOpen?=string[]
// AccordionItemProps: id, children, disabled?=false
// AccordionTriggerProps: children, className?
// AccordionContentProps: children, className?
// ============================================================



// ============================================================
// Contexts
//
// AccordionContext = createContext<AccordionContextValue | null>(null)
// AccordionItemContext = createContext<AccordionItemContextValue | null>(null)
//
// useAccordion():
//   ctx = useContext(AccordionContext)
//   if !ctx: throw new Error("must be used inside <Accordion>")
//
// useAccordionItem():
//   ctx = useContext(AccordionItemContext)
//   if !ctx: throw new Error("Trigger/Content must be inside <Accordion.Item>")
// ============================================================



// ============================================================
// Accordion root component
//
// const Accordion = forwardRef<AccordionHandle, AccordionProps>(function Accordion(...) {
//   State: openPanels = new Set(defaultOpen)
//
//   togglePanel = useCallback((id) => {
//     setOpenPanels(prev => {
//       next = new Set(prev)
//       if next.has(id): next.delete(id)
//       else:
//         if !multiple: next.clear()   ← single mode: close all others first
//         next.add(id)
//       return next
//     })
//   }, [multiple])
//
//   useImperativeHandle(ref, () => ({
//     openPanel(id):
//       setOpenPanels(prev => {
//         next = new Set(multiple ? prev : new Set())  ← single: clear first
//         next.add(id); return next
//       })
//     closePanel(id): delete id from set
//     closeAll():     setOpenPanels(new Set())
//     getOpenPanels():return [...openPanels]
//   }), [openPanels, multiple])
//
//   return:
//     <AccordionContext.Provider value={{ openPanels, togglePanel, multiple }}>
//       <div className="divide-y border rounded-xl overflow-hidden">
//         {children}
//       </div>
//     </AccordionContext.Provider>
// })
//
// Accordion.displayName = "Accordion"
// ============================================================



// ============================================================
// Accordion.Item
//
// function AccordionItem({ id, children, disabled=false }):
//   const { openPanels } = useAccordion()
//   isOpen = openPanels.has(id)
//
//   return:
//     <AccordionItemContext.Provider value={{ id, isOpen, disabled }}>
//       <div className={disabled ? "opacity-50" : ""}>{children}</div>
//     </AccordionItemContext.Provider>
// ============================================================



// ============================================================
// Accordion.Trigger
//
// function AccordionTrigger({ children, className }):
//   const { togglePanel } = useAccordion()
//   const { id, isOpen, disabled } = useAccordionItem()
//
//   <button
//     type="button"
//     disabled={disabled}
//     onClick={() => togglePanel(id)}
//     aria-expanded={isOpen}
//     aria-controls={`accordion-content-${id}`}
//     className="w-full flex justify-between items-center ..."
//   >
//     {children}
//     <ChevronIcon className={isOpen ? "rotate-180" : ""} />  ← transition-transform
//   </button>
// ============================================================



// ============================================================
// Accordion.Content
//
// function AccordionContent({ children, className }):
//   const { id, isOpen } = useAccordionItem()
//
//   Grid trick for height animation (CSS only, no JS measurement):
//   <div
//     id={`accordion-content-${id}`}
//     role="region"
//     aria-labelledby={`accordion-trigger-${id}`}
//     className={`grid transition-[grid-template-rows] duration-200
//       ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
//   >
//     <div className="overflow-hidden">   ← clips content when grid-rows=0fr
//       <div className="px-6 py-4">{children}</div>
//     </div>
//   </div>
//
//   Why grid trick vs max-height animation:
//   max-height: 0→9999px — transition speed is wrong (eases over 9999px, not actual height)
//   grid-rows: 0fr→1fr   — transitions over actual content height, correct timing
// ============================================================



// ============================================================
// Attach subcomponents + export
//
// const AccordionNamespace = Object.assign(Accordion, {
//   Item:    AccordionItem,
//   Trigger: AccordionTrigger,
//   Content: AccordionContent,
// })
// export { AccordionNamespace as Accordion }
// export type { AccordionHandle }
//
// Usage:
//   const ref = useRef<AccordionHandle>(null)
//   ref.current?.openPanel("panel-2")
//   ref.current?.closeAll()
//
//   <Accordion ref={ref} multiple defaultOpen={["panel-1"]}>
//     <Accordion.Item id="panel-1">
//       <Accordion.Trigger>Title</Accordion.Trigger>
//       <Accordion.Content>Body</Accordion.Content>
//     </Accordion.Item>
//     <Accordion.Item id="panel-2" disabled>...</Accordion.Item>
//   </Accordion>
// ============================================================
