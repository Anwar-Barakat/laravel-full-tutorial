// ============================================================
// Problem 01 — Web Workers in React
// ============================================================



// ============================================================
// Why Web Workers
//
// JS is single-threaded — heavy work on main thread blocks:
//   - User clicks, typing, scroll
//   - React rendering, animations (requestAnimationFrame)
//   - Everything visual
//
// Worker runs in a separate thread:
//   - No DOM, no window, no React
//   - Communicate via postMessage / onmessage (structured clone)
//   - Use self.postMessage (not window.postMessage)
// ============================================================



// ============================================================
// Worker file — typed message protocol
//
// Two sides of the protocol:
//   WorkerMessage: what main thread sends TO worker
//     { type:"CALCULATE_ANALYTICS", payload: Booking[] }
//     { type:"PARSE_CSV", payload: string }
//     { type:"EXPORT_CSV", payload: Booking[] }
//
//   WorkerResponse: what worker sends BACK
//     { type:"ANALYTICS_RESULT", payload: AnalyticsResult }
//     { type:"CSV_PARSED", payload: Booking[] }
//     { type:"PROGRESS", payload: number }   ← 0–100
//     { type:"ERROR", payload: string }
//
// Worker entry point:
//   self.onmessage = (event: MessageEvent<WorkerMessage>) => {
//     try {
//       switch (event.data.type) { case "CALCULATE_ANALYTICS": ... }
//     } catch (err) {
//       self.postMessage({ type:"ERROR", payload: err.message })
//     }
//   }
//
// try/catch in onmessage: worker errors not caught here crash silently
// ← always wrap in try/catch and postMessage an ERROR response
// ============================================================



// ============================================================
// Progress reporting from within worker
//
// In a long loop, emit progress every N items:
//   if (i % 1000 === 0):
//     self.postMessage({ type:"PROGRESS",
//                        payload: Math.round(i / total * 100) })
//
// Main thread receives PROGRESS → updates progress bar
// Worker continues computing — no await, no blocking
// ============================================================



// ============================================================
// useWorker hook — core
//
// State (useReducer):
//   status:   "idle" | "loading" | "success" | "error"
//   data:     T | null
//   error:    string | null
//   progress: number (0–100)
//
// workerRef = useRef<Worker | null>(null)
//
// useEffect(() => {
//   workerRef.current = workerFactory()   ← create once on mount
//   workerRef.current.onerror = e => dispatch({ type:"ERROR", payload:e.message })
//   return () => workerRef.current?.terminate()
//   ← CRITICAL: terminate on unmount — workers don't GC automatically
//   ← without this: orphaned thread lives until page reload
// }, [])
//
// postMessage(message):
//   dispatch({ type:"STARTED" })
//   workerRef.current.onmessage = ({ data }) => {
//     if data.type === "PROGRESS": dispatch PROGRESS
//     elif data.type === "ERROR":  dispatch ERROR
//     else:                        dispatch SUCCESS
//   }
//   workerRef.current.postMessage(message)
// ============================================================



// ============================================================
// Worker instantiation — Vite vs CRA
//
// Vite (recommended):
//   new Worker(new URL("../workers/x.worker.ts", import.meta.url), { type:"module" })
//   ← type:"module" required for ES imports inside worker
//   ← import.meta.url resolves relative path at build time
//
// CRA (without type:module):
//   new Worker(new URL("../workers/x.worker.ts", import.meta.url))
//
// Webpack 5 (same as Vite syntax):
//   new Worker(new URL("./worker.ts", import.meta.url))
//
// NEVER: new Worker("./worker.js") ← string path breaks in bundled apps
// NEVER: inline worker via blob URL ← can't import modules
// ============================================================



// ============================================================
// useBookingAnalytics — domain hook
//
// Wraps useWorker with domain-specific interface:
//
// const { data, status, progress, postMessage } =
//   useWorker<WorkerMessage, AnalyticsResult>(
//     () => new Worker(new URL(...), { type:"module" })
//   )
//
// calculate(bookings):
//   postMessage({ type:"CALCULATE_ANALYTICS", payload: bookings })
//
// parseCSV(text):
//   postMessage({ type:"PARSE_CSV", payload: text })
//
// Returns: { analytics, isLoading, progress, error, calculate, parseCSV }
// ============================================================



// ============================================================
// AnalyticsDashboard component
//
// "Analyse 50k Bookings" button:
//   Generate demo data Array.from({ length:50_000 }, ...) on main thread (fast)
//   Call calculate(demo) → sent to worker (heavy part offloaded)
//
// File upload:
//   const text = await file.text()      ← file I/O, fast
//   parseCSV(text)                      ← parsing in worker, not main thread
//
// While isLoading:
//   <div role="status" aria-live="polite" aria-label={`Processing: ${progress}%`}>
//   ← screen reader announces progress
//   ← UI remains interactive (worker is on separate thread)
//
// Error:
//   <div role="alert" aria-live="assertive">Error: {error}</div>
//
// Results: render analytics.totalRevenue, statusBreakdown, topSchools, monthlyRevenue
// ============================================================



// ============================================================
// Key concepts
//
// Worker scope restrictions:
//   ✅ fetch, setTimeout, IndexedDB, crypto, console, URL
//   ❌ window, document, DOM APIs, React, localStorage
//   Use self.postMessage not window.postMessage
//
// Structured clone (default):
//   Deep copy of data — safe but O(n) memory
//   Most data types: objects, arrays, strings, numbers, dates, Maps, Sets
//   Cannot clone: functions, DOM nodes, React components
//
// Worker thread count:
//   navigator.hardwareConcurrency → logical CPU count (good pool hint)
//   Don't create more workers than CPU cores (context switching overhead)
//
// Error propagation:
//   worker.onerror: fires on uncaught errors and syntax/import errors
//   Always also handle { type:"ERROR" } in onmessage
//   Two separate error paths — need both
// ============================================================
