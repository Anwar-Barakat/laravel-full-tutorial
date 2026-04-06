// ============================================================
// Problem 02 — Notification Bell & Live Updates
// ============================================================


// ============================================================
// hooks/useNotifications.ts
// ============================================================

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"

interface AppNotification {
    id: string
    type: "booking_status" | "payment" | "message" | "system"
    title: string
    body: string
    data: Record<string, unknown>
    read_at: string | null
    created_at: string
}

function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { user } = useAuth()

    useEffect(() => {
        fetch("/api/notifications")
            .then(r => r.json())
            .then(setNotifications)
            .finally(() => setIsLoading(false))
    }, [])

    useEffect(() => {
        if (!user) return
        window.Echo.private(`App.Models.User.${user.id}`)
            .notification((notification: AppNotification) => {
                setNotifications(prev => [notification, ...prev])
                playNotificationSound()
                triggerVibration()
            })
        return () => window.Echo.leave(`App.Models.User.${user.id}`)
    }, [user?.id])

    const playNotificationSound = () => {
        const audio = new Audio("/sounds/notification.mp3")
        audio.play().catch(() => {})
    }

    const triggerVibration = () => {
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100])
    }

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        ))
        await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    }

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n =>
            ({ ...n, read_at: n.read_at ?? new Date().toISOString() })
        ))
        await fetch("/api/notifications/read-all", { method: "POST" })
    }

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read_at).length,
        [notifications]
    )

    return { notifications, unreadCount, markAsRead, markAllRead, isLoading }
}

export default useNotifications


// ============================================================
// utils/groupNotifications.ts
// ============================================================

type GroupedNotifications = Record<AppNotification["type"], AppNotification[]>

const GROUP_LABELS: Record<AppNotification["type"], string> = {
    booking_status: "Booking Updates",
    payment:        "Payments",
    message:        "Messages",
    system:         "System",
}

function groupNotifications(notifications: AppNotification[]): GroupedNotifications {
    return notifications.reduce((acc, n) => ({
        ...acc,
        [n.type]: [...(acc[n.type] ?? []), n],
    }), {} as GroupedNotifications)
}

export { groupNotifications, GROUP_LABELS }


// ============================================================
// components/NotificationBell.tsx
// ============================================================

import React from "react"
import { BellIcon } from "@heroicons/react/24/outline"

interface NotificationBellProps {
    count: number
    onClick: () => void
}

function NotificationBell({ count, onClick }: NotificationBellProps) {
    return (
        <button
            onClick={onClick}
            className="relative p-2"
            aria-label={`${count} unread notifications`}
        >
            <BellIcon className="w-6 h-6" />
            {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-500
                                 text-white text-xs rounded-full flex items-center justify-center px-1">
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </button>
    )
}

export default NotificationBell


// ============================================================
// components/NotificationItem.tsx
// ============================================================

import React from "react"

interface NotificationItemProps {
    notification: AppNotification
    onRead: () => void
}

function formatRelativeTime(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour ago`
    return "Yesterday"
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
    const unread = !notification.read_at

    return (
        <div
            onClick={onRead}
            className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b last:border-0
                        ${unread ? "bg-blue-50" : ""}`}
        >
            <div className="flex-1 min-w-0">
                <p className={`text-sm ${unread ? "font-semibold" : ""}`}>
                    {notification.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{notification.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(notification.created_at)}
                </p>
            </div>
            {unread && (
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
            )}
        </div>
    )
}

export default NotificationItem


// ============================================================
// components/NotificationDropdown.tsx
// ============================================================

import React, { useEffect, useMemo, useRef } from "react"
import useNotifications from "@/hooks/useNotifications"
import { groupNotifications, GROUP_LABELS } from "@/utils/groupNotifications"
import NotificationItem from "@/components/NotificationItem"

interface NotificationDropdownProps {
    isOpen: boolean
    onClose: () => void
}

