# Challenge 18 — Race Condition Debug

**Format:** DEBUG
**Topic:** Find and fix a race condition in async API calls triggered by rapid user input.

---

## Context

You are working on the **Tripz** school booking platform. The `BookingSearch` component lets users search bookings by school name or booking reference. QA reported that when typing quickly, old (stale) results sometimes flash up after the correct results have already been shown. This is a classic async race condition.

---

## Broken Code

```tsx
function BookingSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)

    // Bug: no cancellation — older slow requests can resolve after newer fast ones
    fetch(`/api/bookings/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data.results)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))

  }, [query])  // fires on every keystroke — no debounce

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search bookings..."
      />
      {isLoading && <span>Searching...</span>}
      {results.map(b => <SearchResult key={b.id} booking={b} />)}
    </div>
  )
}
```

---

## The Bug Explained

The race condition occurs in this sequence:

| Time | Event |
|------|-------|
| 0 ms | User types `"G"` → request 1 starts (server is slow: 800 ms) |
| 100 ms | User types `"Gr"` → request 2 starts (server is fast: 200 ms) |
| 300 ms | Request 2 resolves → `results` = `"Gr"` results (correct) |
| 800 ms | Request 1 resolves → `results` = `"G"` results (wrong — overwrites!) |

The user sees correct results at 300 ms and then wrong results at 800 ms. The component has no way to know that request 1 is now stale.

There is a second issue: the effect fires on **every keystroke**, meaning fast typers fire 5–10 requests for a single word. Most of these are wasted.

---

## Types

```typescript
interface Booking {
  id: number
  schoolName: string
  date: string
  status: 'pending' | 'confirmed' | 'cancelled'
  studentCount: number
}

interface SearchResponse {
  results: Booking[]
  total: number
}
```

---

## Requirements

Fix **both** issues in the component:

1. **Race condition** — stale responses must never overwrite newer results
2. **Missing debounce** — do not fire a request on every single keystroke; wait until the user pauses

The fix should:
- Not change the component's external props or rendered HTML structure
- Work with the native `fetch` API (no Axios required)
- Handle the case where the component unmounts mid-request gracefully
- Correctly suppress `AbortError` (it is not a real error; it should not trigger an error state)

---

## Starter Shell

```tsx
import { useState, useEffect, useRef } from 'react'

function BookingSearch() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // TODO: add debounce (300 ms)
    // TODO: create AbortController
    // TODO: fetch with signal
    // TODO: return cleanup function that calls controller.abort()
  }, [query])

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search bookings..."
      />
      {isLoading && <span>Searching...</span>}
      {error && <span className="text-red-500">{error}</span>}
      {results.map(b => <SearchResult key={b.id} booking={b} />)}
    </div>
  )
}
```
