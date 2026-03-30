# REACT_TEST_40 — Storybook • Component Docs

**Time:** 25 minutes | **Stack:** React + TypeScript + Storybook v8

---

## Problem 01 — Storybook & Component Documentation (Medium)

Write stories for the Tripz booking components: CSF3 format, typed args, controls, actions, decorators, and play functions.

---

### Setup

```bash
npx storybook@latest init   # auto-detects Vite + React
# Installs: @storybook/react-vite, @storybook/addon-essentials
```

**`.storybook/main.ts`:**
```ts
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",    // controls, actions, docs, viewport, backgrounds
    "@storybook/addon-a11y",           // accessibility panel
    "@storybook/addon-interactions",   // play function debugging
  ],
  framework: { name: "@storybook/react-vite", options: {} },
}
export default config
```

**`.storybook/preview.ts`:**
```ts
import type { Preview } from "@storybook/react"
import "../src/index.css"          // global styles
import { ThemeProvider } from "styled-components"
import { theme } from "../src/theme"

const preview: Preview = {
  parameters: {
    controls: { matchers: {
      color: /(background|color)$/i,   // auto-detect color controls
      date:  /Date$/i,                 // auto-detect date controls
    }},
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f9fafb" },
        { name: "dark",  value: "#111827" },
      ],
    },
    viewport: { viewports: MINIMAL_VIEWPORTS },  // mobile/tablet/desktop
  },
  // Global decorator — wraps EVERY story
  decorators: [
    Story => (
      <ThemeProvider theme={theme}>
        <div style={{ padding: "1rem" }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}
export default preview
```

---

### CSF3 — Component Story Format

```tsx
// stories/BookingCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "@storybook/test"
import { BookingCard } from "../components/BookingCard"

// Meta — component-level configuration
const meta = {
  title:     "Booking/BookingCard",    // Sidebar path: Booking > BookingCard
  component: BookingCard,
  tags:      ["autodocs"],             // auto-generate docs page from JSDoc + propTypes
  parameters: {
    layout: "centered",                // "centered" | "fullscreen" | "padded"
    docs: {
      description: {
        component: "Displays a single booking with status, school, and trip details.",
      },
    },
  },
  argTypes: {
    // Override auto-detected control types:
    status: {
      control: "select",
      options: ["pending", "confirmed", "paid", "completed", "cancelled"],
      description: "Current booking status",
      table: { defaultValue: { summary: "pending" } },
    },
    amount: {
      control: { type: "number", min: 0, max: 50000, step: 100 },
      description: "Booking amount in GBP",
    },
    onSelect: { action: "selected" },  // logs to Actions panel
    onDelete: { action: "deleted" },
    // Hide internal props from controls:
    booking: { table: { disable: true } },
  },
  // Default args applied to ALL stories in this file
  args: {
    onSelect: fn(),   // fn() = Storybook spy — trackable in play functions
    onDelete: fn(),
  },
} satisfies Meta<typeof BookingCard>

export default meta
type Story = StoryObj<typeof meta>
```

---

### Stories — individual variants

```tsx
// Basic story — minimal args
export const Default: Story = {
  args: {
    booking: {
      id: 1,
      school_name: "St. Mary's Primary",
      contact_email: "admin@stmarys.co.uk",
      trip_date: "2024-06-15",
      student_count: 32,
      status: "pending",
      amount: 3200,
    },
    isSelected: false,
  },
}

// Variant stories — one per meaningful state
export const Selected: Story = {
  args: { ...Default.args, isSelected: true },
  parameters: {
    docs: { description: { story: "Card in selected state — shows blue outline." } },
  },
}

export const Paid: Story = {
  args: {
    ...Default.args,
    booking: { ...Default.args!.booking!, status: "paid" },
  },
}

export const Cancelled: Story = {
  args: {
    ...Default.args,
    booking: { ...Default.args!.booking!, status: "cancelled" },
  },
}

export const LongSchoolName: Story = {
  args: {
    ...Default.args,
    booking: {
      ...Default.args!.booking!,
      school_name: "The Very Long School Name Academy Trust — Northern Campus",
    },
  },
  name: "Edge Case: Long Name",  // custom sidebar label
}

// Story-level decorator — wrap just this story
export const DarkBackground: Story = {
  args: Default.args,
  decorators: [
    Story => (
      <div style={{ background: "#111827", padding: "2rem" }}>
        <Story />
      </div>
    ),
  ],
}
```

