// ============================================================
// Problem 02 — Advanced Styling Approaches
// ============================================================



// ============================================================
// Dark mode — styled-components dual theme
//
// lightTheme / darkTheme: separate AppTheme objects
//   lightTheme.colors.background = "#f9fafb"
//   darkTheme.colors.background  = "#111827"
//
// useDarkMode():
//   initial: window.matchMedia("(prefers-color-scheme: dark)").matches
//   useEffect: mq.addEventListener("change", handler)
//   return: { isDark, toggle }
//
// App:
//   <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
//   ← ALL styled-components re-read theme.colors.background etc.
//   ← zero per-component changes needed
//
// Persist to localStorage:
//   localStorage.setItem("theme", isDark ? "dark" : "light")
//   initial: localStorage.getItem("theme") ?? systemPreference
// ============================================================



// ============================================================
// Dark mode — CSS Modules + custom properties (alternative)
//
// tokens.css (global):
//   :root    { --color-bg: #f9fafb; --color-text: #111827; }
//   [data-theme="dark"] { --color-bg: #111827; --color-text: #f9fafb; }
//
// BookingCard.module.css:
//   .card { background: var(--color-bg); color: var(--color-text); }
//
// Switch theme (no component re-renders):
//   document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
//   ← CSS cascade handles it — JS only toggles one attribute
//
// Advantage over styled-components theming:
//   Zero JavaScript re-renders — pure CSS cascade
//   Instant switch with no React tree update
//   Works even in non-React parts of the page
// ============================================================



// ============================================================
// Tailwind vs CSS Modules vs styled-components
//
// Tailwind:
//   + Fastest iteration, utility-first, tiny bundle (purged)
//   + No separate CSS files, responsive/dark with variants
//   - Long className strings, learning all utilities
//   - Dynamic styles need safelisting or inline style
//   Best for: product apps, rapid prototyping, design-token constrained
//
// CSS Modules:
//   + Familiar CSS syntax, zero runtime overhead
//   + Scoped by default, works with all CSS features
//   - Separate .module.css file per component
//   - No dynamic styles from JavaScript props
//   Best for: existing CSS knowledge, max performance, simple theming via CSS vars
//
// styled-components:
//   + Props-driven dynamic styles, colocated with component
//   + ThemeProvider for design system theming
//   - Runtime overhead (~17kB + CSS class generation)
//   - SSR needs ServerStyleSheet (extra setup)
//   Best for: component libraries, heavy dynamic theming, design systems
// ============================================================



// ============================================================
// Performance — styled-components .attrs()
//
// Problem: each unique prop combination = new CSS class
//   If $size changes on every render (animation, resize):
//     100 different sizes → 100 generated CSS classes → memory leak
//
// Solution: .attrs() for frequently-changing values
//   const Box = styled.div.attrs<{ $size: number }>(({ $size }) => ({
//     style: { width:`${$size}px`, height:`${$size}px` },
//   }))`
//     position: absolute;
//     background: ${({ theme }) => theme.colors.primary};
//   `
//   ← style attribute: updated via DOM (no new class)
//   ← class: only for stable CSS (generated once)
//
// Rule: use .attrs({ style:... }) for values that change frequently
//       use CSS props for values that are one of a few discrete options
// ============================================================



// ============================================================
// Performance — shouldForwardProp
//
// styled.input.withConfig({ shouldForwardProp: prop => !["$hasError"].includes(prop) })
//   ← prevents $hasError from reaching <input> DOM element
//   ← avoids "Unknown prop $hasError on <input>" console warning
//
// $ prefix (v5.1+) handles most cases automatically
//   ← $ props are NOT forwarded to DOM by default
//
// Manual shouldForwardProp: needed when you DON'T use $ prefix
// or when wrapping third-party components that forward all props
// ============================================================



// ============================================================
// Testing — CSS Modules
//
// jest.config: moduleNameMapper: { "\\.module\\.css$": "identity-obj-proxy" }
//   ← styles.card → "card" (returns the property key as string)
//   ← styles.selected → "selected"
//
// Test assertion:
//   expect(element).toHaveClass("card")
//   expect(element).toHaveClass("selected")
//   ← identity-obj-proxy makes this work correctly
//
// Vitest: same config in vite.config.ts test.css block
//   or use css: { modules: { classNameStrategy: "non-scoped" } }
// ============================================================



// ============================================================
// Testing — styled-components
//
// import "jest-styled-components"
// ← adds toHaveStyleRule matcher
//
// Always wrap in ThemeProvider when testing themed components:
//   render(<ThemeProvider theme={theme}><Badge status="paid">paid</Badge></ThemeProvider>)
//
// toHaveStyleRule assertions:
//   expect(badge).toHaveStyleRule("background", "#dcfce7")
//   expect(badge).toHaveStyleRule("color", "#166534")
//
//   Media query variant:
//   expect(card).toHaveStyleRule("padding", "0.75rem", {
//     media: "(max-width: 640px)"
//   })
//
//   Pseudo-class variant:
//   expect(button).toHaveStyleRule("background", "#2563eb", { modifier: ":hover" })
// ============================================================



// ============================================================
// Key concepts
//
// CSS Modules class composition order:
//   styles.badge + styles.paid → two separate class names applied
//   CSS order (in .css file) determines specificity, not JSX order
//   Keep modifier classes AFTER base class in CSS file
//
// styled-components SSR (Next.js / Remix):
//   import { ServerStyleSheet } from "styled-components"
//   Collect styles server-side, inject into HTML <head>
//   Prevents FOUC (flash of unstyled content) on hydration
//   Alternative: use @emotion/styled (better SSR + React 18 streaming)
//
// CSS-in-JS alternatives to styled-components:
//   emotion:    similar API, better performance, better SSR
//   vanilla-extract: zero-runtime CSS-in-TS (like CSS Modules but typed)
//   linaria:    zero-runtime CSS-in-JS (extracted at build time)
//   panda-css:  zero-runtime, works with RSC (React Server Components)
//
// When to combine approaches:
//   CSS Modules + CSS custom properties = great default (Vite projects)
//   Tailwind + styled-components = rare (conflicting philosophies)
//   Tailwind + CSS Modules = fine for third-party overrides via :global()
// ============================================================
