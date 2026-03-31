# REACT_TEST_41 — Monorepo • Shared Components

**Time:** 25 minutes | **Stack:** React + TypeScript + Turborepo / pnpm workspaces

---

## Problem 01 — Shared Component Architecture (Medium)

Build a shared component library (`@tripz/ui`) consumed by multiple apps in a monorepo.

---

### Monorepo structure

```
tripz/
├── package.json              ← root workspace config
├── pnpm-workspace.yaml
├── turbo.json                ← Turborepo pipeline
├── packages/
│   ├── ui/                   ← shared component library (@tripz/ui)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts    ← library build
│   │   └── src/
│   │       ├── index.ts      ← main export barrel
│   │       ├── tokens/       ← design tokens
│   │       ├── components/   ← Button, Badge, Card...
│   │       └── hooks/        ← shared hooks
│   ├── config/               ← shared tsconfig, eslint config
│   │   ├── tsconfig.base.json
│   │   └── eslint-base.js
│   └── utils/                ← shared utility functions (@tripz/utils)
└── apps/
    ├── booking-portal/       ← customer-facing React app
    │   └── package.json      ← { "dependencies": { "@tripz/ui": "workspace:*" } }
    └── admin-dashboard/      ← internal admin React app
        └── package.json
```

---

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

---

### Root package.json

```json
{
  "name": "tripz",
  "private": true,
  "scripts": {
    "dev":   "turbo run dev",
    "build": "turbo run build",
    "test":  "turbo run test",
    "lint":  "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

---

### turbo.json — pipeline

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs":   ["dist/**"]
    },
    "dev": {
      "cache":     false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs":   ["coverage/**"]
    },
    "lint": {}
  }
}
```

**`"dependsOn": ["^build"]`** — `^` prefix means: run the `build` task of ALL packages this package depends on before running this package's `build`. If `booking-portal` depends on `@tripz/ui`, the UI library is built first automatically.

---

### @tripz/ui — package.json

```json
{
  "name": "@tripz/ui",
  "version": "1.0.0",
  "description": "Tripz shared UI component library",
  "main":    "./dist/index.cjs",
  "module":  "./dist/index.js",
  "types":   "./dist/index.d.ts",
  "exports": {
    ".": {
      "import":  "./dist/index.js",
      "require": "./dist/index.cjs",
      "types":   "./dist/index.d.ts"
    },
    "./tokens": {
      "import":  "./dist/tokens.js",
      "require": "./dist/tokens.cjs",
      "types":   "./dist/tokens.d.ts"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "peerDependencies": {
    "react":     ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@types/react": "^18",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "vite-plugin-dts": "^3",
    "typescript": "^5"
  },
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "dev":   "vite build --watch",
    "test":  "vitest"
  }
}
```

**Key fields:**
- `exports` — modern package entry points (Node 12+ / bundler-aware)
- `sideEffects: false` — enables tree-shaking (no global side effects)
- `peerDependencies` — React is provided by the consuming app, not bundled in
- `files: ["dist"]` — only publish the dist folder to npm (not src)

---

### vite.config.ts — library build

```ts
// packages/ui/vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,  // generates index.d.ts entry point
      rollupTypes: true,       // bundle all .d.ts into one file
    }),
  ],
  build: {
    lib: {
      entry:    resolve(__dirname, "src/index.ts"),
      name:     "TripzUI",
      formats:  ["es", "cjs"],    // ESM for bundlers, CJS for old tooling
      fileName: format => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      // Exclude peer dependencies from bundle:
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react:           "React",
          "react-dom":     "ReactDOM",
          "react/jsx-runtime": "jsx",
        },
      },
    },
  },
})
```

---

### Design tokens

```ts
// packages/ui/src/tokens/index.ts

export const colors = {
  primary: {
    50:  "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },
  success: {
    50:  "#f0fdf4",
    500: "#22c55e",
    700: "#15803d",
  },
  danger: {
    50:  "#fef2f2",
    500: "#ef4444",
    700: "#b91c1c",
  },
  warning: {
    50:  "#fffbeb",
    500: "#f59e0b",
    700: "#b45309",
  },
  neutral: {
    50:  "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    500: "#6b7280",
    700: "#374151",
    900: "#111827",
  },
} as const

export const spacing = {
  0:    "0",
  1:    "0.25rem",
  2:    "0.5rem",
  3:    "0.75rem",
  4:    "1rem",
  6:    "1.5rem",
  8:    "2rem",
  12:   "3rem",
} as const

export const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
  },
  fontSize: {
    xs:  "0.75rem",
    sm:  "0.875rem",
    md:  "1rem",
    lg:  "1.125rem",
    xl:  "1.25rem",
    "2xl": "1.5rem",
  },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
} as const

export const radii = {
  sm:   "0.25rem",
  md:   "0.375rem",
  lg:   "0.5rem",
  xl:   "0.75rem",
  full: "9999px",
} as const

export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)",
  lg: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
} as const

// Derive TypeScript types from the objects:
export type Color   = typeof colors
export type Spacing = typeof spacing
```

