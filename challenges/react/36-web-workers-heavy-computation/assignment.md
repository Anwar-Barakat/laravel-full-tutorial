# REACT_TEST_36 — Web Workers • Heavy Computation

**Time:** 25 minutes | **Stack:** React + TypeScript + Web Workers API

---

## Problem 01 — Web Workers in React (Medium)

Offload heavy computation to a background thread so the UI never freezes.

---

### Why Web Workers?

JavaScript is single-threaded. Heavy computation on the main thread blocks:
- User interactions (clicks, typing)
- Animations (requestAnimationFrame)
- React rendering

Web Workers run in a **separate thread** — no access to DOM, `window`, or React state.
Communication is via `postMessage` / `onmessage` (structured clone, not shared memory).

---

### Worker file — booking analytics

```ts
// workers/bookingAnalytics.worker.ts

interface Booking {
  id: number
  school_name: string
  trip_date: string
  student_count: number
  status: "pending" | "confirmed" | "paid" | "completed" | "cancelled"
  amount: number
}

interface AnalyticsResult {
  totalRevenue: number
  averageBookingValue: number
  statusBreakdown: Record<string, number>
  topSchools: Array<{ school: string; total: number; count: number }>
  monthlyRevenue: Array<{ month: string; revenue: number; count: number }>
  revenuePerStudent: number
}

type WorkerMessage =
  | { type: "CALCULATE_ANALYTICS"; payload: Booking[] }
  | { type: "PARSE_CSV"; payload: string }
  | { type: "EXPORT_CSV"; payload: Booking[] }

type WorkerResponse =
  | { type: "ANALYTICS_RESULT"; payload: AnalyticsResult }
  | { type: "CSV_PARSED"; payload: Booking[] }
  | { type: "CSV_EXPORTED"; payload: string }
  | { type: "PROGRESS"; payload: number }          // 0–100
  | { type: "ERROR"; payload: string }

// Worker entry point — receives messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data

  try {
    switch (type) {
      case "CALCULATE_ANALYTICS": {
        const result = calculateAnalytics(payload)
        self.postMessage({ type: "ANALYTICS_RESULT", payload: result } satisfies WorkerResponse)
        break
      }
      case "PARSE_CSV": {
        const bookings = parseCSV(payload)
        self.postMessage({ type: "CSV_PARSED", payload: bookings } satisfies WorkerResponse)
        break
      }
      case "EXPORT_CSV": {
        const csv = exportToCSV(payload)
        self.postMessage({ type: "CSV_EXPORTED", payload: csv } satisfies WorkerResponse)
        break
      }
    }
  } catch (err) {
    self.postMessage({
      type: "ERROR",
      payload: err instanceof Error ? err.message : "Unknown worker error",
    } satisfies WorkerResponse)
  }
}

function calculateAnalytics(bookings: Booking[]): AnalyticsResult {
  const total = bookings.length

  const totalRevenue = bookings.reduce((sum, b) => sum + b.amount, 0)

  const statusBreakdown = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  // Top schools by revenue
  const schoolMap = new Map<string, { total: number; count: number }>()
  bookings.forEach(b => {
    const current = schoolMap.get(b.school_name) ?? { total: 0, count: 0 }
    schoolMap.set(b.school_name, { total: current.total + b.amount, count: current.count + 1 })
  })
  const topSchools = [...schoolMap.entries()]
    .map(([school, data]) => ({ school, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Monthly revenue — emit progress during long computation
  const monthlyMap = new Map<string, { revenue: number; count: number }>()
  bookings.forEach((b, i) => {
    const month = b.trip_date.slice(0, 7)  // "2024-03"
    const current = monthlyMap.get(month) ?? { revenue: 0, count: 0 }
    monthlyMap.set(month, { revenue: current.revenue + b.amount, count: current.count + 1 })

    // Report progress every 1000 items
    if (i % 1000 === 0) {
      self.postMessage({ type: "PROGRESS", payload: Math.round(i / bookings.length * 100) })
    }
  })

  const monthlyRevenue = [...monthlyMap.entries()]
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const totalStudents = bookings.reduce((sum, b) => sum + b.student_count, 0)

  return {
    totalRevenue,
    averageBookingValue: total > 0 ? totalRevenue / total : 0,
    statusBreakdown,
    topSchools,
    monthlyRevenue,
    revenuePerStudent: totalStudents > 0 ? totalRevenue / totalStudents : 0,
  }
}

function parseCSV(csvText: string): Booking[] {
  const lines = csvText.trim().split("\n")
  const headers = lines[0].split(",").map(h => h.trim())

  return lines.slice(1).map((line, i) => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""))
    const row = Object.fromEntries(headers.map((h, j) => [h, values[j]]))
    return {
      id: i + 1,
      school_name:   row.school_name ?? "",
      trip_date:     row.trip_date ?? "",
      student_count: Number(row.student_count ?? 0),
      status:        (row.status ?? "pending") as Booking["status"],
      amount:        Number(row.amount ?? 0),
    }
  })
}

function exportToCSV(bookings: Booking[]): string {
  const headers = ["id", "school_name", "trip_date", "student_count", "status", "amount"]
  const rows = bookings.map(b =>
    headers.map(h => `"${String(b[h as keyof Booking]).replace(/"/g, '""')}"`).join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}
