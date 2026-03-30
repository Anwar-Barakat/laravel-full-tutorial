# REACT_TEST_39 — CSS Modules • styled-components

**Time:** 25 minutes | **Stack:** React + TypeScript + CSS Modules + styled-components

---

## Problem 01 — Alternative Styling Approaches (Medium)

Build the Tripz booking UI using both CSS Modules and styled-components. Understand when to choose each approach.

---

### CSS Modules

CSS Modules scope class names to the component file — no global namespace collisions.

```css
/* BookingCard.module.css */
.card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.schoolName {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

/* Modifier classes — applied conditionally in JS */
.badge.pending   { background: #fef3c7; color: #92400e; }
.badge.confirmed { background: #dbeafe; color: #1e40af; }
.badge.paid      { background: #dcfce7; color: #166534; }
.badge.cancelled { background: #fee2e2; color: #991b1b; }

/* composes — inherit from another class (CSS Modules only) */
.cardCompact {
  composes: card;        /* inherit all .card styles */
  padding: 0.75rem;      /* override specific property */
}

/* Global override — escape the module scope */
:global(.dark-mode) .card {
  background: #1f2937;
  color: #f9fafb;
}
```

```tsx
// BookingCard.tsx — CSS Modules usage
import styles from "./BookingCard.module.css"

interface BookingCardProps {
  booking:    Booking
  isSelected: boolean
  onSelect:   (id: number) => void
}

function BookingCard({ booking, isSelected, onSelect }: BookingCardProps) {
  // styles.card → "BookingCard_card__xK3p2" (unique hashed class)
  // Two ways to compose conditional classes:

  // 1. Template literal (simple):
  const cardClass = `${styles.card} ${isSelected ? styles.selected : ""}`

  // 2. clsx / classnames library (cleaner for multiple conditions):
  // import clsx from "clsx"
  // const cardClass = clsx(styles.card, { [styles.selected]: isSelected })

  return (
    <article
      className={cardClass}
      onClick={() => onSelect(booking.id)}
      aria-pressed={isSelected}
    >
      <div className={styles.header}>
        <span className={styles.schoolName}>{booking.school_name}</span>
        <span className={`${styles.badge} ${styles[booking.status]}`}>
          {booking.status}
        </span>
      </div>
      <BookingDetails booking={booking} />
    </article>
  )
}
```

**CSS Modules TypeScript support:**

```ts
// Vite: works out of the box
// CRA: works out of the box
// Next.js: works out of the box

// For typed autocomplete (optional — vite-plugin-css-modules-dts):
// Generates BookingCard.module.css.d.ts:
// declare const styles: {
//   readonly card: string
//   readonly selected: string
//   readonly header: string
//   readonly schoolName: string
//   readonly badge: string
//   readonly pending: string
//   readonly confirmed: string
//   readonly paid: string
//   readonly cancelled: string
// }
// export default styles
```

---

### CSS Modules — BookingList with grid layout

```css
/* BookingList.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.empty .icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

/* CSS custom properties — theme tokens */
.container {
  --card-radius: 0.5rem;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --primary: #3b82f6;
}

/* Responsive — use media queries directly */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

/* Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card {
  animation: fadeIn 0.2s ease-out;
}
```

---

### styled-components

CSS-in-JS: styles defined in JavaScript, colocated with component logic.

```bash
npm install styled-components
npm install -D @types/styled-components
```

```tsx
// components/styled/BookingCard.tsx
import styled, { css, keyframes, DefaultTheme } from "styled-components"

// ---- Basic styled component ----
const Card = styled.article`
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`

// ---- Props-driven styles ----
interface BadgeProps {
  status: Booking["status"]
}

const statusColors = {
  pending:   { bg: "#fef3c7", color: "#92400e" },
  confirmed: { bg: "#dbeafe", color: "#1e40af" },
  paid:      { bg: "#dcfce7", color: "#166534" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
} as const

const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;

  /* Dynamic CSS via props */
  background: ${({ status }) => statusColors[status].bg};
  color:      ${({ status }) => statusColors[status].color};
`

// ---- Conditional styles with css helper ----
interface CardProps {
  $selected?: boolean    // $ prefix = transient prop (not passed to DOM)
  $compact?:  boolean
}

