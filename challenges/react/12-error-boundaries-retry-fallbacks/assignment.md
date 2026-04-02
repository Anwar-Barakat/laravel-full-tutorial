# Error Boundaries & Recovery Patterns

Build reusable Error Boundary components with retry, section-level isolation, and async error bridging.

| Topic                | Details                                                         |
|----------------------|-----------------------------------------------------------------|
| Error Boundary       | getDerivedStateFromError                                        |
| Retry Logic          | Reset state, re-render                                          |
| Graceful Degradation | Section vs page failure                                         |

## Rules

- **25 minutes** total for 2 problems
- Write React + TypeScript code
- Use hooks, functional components, and modern patterns
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Error Boundary System (Medium)

### Scenario

Build a complete error handling system: a reusable `ErrorBoundary` class component, section-level and page-level variants, a `useErrorHandler` hook for async errors, and a retry mechanism.

### Requirements

1. `ErrorBoundary` class component with `getDerivedStateFromError`
2. Configurable fallback: `ReactNode` or render function `(error, retry) => ReactNode`
3. `onError` callback for error reporting
4. `retry()` resets boundary state and re-renders children
5. `SectionErrorBoundary` — inline error for non-critical UI
6. `PageErrorBoundary` — full-page error with go-home option
7. `useErrorHandler()` — bridges async errors into boundaries

### Expected Code

```tsx
// components/ErrorBoundary.tsx
import { Component, type ReactNode, type ErrorInfo } from "react"

// Fallback can be static JSX or a render function receiving error + reset
type FallbackProp =
  | ReactNode
  | ((error: Error, retry: () => void) => ReactNode)

interface ErrorBoundaryProps {
  children:  ReactNode
  fallback?: FallbackProp
  onError?:  (error: Error, errorInfo: ErrorInfo) => void
  // Identifier for logging — "BookingStats", "PaymentsChart", etc.
  name?:     string
}

interface ErrorBoundaryState {
  hasError: boolean
  error:    Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  // Called during render when a descendant throws
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  // Called after the render phase with the error + component stack
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const boundaryName = this.props.name ?? "Unknown"
    console.error(`[ErrorBoundary: ${boundaryName}]`, error, errorInfo.componentStack)
    this.props.onError?.(error, errorInfo)
  }

  // Reset boundary — triggers re-render of children
  retry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { fallback, children } = this.props

    if (!hasError || !error) return children

    // Render function fallback: caller decides the UI
    if (typeof fallback === "function") {
      return fallback(error, this.retry)
    }

    // Static JSX fallback
    if (fallback) return fallback

    // Default fallback
    return <DefaultErrorFallback error={error} retry={this.retry} />
  }
}

// ── Default fallback UI ─────────────────────────────────────
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-6 text-center"
    >
      <p className="text-4xl mb-3" aria-hidden="true">⚠️</p>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
        {error.message}
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
```

```tsx
// components/SectionErrorBoundary.tsx
// Inline error — stays within the section, rest of page continues working
interface SectionErrorBoundaryProps {
  children: ReactNode
  name:     string   // required — helps with debugging
}

export function SectionErrorBoundary({ children, name }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      name={name}
      onError={(error) => {
        // Section errors are warnings — app still works
        console.warn(`Section "${name}" error:`, error.message)
      }}
      fallback={(error, retry) => (
        <div className="
          rounded-xl border border-red-200 dark:border-red-800
          bg-red-50 dark:bg-red-900/20
          p-4 text-sm
        ">
          <p className="font-medium text-red-700 dark:text-red-400 mb-1">
            {name} failed to load
          </p>
          <p className="text-red-600 dark:text-red-500 text-xs mb-3">
            {error.message}
          </p>
          <button
            onClick={retry}
            className="text-red-700 dark:text-red-400 underline text-xs"
          >
            Reload section
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

```tsx
// components/PageErrorBoundary.tsx
// Full-page error — used at the route level
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      name="Page"
      onError={(error, info) => {
        // Page-level errors go to monitoring (Sentry, etc.)
        reportToMonitoring(error, { componentStack: info.componentStack })
      }}
      fallback={(error, retry) => (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <p className="text-6xl mb-6" aria-hidden="true">💔</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Page crashed
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {error.message}
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre className="text-left text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 overflow-auto max-h-32">
                {error.stack}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={retry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try again
              </button>
              <a
                href="/"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

```tsx
// hooks/useErrorHandler.ts
// Bridges async errors into the nearest ErrorBoundary.
// Error boundaries only catch synchronous render errors by default;
// this hook provides a way to push async errors into a boundary.
import { useState, useCallback } from "react"

export function useErrorHandler(): (error: unknown) => void {
  const [, setState] = useState<null>(null)

  // Throwing during a state update is caught by the nearest ErrorBoundary
  return useCallback((error: unknown) => {
    setState(() => {
      // Throw from inside setState — React calls the boundary's getDerivedStateFromError
      if (error instanceof Error) throw error
      throw new Error(String(error))
    })
  }, [])
}

// Usage
function BookingList() {
  const throwError = useErrorHandler()

  useEffect(() => {
    fetchBookings()
      .then(setBookings)
      .catch((err) => throwError(err))  // ← async error reaches nearest ErrorBoundary
  }, [])

  return <div>...</div>
}
```

```tsx
// Layout: section isolation — stats crash doesn't break the list
function BookingsDashboard() {
  return (
    <PageErrorBoundary>
      <div className="space-y-6">
        {/* Each section isolated — one crash doesn't affect others */}
        <SectionErrorBoundary name="Booking Stats">
          <BookingStats />           {/* Crashes → inline error, list still renders */}
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Booking List">
          <BookingList />            {/* Independent — unaffected by Stats crash */}
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Revenue Chart">
          <RevenueChart />
        </SectionErrorBoundary>
      </div>
    </PageErrorBoundary>
  )
}

// Render-function fallback — custom UI per boundary
<ErrorBoundary
  name="PaymentWidget"
  fallback={(error, retry) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-yellow-800 text-sm">Payment widget failed: {error.message}</p>
      <button onClick={retry} className="text-yellow-700 text-xs underline mt-1">
        Reload
      </button>
    </div>
  )}
>
  <PaymentWidget />
</ErrorBoundary>
```

### Error Boundary Lifecycle

```
Normal render: getDerivedStateFromError not called
              componentDidCatch not called

Child throws during render:
  1. getDerivedStateFromError(error) — static; sets { hasError: true, error }
  2. componentDidCatch(error, errorInfo) — called after; runs onError callback
  3. render() → sees hasError: true → renders fallback

User clicks retry:
  4. retry() → setState({ hasError: false, error: null })
  5. render() → hasError: false → renders children again

Note: getDerivedStateFromError runs during render phase (synchronous)
      componentDidCatch runs during commit phase (after DOM update)
```

### What We're Evaluating

- `getDerivedStateFromError` — static method; returns new state; runs during render phase
- `componentDidCatch` — instance method; side effects only (logging); runs after commit
- `retry = (): void => this.setState(...)` — arrow function as class property; `this` always bound
- Render-function fallback `(error, retry) => ReactNode` — caller controls UI, boundary provides data
- `SectionErrorBoundary` — non-critical UI; inline error with reload button; rest of page unaffected
- `PageErrorBoundary` — critical UI; full-screen; stack trace in dev mode only
- `useErrorHandler` — throws inside `setState` callback; React routes this to the nearest boundary
- Section isolation pattern — independent `<SectionErrorBoundary>` wrappers; one crash → one section error