```

---

### useWorker hook — typed message passing

```ts
// hooks/useWorker.ts
import { useEffect, useRef, useCallback, useReducer } from "react"

interface WorkerState<T> {
  data:     T | null
  error:    string | null
  status:   "idle" | "loading" | "success" | "error"
  progress: number    // 0–100
}

type WorkerAction<T> =
  | { type: "STARTED" }
  | { type: "PROGRESS"; payload: number }
  | { type: "SUCCESS"; payload: T }
  | { type: "ERROR"; payload: string }
  | { type: "RESET" }

function workerReducer<T>(state: WorkerState<T>, action: WorkerAction<T>): WorkerState<T> {
  switch (action.type) {
    case "STARTED":   return { ...state, status: "loading", error: null, progress: 0 }
    case "PROGRESS":  return { ...state, progress: action.payload }
    case "SUCCESS":   return { data: action.payload, error: null, status: "success", progress: 100 }
    case "ERROR":     return { ...state, error: action.payload, status: "error" }
    case "RESET":     return { data: null, error: null, status: "idle", progress: 0 }
    default:          return state
  }
}

export function useWorker<TMessage, TResult>(
  workerFactory: () => Worker
  // Factory function — called once on mount to create the worker
  // Vite: () => new Worker(new URL("../workers/x.worker.ts", import.meta.url), { type: "module" })
  // CRA:  () => new Worker(new URL("../workers/x.worker.ts", import.meta.url))
) {
  const workerRef = useRef<Worker | null>(null)
  const [state, dispatch] = useReducer(workerReducer<TResult>, {
    data: null, error: null, status: "idle", progress: 0,
  })

  useEffect(() => {
    workerRef.current = workerFactory()

    workerRef.current.onerror = (event) => {
      dispatch({ type: "ERROR", payload: event.message ?? "Worker crashed" })
    }

    return () => {
      workerRef.current?.terminate()
      // CRITICAL: terminate on unmount — workers don't GC automatically
      // Without this: worker thread stays alive even after component unmounts
    }
  }, [])

  const postMessage = useCallback((message: TMessage) => {
    if (!workerRef.current) return
    dispatch({ type: "STARTED" })

    workerRef.current.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data
      if (type === "PROGRESS") {
        dispatch({ type: "PROGRESS", payload })
      } else if (type === "ERROR") {
        dispatch({ type: "ERROR", payload })
      } else {
        dispatch({ type: "SUCCESS", payload })
      }
    }

    workerRef.current.postMessage(message)
  }, [])

  const reset = useCallback(() => dispatch({ type: "RESET" }), [])

  return { ...state, postMessage, reset }
}
```

---

### useBookingAnalytics — domain-specific hook

```ts
// hooks/useBookingAnalytics.ts
import { WorkerMessage, WorkerResponse, AnalyticsResult } from "../workers/bookingAnalytics.worker"

