# REACT_TEST_38 — WebSocket Native • Reconnect

**Time:** 25 minutes | **Stack:** React + TypeScript + Native WebSocket API

---

## Problem 01 — Native WebSocket API (Medium)

Build a production-ready WebSocket hook: typed messages, auto-reconnect with exponential backoff, heartbeat, and message queuing.

---

### WebSocket fundamentals

```ts
// WebSocket readyState constants:
WebSocket.CONNECTING === 0   // socket opened, handshake in progress
WebSocket.OPEN       === 1   // connection established, can send/receive
WebSocket.CLOSING    === 2   // close() called, handshake in progress
WebSocket.CLOSED     === 3   // connection closed or failed to open

// Events: onopen, onmessage, onerror, onclose
// ws.close(code?, reason?) — RFC 6455 close codes:
//   1000: Normal closure
//   1001: Going away (page unload)
//   1006: Abnormal closure (connection dropped, no close frame)
//   4000–4999: Application-defined codes
```

---

### Types

```ts
// types/websocket.ts

type ConnectionStatus = "connecting" | "open" | "closing" | "closed" | "reconnecting"

interface WSOptions {
  url:                string
  protocols?:         string | string[]    // sub-protocol negotiation
  reconnect?:         boolean              // default: true
  maxReconnectDelay?: number              // default: 30_000 ms
  heartbeatInterval?: number              // default: 30_000 ms
  heartbeatMessage?:  string              // default: "ping"
  messageQueueLimit?: number              // default: 50 messages
  onOpen?:            (event: Event) => void
  onClose?:           (event: CloseEvent) => void
  onError?:           (event: Event) => void
}

// Discriminated union for typed messages
type IncomingMessage =
  | { type: "booking_created";  booking:  Booking }
  | { type: "booking_updated";  booking:  Booking }
  | { type: "booking_deleted";  id:       number }
  | { type: "presence_join";    user:     User }
  | { type: "presence_leave";   userId:   number }
  | { type: "notification";     message:  string; level: "info" | "warn" | "error" }
  | { type: "pong" }

type OutgoingMessage =
  | { type: "subscribe";   channel: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "ping" }
  | { type: "auth";        token:   string }
```

---

### useWebSocket hook

