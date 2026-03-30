// ============================================================
// Problem 01 — Storybook & Component Documentation
// ============================================================



// ============================================================
// CSF3 — Component Story Format structure
//
// Every stories file exports:
//   default export  → Meta (component-level config)
//   named exports   → Story (individual variants)
//
// Meta shape:
//   title:      "Category/ComponentName"  ← sidebar path
//   component:  BookingCard               ← links to component
//   tags:       ["autodocs"]              ← generate docs page
//   parameters: { layout: "centered" }   ← story canvas behaviour
//   argTypes:   { status: { control:"select", options:[...] } }
//   args:       { onSelect: fn() }        ← defaults for ALL stories
//
// Story shape:
//   args:        { booking: {...}, isSelected: false }
//   parameters:  { docs: { description: { story:"..." } } }
//   decorators:  [ Story => <Wrapper><Story /></Wrapper> ]
//   play:        async ({ canvasElement, args }) => { ... }
//   name:        "Custom Sidebar Label"
//
// TypeScript:
//   const meta = { ... } satisfies Meta<typeof BookingCard>
//   export default meta
//   type Story = StoryObj<typeof meta>
//   ← args are typed to BookingCard's props — no manual casting
// ============================================================



// ============================================================
// argTypes — control UI customisation
//
// control: "select"    → dropdown  (enums: status, variant)
// control: "radio"     → radio buttons  (few options)
// control: "boolean"   → toggle switch
// control: "number"    → number input
// control: { type:"range", min:0, max:100 } → slider
// control: "color"     → color picker
// control: "text"      → text input (default for strings)
// control: "object"    → JSON editor (for complex objects)
//
// table.disable: true  → hide from Controls panel (booking object, event handlers)
// action: "selected"   → log to Actions panel on call
// fn()                 → Storybook spy (use in play assertions)
//
// Auto-detection from TypeScript props:
//   boolean props → toggle
//   string unions → select
//   numbers → number input
//   Storybook reads prop types at build time via react-docgen-typescript
// ============================================================



// ============================================================
// Story variants — one per meaningful state
//
// Pattern: Default → then named variants
//
// Default:    { args: { booking: baseBooking, isSelected: false } }
// Selected:   { args: { ...Default.args, isSelected: true } }
// Paid:       { args: { ...Default.args, booking: { ...base, status:"paid" } } }
// Cancelled:  { args: { ...Default.args, booking: { ...base, status:"cancelled" } } }
// LongName:   { args: { ...Default.args, booking: { ...base, school_name: "Very Long..." } } }
//
// What to story:
//   All meaningful prop combinations (not combinatorial explosion)
//   Edge cases: long text, empty state, loading, error
//   Interactive states: hover (via play), selected, disabled
//   Responsive: use viewport parameter or story-level decorator
// ============================================================



// ============================================================
// Decorators — wrap stories with context
//
// Global (preview.ts):
//   decorators: [Story => <ThemeProvider theme={theme}><Story /></ThemeProvider>]
//   ← applies to EVERY story in the Storybook
//
// File-level (meta):
//   decorators: [Story => <div className="booking-context"><Story /></div>]
//   ← applies to all stories in THIS file
//
// Story-level (individual story):
//   decorators: [Story => <div style={{ background:"#111827" }}><Story /></div>]
//   ← overrides/adds for just this story
//
// Decorator order: story → file → global (innermost first)
// Use for: providers (Theme, Query, Router), padding wrappers, mock contexts
// ============================================================



// ============================================================
// render — custom rendering
//
// Default render: <Component {...args} />
//
// Custom render (override):
//   render: () => (
//     <div style={{ display:"flex", gap:"0.5rem" }}>
//       {statuses.map(s => <StatusBadge key={s} status={s} />)}
//     </div>
//   )
//
// render with args:
//   render: (args) => <BookingCard {...args} onDelete={() => console.log("delete")} />
//
// Use when:
//   Showing all variants in one canvas (showcase stories)
//   Composition demos (Card inside a List)
//   Component needs additional wrapper not suitable as decorator
// ============================================================



// ============================================================
// play functions — interaction testing
//
// Runs after the story renders — in Storybook UI and test runner
//
// import { expect, within, userEvent } from "@storybook/test"
//
// play: async ({ canvasElement, args }) => {
//   const canvas = within(canvasElement)
//   ← ALWAYS use within(canvasElement) not document.querySelector
//   ← scopes queries to this story's DOM only
//
//   await userEvent.click(canvas.getByRole("button", { name:/Submit/i }))
//   await userEvent.type(canvas.getByLabelText("School Name"), "St Mary's")
//   await userEvent.keyboard("[Space]")
//   await userEvent.tab()
//
//   expect(args.onSelect).toHaveBeenCalledWith(1)
//   expect(args.onSelect).toHaveBeenCalledTimes(1)
//   await expect(canvas.findByText("Success")).resolves.toBeInTheDocument()
//   ← findBy* = async (waits for element to appear)
//   ← getBy*  = sync (fails immediately if not found)
// }
// ============================================================



// ============================================================
// parameters.layout
//
// "centered"   → component centred in canvas (default for isolated components)
// "padded"     → component with padding (good for cards, form elements)
// "fullscreen" → component fills entire canvas (good for page-level components)
//
// parameters.backgrounds.default: "dark"
//   ← override default background for this story
//
// parameters.viewport.defaultViewport: "mobile1"
//   ← start story at mobile viewport width
//
// parameters.docs.description.story: "Markdown text"
//   ← shown above the story in the docs page
// ============================================================
