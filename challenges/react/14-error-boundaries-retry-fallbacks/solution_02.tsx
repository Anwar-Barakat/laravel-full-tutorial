// ============================================================
// Problem 02 — Auto-Retry & Error Recovery
// ============================================================



// ============================================================
// components/AutoRetryBoundary.tsx
//
// Props: { children, maxRetries?=3, backoff?=1000, onGiveUp?, fallback? }
// State extends ErrorBoundaryState: { retryCount, isRetrying }
//
// private retryTimer: ReturnType<typeof setTimeout> | null = null
//
// static getDerivedStateFromError(error):
//   return { hasError: true, error }
//
// componentDidCatch(error, info):
//   nextAttempt = this.state.retryCount + 1
//   if nextAttempt <= maxRetries:
//     delay = backoff * Math.pow(2, this.state.retryCount)
//       attempt 0 → 1000ms, attempt 1 → 2000ms, attempt 2 → 4000ms
//     setState({ isRetrying: true })
//     setTimeout(() => setState({ hasError: false, error: null,
//                                 retryCount: nextAttempt, isRetrying: false }), delay)
//   else:
//     onGiveUp?.(error, nextAttempt)
//
// componentWillUnmount():
//   if retryTimer: clearTimeout(retryTimer)  ← prevent setState on unmounted component
//
// manualRetry = ():
//   setState({ hasError: false, error: null, retryCount: 0, isRetrying: false })
//   ← manual retry resets counter to 0 (fresh slate)
//
// render():
//   if isRetrying || (hasError && retryCount < maxRetries):
//     show "Retrying… (attempt N of maxRetries)" with spinner
//   if hasError && exhausted:
//     fallback(error, manualRetry) || <ErrorRecovery attempts={retryCount} />
//   else: children
// ============================================================



// ============================================================
// components/ErrorRecovery.tsx
//
// Props: { error?, attempts?=0, onRetry?, onReport? }
//
// exhausted = attempts >= 3
//   → if true: promotes "Refresh page" to primary button; demotes "Try again"
//   → shows amber warning: "This error occurred N times. A page refresh may help."
//
// Recovery options (in priority order):
//   1. "Try again"     → onRetry()             (hidden if exhausted)
//   2. "Refresh page"  → window.location.reload() (primary if exhausted)
//   3. "Go back"       → window.history.back()
//   4. "Report this"   → onReport(error) as text link (only if onReport provided)
// ============================================================



// ============================================================
// lib/withErrorBoundary.tsx  (HOC pattern)
//
// withErrorBoundary<P>(WrappedComponent, options):
//   options: { fallback?, onError?, name?, autoRetry?, maxRetries? }
//   displayName = options.name ?? component.displayName ?? component.name
//
//   function WithErrorBoundaryWrapper(props: P):
//     if autoRetry:
//       return <AutoRetryBoundary maxRetries fallback onGiveUp={(err) => onError?.(err)}>
//                <WrappedComponent {...props} />
//              </AutoRetryBoundary>
//     else:
//       return <ErrorBoundary name fallback onError>
//                <WrappedComponent {...props} />
//              </ErrorBoundary>
//
//   set displayName = `WithErrorBoundary(${displayName})`
//   return wrapper
//
// Usage:
//   const SafeBookingList = withErrorBoundary(BookingList, {
//     onError: err => Sentry.captureException(err),
//     fallback: <ErrorRecovery />,
//   })
//
//   const ResilientChart = withErrorBoundary(RevenueChart, {
//     autoRetry: true, maxRetries: 3
//   })
// ============================================================



// ============================================================
// Error frequency tracking
//
// const errorFrequencyMap = new Map<string, number>()
//   module-level singleton — survives component re-mounts
//
// trackError(error: Error): number
//   key = error.message.slice(0, 100)
//   count = (map.get(key) ?? 0) + 1
//   map.set(key, count)
//   return count
//
// In AutoRetryBoundary.componentDidCatch:
//   frequency = trackError(error)
//   if frequency >= 3:
//     setState({ hasError: true, retryCount: maxRetries })  ← skip retry
//     return
//   // else normal auto-retry logic
//
// window.addEventListener("beforeunload", () => errorFrequencyMap.clear())
//   ← clear on page navigation so fresh page starts clean
// ============================================================
