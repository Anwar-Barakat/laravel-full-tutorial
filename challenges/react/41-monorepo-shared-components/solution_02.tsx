// ============================================================
// Problem 02 — Advanced Shared Architecture
// ============================================================



// ============================================================
// Polymorphic component — "as" prop
//
// Problem: <Button> should sometimes render as <a> or <Link>
//   <Button as="a" href="/bookings">View</Button>
//   <Button as={Link} to="/bookings">View</Button>
//
// TypeScript: infer props from the "as" element type
//
// AsProp<C extends React.ElementType> = { as?: C }
//
// PropsWithAs<C, OwnProps> =
//   AsProp<C>
//   & Omit<React.ComponentPropsWithRef<C>, keyof AsProp<C>>
//   & OwnProps
// ← merges: (a) the as prop, (b) native props of C, (c) custom props
// ← Omit removes conflicts (e.g. if OwnProps has "style" and C has "style")
//
// Generic component function:
//   function TextInner<C extends React.ElementType = "span">(
//     { as, ...props }: TextProps<C>,
//     ref: React.ForwardedRef<React.ElementRef<C>>
//   )
//
// forwardRef loses generic — cast the return type:
//   export const Text = React.forwardRef(TextInner) as <C extends React.ElementType>(
//     props: TextProps<C> & { ref?: React.ForwardedRef<React.ElementRef<C>> }
//   ) => React.ReactElement | null
// ============================================================



// ============================================================
// Compound components in a library
//
// Card with sub-components:
//   Card.Header, Card.Body, Card.Footer
//
// Pattern: Object.assign
//   const CardRoot = ({ children, style, ...props }: CardProps) => (
//     <div style={{ borderRadius:radii.lg, boxShadow:shadows.md, ...style }} {...props}>
//       {children}
//     </div>
//   )
//
//   export const Card = Object.assign(CardRoot, {
//     Header: CardHeader,
//     Body:   CardBody,
//     Footer: CardFooter,
//   })
//
// Usage in consuming app:
//   <Card>
//     <Card.Header><h3>Booking #42</h3></Card.Header>
//     <Card.Body><p>St. Mary's Primary</p></Card.Body>
//     <Card.Footer><Button>View</Button></Card.Footer>
//   </Card>
//
// Export: export { Card } from "./components/Card/Card"
//   ← Card.Header etc. included automatically via Object.assign
// ============================================================



// ============================================================
// Changesets — versioning workflow
//
// npx changeset
//   ← interactive: select changed packages, major/minor/patch, summary
//   ← creates: .changeset/random-animal-name.md
//
// .changeset/add-badge-variant.md:
//   ---
//   "@tripz/ui": minor
//   ---
//   Add neutral variant to Badge component
//
// SemVer rules:
//   patch (1.0.0 → 1.0.1): bug fix, no API change
//   minor (1.0.0 → 1.1.0): new feature, backwards compatible
//   major (1.0.0 → 2.0.0): breaking change (removed prop, renamed export)
//
// Release flow:
//   npx changeset version   ← bumps package.json + CHANGELOG.md
//   npx changeset publish   ← npm publish for changed packages
//
// Breaking changes in a shared library:
//   Rename prop: provide old prop with deprecation warning for one major version
//   Remove export: keep re-export in index.ts with @deprecated JSDoc for one version
//   Change default: document in CHANGELOG, bump major
// ============================================================



// ============================================================
// CSS custom properties from tokens
//
// Generate CSS variable declarations:
//   function generateCSSVariables(tokens, prefix):
//     recurse through token object
//     flat key: "--color-primary-500: #3b82f6"
//
// Inject in consuming app (one time):
//   const style = document.createElement("style")
//   style.textContent = `:root {\n${cssVariables}\n}`
//   document.head.appendChild(style)
//
// Or: export cssVariables string → inject in GlobalStyles / index.css
//
// Benefit: CSS variables work in non-React contexts (plain HTML, email templates)
//
// Type-safe accessor:
//   token("color-primary-500") → "var(--color-primary-500)"
//   style={{ color: token("color-primary-500") }}
//
// vs JS tokens:
//   colors.primary[500]  → "#3b82f6" (static value, no CSS cascade)
//   token("color-primary-500") → CSS variable (can override via CSS)
// ============================================================



// ============================================================
// TypeScript config — shared base
//
// packages/config/tsconfig.base.json:
//   {
//     "compilerOptions": {
//       "target": "ES2020",
//       "module": "ESNext",
//       "moduleResolution": "bundler",
//       "jsx": "react-jsx",
//       "strict": true,
//       "declaration": true,
//       "declarationMap": true,     ← source maps for .d.ts (go to source)
//       "skipLibCheck": true,
//     }
//   }
//
// packages/ui/tsconfig.json:
//   { "extends": "@tripz/config/tsconfig.base.json",
//     "include": ["src"], "exclude": ["dist", "**/*.stories.tsx"] }
//
// apps/booking-portal/tsconfig.json:
//   { "extends": "@tripz/config/tsconfig.base.json",
//     "references": [{ "path": "../../packages/ui" }] }
//   ← TypeScript project references: incremental builds, cross-package navigation
// ============================================================



// ============================================================
// Testing a shared component library
//
// packages/ui/vitest.config.ts:
//   environment: "happy-dom"   ← fast DOM simulation (vs jsdom)
//   setupFiles: ["./vitest.setup.ts"]
//   globals: true
//
// Test file pattern: Button.test.tsx co-located with Button.tsx
//
// What to test in library components:
//   ✅ All variant × size combinations render without crash
//   ✅ Ref forwarding: ref attaches to DOM element
//   ✅ Forwarded props reach DOM: data-testid, aria-label
//   ✅ isLoading disables button and shows spinner
//   ✅ Event handlers fire: onClick, onChange
//   ❌ Don't test CSS values (too brittle) — use Storybook + Chromatic
//
// Snapshot testing for tokens:
//   test("colors token structure", () => {
//     expect(colors).toMatchSnapshot()
//   })
//   ← catches accidental token value changes during refactoring
// ============================================================



// ============================================================
// Key concepts
//
// workspace:* vs ^1.0.0:
//   workspace:* → pnpm uses local package (always latest, no publish needed)
//   ^1.0.0      → fetches from npm registry
//   Development: workspace:*; Production (external consumers): versioned
//
// Why not bundle React into the library:
//   Two React instances = hooks don't work (invalid hook call error)
//   Each app provides its own React via peerDependencies
//   Bundler deduplicates: only one React loaded at runtime
//
// Tree-shaking requirement:
//   sideEffects: false in package.json
//   Named exports (not default exports) in barrel
//   No global side effects at module top level
//   Result: import { Button } → only Button.js in consumer bundle
//
// Package resolution priority (bundlers):
//   exports field > module field > main field
//   exports enables: conditional exports, sub-path imports, type definitions
//   Always define exports in a library package.json
// ============================================================
