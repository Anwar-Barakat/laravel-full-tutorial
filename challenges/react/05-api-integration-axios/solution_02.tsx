// ============================================================
// Problem 02 — Request Queue & Offline Support
// ============================================================

// ============================================================
// hooks/useOnlineStatus.ts
//
// useState(navigator.onLine)
//
// useEffect:
//   up   = () => setIsOnline(true)
//   down = () => setIsOnline(false)
//   window.addEventListener("online",  up)
//   window.addEventListener("offline", down)
//   return cleanup (removeEventListener both)
//
// return isOnline
// ============================================================

import React from "react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { api } from "./solution_01";

export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

    useEffect(() => {
        const up = () => setIsOnline(true);
        const down = () => setIsOnline(false);

        window.addEventListener("online", up);
        window.addEventListener("offline", down);

        return () => {
            window.removeEventListener("online", up);
            window.removeEventListener("offline", down);
        };
    }, []);

    return isOnline;
}

// ============================================================
// lib/requestQueue.ts
//
// QueuedRequest interface: { id, method, url, data?, timestamp }
//
// RequestQueue class (KEY = "offline_request_queue"):
//   getAll()   — localStorage.getItem(KEY) → JSON.parse → QueuedRequest[]
//   add(req)   — { ...req, id: crypto.randomUUID(), timestamp: Date.now() }; push; setItem
//   remove(id) — filter out by id; setItem
//   clear()    — localStorage.removeItem(KEY)
//   get length — this.getAll().length
//
// export const requestQueue = new RequestQueue()
// ============================================================

interface QueuedRequest {
    id: string;
    method: "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    data?: unknown;
    timestamp: number;
}

class RequestQueue {
    private static readonly KEY = "offline_request_queue";

