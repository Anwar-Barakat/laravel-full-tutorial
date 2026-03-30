// ============================================================
// Problem 01 — Native WebSocket API
// ============================================================



// ============================================================
// WebSocket readyState constants
//
// WebSocket.CONNECTING === 0  — handshake in progress
// WebSocket.OPEN       === 1  — connected, can send/receive
// WebSocket.CLOSING    === 2  — close() called, handshake
// WebSocket.CLOSED     === 3  — connection closed
//
// Always check ws.readyState === WebSocket.OPEN before send()
// Sending on a non-OPEN socket throws DOMException
//
// Close codes (RFC 6455):
//   1000: Normal closure      ← don't reconnect
//   1001: Going away (unload) ← don't reconnect
//   1006: Abnormal (dropped)  ← reconnect
//   4000–4999: Application-defined
// ============================================================



// ============================================================
// Types — discriminated union messages
//
// IncomingMessage: union of server → client messages
//   | { type:"booking_created", booking: Booking }
//   | { type:"booking_updated", booking: Booking }
//   | { type:"booking_deleted", id: number }
//   | { type:"notification",    message: string, level: "info"|"warn"|"error" }
//   | { type:"pong" }
//
// OutgoingMessage: union of client → server messages
//   | { type:"subscribe",   channel: string }
//   | { type:"ping" }
//   | { type:"auth",        token: string }
//
// ConnectionStatus: "connecting"|"open"|"closing"|"closed"|"reconnecting"
// ============================================================



// ============================================================
// useWebSocket hook — core refs
//
// wsRef:            useRef<WebSocket | null>(null)    ← current socket instance
// reconnectTimer:   useRef<ReturnType<typeof setTimeout>>()
// heartbeatTimer:   useRef<ReturnType<typeof setInterval>>()
// messageQueue:     useRef<OutgoingMessage[]>([])    ← buffer during reconnect
// reconnectAttempt: useRef(0)
// isMounted:        useRef(true)                     ← prevent updates after unmount
// optionsRef:       useRef(options); optionsRef.current = options
//   ← keeps latest callbacks without recreating WebSocket on every render
// ============================================================



// ============================================================
// connect() function
//
// dispatch({ type:"CONNECTING" })
// const ws = new WebSocket(url, protocols)
// wsRef.current = ws
//
// ws.onopen:
//   dispatch({ type:"OPEN" })
//   reconnectAttempt.current = 0
//   flush messageQueue: while queue.length: ws.send(JSON.stringify(queue.shift()))
//   start heartbeat: setInterval(() => {
//     if ws.readyState === WebSocket.OPEN: ws.send(heartbeatMessage)
//   }, heartbeatInterval)
//   optionsRef.current.onOpen?.(event)
//
// ws.onmessage:
//   if !isMounted.current: return    ← prevent update after unmount
//   try: JSON.parse(event.data) → dispatch MESSAGE
//   if type === "pong": return      ← swallow keepalive ack
//   catch: ignore non-JSON (raw "pong" string from some servers)
//
// ws.onerror:
//   dispatch({ type:"ERROR", payload:"WebSocket error" })
//
// ws.onclose:
//   clearInterval(heartbeatTimer)
//   dispatch({ type:"CLOSED" })
//   if reconnect && code !== 1000 && code !== 1001 && isMounted.current:
//     scheduleReconnect()
// ============================================================



// ============================================================
// scheduleReconnect — exponential backoff + jitter
//
// reconnectAttempt.current += 1
// dispatch({ type:"RECONNECTING", attempt: reconnectAttempt.current })
//
// baseDelay = Math.min(Math.pow(2, attempt) * 1000, maxReconnectDelay)
//   attempt 1: 2000ms,  attempt 2: 4000ms,  attempt 3: 8000ms
//   attempt 4: 16000ms, attempt 5+: capped at maxReconnectDelay (30s)
//
// jitter = Math.random() * 1000   ← 0–1000ms random offset
// delay  = baseDelay + jitter
//
// reconnectTimer.current = setTimeout(connect, delay)
//
// Why jitter:
//   Without it: ALL clients reconnect simultaneously after server restart
//   → thundering herd → server overloaded → all disconnect → repeat
//   Jitter spreads reconnect times → gradual load increase
// ============================================================



// ============================================================
// send() — queue when not open
//
// if ws.readyState === WebSocket.OPEN:
//   ws.send(JSON.stringify(message))
// else if messageQueue.length < messageQueueLimit:
//   messageQueue.current.push(message)   ← buffer for later
// else:
//   silently drop   ← backpressure — don't grow queue unboundedly
//
// messageQueueLimit: default 50 messages
// Queue is flushed in onopen (after reconnect)
// ============================================================



// ============================================================
// useEffect — connect on mount, close on unmount
//
// useEffect(() => {
//   isMounted.current = true
//   connect()
//   return () => {
//     isMounted.current = false
//     clearTimeout(reconnectTimer.current)
//     clearInterval(heartbeatTimer.current)
//     wsRef.current?.close(1000, "Component unmounted")
//     ← 1000 = normal close → onclose won't schedule reconnect
//   }
// }, [connect])
//
// connect is stable via useCallback with stable deps (url, protocols, options)
// ← no reconnect triggered by option object changes
// ============================================================



// ============================================================
// BookingLiveUpdates — subscribe + handle messages
//
// const { status, lastMessage, send } = useWebSocket({ url, reconnect:true })
//
// Subscribe on open:
//   useEffect(() => {
//     if status === "open": send({ type:"subscribe", channel:"bookings" })
//   }, [status])
//
// Handle messages:
//   useEffect(() => {
//     if !lastMessage: return
//     switch lastMessage.type:
//       "booking_created": setBookings(prev => [booking, ...prev])
//       "booking_updated": setBookings(prev => prev.map(b => b.id===id ? booking : b))
//       "booking_deleted": setBookings(prev => prev.filter(b => b.id !== id))
//   }, [lastMessage])
//
// ConnectionStatusBadge:
//   role="status" aria-live="polite" aria-atomic="true"
//   Map status → { label, color, animated }
//   "reconnecting" → show attempt count
// ============================================================
