# REACT_TEST_19 — Echo • Reverb • Real-Time UI

**Time:** 25 minutes | **Stack:** React + TypeScript + Laravel Echo + Reverb

---

## Problem 01 — Echo Integration Hooks (Medium)

Build custom React hooks that connect to Laravel Echo channels: `useChannel` for private events, `usePresence` for who's online, and a complete chat UI with typing indicators.

---

### Part A — `useChannel` hook

**File:** `hooks/useChannel.ts`

```ts
type EventHandlers = Record<string, (data: unknown) => void>

interface UseChannelReturn {
  lastEvent: { name: string; data: unknown } | null
  channel: Echo["private"] extends (...args: any[]) => infer R ? R : never
}

function useChannel(channelName: string, handlers: EventHandlers = {}): UseChannelReturn
```

**Implementation:**
- `lastEvent` state: `{ name: string; data: unknown } | null`, init `null`
- `channelRef = useRef<any>(null)`
- `handlersRef = useRef(handlers)` + `useEffect` with no dep array that updates `handlersRef.current = handlers`
  — keeps handlers stable without re-subscribing on every render
- Main `useEffect([channelName])`:
  - `channelRef.current = window.Echo.private(channelName)`
  - Iterate `Object.entries(handlersRef.current)` → `.listen(event, (data) => { setLastEvent({ name: event, data }); handler(data) })`
  - Cleanup: `window.Echo.leave(channelName)`
- Return `{ lastEvent, channel: channelRef.current }`

**Usage:**
```ts
const { lastEvent } = useChannel("booking.42", {
  "status.changed": (e) => setStatus((e as any).newStatus),
  "payment.received": () => refetchBooking(),
})
```

---

### Part B — `usePresence` hook

**File:** `hooks/usePresence.ts`

```ts
interface PresenceUser {
  id: number
  name: string
  avatar?: string
}

interface UsePresenceReturn {
  onlineUsers: PresenceUser[]
  isUserOnline: (userId: number) => boolean
  memberCount: number
}

function usePresence(channelName: string): UsePresenceReturn
```

**Implementation:**
- `onlineUsers` state: `PresenceUser[]`, init `[]`
- `useEffect([channelName])`:
  - `channel = window.Echo.join(channelName)`
  - `.here((users: PresenceUser[]) => setOnlineUsers(users))`
    — fires immediately with all current members
  - `.joining((user: PresenceUser) => setOnlineUsers(prev => [...prev, user]))`
  - `.leaving((user: PresenceUser) => setOnlineUsers(prev => prev.filter(u => u.id !== user.id)))`
  - `.error((error: unknown) => console.error("Presence error:", error))`
  - Cleanup: `window.Echo.leave(channelName)`
- `isUserOnline = useCallback((userId: number) => onlineUsers.some(u => u.id === userId), [onlineUsers])`
- Return `{ onlineUsers, isUserOnline, memberCount: onlineUsers.length }`

---

### Part C — `useChatMessages` hook

**File:** `hooks/useChatMessages.ts`

```ts
interface ChatMessage {
  id: number
  body: string
  user: { id: number; name: string; avatar?: string }
  created_at: string
  read_by: number[]
}

interface UseChatMessagesReturn {
  messages: ChatMessage[]
  sendMessage: (body: string) => Promise<void>
  sendTyping: () => void
  typingUsers: string[]
  isLoading: boolean
}

function useChatMessages(bookingId: number): UseChatMessagesReturn
```

**Implementation:**
- `messages` state: `ChatMessage[]`, init `[]`
- `typingUsers` state: `string[]`, init `[]`
- `isLoading` state: `boolean`, init `true`
- `typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())`

- **Fetch history** `useEffect([bookingId])`:
  - `fetch(\`/api/bookings/${bookingId}/messages\`).then(r => r.json()).then(setMessages).finally(() => setIsLoading(false))`

- **Echo subscription** `useEffect([bookingId])`:
  - `channel = window.Echo.private(\`chat.booking.${bookingId}\`)`
  - `.listen("MessageSent", (e: { message: ChatMessage }) => setMessages(prev => [...prev, e.message]))`
  - `.listenForWhisper("typing", (e: { user: string }) => {`
    - `setTypingUsers(prev => prev.includes(e.user) ? prev : [...prev, e.user])`
    - Clear old timer for user, set new 3 s timer → remove from typingUsers
    - `typingTimers.current.set(e.user, setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== e.user)), 3000))`
  - `})`
  - Cleanup: `typingTimers.current.forEach(clearTimeout)` + `window.Echo.leave(\`chat.booking.${bookingId}\`)`

