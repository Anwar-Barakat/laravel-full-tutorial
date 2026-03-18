// ============================================================
// Problem 02 — Advanced Native WebSocket
// ============================================================



// ============================================================
// WebSocket Context — shared single connection
//
// Problem: each component calling useWebSocket() creates its OWN socket
//   → N components = N connections to server
//   → wasteful, message duplication, auth overhead
//
// Solution: WebSocketProvider wraps app with ONE shared connection
//   Fan-out: dispatch incoming messages to registered subscribers
//
// listenersRef: Map<IncomingMessage["type"], Set<(msg) => void>>
//   ← keyed by message type, each type can have multiple handlers
//
// subscribe(type, handler): () => void
//   listenersRef.get(type).add(handler)
//   return () => listenersRef.get(type).delete(handler)
//   ← returns cleanup fn — caller calls on unmount (useEffect return)
//
// Fan-out in useEffect([lastMessage]):
//   listenersRef.current.get(lastMessage.type)?.forEach(h => h(lastMessage))
//
// useWS() = useContext + throw if no provider
// ============================================================



// ============================================================
// Message acknowledgement — at-least-once delivery
//
// pendingAcks: Map<ackId, { message, timer, retries }>
//
// sendWithAck(message): Promise<void>
//   ackId = crypto.randomUUID()
//   attach ackId to message: { ...message, ackId }
//
//   retry(retries):
//     if retries >= MAX_RETRIES (3): reject + delete from pendingAcks
//     ws.send(msgWithAck)
//     timer = setTimeout(() => retry(retries+1), ACK_TIMEOUT=5000)
//     pendingAcks.set(ackId, { message, timer, retries })
//
//   On incoming { type:"ack", ackId }:
//     const pending = pendingAcks.get(ackId)
//     clearTimeout(pending.timer)
//     pendingAcks.delete(ackId)
//     resolve()
//
// Guarantees at-least-once: server may receive duplicate on retry
// Server should deduplicate by ackId (idempotency key)
// ============================================================



// ============================================================
// Binary messages — ArrayBuffer + binaryType
//
// ws.binaryType = "arraybuffer"   ← set BEFORE any messages arrive
//   default: "blob" (async .arrayBuffer() needed)
//   "arraybuffer": synchronous access — preferred
//
// Sending binary:
//   const buffer = new TextEncoder().encode(JSON.stringify(message)).buffer
//   ws.send(buffer)
//
// Receiving in onmessage:
//   if event.data instanceof ArrayBuffer:
//     const text = new TextDecoder().decode(event.data)
//     JSON.parse(text)
//   else:
//     JSON.parse(event.data)   ← text message
//
// Use cases: file chunks, audio streams, game state (compact encoding)
// ============================================================



// ============================================================
// Visibility-based connection management
//
// Disconnect when tab hidden → saves server connections + battery
// Reconnect when tab becomes visible
//
// document.addEventListener("visibilitychange", () => {
//   setIsVisible(!document.hidden)
// })
//
// useEffect:
//   if !isVisible && status === "open":
//     ws.close(1001, "Tab hidden")   ← 1001 = going away
//   ← when isVisible becomes true: wsOptions.reconnect flips to true
//     → useWebSocket detects URL/option change → new connection
//
// Alternative: pause sending (keep connection) vs close (save resources)
//   Close: better for mobile (battery), reconnect on return
//   Pause: better for desktop (faster resume, no handshake overhead)
// ============================================================



// ============================================================
// useMessageHandler — typed routing (alternative pattern)
//
// handlersRef: Partial<{ [K in IncomingMessage["type"]]: handler }>
//
// on<T extends IncomingMessage["type"]>(type, handler):
//   handlersRef.current[type] = handler
//
// useEffect([lastMessage]):
//   handler = handlersRef.current[lastMessage.type]
//   handler?.(lastMessage)
//
// vs Context fan-out:
//   useMessageHandler: single component, one handler per type
//   Context fan-out:   multiple components, multiple handlers per type
//   Choose based on whether message handling is centralised or distributed
// ============================================================



// ============================================================
// Testing WebSockets
//
// MockWebSocket class:
//   static CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3
//   readyState = CONNECTING
//   send = vi.fn()
//   close = vi.fn(code => { readyState=CLOSED; onclose(CloseEvent(code)) })
//
// Test helper methods:
//   simulateOpen():    readyState=OPEN; onopen(Event)
//   simulateMessage(data): onmessage(MessageEvent{ data:JSON.stringify(data) })
//   simulateClose(code=1006): readyState=CLOSED; onclose(CloseEvent{code})
//   simulateError():   onerror(Event)
//
// global.WebSocket = MockWebSocket as any
//
// Test reconnect:
//   renderHook(() => useWebSocket({ url, reconnect:true }))
//   act(() => mockWs.simulateOpen())
//   expect(status).toBe("open")
//   act(() => mockWs.simulateClose(1006))
//   expect(status).toBe("reconnecting")
//   vi.advanceTimersByTime(3000)   ← vi.useFakeTimers() for backoff
//   expect new WebSocket called
//
// Test message queue:
//   close socket → call send() → simulateOpen → assert ws.send called with queued message
// ============================================================



// ============================================================
// Key concepts
//
// isMounted ref pattern:
//   Set true on mount, false in cleanup
//   Check at START of every event handler (onopen/onmessage/onclose)
//   Prevents: "Can't perform state update on unmounted component"
//   Prevents: scheduling reconnect after intentional unmount
//
// optionsRef.current = options:
//   Pattern to keep latest callback refs without re-running useEffect
//   Similar to useEvent / useEffectEvent (proposed React API)
//   Without this: changing onMessage prop would close + reopen socket
//
// WebSocket vs SSE:
//   WebSocket: full-duplex (send + receive), binary support, custom protocol
//   SSE: server → client only, auto-reconnect built-in, HTTP/2 compatible
//   Use WS for: chat, gaming, collaborative editing, bidirectional data
//   Use SSE for: notifications, live feeds, streaming responses
//
// Heartbeat purpose:
//   NAT gateways and proxies close idle TCP connections (typically 30–120s)
//   Heartbeat keeps connection alive through these intermediaries
//   Server should respond with "pong" to confirm it's alive
//   If no pong received: consider connection dead, reconnect
// ============================================================
