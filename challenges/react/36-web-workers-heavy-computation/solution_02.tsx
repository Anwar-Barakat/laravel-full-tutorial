// ============================================================
// Problem 02 — Advanced Web Workers
// ============================================================



// ============================================================
// Transferable objects — zero-copy transfers
//
// Default postMessage: structured clone → deep copy → O(n) memory
// Transferable:        ownership transfer → zero copy → O(1) memory
//
// How to transfer:
//   const buffer = new ArrayBuffer(data.byteLength)
//   new Float64Array(buffer).set(data)
//   worker.postMessage({ type:"PROCESS", buffer }, [buffer])
//                                                   ↑ transfer list
//   After: buffer.byteLength === 0 on main thread (ownership gone)
//
// Worker sends back:
//   self.postMessage({ type:"RESULT", buffer: result.buffer }, [result.buffer])
//
// Transferable types: ArrayBuffer, MessagePort, ImageBitmap, OffscreenCanvas
// NOT transferable: plain objects, arrays, strings — always cloned
//
// When to use: images, audio buffers, large numeric arrays (>1MB)
// ============================================================



// ============================================================
// Worker Pool — parallel processing
//
// useWorkerPool(workerFactory, poolSize = navigator.hardwareConcurrency || 4)
//
// poolRef:  useRef(Array.from({ length:poolSize }, workerFactory))
// busyRef:  useRef(new Set<Worker>())
// queueRef: useRef([ { message, resolve, reject }, ... ])
//
// run(message): Promise<R>
//   freeWorker = poolRef.current.find(w => !busyRef.has(w))
//   if freeWorker: dispatch(freeWorker, message, resolve, reject)
//   else: queueRef.current.push({ message, resolve, reject })
//
// dispatch(worker, message, resolve, reject):
//   busyRef.add(worker)
//   worker.onmessage = ({ data }) => {
//     busyRef.delete(worker)
//     resolve(data)
//     const next = queueRef.current.shift()
//     if next: dispatch(worker, next.message, next.resolve, next.reject)
//   }
//   worker.postMessage(message)
//
// runBatch(chunks[]): Promise.all(chunks.map(run))
//   ← process N chunks in parallel across all workers
//
// Cleanup: useEffect(() => () => poolRef.current.forEach(w => w.terminate()), [])
// ============================================================



// ============================================================
// Batch processing — split + merge
//
// Split 100k rows into chunks:
//   const chunkSize = Math.ceil(bookings.length / poolSize)
//   const chunks = Array.from({ length:poolSize }, (_, i) =>
//     bookings.slice(i * chunkSize, (i + 1) * chunkSize)
//   )
//   const partialResults = await runBatch(chunks)
//   return mergePartialResults(partialResults)
//
// mergePartialResults(partials: PartialResult[]): AnalyticsResult
//   totalRevenue: sum all partials
//   statusBreakdown: merge-reduce all partial objects
//   topSchools: combine maps, re-sort, slice top 10
//   monthlyRevenue: merge by month key, re-sort
//
// Why batch > single worker:
//   4 workers × 25k rows ≈ same wall-clock as 1 worker × 100k rows
//   True parallelism on multi-core hardware
// ============================================================



// ============================================================
// Comlink — RPC over postMessage
//
// npm install comlink
//
// Worker file:
//   import * as Comlink from "comlink"
//   const api = {
//     async calculateAnalytics(bookings): Promise<AnalyticsResult> { ... },
//     async parseCSV(text): Promise<Booking[]> { ... },
//   }
//   Comlink.expose(api)
//   export type AnalyticsWorkerAPI = typeof api
//
// Main thread:
//   import * as Comlink from "comlink"
//   import type { AnalyticsWorkerAPI } from "../workers/analytics.worker"
//
//   useEffect(() => {
//     const worker = new Worker(new URL("../workers/analytics.worker.ts", import.meta.url), { type:"module" })
//     workerRef.current = Comlink.wrap<AnalyticsWorkerAPI>(worker)
//     return () => worker.terminate()
//   }, [])
//
//   const result = await workerRef.current.calculateAnalytics(bookings)
//   ← looks like normal async function call
//   ← Comlink handles postMessage/onmessage internally
//
// vs raw postMessage:
//   Comlink: cleaner, typed, async/await — good for complex APIs
//   Raw:     no dependency, explicit control — good for simple single-message workers
// ============================================================



// ============================================================
// Cancel in-flight work
//
// Workers have no pause/resume — only terminate() + recreate
//
// useCancellableWorker(workerFactory):
//   workerRef = useRef(null)
//
//   run(message): Promise<R>
//     workerRef.current?.terminate()     ← kill previous worker
//     workerRef.current = workerFactory()  ← fresh worker
//     return new Promise((resolve, reject) => {
//       workerRef.current.onmessage = ({ data }) => resolve(data)
//       workerRef.current.onerror   = (e)      => reject(new Error(e.message))
//       workerRef.current.postMessage(message)
//     })
//
//   cancel():
//     workerRef.current?.terminate()
//     workerRef.current = null
//
// Pattern: terminate + recreate on each new run
//   ← ensures no stale message from old computation arrives
//   ← safe because Worker creation is cheap
// ============================================================



// ============================================================
// Testing Web Workers
//
// Option 1: Mock Worker globally
//   class MockWorker {
//     postMessage = vi.fn((data) => {
//       setTimeout(() => this.onmessage(new MessageEvent("message", {
//         data: { type:"ANALYTICS_RESULT", payload: mockResult }
//       })), 0)
//     })
//     terminate = vi.fn()
//   }
//   global.Worker = MockWorker as any
//
//   Test: verify postMessage called with right args
//         verify state updates when onmessage fires
//
// Option 2: Test pure functions directly (RECOMMENDED)
//   Export worker functions separately:
//     export function calculateAnalytics(bookings): AnalyticsResult { ... }
//   Import in tests — no Worker infrastructure needed:
//     import { calculateAnalytics } from "../workers/analytics.worker"
//     expect(calculateAnalytics(fixtures).totalRevenue).toBe(1500)
//
//   ← tests are fast, synchronous, no mock complexity
//   ← tests the logic that actually matters
// ============================================================



// ============================================================
// Key concepts
//
// Worker lifecycle:
//   Create: new Worker(url, options)   ← cheap, ~1ms
//   Idle:   keeps thread alive, minimal memory
//   Active: runs JavaScript on OS thread
//   Terminated: terminate() → cannot be reused
//
// When to use a Worker (vs not):
//   ✅ >50ms computation (perceptible lag threshold)
//   ✅ CSV/JSON parsing of large files
//   ✅ Image/audio processing
//   ✅ Sorting/filtering 10k+ rows client-side
//   ❌ Simple array operations (<1000 items)
//   ❌ Network requests (use async/await on main thread)
//   ❌ DOM manipulation (worker can't access DOM)
//
// Message passing cost:
//   Structured clone: O(n) time + memory (copies data)
//   Transferable:     O(1) time + memory (moves ownership)
//   For <1MB: clone overhead negligible
//   For >1MB typed arrays: use transferable
//
// SharedArrayBuffer:
//   True shared memory between threads
//   Requires COOP/COEP headers (cross-origin isolation)
//   Use Atomics for thread-safe access
//   Rarely needed — transferable handles most cases
// ============================================================
