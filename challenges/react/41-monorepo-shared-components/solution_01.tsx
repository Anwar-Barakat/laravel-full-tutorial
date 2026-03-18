// ============================================================
// Problem 01 — Shared Component Architecture
// ============================================================



// ============================================================
// Monorepo structure
//
// tripz/
//   packages/
//     ui/      ← @tripz/ui (shared components + tokens)
//     config/  ← shared tsconfig, eslint config
//     utils/   ← @tripz/utils (shared utility functions)
//   apps/
//     booking-portal/   → depends on @tripz/ui
//     admin-dashboard/  → depends on @tripz/ui
//
// pnpm-workspace.yaml:
//   packages: ["packages/*", "apps/*"]
//
// Consuming app package.json:
//   { "dependencies": { "@tripz/ui": "workspace:*" } }
//   workspace:* = always use local version (not npm registry)
// ============================================================



// ============================================================
// turbo.json — build pipeline
//
// "build": { "dependsOn":["^build"], "outputs":["dist/**"] }
//   ← ^ prefix = run dependency's build FIRST
//   ← if booking-portal depends on @tripz/ui:
//      turbo run build → builds @tripz/ui first, then apps
//
// "dev":  { "cache":false, "persistent":true }
//   ← persistent: long-running dev server (don't wait for exit)
//   ← cache:false: always run (can't cache a server process)
//
// Turborepo caching:
//   Caches task outputs (dist/) by content hash of inputs
//   Unchanged packages: restore from cache (near-instant)
//   Changed packages: rebuild only those + dependents
// ============================================================



// ============================================================
// @tripz/ui package.json — key fields
//
// "main":   "./dist/index.cjs"    ← CommonJS (old Node / Jest)
// "module": "./dist/index.js"     ← ESM (Vite / webpack 5)
// "types":  "./dist/index.d.ts"   ← TypeScript declarations
//
// "exports": {
//   ".":        { import:"./dist/index.js", require:"./dist/index.cjs" }
//   "./tokens": { import:"./dist/tokens.js", ... }
// }
// ← exports field takes priority over main/module in modern bundlers
// ← allows sub-path imports: import { colors } from "@tripz/ui/tokens"
//
// "sideEffects": false
//   ← tree-shaking: bundler can safely drop unused exports
//   ← set to true only if file has global side effects (CSS imports, polyfills)
//
// "peerDependencies": { "react": ">=18" }
//   ← React is provided by consuming app
//   ← library NEVER bundles React (prevents two React instances)
//
// "files": ["dist"]
//   ← only ship dist to npm (not src, tests, .storybook, stories)
// ============================================================



// ============================================================
// vite.config.ts — library build
//
// build.lib:
//   entry:   "src/index.ts"           ← library entry point
//   formats: ["es", "cjs"]            ← ESM + CommonJS dual build
//   fileName: format => `index.${format === "es" ? "js" : "cjs"}`
//
// rollupOptions.external: ["react", "react-dom", "react/jsx-runtime"]
//   ← CRITICAL: exclude peer deps from bundle
//   ← without this: each consuming app loads TWO React instances
//   ← two React instances = hooks crash ("Invalid hook call")
//
// vite-plugin-dts:
//   insertTypesEntry: true   ← generate index.d.ts entry
//   rollupTypes: true        ← bundle all .d.ts into single file
//   ← consuming app gets proper TypeScript intellisense
// ============================================================



// ============================================================
// Design tokens — as const + type inference
//
// export const colors = { primary: { 500:"#3b82f6", ... } } as const
// ← as const: literal types (not string) → enables type-safe access
// ← colors.primary[500] is "#3b82f6" (literal), not string
//
// export type Color = typeof colors
// ← derive TypeScript type from the object (no duplication)
//
// Token categories:
//   colors:     palette + semantic (primary, success, danger, neutral)
//   spacing:    0→12 scale in rem (consistent whitespace)
//   typography: fontFamily, fontSize, fontWeight
//   radii:      sm/md/lg/xl/full
//   shadows:    sm/md/lg elevation
//
// Design token naming convention:
//   colors.primary[500] = base colour
//   colors.primary[50]  = light tint (backgrounds)
//   colors.primary[700] = dark shade (text on light bg)
// ============================================================



// ============================================================
// Button component — forwardRef + variants
//
// React.forwardRef<HTMLButtonElement, ButtonProps>
//   ← enables ref passing: <Button ref={btnRef} />
//   ← required for any component used in form libraries, popovers
//
// Button.displayName = "Button"
//   ← shows "Button" in React DevTools (not "ForwardRef")
//
// variant styles: Record<ButtonVariant, CSSProperties>
//   ← object map avoids switch statement
//   ← add new variant = add one entry to the map
//
// isLoading handling:
//   disabled={disabled || isLoading}
//   aria-busy={isLoading}
//   Show Spinner instead of leftIcon when loading
//   ← button remains accessible (not just visually disabled)
//
// style spread last:
//   ...style  ← consumer can override any individual property
//   ← prefer this over className for library components (no CSS dependency)
// ============================================================



// ============================================================
// src/index.ts — barrel export (public API)
//
// Export components:
//   export { Button } from "./components/Button/Button"
//   export { Badge }  from "./components/Badge/Badge"
//
// Export types separately (TypeScript best practice):
//   export type { ButtonProps } from "./components/Button/Button"
//   ← "export type" → erased at runtime, no JS output
//
// Export tokens:
//   export * from "./tokens"
//   ← consuming apps import: import { colors, spacing } from "@tripz/ui"
//
// Barrel pattern rule:
//   ONLY export what is part of the public API
//   Internal helpers, implementation details: do NOT export
//   Once exported, consumers may depend on it → breaking to remove
// ============================================================
