// ============================================================
// Problem 01 — Echo Integration Hooks
// ============================================================


// ============================================================
// hooks/useChannel.ts
// ============================================================

import { useEffect, useRef, useState } from "react"
import type Echo from "laravel-echo"

type EventHandlers = Record<string, (data: unknown) => void>

function useChannel(channelName: string, handlers: EventHandlers = {}) {
    const [lastEvent, setLastEvent] = useState<{
        name: string;
        data: unknown;
    } | null>(null);
    const channelRef = useRef<any>(null);
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        channelRef.current = window.Echo.private(channelName);
        Object.entries(handlersRef.current).forEach(([event, handler]) => {
            channelRef.current.listen(event, (data: unknown) => {
                setLastEvent({ name: event, data });
                (handler as (data: unknown) => void)(data);
            });
        });
        return () => window.Echo.leave(channelName);
    }, [channelName]);

    return { lastEvent, channel: channelRef.current };
}

export default useChannel


// ============================================================
// hooks/usePresence.ts
// ============================================================

import { useCallback, useEffect, useState } from "react"

interface PresenceUser {
    id: number
    name: string
    avatar?: string
}

function usePresence(channelName: string) {
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

    useEffect(() => {
        const channel = window.Echo.join(channelName)
            .here((users: PresenceUser[]) => setOnlineUsers(users))
            .joining((user: PresenceUser) =>
                setOnlineUsers((prev) => [...prev, user]),
            )
            .leaving((user: PresenceUser) =>
                setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id)),
            )
            .error((error: unknown) => console.error("Presence error:", error));

        return () => window.Echo.leave(channelName);
    }, [channelName]);

    const isUserOnline = useCallback(
        (userId: number) => onlineUsers.some((u) => u.id === userId),
        [onlineUsers],
    );

    return { onlineUsers, isUserOnline, memberCount: onlineUsers.length };
}

export default usePresence


// ============================================================
// hooks/useChatMessages.ts
// ============================================================

import { useEffect, useRef, useState } from "react"

interface ChatMessage {
    id: number
    body: string
    user: { id: number; name: string; avatar?: string }
    created_at: string
    read_by: number[]
}

function useChatMessages(bookingId: number) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const lastWhisperTime = useRef<number>(0);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        fetch(`/api/bookings/${bookingId}/messages`)
            .then((r) => r.json())
            .then(setMessages)
            .finally(() => setIsLoading(false));
    }, [bookingId]);

    useEffect(() => {
        channelRef.current = window.Echo.private(`chat.booking.${bookingId}`)
            .listen("MessageSent", (e: { message: ChatMessage }) => {
                setMessages(prev => [...prev, e.message])
            })
            .listenForWhisper("typing", (e: { user: string }) => {
                setTypingUsers(prev => prev.includes(e.user) ? prev : [...prev, e.user])
                clearTimeout(typingTimers.current.get(e.user))
                typingTimers.current.set(e.user,
                    setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== e.user)), 3000)
                )
            })

        return () => {
            typingTimers.current.forEach((timer) => clearTimeout(timer))
            window.Echo.leave(`chat.booking.${bookingId}`)
        };
    }, [bookingId]);

    const sendMessage = async (body: string) => {
        const optimistic: ChatMessage = {
            id: Date.now(),
            body,
            user: (window as any).auth.user,
            created_at: new Date().toISOString(),
            read_by: [],
        }

        setMessages(prev => [...prev, optimistic])
        const res = await fetch(`/api/bookings/${bookingId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
        })

        const real = await res.json()
        setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m))
    }

    const sendTyping = () => {
        if (Date.now() - lastWhisperTime.current < 2000) return
        lastWhisperTime.current = Date.now()
        channelRef.current?.whisper("typing", { user: (window as any).auth.user.name })
    }

    return { messages, sendMessage, sendTyping, typingUsers, isLoading };
}

export default useChatMessages


// ============================================================
// components/ChatWindow.tsx
// ============================================================

import React, { useEffect, useRef, useState } from "react"
import useChatMessages from "@/hooks/useChatMessages"
import usePresence from "@/hooks/usePresence"

interface ChatWindowProps {
    bookingId: number
    currentUserId: number
}

function ChatWindow({ bookingId, currentUserId }: ChatWindowProps) {
    const { messages, sendMessage, sendTyping, typingUsers, isLoading } = useChatMessages(bookingId)
    const { onlineUsers, memberCount } = usePresence(`chat.booking.${bookingId}`)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [inputValue, setInputValue] = useState("")

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        sendMessage(inputValue)
        setInputValue("")
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
        sendTyping()
    }

    return (
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
                {typingUsers.length > 0 && (
                    <p className="text-sm text-gray-400 italic">
                        {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
                    </p>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                <input value={inputValue} onChange={handleInputChange} className="flex-1" />
                <button type="submit">Send</button>
            </form>
        </div>
    )
}

export default ChatWindow


/*
================================================================
TIPS
================================================================

ECHO CHANNEL TYPES
------------------
• Echo.private("channel")   → authenticated users only — requires auth middleware
• Echo.join("channel")      → presence channel — private + tracks who's online
• Echo.channel("channel")   → public — no auth required
• always call window.Echo.leave("channel") in useEffect cleanup

STABLE HANDLER REF PATTERN
---------------------------
• handlers object is recreated every render → if in deps, causes re-subscribe every render
• solution: store in useRef, update with useEffect(() => { ref.current = val }) — no deps
• main useEffect uses ref.current — reads latest handlers without having them in deps
• result: one subscription for the lifetime of the channel name

PRESENCE CHANNEL
----------------
• .here(users)    → fires immediately with full list of current members
• .joining(user)  → fires when a new user joins
• .leaving(user)  → fires when a user leaves
• .error(err)     → fires on connection error
• state update pattern: joining → spread [...prev, user], leaving → filter

WHISPER (CLIENT-TO-CLIENT)
---------------------------
• channel.whisper("event", data)              → sends directly to other clients
• channel.listenForWhisper("event", handler)  → receives whispers
• no server round trip — never stored in DB, not logged
• use for ephemeral events: typing indicators, cursor positions, reactions

TYPING INDICATOR PATTERN
-------------------------
• Map<username, timeoutId> — one timer per user
• on whisper received: add user to typingUsers, clear old timer, set new 3s timer
• timer fires: remove user from typingUsers
• on sender side: debounce with useRef timestamp — only whisper every 2s

OPTIMISTIC UPDATE
-----------------
• add message immediately with temp id (Date.now()) → UI feels instant
• POST to server → replace temp message with real server response
• if POST fails → remove optimistic message or show error

AUTO-SCROLL
-----------
• useEffect([messages]) → fires after every new message
• messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
• place <div ref={messagesEndRef} /> as last child of messages container

================================================================
*/