```ts
// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useReducer } from "react"

interface WSState {
  status:           ConnectionStatus
  lastMessage:      IncomingMessage | null
  error:            string | null
  reconnectAttempt: number
}

type WSAction =
  | { type: "CONNECTING" }
  | { type: "OPEN" }
  | { type: "MESSAGE";     payload: IncomingMessage }
  | { type: "ERROR";       payload: string }
  | { type: "CLOSED" }
  | { type: "RECONNECTING"; attempt: number }

function wsReducer(state: WSState, action: WSAction): WSState {
  switch (action.type) {
    case "CONNECTING":   return { ...state, status: "connecting", error: null }
    case "OPEN":         return { ...state, status: "open", reconnectAttempt: 0, error: null }
    case "MESSAGE":      return { ...state, lastMessage: action.payload }
    case "ERROR":        return { ...state, error: action.payload }
    case "CLOSED":       return { ...state, status: "closed" }
    case "RECONNECTING": return { ...state, status: "reconnecting", reconnectAttempt: action.attempt }
    default:             return state
  }
}

export function useWebSocket(options: WSOptions) {
  const {
    url,
    protocols,
    reconnect          = true,
    maxReconnectDelay  = 30_000,
    heartbeatInterval  = 30_000,
    heartbeatMessage   = "ping",
    messageQueueLimit  = 50,
    onOpen, onClose, onError,
  } = options

  const [state, dispatch] = useReducer(wsReducer, {
    status: "connecting", lastMessage: null, error: null, reconnectAttempt: 0,
  })

  const wsRef            = useRef<WebSocket | null>(null)
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout>>()
  const heartbeatTimer   = useRef<ReturnType<typeof setInterval>>()
  const messageQueue     = useRef<OutgoingMessage[]>([])
  const reconnectAttempt = useRef(0)
  const isMounted        = useRef(true)
  const optionsRef       = useRef(options)
  optionsRef.current = options  // keep latest callbacks without re-connecting

  const connect = useCallback(() => {
    if (!isMounted.current) return
    dispatch({ type: "CONNECTING" })

    const ws = new WebSocket(url, protocols)
    wsRef.current = ws

    ws.onopen = (event) => {
      if (!isMounted.current) return
      dispatch({ type: "OPEN" })
      reconnectAttempt.current = 0

      // Flush queued messages
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift()!
        ws.send(JSON.stringify(msg))
      }

      // Start heartbeat
      heartbeatTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(heartbeatMessage)
        }
      }, heartbeatInterval)

      optionsRef.current.onOpen?.(event)
    }

    ws.onmessage = (event: MessageEvent) => {
      if (!isMounted.current) return
      try {
        const parsed = JSON.parse(event.data) as IncomingMessage
        if (parsed.type === "pong") return  // swallow pong — just a keepalive ack
        dispatch({ type: "MESSAGE", payload: parsed })
      } catch {
        // non-JSON message (e.g. raw "pong" string from some servers)
      }
    }

    ws.onerror = (event) => {
      if (!isMounted.current) return
      dispatch({ type: "ERROR", payload: "WebSocket error" })
      optionsRef.current.onError?.(event)
    }

    ws.onclose = (event: CloseEvent) => {
      if (!isMounted.current) return
      clearInterval(heartbeatTimer.current)
      dispatch({ type: "CLOSED" })
      optionsRef.current.onClose?.(event)

      // Don't reconnect on intentional close (code 1000 or 1001) or if unmounted
      const shouldReconnect = reconnect
        && event.code !== 1000
        && event.code !== 1001
        && isMounted.current

      if (shouldReconnect) {
        scheduleReconnect()
      }
    }
  }, [url, protocols, reconnect, heartbeatInterval, heartbeatMessage])

  const scheduleReconnect = useCallback(() => {
    reconnectAttempt.current += 1
    dispatch({ type: "RECONNECTING", attempt: reconnectAttempt.current })

    // Exponential backoff with jitter: 2^attempt * 1000ms + random(0–1000ms)
    const baseDelay  = Math.min(Math.pow(2, reconnectAttempt.current) * 1000, maxReconnectDelay)
    const jitter     = Math.random() * 1000
    const delay      = baseDelay + jitter

    reconnectTimer.current = setTimeout(connect, delay)
    // attempt 1: ~2s,  attempt 2: ~4s,  attempt 3: ~8s
    // attempt 4: ~16s, attempt 5+: ~30s (capped)
  }, [connect, maxReconnectDelay])

  const send = useCallback((message: OutgoingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      // Queue message for when connection reopens
      if (messageQueue.current.length < messageQueueLimit) {
        messageQueue.current.push(message)
      }
      // Silently drop if queue is full (backpressure)
    }
  }, [messageQueueLimit])

  const close = useCallback((code = 1000, reason = "Component unmounted") => {
    isMounted.current = false
    clearTimeout(reconnectTimer.current)
    clearInterval(heartbeatTimer.current)
    wsRef.current?.close(code, reason)
  }, [])

  useEffect(() => {
    isMounted.current = true
    connect()
    return () => {
      isMounted.current = false
      clearTimeout(reconnectTimer.current)
      clearInterval(heartbeatTimer.current)
      // Close with 1000 (normal) → onclose won't trigger reconnect
      wsRef.current?.close(1000, "Component unmounted")
    }
  }, [connect])  // connect is stable (useCallback with stable deps)

  return { ...state, send, close, reconnectAttempt: reconnectAttempt.current }
}
```

---

### Exponential backoff explained

```
Attempt 1: 2^1 * 1000 = 2000ms  + jitter → ~2–3s
Attempt 2: 2^2 * 1000 = 4000ms  + jitter → ~4–5s
Attempt 3: 2^3 * 1000 = 8000ms  + jitter → ~8–9s
Attempt 4: 2^4 * 1000 = 16000ms + jitter → ~16–17s
Attempt 5+: capped at maxReconnectDelay   → ~30–31s
```

**Why jitter?** Without jitter, all clients reconnect at the same time after a server restart → thundering herd → server overloaded again → immediate disconnect → repeat. Jitter spreads reconnect times across the window.

---

### useMessageHandler — typed message routing

```ts
// hooks/useMessageHandler.ts
export function useMessageHandler(lastMessage: IncomingMessage | null) {
  const handlersRef = useRef<Partial<{
    [K in IncomingMessage["type"]]: (msg: Extract<IncomingMessage, { type: K }>) => void
  }>>({})

  // Register handlers (stable references via useCallback in callers)
  const on = useCallback(<T extends IncomingMessage["type"]>(
    type: T,
    handler: (msg: Extract<IncomingMessage, { type: T }>) => void
  ) => {
    (handlersRef.current as any)[type] = handler
  }, [])

  useEffect(() => {
    if (!lastMessage) return
    const handler = (handlersRef.current as any)[lastMessage.type]
    handler?.(lastMessage)
  }, [lastMessage])

  return { on }
}
```

---

### BookingLiveUpdates component