---

### Button component — polymorphic + variants

```tsx
// packages/ui/src/components/Button/Button.tsx

import React from "react"
import { colors, radii, spacing, typography } from "../../tokens"

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"
type ButtonSize    = "sm" | "md" | "lg"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  isLoading?: boolean
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: colors.primary[500], color: "white", border: "none" },
  secondary: { background: "white", color: colors.primary[600], border: `1px solid ${colors.primary[500]}` },
  danger:    { background: colors.danger[500], color: "white", border: "none" },
  ghost:     { background: "transparent", color: colors.neutral[700], border: "none" },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: `${spacing[1]} ${spacing[3]}`, fontSize: typography.fontSize.sm },
  md: { padding: `${spacing[2]} ${spacing[4]}`, fontSize: typography.fontSize.md },
  lg: { padding: `${spacing[3]} ${spacing[6]}`, fontSize: typography.fontSize.lg },
}

/**
 * Primary action button with variant and size options.
 * @example <Button variant="primary" size="md">Create Booking</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", isLoading = false, leftIcon, rightIcon, children, disabled, style, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            spacing[2],
          borderRadius:   radii.md,
          fontWeight:     typography.fontWeight.medium,
          fontFamily:     typography.fontFamily.sans,
          cursor:         disabled || isLoading ? "not-allowed" : "pointer",
          opacity:        disabled ? 0.6 : 1,
          transition:     "background 0.15s, box-shadow 0.15s",
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,         // allow consumer overrides
        }}
        {...props}
      >
        {isLoading ? <Spinner size={size} /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)
Button.displayName = "Button"
```

---

### Badge component

```tsx
// packages/ui/src/components/Badge/Badge.tsx

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral"

interface BadgeProps {
  variant?: BadgeVariant
  size?:    "sm" | "md"
  children: React.ReactNode
  className?: string
}

const badgeTokens: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: colors.success[50],  color: colors.success[700]  },
  warning: { bg: colors.warning[50],  color: colors.warning[700]  },
  danger:  { bg: colors.danger[50],   color: colors.danger[700]   },
  info:    { bg: colors.primary[50],  color: colors.primary[700]  },
  neutral: { bg: colors.neutral[100], color: colors.neutral[700]  },
}

export function Badge({ variant = "neutral", size = "md", children }: BadgeProps) {
  const { bg, color } = badgeTokens[variant]
  return (
    <span style={{
      display:      "inline-flex",
      alignItems:   "center",
      padding:      size === "sm" ? `${spacing[0]} ${spacing[2]}` : `${spacing[1]} ${spacing[3]}`,
      borderRadius: radii.full,
      fontSize:     size === "sm" ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight:   typography.fontWeight.medium,
      background:   bg,
      color,
    }}>
      {children}
    </span>
  )
}
```

---

### src/index.ts — barrel export

```ts
// packages/ui/src/index.ts

// Components
export { Button }        from "./components/Button/Button"
export { Badge }         from "./components/Badge/Badge"
export { Card }          from "./components/Card/Card"
export { Input }         from "./components/Input/Input"
export { Modal }         from "./components/Modal/Modal"
export { Spinner }       from "./components/Spinner/Spinner"

// Types (re-export for consuming apps)
export type { ButtonProps }   from "./components/Button/Button"
export type { BadgeProps }    from "./components/Badge/Badge"

// Tokens
export * from "./tokens"

// Hooks
export { useBreakpoint }     from "./hooks/useBreakpoint"
export { useMediaQuery }     from "./hooks/useMediaQuery"
```

---

### Consuming app — usage

```tsx
// apps/booking-portal/src/components/BookingCard.tsx
import { Button, Badge, Card, colors, spacing } from "@tripz/ui"

function BookingCard({ booking }: { booking: Booking }) {
  const variantMap = {
    pending:   "warning",
    confirmed: "info",
    paid:      "success",
    cancelled: "danger",
  } as const

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing[4] }}>
        <h3>{booking.school_name}</h3>
        <Badge variant={variantMap[booking.status]}>{booking.status}</Badge>
      </div>
      <Button variant="primary" onClick={() => viewBooking(booking.id)}>
        View Details
      </Button>
    </Card>
  )
}
```

---

## Problem 02 — Advanced Shared Architecture (Hard)

Polymorphic components, compound patterns, versioning with changesets, and type-safe CSS variables.

---

### Polymorphic component — `as` prop