    getAll(): QueuedRequest[] {
        try {
            const raw = localStorage.getItem(RequestQueue.KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    add(req: Omit<QueuedRequest, "id" | "timestamp">): QueuedRequest {
        const item: QueuedRequest = {
            ...req,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        const queue = this.getAll();
        queue.push(item);
        localStorage.setItem(RequestQueue.KEY, JSON.stringify(queue));
        return item;
    }

    remove(id: string): void {
        const updated = this.getAll().filter((r) => r.id !== id);
        localStorage.setItem(RequestQueue.KEY, JSON.stringify(updated));
    }

    clear(): void {
        localStorage.removeItem(RequestQueue.KEY);
    }

    get length(): number {
        return this.getAll().length;
    }
}

export const requestQueue = new RequestQueue();

// ============================================================
// hooks/useOfflineMutation.ts
//
// UseOfflineMutationOptions<T>: { queuedMethod?, queuedUrl?, onOnlineSuccess?, onError? }
// UseOfflineMutationReturn<TData, TVariables>: { mutate, isLoading, pendingCount }
//
// const isOnline     = useOnlineStatus()
// const [isLoading]  = useState(false)
// const [pendingCount] = useState(requestQueue.length)
//
// useEffect([isOnline]):
//   if (!isOnline) return
//   drainQueue():
//     items = requestQueue.getAll()
//     for item of items (FIFO):
//       api.request({ method, url, data })
//       requestQueue.remove(id) → setPendingCount
//       onOnlineSuccess?.(result.data)
//       on error: break (stop — don't skip silently)
//
// mutate(variables):
//   if offline && queuedMethod && queuedUrl:
//     requestQueue.add(...) → setPendingCount
//     toast("Saved offline — will sync when connected.")
//     return null
//   setIsLoading(true)
//   try: return await mutationFn(variables)
//   catch: onError?.(err); throw err
//   finally: setIsLoading(false)
//
// return { mutate, isLoading, pendingCount }
// ============================================================

interface UseOfflineMutationOptions<T> {
    queuedMethod?: "POST" | "PUT" | "PATCH" | "DELETE";
    queuedUrl?: string;
    onOnlineSuccess?: (result: T) => void;
    onError?: (error: unknown) => void;
}

export function useOfflineMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: UseOfflineMutationOptions<TData> = {},
) {
    const isOnline = useOnlineStatus();
    const [isLoading, setIsLoading] = useState(false);
    const [pendingCount, setPendingCount] = useState(requestQueue.length);

    useEffect(() => {
        if (!isOnline) return; // only drain when back online

        async function drainQueue() {
            const items = requestQueue.getAll();
            if (items.length === 0) return;

            setIsLoading(true);
            for (const item of items) {       // FIFO
                try {
                    const result = await api.request({
                        method: item.method,
                        url: item.url,
                        data: item.data,
                    });
                    requestQueue.remove(item.id);
                    setPendingCount(requestQueue.length);
                    options.onOnlineSuccess?.(result.data);
                } catch {
                    break; // stop on first failure
                }
            }
            setIsLoading(false);
        }

        drainQueue();
    }, [isOnline]);

    async function mutate(variables: TVariables): Promise<TData | null> {
        if (!isOnline) {
            if (options.queuedMethod && options.queuedUrl) {
                requestQueue.add({
                    method: options.queuedMethod,
                    url: options.queuedUrl,
                    data: variables,
                });
                setPendingCount(requestQueue.length);
            }
            toast("Saved offline — will sync when connected.", { icon: "📶" });
            return null;
        }

        setIsLoading(true);
        try {
            return await mutationFn(variables);
        } catch (err) {
            options.onError?.(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    return { mutate, isLoading, pendingCount };
}

// ============================================================
// components/OfflineBanner.tsx
//
// Props: { pendingCount: number }
//
// <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-medium shadow-md">
//   <span>⚠️ You are offline.</span>
//   {pendingCount > 0 && <span>{pendingCount} change(s) pending sync.</span>}
// </div>
//
// Usage in AppLayout:
//   {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
//   <main className={!isOnline ? "mt-10" : ""}>{children}</main>
// ============================================================

interface OfflineBannerProps {
    pendingCount: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ pendingCount }) => (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-medium shadow-md">
        <span>⚠️ You are offline.</span>
        {pendingCount > 0 && (
            <span className="ml-2">
                {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending sync.
            </span>
        )}
    </div>
);

function AppLayout({ children }: { children: React.ReactNode }) {
    const isOnline = useOnlineStatus();
    const { pendingCount } = useOfflineMutation(() => Promise.resolve());

    return (
        <>
            {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
            <main className={!isOnline ? "mt-10" : ""}>{children}</main>
        </>
    );
}

/*
================================================================
TIPS
================================================================

USEONLINESTATUS — WRAPPING NAVIGATOR.ONLINE IN REACT STATE
------------------------------------------------------------
• navigator.onLine — browser built-in, true if connected
• useState(navigator.onLine) — initial state from browser
• window events "online"/"offline" fire when connection changes
• cleanup removes listeners on unmount — prevents memory leaks
• used by useOfflineMutation and OfflineBanner

REQUESTQUEUE CLASS — LOCALSTORAGE PERSISTENCE
-----------------------------------------------
• stores queued requests as JSON array in localStorage
• survives page refresh — requests are not lost
• read → modify → rewrite pattern — no append in localStorage
• getAll() wraps JSON.parse in try/catch — corrupted data returns []
• add() generates id with crypto.randomUUID() and timestamp with Date.now()
• get length — getter property, not method — access as requestQueue.length

USEOFFLINEMUTATION — ONLINE/OFFLINE BRANCHING
-----------------------------------------------
• online path  → calls mutationFn directly, manages isLoading
• offline path → queues request to localStorage, shows toast, returns null
• useEffect([isOnline]) — triggers drainQueue when connection restored
• drainQueue() — FIFO order using for...of loop
• break on first failure — stops processing, prevents partial state corruption
• pendingCount synced after every add/remove

DRAINQUEUE — FIFO AND FAIL-FAST
---------------------------------
• FIFO = First In First Out — processes requests in the order they were queued
• break on error — if one request fails, stop the whole queue
• reason: later requests may depend on earlier ones (e.g. create before update)
• onOnlineSuccess called per item — caller can refetch or update UI

OFFLINEBANNER — FIXED TOP UI
------------------------------
• fixed top-0 inset-x-0 — spans full width at top of screen
• mt-10 on main — prevents content hidden behind the banner
• pendingCount > 0 — shows "X changes pending sync" only when queue has items
• pendingCount !== 1 — correct pluralisation: "1 change" vs "2 changes"

================================================================
*/