```tsx
// components/BookingLiveUpdates.tsx
function BookingLiveUpdates() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const { status, lastMessage, send, reconnectAttempt } = useWebSocket({
    url: `wss://api.tripz.com/ws?token=${authToken}`,
    reconnect: true,
    heartbeatInterval: 25_000,
  })

  // Subscribe to booking channel on connect
  useEffect(() => {
    if (status === "open") {
      send({ type: "subscribe", channel: "bookings" })
    }
  }, [status, send])

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return
    switch (lastMessage.type) {
      case "booking_created":
        setBookings(prev => [lastMessage.booking, ...prev])
        break
      case "booking_updated":
        setBookings(prev => prev.map(b =>
          b.id === lastMessage.booking.id ? lastMessage.booking : b
        ))
        break
      case "booking_deleted":
        setBookings(prev => prev.filter(b => b.id !== lastMessage.id))
        break
    }
  }, [lastMessage])

  return (
    <div>
      <ConnectionStatusBadge status={status} reconnectAttempt={reconnectAttempt} />
      <BookingList bookings={bookings} />
    </div>
  )
}

function ConnectionStatusBadge({ status, reconnectAttempt }: {
  status: ConnectionStatus
  reconnectAttempt: number
}) {
  const config = {
    connecting:   { label: "Connecting...",  color: "yellow", dot: true  },
    open:         { label: "Live",           color: "green",  dot: true  },
    closing:      { label: "Closing...",     color: "yellow", dot: false },
    closed:       { label: "Disconnected",   color: "red",    dot: false },
    reconnecting: { label: `Reconnecting (attempt ${reconnectAttempt})...`, color: "orange", dot: true },
  }[status]

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      <span className={`dot ${config.color} ${config.dot ? "animate-pulse" : ""}`} />
      <span>{config.label}</span>
    </div>
  )
}
```

---

## Problem 02 — Advanced WebSocket (Hard)

Binary messages, shared connection (context), message acknowledgement, and testing.

---

### WebSocket context — shared connection

```tsx
// contexts/WebSocketContext.tsx
// Share ONE WebSocket connection across all components (avoid N connections per component)

interface WSContextValue {
  status:   ConnectionStatus
  send:     (msg: OutgoingMessage) => void
  subscribe: <T extends IncomingMessage["type"]>(
    type: T,
    handler: (msg: Extract<IncomingMessage, { type: T }>) => void
  ) => () => void  // returns unsubscribe function
}

const WSContext = createContext<WSContextValue | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { status, lastMessage, send } = useWebSocket({
    url: `wss://api.tripz.com/ws`,
  })

  // Fan-out: multiple components subscribe to same connection
  const listenersRef = useRef<Map<IncomingMessage["type"], Set<(msg: any) => void>>>(new Map())

  const subscribe = useCallback(<T extends IncomingMessage["type"]>(
    type: T,
    handler: (msg: Extract<IncomingMessage, { type: T }>) => void
  ) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type)!.add(handler)
    return () => listenersRef.current.get(type)?.delete(handler)
    // Returns cleanup function — caller must call on unmount
  }, [])

  useEffect(() => {
    if (!lastMessage) return
    listenersRef.current.get(lastMessage.type)?.forEach(h => h(lastMessage))
  }, [lastMessage])

  return (
    <WSContext.Provider value={{ status, send, subscribe }}>
      {children}
    </WSContext.Provider>
  )
}

export function useWS() {
  const ctx = useContext(WSContext)
  if (!ctx) throw new Error("useWS must be used inside WebSocketProvider")
  return ctx
}

// Usage in any component (no new connection created):
function BookingNotifications() {
  const { subscribe } = useWS()
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    const unsub = subscribe("notification", msg => {
      setNotifications(prev => [msg.message, ...prev.slice(0, 49)])
    })
    return unsub  // cleanup removes handler from fan-out set
  }, [subscribe])
}
```

---

### Message acknowledgement (at-least-once delivery)

```ts
// hooks/useAckWebSocket.ts
interface PendingAck {
  message: OutgoingMessage & { ackId: string }
  timer:   ReturnType<typeof setTimeout>
  retries: number
}

