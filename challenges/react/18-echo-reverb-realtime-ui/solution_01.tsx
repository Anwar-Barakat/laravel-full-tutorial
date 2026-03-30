// ============================================================
// Problem 01 — Echo Integration Hooks
// ============================================================



// ============================================================
// hooks/useChannel.ts
//
// State: lastEvent: { name: string; data: unknown } | null = null
// Refs: channelRef (Echo private channel), handlersRef (event map)
//
// handlersRef pattern (stable handler ref):
//   handlersRef = useRef(handlers)
//   useEffect(() => { handlersRef.current = handlers })  ← no deps, runs every render
//   ← handlers update without triggering re-subscription
//
// Main useEffect([channelName]):
//   channelRef.current = window.Echo.private(channelName)
//   Object.entries(handlersRef.current).forEach(([event, handler]) =>
//     channel.listen(event, (data) => {
//       setLastEvent({ name: event, data })
//       handler(data)
//     })
//   )
//   cleanup: window.Echo.leave(channelName)
//
// return { lastEvent, channel: channelRef.current }
// ============================================================



// ============================================================
// hooks/usePresence.ts
//
// State: onlineUsers: PresenceUser[] = []
//
// useEffect([channelName]):
//   channel = window.Echo.join(channelName)
//     .here((users) => setOnlineUsers(users))        ← initial full list
//     .joining((user) => setOnlineUsers(prev => [...prev, user]))
//     .leaving((user) => setOnlineUsers(prev => prev.filter(u => u.id !== user.id)))
//     .error((err) => console.error("Presence error:", err))
//   cleanup: window.Echo.leave(channelName)
//
// isUserOnline = useCallback((userId) => onlineUsers.some(u => u.id === userId), [onlineUsers])
//
// return { onlineUsers, isUserOnline, memberCount: onlineUsers.length }
// ============================================================



// ============================================================
// hooks/useChatMessages.ts
//
// State: messages: ChatMessage[] = [], typingUsers: string[] = [], isLoading = true
// Refs: typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
//       lastWhisperTime = useRef<number>(0)
//
// Fetch history useEffect([bookingId]):
//   fetch(`/api/bookings/${bookingId}/messages`)
//     .then(r => r.json()).then(setMessages).finally(() => setIsLoading(false))
//
// Echo subscription useEffect([bookingId]):
//   channel = window.Echo.private(`chat.booking.${bookingId}`)
//     .listen("MessageSent", (e) => setMessages(prev => [...prev, e.message]))
//     .listenForWhisper("typing", (e: { user: string }) => {
//       setTypingUsers(prev => prev.includes(e.user) ? prev : [...prev, e.user])
//       clearTimeout(typingTimers.current.get(e.user))
//       typingTimers.current.set(e.user,
//         setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== e.user)), 3000)
//       )
//     })
//   cleanup: typingTimers.current.forEach(clearTimeout) + window.Echo.leave(...)
//
// sendMessage(body):
//   optimistic: setMessages(prev => [...prev, { id: Date.now(), body, user: currentUser, ... }])
//   POST /api/bookings/${bookingId}/messages → replace optimistic on success
//
// sendTyping():
//   if Date.now() - lastWhisperTime.current < 2000: return  ← debounce
//   lastWhisperTime.current = Date.now()
//   channel.whisper("typing", { user: auth.user.name })
//
// return { messages, sendMessage, sendTyping, typingUsers, isLoading }
// ============================================================



// ============================================================
// components/ChatWindow.tsx
//
// Props: { bookingId: number; currentUserId: number }
//
// Hooks: useChatMessages(bookingId), usePresence(`chat.booking.${bookingId}`)
// Refs: messagesEndRef = useRef<HTMLDivElement>(null)
// State: inputValue = ""
//
// Auto-scroll useEffect([messages]):
//   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//
// handleSubmit(e):
//   e.preventDefault()
//   sendMessage(inputValue)
//   setInputValue("")
//
// handleInputChange(e):
//   setInputValue(e.target.value)
//   sendTyping()
//
// Render layout:
//   Online users bar — avatars with green dot badge + memberCount
//   Messages list — own messages right-aligned, others left-aligned
//   Typing indicator — "{names} is/are typing…" when typingUsers.length > 0
//   <div ref={messagesEndRef} /> at bottom of list
//   Form — input + submit button
// ============================================================