---

### Play functions — interaction testing

```tsx
// @storybook/test provides testing utilities in play functions
import { expect, within, userEvent } from "@storybook/test"

export const ClickToSelect: Story = {
  args: Default.args,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // canvasElement: the story's root DOM element

    // Simulate user interaction:
    const card = canvas.getByRole("button", { name: /St. Mary's Primary/i })
    await userEvent.click(card)

    // Assert spy was called:
    expect(args.onSelect).toHaveBeenCalledWith(1)
    expect(args.onSelect).toHaveBeenCalledTimes(1)
  },
}

export const KeyboardNavigation: Story = {
  args: Default.args,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByRole("button")

    // Tab to the card, press Space to select:
    await userEvent.tab()
    await userEvent.keyboard("[Space]")

    expect(args.onSelect).toHaveBeenCalledOnce()
  },
}
```

---

### StatusBadge stories

```tsx
// stories/StatusBadge.stories.tsx
import type { Meta, StoryObj } from "@storybook/react"
import { StatusBadge } from "../components/StatusBadge"

const meta = {
  title:     "UI/StatusBadge",
  component: StatusBadge,
  tags:      ["autodocs"],
  argTypes: {
    status: {
      control: "radio",
      options: ["pending", "confirmed", "paid", "completed", "cancelled"],
    },
  },
} satisfies Meta<typeof StatusBadge>
export default meta
type Story = StoryObj<typeof meta>

export const AllStatuses: Story = {
  render: () => (
    // Custom render for showing all variants at once:
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {(["pending", "confirmed", "paid", "completed", "cancelled"] as const).map(s => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
  // render overrides the default single-component rendering
  // Use for: showing all variants, composition demos
}

export const Pending:   Story = { args: { status: "pending" } }
export const Confirmed: Story = { args: { status: "confirmed" } }
export const Paid:      Story = { args: { status: "paid" } }
```

---

### BookingForm stories with MSW

```tsx
// stories/BookingForm.stories.tsx
import { http, HttpResponse } from "msw"
import { initialize, mswLoader } from "msw-storybook-addon"

initialize()  // in preview.ts: loaders: [mswLoader]

const meta = {
  title:     "Forms/BookingForm",
  component: BookingForm,
  loaders:   [mswLoader],
} satisfies Meta<typeof BookingForm>
export default meta
type Story = StoryObj<typeof meta>

export const SubmitSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/bookings", () => {
          return HttpResponse.json({ id: 42, status: "pending" })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("School Name"), "St. Mary's")
    await userEvent.type(canvas.getByLabelText("Email"), "admin@stmarys.co.uk")
    await userEvent.click(canvas.getByRole("button", { name: "Submit" }))
    await expect(canvas.findByText("Booking created!")).resolves.toBeInTheDocument()
  },
}

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/bookings", () =>
          HttpResponse.json({ errors: { school_name: ["Already exists"] } }, { status: 422 })
        ),
      ],
    },
  },
}
```

---

## Problem 02 — Advanced Storybook (Hard)

Visual regression testing, accessibility stories, composite stories, and test runner.

---

### Storybook Test Runner

```bash
npm install --save-dev @storybook/test-runner
# Runs all stories as integration tests in real browser (Playwright)
```

```json
// package.json
{
  "scripts": {
    "test-storybook": "test-storybook",
    "test-storybook:ci": "test-storybook --url http://localhost:6006"
  }
}
```

```ts
// .storybook/test-runner.ts
import type { TestRunnerConfig } from "@storybook/test-runner"
import { injectAxe, checkA11y } from "axe-playwright"

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page)  // inject axe-core into every story
  },
  async postVisit(page) {
    await checkA11y(page, "#storybook-root", {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })
    // Fails test if any a11y violations found in the story
  },
}
export default config
```

---

### Visual regression — Chromatic

```bash
npm install --save-dev chromatic
npx chromatic --project-token=<token>
```

```yaml
# .github/workflows/chromatic.yml
name: Chromatic
on: [push]
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # full git history for baseline comparison
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

**How Chromatic works:**
1. Takes screenshots of every story on every push
2. Compares to baseline (accepted screenshots)
3. Flags pixel differences for review
4. Reviewer accepts/rejects changes

```tsx
// Mark stories that should be visually tested:
export const Paid: Story = {
  args: { ...Default.args, booking: { ...Default.args!.booking!, status: "paid" } },
  parameters: {
    chromatic: {
      viewports: [375, 768, 1280],  // test on mobile, tablet, desktop
      delay: 500,                   // wait 500ms after render (animations)
    },
  },
}