- **`sendMessage`**:
  - `POST /api/bookings/${bookingId}/messages` with `{ body }`
  - Optimistic update: `setMessages(prev => [...prev, optimistic])` then replace on success

- **`sendTyping`**:
  - `channel.whisper("typing", { user: auth.user.name })`
  - Debounce: only whisper if last whisper was > 2 s ago (use `useRef` for last whisper time)

---

### Part D — `ChatWindow` component

**File:** `components/ChatWindow.tsx`

```tsx
interface ChatWindowProps {
  bookingId: number
  currentUserId: number
}
```

**Implementation:**
- Use `useChatMessages(bookingId)`, `usePresence(\`chat.booking.${bookingId}\`)`
- `messagesEndRef = useRef<HTMLDivElement>(null)`
- Auto-scroll: `useEffect([messages])` → `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })`
- `inputValue` state + `handleSubmit`: call `sendMessage(inputValue)`, clear input
- `handleInputChange`: call `sendTyping()` on each keystroke

**Render structure:**
```tsx
<div className="flex flex-col h-full">
  {/* Online users bar */}
  <div className="flex items-center gap-2 p-2 border-b">
    {onlineUsers.map(user => (
      <div key={user.id} className="relative">
        <img src={user.avatar} className="w-8 h-8 rounded-full" />
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full" />
      </div>
    ))}
    <span>{memberCount} online</span>
  </div>

  {/* Messages list */}
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    {messages.map(msg => (
      <div key={msg.id} className={msg.user.id === currentUserId ? "text-right" : "text-left"}>
        <span className="text-xs text-gray-500">{msg.user.name}</span>
        <p className="inline-block bg-blue-100 rounded-lg px-3 py-2">{msg.body}</p>
      </div>
    ))}
    {/* Typing indicator */}
    {typingUsers.length > 0 && (
      <p className="text-sm text-gray-400 italic">
        {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
      </p>
    )}
    <div ref={messagesEndRef} />
  </div>

  {/* Input */}
  <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
    <input value={inputValue} onChange={handleInputChange} className="flex-1 ..." />
    <button type="submit">Send</button>
  </form>
</div>
```

---

## Problem 02 — Notification Bell & Live Updates (Hard)

Build a notification bell that receives real-time notifications via Echo and displays them in a dropdown — with unread count badge, mark-as-read, sound/vibration, and grouping.

---

### Part A — `useNotifications` hook

**File:** `hooks/useNotifications.ts`

```ts
interface AppNotification {
  id: string
  type: "booking_status" | "payment" | "message" | "system"
  title: string
  body: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

interface UseNotificationsReturn {
  notifications: AppNotification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  isLoading: boolean
}

function useNotifications(): UseNotificationsReturn
```

**Implementation:**
- `notifications` state: `AppNotification[]`, init `[]`
- `isLoading` state: `boolean`, init `true`
- `{ user } = useAuth()`

- **Fetch history** `useEffect([])`:
  - `GET /api/notifications` → `setNotifications(data)`

- **Echo subscription** `useEffect([user?.id])`:
  - `window.Echo.private(\`App.Models.User.${user.id}\`)`
  - `.notification((notification: AppNotification) => {`
    - `setNotifications(prev => [notification, ...prev])`  ← prepend newest
    - `playNotificationSound()`
    - `triggerVibration()`
  - `})`
  - Cleanup: `window.Echo.leave(\`App.Models.User.${user.id}\`)`

- **`playNotificationSound`**:
  - `const audio = new Audio("/sounds/notification.mp3")`
  - `audio.play().catch(() => {})` — catch required: autoplay policy may block

- **`triggerVibration`**:
  - `if ("vibrate" in navigator) navigator.vibrate([100, 50, 100])`

- **`markAsRead(id)`**:
  - `PATCH /api/notifications/${id}/read`
  - Optimistic: `setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))`

- **`markAllRead`**:
  - `POST /api/notifications/read-all`
  - Optimistic: `setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))`

- **`unreadCount`**: `useMemo(() => notifications.filter(n => !n.read_at).length, [notifications])`

---