export function useAckWebSocket(options: WSOptions) {
  const ws = useWebSocket(options)
  const pendingAcks = useRef<Map<string, PendingAck>>(new Map())
  const MAX_RETRIES = 3
  const ACK_TIMEOUT = 5000  // resend if no ack in 5s

  const sendWithAck = useCallback((message: OutgoingMessage): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ackId = crypto.randomUUID()
      const msgWithAck = { ...message, ackId }

      const retry = (retries: number) => {
        if (retries >= MAX_RETRIES) {
          pendingAcks.current.delete(ackId)
          reject(new Error(`Message ${ackId} not acknowledged after ${MAX_RETRIES} retries`))
          return
        }

        ws.send(msgWithAck as any)
        const timer = setTimeout(() => retry(retries + 1), ACK_TIMEOUT)
        pendingAcks.current.set(ackId, { message: msgWithAck, timer, retries })
      }

      retry(0)

      // Resolve when server sends back { type: "ack", ackId }
      pendingAcks.current.set(ackId, {
        message: msgWithAck,
        timer: setTimeout(() => retry(1), ACK_TIMEOUT),
        retries: 0,
      })
    })
  }, [ws.send])

  // Watch for ack messages
  useEffect(() => {
    if (!ws.lastMessage) return
    if ((ws.lastMessage as any).type === "ack") {
      const ackId = (ws.lastMessage as any).ackId
      const pending = pendingAcks.current.get(ackId)
      if (pending) {
        clearTimeout(pending.timer)
        pendingAcks.current.delete(ackId)
        // Resolve the corresponding promise — handled via external resolve map
      }
    }
  }, [ws.lastMessage])

  return { ...ws, sendWithAck }
}
```

---

### Binary messages (ArrayBuffer / Blob)

```ts
// Sending binary data (e.g. file upload progress, audio):
const buffer = new TextEncoder().encode(JSON.stringify(message)).buffer
ws.send(buffer)   // ← sends ArrayBuffer

// Or Blob:
ws.send(new Blob([JSON.stringify(message)], { type: "application/json" }))

// Receiving binary:
ws.binaryType = "arraybuffer"  // default: "blob"
// "arraybuffer" → onmessage.data is ArrayBuffer (synchronous access)
// "blob"        → onmessage.data is Blob (needs .arrayBuffer() or .text() async)

ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    const text = new TextDecoder().decode(event.data)
    const parsed = JSON.parse(text)
    // handle binary message
  } else {
    // text message
    JSON.parse(event.data)
  }
}
```

---

### Visibility-based connection management

```ts
// Disconnect when tab hidden, reconnect when visible
// Saves server connections for inactive tabs

function useVisibilityWebSocket(options: WSOptions) {
  const [isVisible, setIsVisible] = useState(!document.hidden)
  const wsOptions = { ...options, reconnect: isVisible }
  const ws = useWebSocket(wsOptions)

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden)
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [])

  // Disconnect when hidden (close with 1001 = "going away")
  useEffect(() => {
    if (!isVisible && ws.status === "open") {
      ws.close(1001, "Tab hidden")
    }
    // Reconnect triggered automatically when isVisible → reconnect option becomes true
  }, [isVisible, ws.status])

  return ws
}
```

---

### Testing WebSockets

```ts
// vitest / jest — mock WebSocket globally
class MockWebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen:    ((e: Event) => void)      | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror:   ((e: Event) => void)      | null = null
  onclose:   ((e: CloseEvent) => void) | null = null

  send = vi.fn()
  close = vi.fn((code = 1000) => {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent("close", { code, wasClean: code === 1000 }))
  })

  // Test helpers — simulate server events:
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event("open"))
  }
  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }))
  }
  simulateClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent("close", { code, wasClean: false }))
  }
}

global.WebSocket = MockWebSocket as any

// Test:
test("reconnects after unexpected close", async () => {
  const { result } = renderHook(() => useWebSocket({ url: "ws://test", reconnect: true }))
  const mockWs = result.current as any

  act(() => mockWs.simulateOpen())
  expect(result.current.status).toBe("open")

  act(() => mockWs.simulateClose(1006))  // abnormal close
  expect(result.current.status).toBe("reconnecting")
  // After backoff delay: new WebSocket created and reconnects
})
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `readyState` | Check `=== WebSocket.OPEN` before `send()` — sending on closed socket throws |
| `isMounted` ref | Prevent state updates after unmount — check in every event handler |
| Exponential backoff | `2^n * 1000ms` capped at max — multiply delay each attempt |
| Jitter | `+= Math.random() * 1000` — spread reconnect storms across time window |
| Close code `1000` | Normal — don't reconnect. `1006` = abnormal — reconnect |
| `heartbeatInterval` | Send ping every N ms to keep connection alive through NAT/proxies |
| Message queue | Buffer outgoing messages while reconnecting, flush on `onopen` |
| `response.clone()` doesn't apply | WS has no clone — handle `lastMessage` ref carefully |
| `optionsRef.current = options` | Keep latest callbacks without re-creating WebSocket |
| Shared context | One WebSocket per app — fan-out to subscribers via `Map<type, Set<handler>>` |
| `binaryType = "arraybuffer"` | Synchronous binary access (vs Blob which is async) |
| `1001` on tab hide | Intentional close — don't reconnect until tab visible again |