export function useBookingAnalytics() {
  const { data, error, status, progress, postMessage } = useWorker<WorkerMessage, AnalyticsResult>(
    () => new Worker(
      new URL("../workers/bookingAnalytics.worker.ts", import.meta.url),
      { type: "module" }
      // type: "module" required for Vite + TypeScript workers (enables ES imports)
    )
  )

  const calculate = useCallback((bookings: Booking[]) => {
    postMessage({ type: "CALCULATE_ANALYTICS", payload: bookings })
  }, [postMessage])

  const parseCSV = useCallback((csvText: string) => {
    postMessage({ type: "PARSE_CSV", payload: csvText })
  }, [postMessage])

  return { analytics: data, error, isLoading: status === "loading", progress, calculate, parseCSV }
}
```

---

### AnalyticsDashboard component

```tsx
// components/AnalyticsDashboard.tsx
function AnalyticsDashboard() {
  const { analytics, isLoading, progress, error, calculate } = useBookingAnalytics()
  const [bookings, setBookings] = useState<Booking[]>([])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Read file on main thread (fast — just file I/O)
    const text = await file.text()

    // Heavy parsing happens in worker — main thread free
    calculate(parseCSVToBookings(text))
  }

  const handleGenerateDemo = () => {
    // Generate 50k bookings to demonstrate worker benefit
    const demo = Array.from({ length: 50_000 }, (_, i) => ({
      id: i + 1,
      school_name: `School ${i % 200}`,
      trip_date: new Date(2024, i % 12, (i % 28) + 1).toISOString().slice(0, 10),
      student_count: 10 + (i % 40),
      status: (["pending","confirmed","paid","completed","cancelled"] as const)[i % 5],
      amount: 500 + (i % 5000),
    }))
    calculate(demo)
  }

  return (
    <div>
      <button onClick={handleGenerateDemo} disabled={isLoading}>
        Analyse 50k Bookings
      </button>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        aria-label="Upload CSV file"
      />

      {isLoading && (
        <div role="status" aria-live="polite" aria-label={`Processing: ${progress}%`}>
          <ProgressBar value={progress} max={100} />
          <p>Processing... {progress}%</p>
          {/* UI remains interactive — user can still navigate, click etc. */}
        </div>
      )}

      {error && (
        <div role="alert" aria-live="assertive">
          Error: {error}
        </div>
      )}

      {analytics && (
        <div aria-label="Analytics results">
          <StatCard label="Total Revenue"    value={formatCurrency(analytics.totalRevenue)} />
          <StatCard label="Average Booking"  value={formatCurrency(analytics.averageBookingValue)} />
          <StatCard label="Revenue/Student"  value={formatCurrency(analytics.revenuePerStudent)} />
          <StatusBreakdownChart data={analytics.statusBreakdown} />
          <TopSchoolsTable data={analytics.topSchools} />
          <MonthlyRevenueChart data={analytics.monthlyRevenue} />
        </div>
      )}
    </div>
  )
}
```

---

## Problem 02 — Advanced Web Workers (Hard)

Worker pools, SharedArrayBuffer, comlink, transferable objects, and testing patterns.

---

### Transferable objects — zero-copy transfers

```ts
// Default postMessage: structured clone (deep copy — expensive for large data)
// Transferable: transfers ownership — zero copy, main thread loses access

// Sending ArrayBuffer to worker (zero-copy):
const buffer = new ArrayBuffer(largeData.byteLength)
const view = new Float64Array(buffer)
largeData.forEach((val, i) => { view[i] = val })

worker.postMessage({ type: "PROCESS", buffer }, [buffer])
//                                               ↑ transfer list
// After this: buffer.byteLength === 0 on main thread (ownership transferred)

// Worker sends result back:
const result = new Float64Array(processedBuffer)
self.postMessage({ type: "RESULT", buffer: result.buffer }, [result.buffer])

// Use cases: large typed arrays (image data, audio buffers, large number arrays)
// Don't use for: objects, strings, plain arrays (not transferable)
```

---

### Worker Pool — concurrent processing

```ts
// hooks/useWorkerPool.ts
// Run N workers in parallel for independent chunks of work

export function useWorkerPool<T, R>(
  workerFactory: () => Worker,
  poolSize: number = navigator.hardwareConcurrency || 4
  // navigator.hardwareConcurrency: logical CPU count (4–16 on modern machines)
) {
  const poolRef = useRef<Worker[]>([])
  const queueRef = useRef<Array<{ message: T; resolve: (r: R) => void; reject: (e: Error) => void }>>([])
  const busyRef  = useRef<Set<Worker>>(new Set())

  useEffect(() => {
    poolRef.current = Array.from({ length: poolSize }, workerFactory)
    return () => poolRef.current.forEach(w => w.terminate())
  }, [])

  const run = useCallback((message: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      const freeWorker = poolRef.current.find(w => !busyRef.current.has(w))

      if (freeWorker) {
        dispatch(freeWorker, message, resolve, reject)
      } else {
        queueRef.current.push({ message, resolve, reject })
      }
    })
  }, [])

  function dispatch(worker: Worker, message: T, resolve: (r: R) => void, reject: (e: Error) => void) {
    busyRef.current.add(worker)
    worker.onmessage = ({ data }) => {
      busyRef.current.delete(worker)
      resolve(data)
      // Process next queued task
      const next = queueRef.current.shift()
      if (next) dispatch(worker, next.message, next.resolve, next.reject)
    }
    worker.onerror = (e) => {
      busyRef.current.delete(worker)
      reject(new Error(e.message))
    }
    worker.postMessage(message)
  }

  // Process all chunks in parallel across pool
  const runBatch = useCallback(async (chunks: T[]): Promise<R[]> => {
    return Promise.all(chunks.map(run))
  }, [run])

  return { run, runBatch }
}

