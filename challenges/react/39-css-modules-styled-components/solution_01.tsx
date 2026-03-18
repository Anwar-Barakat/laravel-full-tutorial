// ============================================================
// Problem 01 — CSS Modules + styled-components
// ============================================================



// ============================================================
// CSS Modules — fundamentals
//
// Import: import styles from "./BookingCard.module.css"
// Use:    className={styles.card}
// Output: className="BookingCard_card__xK3p2"  (hashed unique name)
//
// Why: no global class collisions even if every module uses .card
//
// Conditional classes (two approaches):
//   1. Template literal:
//      `${styles.card} ${isSelected ? styles.selected : ""}`
//   2. clsx (cleaner):
//      clsx(styles.card, { [styles.selected]: isSelected })
//      clsx(styles.card, styles.header, condition && styles.active)
//
// Dynamic modifier via bracket notation:
//   className={`${styles.badge} ${styles[booking.status]}`}
//   ← status is "pending"|"confirmed"|"paid"|"cancelled"
//   ← maps to .pending / .confirmed etc. in the CSS file
// ============================================================



// ============================================================
// CSS Modules — key CSS features
//
// composes (CSS Modules only):
//   .cardCompact { composes: card; padding: 0.75rem; }
//   ← inherits all .card styles, overrides padding
//   ← vs duplicating: DRY, no specificity conflicts
//
// :global(.className) — escape module scope:
//   :global(.dark-mode) .card { background: #1f2937; }
//   ← overrides when .dark-mode is on an ancestor element
//   ← use for: third-party library overrides, body class theming
//
// CSS custom properties work normally inside modules:
//   .container { --primary: #3b82f6; }
//   .button { background: var(--primary); }
//
// All standard CSS works: hover, focus, media queries, keyframes
//   Just the class names are scoped — CSS mechanics unchanged
// ============================================================



// ============================================================
// CSS Modules — TypeScript types (vite-plugin-css-modules-dts)
//
// Without plugin: styles is typed as { [key: string]: string }
//   → no autocomplete, typos silently return undefined
//
// With plugin: generates .module.css.d.ts:
//   declare const styles: { readonly card: string; readonly badge: string; ... }
//   → full autocomplete + compile errors on missing class names
//
// Quick alternative without plugin — manual types file:
//   BookingCard.module.css.d.ts:
//   declare const styles: { card: string; badge: string; ... }
//   export default styles
// ============================================================



// ============================================================
// styled-components — basics
//
// import styled, { css, keyframes } from "styled-components"
//
// const Card = styled.article`
//   background: white;
//   border-radius: 0.5rem;
//   &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
//   &:focus-visible { outline: 2px solid #3b82f6; }
// `
//
// Generates: unique class per styled component
// Injected into: <style> tag in <head> at runtime
// Re-renders: new CSS class generated when props change
//
// Three component types:
//   styled.div → HTML element
//   styled(ExistingComponent) → wrap any component (must accept className)
//   styled(Link) → works with react-router Link etc.
// ============================================================



// ============================================================
// styled-components — props-driven styles
//
// Props convention: $ prefix = transient prop
//   $selected, $compact, $variant, $hasError
//   ← NOT forwarded to DOM (avoids React unknown-prop warning)
//   ← styled.button<{ $loading: boolean }>`...`
//
// Dynamic CSS:
//   background: ${({ status }) => statusColors[status].bg};
//   padding: ${({ $compact }) => $compact ? "0.75rem" : "1.5rem"};
//
// Conditional block with css helper:
//   ${({ $selected }) => $selected && css`
//     outline: 2px solid #3b82f6;
//     outline-offset: 2px;
//   `}
//   ← css`` tag: enables syntax highlighting + correct interpolation
//   ← without css``: string concatenation, no syntax highlight
// ============================================================



// ============================================================
// styled-components — keyframes + extending
//
// keyframes:
//   const fadeIn = keyframes`
//     from { opacity:0; transform:translateY(8px); }
//     to   { opacity:1; transform:translateY(0); }
//   `
//   const AnimatedCard = styled(Card)`
//     animation: ${fadeIn} 0.2s ease-out;
//   `
//   ← injects @keyframes with unique name → no global collision
//
// Extending:
//   const CompactCard = styled(StyledCard)` padding: 0.75rem; `
//   ← generates a NEW component, new class, overrides just padding
//   ← original StyledCard unchanged
// ============================================================



// ============================================================
// styled-components — ThemeProvider
//
// Wrap app: <ThemeProvider theme={theme}>{children}</ThemeProvider>
//
// Access in component: ${({ theme }) => theme.colors.primary}
//
// TypeScript: declare module "styled-components" {
//   interface DefaultTheme extends AppTheme {}
// }
// ← now theme is typed everywhere, no any casts
//
// createGlobalStyle:
//   const GlobalStyles = createGlobalStyle`
//     *, *::before, *::after { box-sizing: border-box; }
//     body { background: ${({ theme }) => theme.colors.background}; }
//   `
//   ← inject in App alongside ThemeProvider:
//   <ThemeProvider theme={theme}><GlobalStyles /><App /></ThemeProvider>
// ============================================================
