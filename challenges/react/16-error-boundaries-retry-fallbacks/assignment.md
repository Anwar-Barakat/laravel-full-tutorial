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

---

## Problem 02 — Auto-Retry & Error Recovery (Hard)

### Scenario

Build an auto-retry Error Boundary that automatically retries rendering failed components with exponential backoff, plus an `ErrorRecovery` component that offers multiple recovery strategies.

### Requirements

1. `AutoRetryBoundary` — retries N times before showing error
2. Exponential backoff between retries (1s, 2s, 4s)
3. Show retry count: "Retrying... (attempt 2 of 3)"
4. `ErrorRecovery` — offers: retry, refresh page, go back, report bug
5. `withErrorBoundary(Component, options)` HOC for wrapping
6. Track error frequency — if same error 3+ times, suggest page refresh instead of retry

### Expected Code

```tsx
// components/AutoRetryBoundary.tsx
interface AutoRetryBoundaryProps {
  children:    ReactNode
  maxRetries?: number    // default 3
  backoff?:    number    // initial delay ms; doubles each attempt (default 1000)
  onGiveUp?:   (error: Error, attempts: number) => void
  fallback?:   FallbackProp
}

interface AutoRetryState extends ErrorBoundaryState {
  retryCount:   number
  isRetrying:   boolean
}

export class AutoRetryBoundary extends Component<AutoRetryBoundaryProps, AutoRetryState> {
  state: AutoRetryState = {
    hasError:   false,
    error:      null,
    retryCount: 0,
    isRetrying: false,
  }

  private retryTimer: ReturnType<typeof setTimeout> | null = null

  static getDerivedStateFromError(error: Error): Partial<AutoRetryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { maxRetries = 3, backoff = 1000, onGiveUp } = this.props
    const nextAttempt = this.state.retryCount + 1

    if (nextAttempt <= maxRetries) {
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = backoff * Math.pow(2, this.state.retryCount)

      this.setState({ isRetrying: true })

      this.retryTimer = setTimeout(() => {
        this.setState({
          hasError:   false,
          error:      null,
          retryCount: nextAttempt,
          isRetrying: false,
        })
      }, delay)
    } else {
      // Exhausted all retries
      onGiveUp?.(error, nextAttempt)
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
  }

  manualRetry = (): void => {
    this.setState({
      hasError:   false,
      error:      null,
      retryCount: 0,   // manual retry resets the counter
      isRetrying: false,
    })
  }

  render(): ReactNode {
    const { hasError, error, retryCount, isRetrying } = this.state
    const { maxRetries = 3, children, fallback } = this.props

    // Auto-retry in progress — show status
    if (isRetrying || (hasError && retryCount < maxRetries)) {
      return (
        <div className="flex items-center justify-center p-6 text-gray-500 text-sm">
          <span className="animate-spin mr-2">⟳</span>
          Retrying… (attempt {retryCount + 1} of {maxRetries})
        </div>
      )
    }

    // Exhausted retries — show fallback
    if (hasError && error) {
      if (typeof fallback === "function") return fallback(error, this.manualRetry)
      if (fallback) return fallback

      return (
        <ErrorRecovery
          error={error}
          attempts={retryCount}
          onRetry={this.manualRetry}
        />
      )
    }

    return children
  }
}
```

```tsx
// components/ErrorRecovery.tsx
interface ErrorRecoveryProps {
  error?:      Error
  attempts?:   number
  onRetry?:    () => void
  onReport?:   (error: Error) => void
}

export function ErrorRecovery({
  error,
  attempts = 0,
  onRetry,
  onReport,
}: ErrorRecoveryProps) {
  // If the same error happened 3+ times, recommend a full page refresh
  const exhausted = attempts >= 3

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto"
    >
      <p className="text-5xl mb-4" aria-hidden="true">
        {exhausted ? "🔄" : "⚠️"}
      </p>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {exhausted ? "Still not working?" : "Something went wrong"}
      </h3>

      {error && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-5">
          {error.message}
        </p>
      )}

      {exhausted && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
          This error has occurred {attempts} times. A page refresh may help.
        </p>
      )}

      <div className="flex flex-col gap-2 w-full">
        {/* Recovery options in priority order */}
        {!exhausted && onRetry && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Try again
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className={`w-full px-4 py-2 rounded-lg text-sm border ${
            exhausted
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
          }`}
        >
          Refresh page
        </button>

        <button
          onClick={() => window.history.back()}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Go back
        </button>

        {onReport && error && (
          <button
            onClick={() => onReport(error)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline mt-1"
          >
            Report this problem
          </button>
        )}
      </div>
    </div>
  )
}
```