### Part B — Notification grouping utility

**File:** `utils/groupNotifications.ts`

```ts
type GroupedNotifications = Record<AppNotification["type"], AppNotification[]>

function groupNotifications(notifications: AppNotification[]): GroupedNotifications
```

**Implementation:**
- `reduce` over notifications
- `acc[n.type] = [...(acc[n.type] ?? []), n]`
- Return grouped object

**Group labels:**
```ts
const GROUP_LABELS: Record<AppNotification["type"], string> = {
  booking_status: "Booking Updates",
  payment:        "Payments",
  message:        "Messages",
  system:         "System",
}
```

---

### Part C — `NotificationBell` component

**File:** `components/NotificationBell.tsx`

```tsx
interface NotificationBellProps {
  count: number
  onClick: () => void
}
```

**Render:**
```tsx
<button onClick={onClick} className="relative p-2" aria-label={`${count} unread notifications`}>
  <BellIcon className="w-6 h-6" />
  {count > 0 && (
    <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs
                     rounded-full flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  )}
</button>
```

- `aria-label` updates with count for screen readers
- Badge caps at `99+` to prevent layout overflow

---

### Part D — `NotificationDropdown` component

**File:** `components/NotificationDropdown.tsx`

```tsx
interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
}
```

**Implementation:**
- `const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()`
- `grouped = useMemo(() => groupNotifications(notifications), [notifications])`
- Close on outside click: `useEffect` attaches `mousedown` listener to `document`, checks `!ref.current?.contains(e.target)`
- Close on Escape: `useEffect` → `keydown` listener

**Render structure:**
```tsx
<div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-96 bg-white shadow-xl rounded-xl z-50">
  {/* Header */}
  <div className="flex justify-between items-center p-4 border-b">
    <h3>Notifications ({unreadCount} unread)</h3>
    {unreadCount > 0 && (
      <button onClick={markAllRead} className="text-sm text-blue-600">Mark all read</button>
    )}
  </div>

  {/* Grouped list */}
  <div className="max-h-96 overflow-y-auto">
    {Object.entries(grouped).map(([type, items]) => (
      <div key={type}>
        <h4 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
          {GROUP_LABELS[type as AppNotification["type"]]}
        </h4>
        {items.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRead={() => markAsRead(notification.id)}
          />
        ))}
      </div>
    ))}
    {notifications.length === 0 && (
      <p className="p-8 text-center text-gray-500">No notifications</p>
    )}
  </div>
</div>
```

---

### Part E — `NotificationItem` component

**File:** `components/NotificationItem.tsx`

```tsx
interface NotificationItemProps {
  notification: AppNotification
  onRead: () => void
}
```

**Render:**
```tsx
<div
  onClick={onRead}
  className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b last:border-0
              ${!notification.read_at ? "bg-blue-50" : ""}`}
>
  <NotificationIcon type={notification.type} />  {/* icon by type */}
  <div className="flex-1 min-w-0">
    <p className={`text-sm ${!notification.read_at ? "font-semibold" : ""}`}>
      {notification.title}
    </p>
    <p className="text-xs text-gray-500 truncate">{notification.body}</p>
    <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.created_at)}</p>
  </div>
  {!notification.read_at && (
    <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
  )}
</div>
```

- Unread: blue background + bold title + blue dot
- `formatRelativeTime`: "2 min ago", "1 hour ago", "Yesterday"

---

### Part F — Wiring everything together

**File:** `components/NotificationCenter.tsx`

```tsx
function NotificationCenter() {
  const { unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <NotificationBell count={unreadCount} onClick={() => setIsOpen(prev => !prev)} />
      {isOpen && (
        <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </div>
  )
}
```

**Key Echo patterns (reference):**
```ts
// Private channel (authenticated user events)
window.Echo.private(`App.Models.User.${userId}`)
  .notification(handler)        // Laravel Notification broadcasts
  .listen("CustomEvent", handler)

// Presence channel (who's online)
window.Echo.join("chat.booking.42")
  .here(users => ...)           // initial member list
  .joining(user => ...)         // user joined
  .leaving(user => ...)         // user left

// Whisper (client-to-client, no server round trip)
channel.whisper("typing", { user: "Alice" })
channel.listenForWhisper("typing", handler)

// Cleanup
window.Echo.leave("channel-name")  // always in useEffect cleanup
```