const StyledCard = styled.article<CardProps>`
  background: white;
  border-radius: 0.5rem;
  padding: ${({ $compact }) => $compact ? "0.75rem" : "1.5rem"};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  ${({ $selected }) =>
    $selected &&
    css`
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    `
  }
`
// $ prefix (transient props): prevents styled-components from forwarding
// $selected to the DOM element — avoids React unknown-prop warning

// ---- Keyframe animation ----
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const AnimatedCard = styled(StyledCard)`
  animation: ${fadeIn} 0.2s ease-out;
`

// ---- Extending existing components ----
const CompactCard = styled(StyledCard)`
  padding: 0.75rem;
`

// ---- Styling third-party components ----
import { Link } from "react-router-dom"
const StyledLink = styled(Link)`
  color: #3b82f6;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`
// Works if the component passes className to its root element

// ---- Component usage ----
function BookingCard({ booking, isSelected, compact }: BookingCardProps & { compact?: boolean }) {
  return (
    <AnimatedCard
      $selected={isSelected}
      $compact={compact}
      onClick={() => onSelect(booking.id)}
      role="button"
      tabIndex={0}
    >
      <Badge status={booking.status}>{booking.status}</Badge>
      <p>{booking.school_name}</p>
    </AnimatedCard>
  )
}
```

---

### styled-components — ThemeProvider

```tsx
// theme.ts
export const theme = {
  colors: {
    primary:    "#3b82f6",
    success:    "#22c55e",
    danger:     "#ef4444",
    background: "#f9fafb",
    text:       "#111827",
    textMuted:  "#6b7280",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "1rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.1)",
    md: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
} as const

export type AppTheme = typeof theme

// Extend DefaultTheme so all styled-components know the shape:
declare module "styled-components" {
  interface DefaultTheme extends AppTheme {}
}

// App.tsx:
import { ThemeProvider } from "styled-components"
<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>

// Usage in styled component — theme available via props:
const Button = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: white;
  border: none;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}dd;  /* alpha */
  }
`
```

---

### Global styles with styled-components

```tsx
// GlobalStyles.tsx
import { createGlobalStyle } from "styled-components"

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.5;
  }

  /* Focus styles for accessibility */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

// App.tsx:
<ThemeProvider theme={theme}>
  <GlobalStyles />
  <App />
</ThemeProvider>
```

---

## Problem 02 — Advanced Styling (Hard)

Dark mode, CSS custom properties integration, animation variants, testing, and performance.

---

### Dark mode — styled-components

```tsx
// hooks/useDarkMode.ts
export function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  )

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return { isDark, toggle: () => setIsDark(d => !d) }
}

// Dual themes:
const lightTheme: AppTheme = { ...theme, colors: { ...theme.colors, background: "#f9fafb", text: "#111827" } }
const darkTheme:  AppTheme = { ...theme, colors: { ...theme.colors, background: "#111827", text: "#f9fafb" } }

function App() {
  const { isDark } = useDarkMode()
  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <GlobalStyles />
      <Router />
    </ThemeProvider>
  )
}
```

---

### CSS Modules + CSS custom properties (hybrid approach)

```css
/* tokens.css — design tokens as CSS custom properties */
:root {
  --color-primary:    #3b82f6;
  --color-background: #f9fafb;
  --color-text:       #111827;
  --shadow-card:      0 1px 3px rgba(0, 0, 0, 0.1);
  --radius-card:      0.5rem;
  --transition-base:  200ms ease;
}

[data-theme="dark"] {
  --color-primary:    #60a5fa;
  --color-background: #111827;
  --color-text:       #f9fafb;
  --shadow-card:      0 1px 3px rgba(0, 0, 0, 0.4);
}
```

```css
/* BookingCard.module.css — use tokens */
.card {
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-card);
  transition: box-shadow var(--transition-base);
}
```

```tsx
// Apply dark theme by toggling data-theme on <html>:
document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
// CSS Modules + custom properties = no JS theme switching on individual components
```

---

### Comparison: Tailwind vs CSS Modules vs styled-components

