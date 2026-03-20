// SOLUTION 01 — Race condition fix using AbortController + debounce in useEffect
// This is the idiomatic React approach: cleanup function + setTimeout debounce

// ─── FIX 1: AbortController ───────────────────────────────────────────────────

// Every time the effect runs (i.e. every time `query` changes), create a new
// AbortController:
//   const controller = new AbortController()

// Pass its signal into the fetch call:
//   fetch(url, { signal: controller.signal })

// Return a cleanup function that aborts the controller:
//   return () => { controller.abort() }

// React calls the cleanup function before running the effect again (i.e. before
// the next keystroke triggers a new effect). This means:
//   - The previous in-flight request is cancelled at the network level
//   - Its .then() callback never calls setResults
//   - The new request starts fresh with a clean controller

// ─── HANDLING AbortError ──────────────────────────────────────────────────────

// When you abort a fetch, the promise rejects with a DOMException named 'AbortError'.
// This is not a real error — it is expected behaviour from our own cleanup code.

// In the .catch() block, check the error name before setting error state:
//   .catch(err => {
//     if (err.name === 'AbortError') return   // ignore — this was intentional
//     setError(err.message)
//     setIsLoading(false)
//   })

// Without this check, every keystroke would briefly flash an error state as the
// previous request is aborted.

// ─── FIX 2: DEBOUNCE WITH setTimeout ─────────────────────────────────────────

// Inside the useEffect, before firing fetch, set a 300 ms delay:
//   const timerId = setTimeout(() => {
//     // fetch goes here
//   }, 300)

// The cleanup function must also clear the timer:
//   return () => {
//     clearTimeout(timerId)
//     controller.abort()
//   }

// How this works together:
//   - User types "T" → timer starts (300 ms)
//   - User types "Tr" (100 ms later) → cleanup clears timer, new timer starts
//   - User types "Tri" (100 ms later) → cleanup clears timer, new timer starts
//   - User pauses for 300 ms → timer fires, fetch starts with query = "Tri"
//   - Only ONE request was made for the word "Tri"

// ─── COMBINED EFFECT STRUCTURE ────────────────────────────────────────────────

// useEffect(() => {
//   if (!query.trim()) {
//     setResults([])
//     return
//   }

//   const controller = new AbortController()

//   const timerId = setTimeout(() => {
//     setIsLoading(true)
//     setError(null)

//     fetch(`/api/bookings/search?q=${encodeURIComponent(query)}`, {
//       signal: controller.signal,
//     })
//       .then(res => {
//         if (!res.ok) throw new Error(`Server error: ${res.status}`)
//         return res.json()
//       })
//       .then((data: SearchResponse) => {
//         setResults(data.results)
//         setIsLoading(false)
//       })
//       .catch(err => {
//         if (err.name === 'AbortError') return  // cleanup abort — not a real error
//         setError(err.message)
//         setIsLoading(false)
//       })
//   }, 300)

//   return () => {
//     clearTimeout(timerId)   // cancel pending debounce timer
//     controller.abort()      // cancel any in-flight fetch
//   }
// }, [query])

// ─── WHY THIS FULLY SOLVES THE RACE CONDITION ─────────────────────────────────

// Scenario: user types "G" then quickly types "r"

// 1. Query = "G"    → cleanup runs for empty, new effect starts, timer T1 begins
// 2. Query = "Gr"   → cleanup runs: T1 cleared (never fires), controller1 abort (no-op)
//                     new effect starts, timer T2 begins
// 3. T2 fires       → fetch starts for "Gr" with controller2
// 4. Request resolves → setResults(Gr results) ✓

// Request for "G" was never even sent (debounce cancelled it). Even if it had
// been sent, controller1.abort() would have cancelled it in the cleanup step.

// ─── UNMOUNT SAFETY ──────────────────────────────────────────────────────────

// The cleanup function also runs when the component unmounts entirely.
// This prevents the "can't perform state update on unmounted component" warning:
//   - timer is cleared (no delayed fetch fires after unmount)
//   - controller is aborted (no .then() callback fires after unmount)