```tsx
// A component that can render as any HTML element or React component

type AsProp<C extends React.ElementType> = { as?: C }

type PropsWithAs<C extends React.ElementType, P = {}> =
  AsProp<C> & Omit<React.ComponentPropsWithRef<C>, keyof AsProp<C>> & P

interface TextOwnProps {
  size?:    keyof typeof typography.fontSize
  weight?:  keyof typeof typography.fontWeight
  color?:   string
  truncate?: boolean
}

type TextProps<C extends React.ElementType = "span"> =
  PropsWithAs<C, TextOwnProps>

function TextInner<C extends React.ElementType = "span">(
  { as, size = "md", weight = "normal", color, truncate, style, children, ...props }: TextProps<C>,
  ref: React.ForwardedRef<React.ElementRef<C>>
) {
  const Component = as ?? "span"

  return (
    <Component
      ref={ref}
      style={{
        fontSize:     typography.fontSize[size],
        fontWeight:   typography.fontWeight[weight],
        color:        color,
        overflow:     truncate ? "hidden" : undefined,
        textOverflow: truncate ? "ellipsis" : undefined,
        whiteSpace:   truncate ? "nowrap" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  )
}

// forwardRef loses generic type — use this pattern:
export const Text = React.forwardRef(TextInner) as <C extends React.ElementType = "span">(
  props: TextProps<C> & { ref?: React.ForwardedRef<React.ElementRef<C>> }
) => React.ReactElement | null

// Usage:
// <Text as="h1" size="2xl" weight="bold">Bookings</Text>
// <Text as="p" size="sm" color={colors.neutral[500]}>Subtitle</Text>
// <Text as={Link} to="/bookings" size="sm">View all</Text>
```

---

### Changesets — versioning

```bash
# Install changesets in monorepo root:
npm install -D @changesets/cli
npx changeset init

# Developer workflow — when making a change:
npx changeset
# Interactive: which packages changed? major/minor/patch? summary?
# Creates: .changeset/random-name.md

# Release workflow (CI/CD):
npx changeset version   # bumps versions + updates CHANGELOG.md
npx changeset publish   # publishes changed packages to npm
```

```md
<!-- .changeset/add-badge-variant.md (auto-generated) -->
---
"@tripz/ui": minor
---

Add `neutral` variant to Badge component
```

**SemVer rules:**
- `major` (1.0.0 → 2.0.0): breaking change (removed prop, changed API)
- `minor` (1.0.0 → 1.1.0): new feature, backwards compatible
- `patch` (1.0.0 → 1.0.1): bug fix, no API change

---

### Type-safe CSS custom properties

```ts
// packages/ui/src/tokens/cssVariables.ts

// Generate CSS variable declarations from tokens:
export function generateCSSVariables(tokens: Record<string, any>, prefix = ""): string {
  return Object.entries(tokens)
    .flatMap(([key, value]) => {
      const varName = prefix ? `--${prefix}-${key}` : `--${key}`
      if (typeof value === "object" && value !== null) {
        return [generateCSSVariables(value, varName.replace(/^--/, ""))]
      }
      return [`  ${varName}: ${value};`]
    })
    .join("\n")
}

// Usage:
// generateCSSVariables({ primary: { 500: "#3b82f6" } }, "color")
// → "  --color-primary-500: #3b82f6;"

// Inject into :root in consuming app:
export const cssVariables = `
:root {
${generateCSSVariables({ ...colors }, "color")}
${generateCSSVariables({ ...spacing }, "space")}
}
`

// TypeScript helper for typed CSS variable access:
export function token(variable: string): string {
  return `var(--${variable})`
}
// <div style={{ color: token("color-primary-500") }} />
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `workspace:*` | pnpm internal package reference — always uses local version |
| `"dependsOn": ["^build"]` | Turborepo: build dependencies first (`^` = all dependencies) |
| `external: ["react"]` | Never bundle React into the library — use host app's React |
| `sideEffects: false` | Enable tree-shaking — consumers only bundle what they import |
| `exports` field | Modern package entry points — map import paths to files |
| `peerDependencies` | React = peer, not dependency — single React instance in app |
| `vite-plugin-dts` | Generate `.d.ts` declaration files from TypeScript source |
| `as` prop polymorphic | Component renders as any element — preserve all native props |
| `PropsWithRef<C>` | Include `ref` type when building polymorphic with `forwardRef` |
| Changesets | `changeset` → version → publish — structured changelog workflow |
| `workspace:*` vs `^1.0.0` | `workspace:*` uses local; versioned range uses registry |
| Barrel `index.ts` | Single entry point — controls public API surface |
| `files: ["dist"]` | Only ship dist to npm — not src, tests, storybook |
| CSS custom properties | Share tokens across React + non-React without JS |