// Disable visual testing for stories that are not visual:
export const LoadingState: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
  },
}
```

---

### Accessibility stories

```tsx
// stories/AccessibilityDemo.stories.tsx
export const WithFocusTrap: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open modal:
    await userEvent.click(canvas.getByRole("button", { name: "Open Booking" }))

    // Verify focus trapped inside modal:
    const modal = canvas.getByRole("dialog")
    await expect(modal).toBeInTheDocument()

    // Tab through all focusable elements — should cycle within modal:
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()

    // Last focusable element → Tab wraps to first:
    const firstFocusable = within(modal).getAllByRole("button")[0]
    expect(firstFocusable).toHaveFocus()
  },
}

// Explicit accessibility parameters:
export const HighContrast: Story = {
  parameters: {
    backgrounds: { default: "dark" },
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
}

// Mark story as known a11y failure (tech debt):
export const LegacyWithKnownIssue: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [{ id: "button-name", enabled: false }],  // suppress known violation
      },
    },
  },
}
```

---

### Composite stories — documentation pages

```tsx
// stories/BookingFlow.stories.tsx — document a multi-step flow
import type { Meta, StoryObj } from "@storybook/react"
import { Canvas, Controls, Description, Source, Stories } from "@storybook/blocks"

const meta = {
  title:     "Flows/BookingFlow",
  component: BookingWizard,
  parameters: {
    docs: {
      // Custom docs page layout:
      page: () => (
        <>
          <h1>Booking Flow</h1>
          <Description />   {/* component JSDoc */}
          <h2>Step 1 — School Details</h2>
          <Canvas of={StepOne} />
          <Controls of={StepOne} />
          <h2>Step 2 — Trip Details</h2>
          <Canvas of={StepTwo} />
          <h2>Complete Flow</h2>
          <Canvas of={CompleteFlow} />
          <Stories />        {/* auto-render all stories below */}
        </>
      ),
    },
  },
} satisfies Meta<typeof BookingWizard>
```

---

### Args composition — spread pattern

```tsx
// stories/BookingCard.stories.tsx — composable story args

// Base fixture — define once, reuse everywhere:
const baseBooking: Booking = {
  id: 1, school_name: "St. Mary's Primary", contact_email: "admin@stmarys.co.uk",
  trip_date: "2024-06-15", student_count: 32, status: "pending", amount: 3200,
}

export const Default: Story = {
  args: { booking: baseBooking, isSelected: false },
}

// Spread + override — clear relationship between variants:
export const International: Story = {
  args: { ...Default.args, booking: { ...baseBooking, trip_type: "international", amount: 8500 } },
}

export const LargeGroup: Story = {
  args: { ...Default.args, booking: { ...baseBooking, student_count: 120, amount: 14000 } },
}

// Combining meta.args + story.args (additive):
// meta.args:  { onSelect: fn() }
// story.args: { booking: baseBooking }
// merged:     { onSelect: fn(), booking: baseBooking }
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `Meta` + `StoryObj` | TypeScript generics tie props to `args` — no casting |
| `satisfies Meta<typeof Comp>` | Better than `as Meta<...>` — catches extra properties |
| `tags: ["autodocs"]` | Auto-generate docs page from JSDoc + arg types |
| `argTypes` | Override control UI: `"select"`, `"radio"`, `"color"`, `"boolean"` |
| `fn()` | Storybook spy — trackable in play functions (`toHaveBeenCalledWith`) |
| `action("name")` | Logs to Actions panel — simpler, not a spy |
| `play` | Automated interaction + assertion after render — runs in Storybook + test runner |
| `within(canvasElement)` | Scope queries to the story's DOM (not the whole browser window) |
| `render` | Custom render function — use when showing multiple variants together |
| `decorators` | Wrap stories with providers, padding, context |
| `loaders` | Async data loading before story renders (MSW, seeded state) |
| `parameters.layout` | `"centered"` / `"padded"` / `"fullscreen"` |
| `parameters.msw.handlers` | Mock HTTP requests per-story with MSW |
| `chromatic.disableSnapshot` | Opt out of visual regression for non-visual stories |
| `checkA11y` | Axe-powered a11y test in test runner — fails on violations |
| `@storybook/test-runner` | Runs all play functions as real Playwright tests |