// Usage — split 100k rows into 4 chunks, process in parallel:
function useBatchAnalytics() {
  const { runBatch } = useWorkerPool<Booking[], PartialResult>(
    () => new Worker(new URL("../workers/analytics.worker.ts", import.meta.url), { type: "module" }),
    4
  )

  const analyseAll = async (bookings: Booking[]) => {
    const chunkSize = Math.ceil(bookings.length / 4)
    const chunks = Array.from({ length: 4 }, (_, i) =>
      bookings.slice(i * chunkSize, (i + 1) * chunkSize)
    )
    const partialResults = await runBatch(chunks)
    return mergePartialResults(partialResults)  // combine results from all workers
  }
}
```

---

### Comlink — RPC-style worker communication

```ts
// Instead of postMessage/onmessage boilerplate, use Comlink for RPC:
// npm install comlink

// workers/analytics.worker.ts
import * as Comlink from "comlink"

const api = {
  async calculateAnalytics(bookings: Booking[]): Promise<AnalyticsResult> {
    return calculateAnalytics(bookings)
  },
  async parseCSV(text: string): Promise<Booking[]> {
    return parseCSV(text)
  },
}

Comlink.expose(api)
export type AnalyticsWorkerAPI = typeof api

// Main thread — use like a regular async function:
import * as Comlink from "comlink"
import type { AnalyticsWorkerAPI } from "../workers/analytics.worker"

function useComlinkWorker() {
  const workerRef = useRef<Comlink.Remote<AnalyticsWorkerAPI> | null>(null)

  useEffect(() => {
    const worker = new Worker(new URL("../workers/analytics.worker.ts", import.meta.url), { type: "module" })
    workerRef.current = Comlink.wrap<AnalyticsWorkerAPI>(worker)
    return () => worker.terminate()
  }, [])

  const calculate = async (bookings: Booking[]) => {
    // Looks like a regular async call — Comlink handles postMessage under the hood
    return workerRef.current?.calculateAnalytics(bookings)
  }

  return { calculate }
}
```

---

### Abort / cancel in-flight worker

```ts
// Workers can't be "paused" — only terminated and restarted

function useCancellableWorker<T, R>(workerFactory: () => Worker) {
  const workerRef = useRef<Worker | null>(null)

  const run = useCallback((message: T): Promise<R> => {
    // Terminate previous worker if still running
    workerRef.current?.terminate()
    workerRef.current = workerFactory()

    return new Promise<R>((resolve, reject) => {
      workerRef.current!.onmessage = ({ data }) => resolve(data)
      workerRef.current!.onerror   = (e) => reject(new Error(e.message))
      workerRef.current!.postMessage(message)
    })
  }, [])

  const cancel = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  useEffect(() => () => workerRef.current?.terminate(), [])  // cleanup on unmount

  return { run, cancel }
}
```

---

### Testing Web Workers (Vitest / Jest)

```ts
// Option 1: mock the Worker entirely
// vitest.setup.ts
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror:   ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn((data: any) => {
    // Simulate worker response synchronously
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent("message", {
          data: { type: "ANALYTICS_RESULT", payload: mockAnalyticsResult },
        }))
      }
    }, 0)
  })
  terminate = vi.fn()
}
global.Worker = MockWorker as any

// Option 2: test worker logic in isolation (without Worker wrapper)
// Import and test the pure functions directly:
import { calculateAnalytics, parseCSV } from "../workers/bookingAnalytics.worker"

test("calculateAnalytics returns correct totals", () => {
  const bookings = [
    { id: 1, school_name: "A", trip_date: "2024-03-01", student_count: 10, status: "paid", amount: 500 },
    { id: 2, school_name: "B", trip_date: "2024-03-15", student_count: 20, status: "paid", amount: 1000 },
  ]
  const result = calculateAnalytics(bookings)
  expect(result.totalRevenue).toBe(1500)
  expect(result.averageBookingValue).toBe(750)
})
// This is the recommended approach — test logic, not Worker infrastructure
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `self.onmessage` | Worker entry point — receives messages from main thread |
| `self.postMessage` | Worker sends back to main thread |
| `worker.terminate()` | **Always** call on unmount — workers don't GC automatically |
| `type: "module"` | Required for Vite + TypeScript workers (enables ES imports in worker) |
| Structured clone | Default copy semantics — safe but copies large data |
| Transferable | `postMessage(msg, [transfer])` — zero-copy, sender loses access |
| `navigator.hardwareConcurrency` | Logical CPU count — good pool size hint |
| `PROGRESS` messages | Emit from worker loop for progress bars — every N items |
| Comlink | npm library — RPC over postMessage (cleaner API, no boilerplate) |
| Cancel = terminate | No pause/resume — terminate and recreate with new Worker() |
| Test pure functions | Extract calculation logic → test directly without Worker wrapper |
| `onerror` handler | Catches syntax errors, unhandled throws, import failures |
| Worker scope | No `window`, no `document`, no React — use `self` or globals only |