```
┌─────────────────┬─────────────┬──────────────┬───────────────────┐
│ Feature         │ Tailwind    │ CSS Modules  │ styled-components │
├─────────────────┼─────────────┼──────────────┼───────────────────┤
│ Scoping         │ Global util │ File-scoped  │ Component-scoped  │
│ Bundle size     │ Tiny (purge)│ Per-file CSS │ Runtime + lib     │
│ Dynamic styles  │ Limited*    │ None (static)│ Full (props)      │
│ TypeScript      │ Excellent   │ Good (d.ts)  │ Excellent         │
│ SSR             │ Perfect     │ Perfect      │ Good (ServerStyle)│
│ Theming         │ config.js   │ CSS vars     │ ThemeProvider     │
│ Learning curve  │ Medium      │ Low          │ Medium            │
│ Co-location     │ In JSX      │ Separate .css│ In .tsx           │
│ Runtime cost    │ None        │ None         │ Small (~17kB)     │
│ Debugging       │ Class names │ Real names   │ Generated names   │
└─────────────────┴─────────────┴──────────────┴───────────────────┘
* Tailwind dynamic: safelisting or inline style for truly dynamic values

Choose:
  Tailwind:          rapid development, utility-first, design system tokens in config
  CSS Modules:       prefer plain CSS, existing codebase, max performance
  styled-components: design system library, heavy dynamic theming, component library
```

---

### Testing styled-components

```tsx
// @testing-library/jest-dom + jest-styled-components
import "jest-styled-components"

test("badge renders correct status color", () => {
  const { getByText } = render(
    <ThemeProvider theme={theme}>
      <Badge status="paid">paid</Badge>
    </ThemeProvider>
  )

  expect(getByText("paid")).toHaveStyleRule("background", "#dcfce7")
  // toHaveStyleRule: from jest-styled-components — reads computed styles
  expect(getByText("paid")).toHaveStyleRule("color", "#166534")
})

// CSS Modules testing:
// jest.config.js: moduleNameMapper: { "\\.module\\.css$": "identity-obj-proxy" }
// identity-obj-proxy: styles.card → "card" (the key name) for assertions
test("card has selected class when selected", () => {
  const { getByRole } = render(<BookingCard booking={booking} isSelected onSelect={() => {}} />)
  expect(getByRole("button")).toHaveClass("selected")  // identity-obj-proxy returns key
})
```

---

### Performance — styled-components v6

```tsx
// 1. Use .attrs() for frequently-changing inline styles (avoids class regeneration):
const Box = styled.div.attrs<{ $size: number }>(({ $size }) => ({
  style: { width: `${$size}px`, height: `${$size}px` },
  // style: updated via DOM style attribute (no new CSS class generated)
  // class: only for stable CSS (generated once)
}))`
  position: absolute;
  background: ${({ theme }) => theme.colors.primary};
`
// Without .attrs: each unique $size value generates a new CSS class
// With .attrs: stable class + inline style for changing property

// 2. shouldForwardProp — prevent non-HTML props reaching DOM:
const StyledInput = styled.input.withConfig({
  shouldForwardProp: prop => !["$hasError", "$size"].includes(prop),
})<{ $hasError?: boolean; $size?: "sm" | "md" | "lg" }>`
  border-color: ${({ $hasError }) => $hasError ? "red" : "currentColor"};
`

// 3. CSS Modules: zero runtime overhead
// Only real cost: CSS file size (offset by HTTP/2 caching)
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `styles.className` | Hashed unique name — no collisions across components |
| `composes` | CSS Modules only — inherit styles from another class |
| `:global()` | Escape CSS Module scoping — for third-party library overrides |
| `clsx` | Utility to conditionally join class names (works with any approach) |
| `styled.div` | Returns a React component with a generated class |
| `css` helper | Tagged template for conditional style blocks (enables syntax highlighting) |
| `$prop` transient prefix | Prevents styled-components from forwarding prop to DOM element |
| `keyframes` | Defines animation, injects unique `@keyframes` name at build |
| `ThemeProvider` | Injects theme into `props.theme` for all styled descendants |
| `createGlobalStyle` | Injects global CSS (resets, fonts, root variables) |
| `DefaultTheme` augmentation | TypeScript: extend `DefaultTheme` so `theme` prop is typed |
| `.attrs()` | Compute frequently-changing values as `style` (not CSS class) |
| `shouldForwardProp` | Prevent custom props reaching HTML element (avoids console warnings) |
| `identity-obj-proxy` | Jest: CSS Modules → class name returns its own key string |
| `jest-styled-components` | Adds `toHaveStyleRule` for testing CSS-in-JS rules |
