// ============================================================
// Problem 01 — Error Boundary System
// ============================================================

import { Component, useState, useCallback, type ReactNode, type ErrorInfo } from "react";

// ============================================================
// Types
// ============================================================

// Fallback can be static JSX or a render function receiving error + retry
type FallbackProp =
    | ReactNode
    | ((error: Error, retry: () => void) => ReactNode);

interface ErrorBoundaryProps {
    children:  ReactNode;
    fallback?: FallbackProp;
    onError?:  (error: Error, errorInfo: ErrorInfo) => void;
    name?:     string;   // identifier for logging — "BookingStats", "PaymentsChart"
}

interface ErrorBoundaryState {
    hasError: boolean;
    error:    Error | null;
}

// ============================================================
// ErrorBoundary — base class component
// ============================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    // Runs during render phase — returns new state; no side effects allowed
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    // Runs after commit phase — side effects only (logging, reporting)
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error(
            `[ErrorBoundary: ${this.props.name ?? "Unknown"}]`,
            error,
            errorInfo.componentStack,
        );
        this.props.onError?.(error, errorInfo);
    }

    // Arrow function — this is always bound, no constructor needed
    retry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { fallback, children } = this.props;

        if (!hasError || !error) return children;
        if (typeof fallback === "function") return fallback(error, this.retry);
        if (fallback) return fallback;
        return <DefaultErrorFallback error={error} retry={this.retry} />;
    }
}

// ============================================================
// DefaultErrorFallback — shown when no fallback prop provided
// ============================================================

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
    return (
        <div role="alert" className="flex flex-col items-center justify-center p-6 text-center">
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
    );
}

// ============================================================
// SectionErrorBoundary — inline error for non-critical UI
// ============================================================

export function SectionErrorBoundary({
    children,
    name,
}: {
    children: ReactNode;
    name:     string;   // required — helps with debugging
}) {
    return (
        <ErrorBoundary
            name={name}
            onError={(error) => console.warn(`Section "${name}" error:`, error.message)}
            fallback={(error, retry) => (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm">
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
    );
}

// ============================================================
// PageErrorBoundary — full-page error at route level
// ============================================================

export function PageErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            name="Page"
            onError={(error, info) => {
                // Send to monitoring in production (Sentry etc.)
                console.error("Page error:", error, info.componentStack);
            }}
            fallback={(error, retry) => (
                <div className="min-h-screen flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <p className="text-6xl mb-6" aria-hidden="true">💔</p>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Page crashed
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
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
    );
}

// ============================================================
// useErrorHandler — bridges async errors into boundaries
// ============================================================

// Error boundaries only catch synchronous render errors by default.
// This hook throws inside a setState callback — React routes it to the nearest boundary.

export function useErrorHandler(): (error: unknown) => void {
    const [, setState] = useState<null>(null);

    return useCallback((error: unknown) => {
        setState(() => {
            if (error instanceof Error) throw error;
            throw new Error(String(error));
        });
    }, []);
}

// Usage:
// function BookingList() {
//   const throwError = useErrorHandler()
//   useEffect(() => {
//     fetchBookings()
//       .then(setBookings)
//       .catch(err => throwError(err))  ← async error reaches nearest ErrorBoundary
//   }, [])
// }

/*
================================================================
TIPS
================================================================

WHY ERROR BOUNDARIES EXIST
----------------------------
• Without ErrorBoundary: one component crash → entire page goes blank (white screen)
• With ErrorBoundary: crash is contained — only that section shows an error
• ErrorBoundary = a wall around components
  → if something inside crashes, the wall catches it
  → everything OUTSIDE the wall keeps working

getDerivedStateFromError vs componentDidCatch
----------------------------------------------
• getDerivedStateFromError — static, runs DURING render phase
  → only returns new state; NO side effects (no console, no fetch)
• componentDidCatch       — instance, runs AFTER commit phase
  → side effects here: logging, Sentry, analytics
• getDerivedStateFromError is the ONLY thing React checks to decide if a class
  component is an error boundary — everything else (componentDidCatch, retry, onError) is optional
• Rule: getDerivedStateFromError → WHAT state to be in; componentDidCatch → WHO to tell

retry = (): void => { ... }  (arrow function as class property)
----------------------------------------------------------------
• Arrow function automatically binds `this` to the class instance
• Alternative (old way): bind in constructor: this.retry = this.retry.bind(this)
• Arrow property is cleaner — no constructor needed

FallbackProp — render function pattern
----------------------------------------
• Static JSX fallback: <ErrorBoundary fallback={<div>Error</div>}>
• Render function:     <ErrorBoundary fallback={(error, retry) => <div onClick={retry}>{error.message}</div>}>
• Render function gives caller control of the UI while boundary provides the data

useErrorHandler — setState throw trick
----------------------------------------
• Error boundaries only catch errors during render/lifecycle
• Async errors (fetch, setTimeout) are NOT caught by default
• Fix: throw inside setState callback → React treats it as a render error → boundary catches it

SectionErrorBoundary vs PageErrorBoundary
------------------------------------------
• Section: non-critical — inline red box, rest of page still works
• Page: critical — full screen, go home option, stack trace in dev
• Both are just thin wrappers around the same ErrorBoundary class

================================================================
*/