function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
    const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()
    const grouped = useMemo(() => groupNotifications(notifications), [notifications])
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!dropdownRef.current?.contains(e.target as Node)) onClose()
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [onClose])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    }, [onClose])

    return (
        <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-96 bg-white shadow-xl rounded-xl z-50">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-semibold">Notifications ({unreadCount} unread)</h3>
                {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-sm text-blue-600">
                        Mark all read
                    </button>
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
    )
}

export default NotificationDropdown


// ============================================================
// components/NotificationCenter.tsx
// ============================================================

import React, { useState } from "react"
import useNotifications from "@/hooks/useNotifications"
import NotificationBell from "@/components/NotificationBell"
import NotificationDropdown from "@/components/NotificationDropdown"

function NotificationCenter() {
    const { unreadCount } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative">
            <NotificationBell
                count={unreadCount}
                onClick={() => setIsOpen(prev => !prev)}
            />
            {isOpen && (
                <NotificationDropdown
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    )
}

export default NotificationCenter


/*
================================================================
TIPS
================================================================

.NOTIFICATION() VS .LISTEN()
-----------------------------
.notification():
  - Only for Laravel Notification system ($user->notify(...))
  - No event name needed — catches ALL notifications for that user
  - Only works on .private() channel
  - Laravel automatically uses App.Models.User.{id} as the channel
  - internally listens for: Illuminate\Notifications\Events\BroadcastNotificationCreated

.listen():
  - For manually broadcast events (event(new BookingStatusChanged()))
  - Requires the event class name as first argument
  - Works on .private(), .channel(), and .join()
  - You control the channel name yourself

APP.MODELS.USER.{ID} CHANNEL
------------------------------
• Laravel's default broadcast channel for Notifications — built into the framework
• triggered by: $user->notify(new SomeNotification()) on the server
• channel name is based on the RECIPIENT's id — not the sender
• each user subscribes to their own channel → they only see their own notifications
• you DON'T need to define broadcastOn() in your Notification class — Laravel sets it automatically
• only override broadcastOn() if you want a custom channel name:
  return [new PrivateChannel("my-channel.{$this->notifiable->id}")]
• if you change the channel name on Laravel side, update Echo.private() on React side to match
• requires ShouldBroadcast on the Notification class — that's all

OPTIMISTIC MARK AS READ
------------------------
• update UI immediately → user sees instant feedback
• then send PATCH to server in background
• if server fails → ideally revert, but for read status this is usually acceptable to skip

USEMEMO FOR DERIVED STATE
--------------------------
• unreadCount = useMemo(() => notifications.filter(...).length, [notifications])
  — only recalculates when notifications array changes, not on every render
• grouped = useMemo(() => groupNotifications(notifications), [notifications])
  — same principle — expensive reduce only runs when data changes

NULLISH COALESCING (??)
------------------------
• n.read_at ?? new Date().toISOString()
  — use existing read_at if already set, otherwise use now
  — ?? only checks null/undefined (not falsy) — safer than ||

CLOSE ON OUTSIDE CLICK
-----------------------
• attach mousedown to document
• check: !dropdownRef.current?.contains(e.target) → click was outside
• cleanup removeEventListener in useEffect return — prevents memory leaks

CLOSE ON ESCAPE
---------------
• attach keydown to document
• check e.key === "Escape" → call onClose()
• same cleanup pattern as outside click

NOTIFICATION SOUND
------------------
• new Audio("/sounds/notification.mp3") — loads the sound file from public/sounds/
• audio.play() — plays it, returns a Promise
• must .catch(() => {}) — browser autoplay policy blocks audio until user clicks something first
  - without catch: throws unhandled Promise rejection error in console
  - with catch: fails silently — no crash, user just doesn't hear the sound
• browser rule: audio is only allowed after the user has interacted with the page (clicked anything)
• place audio files in public/sounds/

VIBRATION API
-------------
• navigator.vibrate([100, 50, 100]) → on 100ms, off 50ms, on 100ms
• check "vibrate" in navigator first — not supported in all browsers (desktop)
• mobile only — desktop browsers ignore it silently

GROUP_LABELS
------------
• Record<type, label> maps notification type to human readable string
• cast type when accessing: GROUP_LABELS[type as AppNotification["type"]]

================================================================
*/