```tsx
// lib/withErrorBoundary.tsx — HOC pattern
interface WithErrorBoundaryOptions {
  fallback?:  FallbackProp
  onError?:   (error: Error, errorInfo: ErrorInfo) => void
  name?:      string
  autoRetry?: boolean
  maxRetries?: number
}

// Wraps a component in an ErrorBoundary — useful for third-party or unstable components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const { fallback, onError, name, autoRetry = false, maxRetries = 3 } = options
  const displayName = name ?? WrappedComponent.displayName ?? WrappedComponent.name

  function WithErrorBoundaryWrapper(props: P) {
    if (autoRetry) {
      return (
        <AutoRetryBoundary
          maxRetries={maxRetries}
          fallback={fallback}
          onGiveUp={(err, attempts) => onError?.(err, { componentStack: "" } as ErrorInfo)}
        >
          <WrappedComponent {...props} />
        </AutoRetryBoundary>
      )
    }

    return (
      <ErrorBoundary name={displayName} fallback={fallback} onError={onError}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  WithErrorBoundaryWrapper.displayName = `WithErrorBoundary(${displayName})`
  return WithErrorBoundaryWrapper
}

// Usage
const SafeBookingList = withErrorBoundary(BookingList, {
  name:     "BookingList",
  onError:  (err) => Sentry.captureException(err),
  fallback: <ErrorRecovery />,
})

const ResilientChart = withErrorBoundary(RevenueChart, {
  name:       "RevenueChart",
  autoRetry:  true,
  maxRetries: 3,
  onError:    reportToSentry,
})
```

```tsx
// Error frequency tracking — module-level singleton
const errorFrequencyMap = new Map<string, number>()

function trackError(error: Error): number {
  // Use the error message as the key (normalised)
  const key   = error.message.slice(0, 100)
  const count = (errorFrequencyMap.get(key) ?? 0) + 1
  errorFrequencyMap.set(key, count)
  return count
}

// In AutoRetryBoundary.componentDidCatch:
componentDidCatch(error: Error, info: ErrorInfo): void {
  const frequency = trackError(error)

  // Same error 3+ times → skip retry, go straight to page refresh suggestion
  if (frequency >= 3) {
    this.setState({ hasError: true, retryCount: this.props.maxRetries ?? 3 })
    return
  }

  // Normal auto-retry logic...
}

// Clear frequency on page navigation
window.addEventListener("beforeunload", () => errorFrequencyMap.clear())
```

### Auto-Retry Flow

```
Component throws on render:
  getDerivedStateFromError → { hasError: true, error }
  componentDidCatch → retryCount < maxRetries?
    YES: delay = backoff * 2^retryCount
         setTimeout(reset, delay)   → retryCount++
         isRetrying = true          → render shows "Retrying (1 of 3)"
         Timer fires → hasError = false → children re-render
    NO:  onGiveUp(error, attempts) → render shows <ErrorRecovery attempts={3} />
         exhausted flag → suggests page refresh over retry

Backoff schedule (backoff=1000):
  attempt 0 → wait 1000ms  (1s)
  attempt 1 → wait 2000ms  (2s)
  attempt 2 → wait 4000ms  (4s)
  attempt 3 → give up → <ErrorRecovery exhausted />
```

### What We're Evaluating

- `retryTimer` as class property — cleared in `componentWillUnmount` to prevent setState on unmounted component
- `Math.pow(2, retryCount)` — exponential backoff; doubles each attempt
- `manualRetry` resets `retryCount: 0` — user-initiated retry gets a fresh slate
- `errorFrequencyMap` module singleton — survives re-mounts; tracks across the session
- `frequency >= 3` short-circuit — skip retry, display page-refresh suggestion immediately
- `withErrorBoundary` HOC — preserves `displayName` for React DevTools debugging
- `ErrorRecovery` — `exhausted` flag promotes "Refresh page" button to primary; deprioritises retry
- `window.history.back()` — Go Back option only makes sense in browser context (not SSR)
