// ============================================================
// Problem 02 — Advanced Storybook
// ============================================================



// ============================================================
// MSW (Mock Service Worker) in Storybook
//
// Setup (preview.ts):
//   import { initialize, mswLoader } from "msw-storybook-addon"
//   initialize()
//   export const preview = { loaders: [mswLoader], ... }
//
// Per-story handlers:
//   parameters: {
//     msw: { handlers: [
//       http.post("/api/bookings", () => HttpResponse.json({ id:42 })),
//     ]}
//   }
//
// Story variants by API state:
//   SubmitSuccess: handler returns 200 + booking object
//   ServerError:   handler returns 422 + validation errors
//   NetworkError:  handler returns HttpResponse.error()
//   SlowResponse:  handler has await delay(2000) before responding
//
// play function + MSW: test the full async flow:
//   type form fields → click submit → assert success message appears
//   Works because MSW intercepts fetch at the service worker level
// ============================================================



// ============================================================
// Storybook Test Runner
//
// @storybook/test-runner: runs play functions as Playwright tests
//
// npm run test-storybook
//   ← launches headless browser, opens each story, runs play function
//   ← reports pass/fail per story
//
// .storybook/test-runner.ts:
//   preVisit(page):  runs before story renders  → inject axe
//   postVisit(page): runs after story renders   → checkA11y
//
// CI: start Storybook server then run test-storybook:
//   "start-server-and-test": "start-server-and-test storybook 6006 test-storybook"
//
// What it catches:
//   Broken stories (render errors)
//   Failed assertions in play functions
//   a11y violations (via axe integration)
//   MSW handler mismatches
// ============================================================



// ============================================================
// Accessibility testing — addon-a11y + test runner
//
// addon-a11y:
//   Shows accessibility panel with violations per story
//   Powered by axe-core
//   Runs automatically in Storybook UI
//
// test-runner + axe-playwright:
//   injectAxe(page)   → add axe-core to page
//   checkA11y(page, "#storybook-root", { detailedReport:true })
//   ← fails CI on any violation
//
// Per-story a11y config:
//   parameters: { a11y: { config: { rules: [{ id:"color-contrast", enabled:true }] } } }
//
// Suppress known violations (tech debt):
//   parameters: { a11y: { config: { rules: [{ id:"button-name", enabled:false }] } } }
//   ← document WHY in a code comment
//
// Play function for interactive a11y:
//   Tab through story → assert focus order
//   Open modal → assert focus trapped
//   Close modal → assert focus returns to trigger
// ============================================================



// ============================================================
// Visual regression — Chromatic
//
// Chromatic: screenshot-based visual diff service (from Storybook team)
//
// CI workflow:
//   npx chromatic --project-token=$TOKEN
//   ← takes screenshots of every story
//   ← compares to last accepted baseline
//   ← shows diff in PR for review
//
// Per-story config:
//   parameters: { chromatic: {
//     viewports: [375, 768, 1280],   ← test at multiple widths
//     delay: 500,                    ← wait for animations to settle
//   }}
//
// Opt out (non-visual stories, loading states):
//   parameters: { chromatic: { disableSnapshot: true } }
//
// fetch-depth: 0 in git checkout:
//   Chromatic needs full git history to find baseline commit
//   Without it: every build is a new baseline (no diffs)
// ============================================================



// ============================================================
// Custom docs page — blocks
//
// tags: ["autodocs"] → auto-generated docs page
//   Includes: component description, all stories, controls table
//
// Custom docs page:
//   parameters: { docs: { page: () => (
//     <>
//       <Title />          ← component name
//       <Description />    ← JSDoc comment
//       <Primary />        ← first story with controls
//       <Controls />       ← props table
//       <Stories />        ← all remaining stories
//     </>
//   )}}
//
// Custom flow documentation:
//   Mix Canvas (story embed) with prose
//   <Canvas of={StepOne} />   ← renders specific story
//   <Controls of={StepOne} /> ← controls for specific story
//   <Source of={StepOne} />   ← code snippet
//
// JSDoc on component → appears in Description block:
//   /** Displays a booking card with status badge and action buttons. */
//   function BookingCard(...) { ... }
// ============================================================



// ============================================================
// Args composition patterns
//
// Base fixture — define once, spread everywhere:
//   const baseBooking = { id:1, school_name:"St. Mary's", ... }
//   export const Default: Story = { args: { booking:baseBooking } }
//   export const Paid: Story = { args: { ...Default.args,
//     booking: { ...baseBooking, status:"paid" } } }
//
// meta.args + story.args merging:
//   meta.args:  { onSelect:fn(), onDelete:fn() }
//   story.args: { booking:baseBooking }
//   result:     { onSelect:fn(), onDelete:fn(), booking:baseBooking }
//   ← additive, not replacing
//
// Storybook globals (locale, theme):
//   globalTypes: { locale: { defaultValue:"en", toolbar: { items:["en","ar"] } } }
//   Access in story: (args, { globals: { locale } }) => ...
// ============================================================



// ============================================================
// Key concepts
//
// satisfies vs as:
//   const meta = { ... } satisfies Meta<typeof BookingCard>
//   ← satisfies: validates shape, preserves literal types → better inference
//   ← as Meta<...>: cast, loses type info, misses extra property errors
//
// fn() vs action():
//   fn()          → Storybook spy (can assert: toHaveBeenCalledWith)
//   action("name")→ only logs to Actions panel (cannot assert in play)
//   Always use fn() when you have play functions
//
// Story naming:
//   Export name PascalCase → sidebar shows as "Pascal Case" (spaces added)
//   Override: name: "Edge Case: Long Name"
//   Avoid: Default as first story (it shows in Primary slot in docs)
//
// Story testing pyramid:
//   Unit tests (Vitest):     pure function logic
//   Play functions:          component interaction (render → click → assert)
//   Test runner:             all stories rendered without errors
//   Visual regression:       pixel-perfect UI consistency
//   E2E (Playwright/Cypress):full user flows across pages
// ============================================================
