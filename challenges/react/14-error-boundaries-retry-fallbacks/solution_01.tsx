// ============================================================
// Problem 01 — Error Boundary System
// ============================================================



// ============================================================
// components/ErrorBoundary.tsx  (class component — required for error boundaries)
//
// type FallbackProp = ReactNode | ((error: Error, retry: () => void) => ReactNode)
//
// Props: { children, fallback?, onError?, name? }
// State: { hasError: boolean; error: Error | null }
//
// static getDerivedStateFromError(error: Error):
//   return { hasError: true, error }
//   ← static: no this; pure; runs during render phase
//
// componentDidCatch(error, errorInfo):
//   console.error(`[ErrorBoundary: ${name}]`, error, errorInfo.componentStack)
//   this.props.onError?.(error, errorInfo)
//   ← instance method; side effects only; runs after commit
//
// retry = (): void => this.setState({ hasError: false, error: null })
//   ← arrow function as class property; this always bound (no binding in constructor needed)
//
// render():
//   if !hasError: return children
//   if typeof fallback === "function": return fallback(error, this.retry)
//   if fallback: return fallback
//   return <DefaultErrorFallback error={error} retry={this.retry} />
// ============================================================



// ============================================================
// components/SectionErrorBoundary.tsx
//
// Props: { children, name: string }  (name required for debugging)
//
// Wraps ErrorBoundary with:
//   onError: console.warn (section errors are non-critical)
//   fallback: (error, retry) => inline red bordered box
//     shows section name + error.message + "Reload section" link
//
// Purpose: non-critical UI — crash stays within the section
//          rest of page continues working
// ============================================================



// ============================================================
// components/PageErrorBoundary.tsx
//
// Wraps ErrorBoundary with:
//   name: "Page"
//   onError: reportToMonitoring (Sentry etc.)
//   fallback: (error, retry) => full-screen centered error
//     "Page crashed" h1
//     error.message
//     {dev only} <pre>{error.stack}</pre>
//     buttons: "Try again" (retry) + "Go home" (a href="/")
// ============================================================



// ============================================================
// hooks/useErrorHandler.ts
//
// Bridges async errors into the nearest ErrorBoundary.
// Error boundaries only catch synchronous render errors by default.
//
// const [, setState] = useState<null>(null)
//
// return useCallback((error: unknown) => {
//   setState(() => {
//     if (error instanceof Error) throw error
//     throw new Error(String(error))
//   })
// }, [])
//
// Mechanism: throwing inside setState callback during render →
//   React routes it to the nearest boundary's getDerivedStateFromError
//
// Usage:
//   const throwError = useErrorHandler()
//   fetchBookings().catch(err => throwError(err))
// ============================================================



// ============================================================
// Layout pattern: section isolation
//
// <PageErrorBoundary>
//   <SectionErrorBoundary name="Booking Stats">
//     <BookingStats />     ← crash → inline error, rest renders
//   </SectionErrorBoundary>
//   <SectionErrorBoundary name="Booking List">
//     <BookingList />      ← independent — unaffected by Stats crash
//   </SectionErrorBoundary>
// </PageErrorBoundary>
//
// Render-function fallback:
//   <ErrorBoundary fallback={(error, retry) => <custom JSX />}>
//     <PaymentWidget />
//   </ErrorBoundary>
// ============================================================
