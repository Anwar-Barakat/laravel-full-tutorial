// ============================================================
// Problem 02 — Notification Bell & Live Updates
// ============================================================



// ============================================================
// hooks/useNotifications.ts
//
// State: notifications: AppNotification[] = [], isLoading = true
// const { user } = useAuth()
//
// Fetch history useEffect([]):
//   GET /api/notifications → setNotifications(data).finally(() => setIsLoading(false))
//
// Echo subscription useEffect([user?.id]):
//   if !user: return
//   window.Echo.private(`App.Models.User.${user.id}`)
//     .notification((notification: AppNotification) => {
//       setNotifications(prev => [notification, ...prev])  ← prepend newest
//       playNotificationSound()
//       triggerVibration()
//     })
//   cleanup: window.Echo.leave(`App.Models.User.${user.id}`)
//
// playNotificationSound():
//   const audio = new Audio("/sounds/notification.mp3")
//   audio.play().catch(() => {})  ← catch: browser autoplay policy may block
//
// triggerVibration():
//   if "vibrate" in navigator: navigator.vibrate([100, 50, 100])
//
// markAsRead(id):
//   optimistic: setNotifications(prev => prev.map(n =>
//     n.id === id ? { ...n, read_at: new Date().toISOString() } : n
//   ))
//   PATCH /api/notifications/${id}/read
//
// markAllRead():
//   optimistic: setNotifications(prev => prev.map(n =>
//     ({ ...n, read_at: n.read_at ?? new Date().toISOString() })
//   ))
//   POST /api/notifications/read-all
//
// unreadCount = useMemo(() => notifications.filter(n => !n.read_at).length, [notifications])
//
// return { notifications, unreadCount, markAsRead, markAllRead, isLoading }
// ============================================================



// ============================================================
// utils/groupNotifications.ts
//
// type GroupedNotifications = Record<AppNotification["type"], AppNotification[]>
//
// groupNotifications(notifications):
//   return notifications.reduce((acc, n) => ({
//     ...acc,
//     [n.type]: [...(acc[n.type] ?? []), n],
//   }), {} as GroupedNotifications)
//
// GROUP_LABELS:
//   booking_status → "Booking Updates"
//   payment        → "Payments"
//   message        → "Messages"
//   system         → "System"
// ============================================================



// ============================================================
// components/NotificationBell.tsx
//
// Props: { count: number; onClick: () => void }
//
// render:
//   <button onClick={onClick} aria-label={`${count} unread notifications`}>
//     <BellIcon />
//     {count > 0 &&
//       <span className="absolute -top-1 -right-1 ...">
//         {count > 99 ? "99+" : count}
//       </span>
//     }
//   </button>
//
// Badge caps at "99+" to prevent layout overflow
// aria-label updates dynamically for screen reader announcements
// ============================================================



// ============================================================
// components/NotificationDropdown.tsx
//
// Props: { isOpen: boolean; onClose: () => void }
// Hooks: useNotifications(), useMemo(() => groupNotifications(notifications), [notifications])
// Refs: dropdownRef = useRef<HTMLDivElement>(null)
//
// Close on outside click useEffect:
//   document.addEventListener("mousedown", handler)
//   handler: if !dropdownRef.current?.contains(e.target as Node): onClose()
//   cleanup: removeEventListener
//
// Close on Escape useEffect:
//   document.addEventListener("keydown", handler)
//   handler: if e.key === "Escape": onClose()
//   cleanup: removeEventListener
//
// Render structure:
//   Header — "Notifications (N unread)" + "Mark all read" button (if unreadCount > 0)
//   Scrollable list (max-h-96 overflow-y-auto):
//     Object.entries(grouped).map(([type, items]) =>
//       Group header (GROUP_LABELS[type]) + items.map(<NotificationItem />)
//     )
//     Empty state if notifications.length === 0
// ============================================================



// ============================================================
// components/NotificationItem.tsx
//
// Props: { notification: AppNotification; onRead: () => void }
//
// Unread styles: bg-blue-50 + font-semibold title + blue dot indicator
// Read styles: plain background + normal weight
//
// render:
//   <div onClick={onRead} className={unread ? "bg-blue-50 ..." : "..."}>
//     <NotificationIcon type={notification.type} />
//     <div>
//       <p className={unread ? "font-semibold" : ""}>{notification.title}</p>
//       <p className="truncate text-xs text-gray-500">{notification.body}</p>
//       <p className="text-xs text-gray-400">{formatRelativeTime(notification.created_at)}</p>
//     </div>
//     {unread && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
//   </div>
//
// formatRelativeTime: "2 min ago" / "1 hour ago" / "Yesterday"
// ============================================================



// ============================================================
// components/NotificationCenter.tsx  (wires bell + dropdown)
//
// State: isOpen = false
// const { unreadCount } = useNotifications()
//
// render:
//   <div className="relative">
//     <NotificationBell count={unreadCount} onClick={() => setIsOpen(prev => !prev)} />
//     {isOpen && <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />}
//   </div>
//
// Echo channel reference:
//   Private:  window.Echo.private(`App.Models.User.${id}`).notification(handler)
//   Presence: window.Echo.join("chat.booking.42").here().joining().leaving()
//   Whisper:  channel.whisper("typing", data) / channel.listenForWhisper("typing", handler)
//   Cleanup:  window.Echo.leave("channel-name")  ← always in useEffect return
// ============================================================
