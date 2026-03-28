// ============================================================
// Problem 02 — Auth Store with Persist & Store Composition
// ============================================================

// ============================================================
// stores/authStore.ts
//
// User interface (id, name, email, role union, permissions[])
// AuthState interface (user, token, isAuthenticated, isLoading, error + actions)
//
// useAuthStore = create<AuthState>()(persist(immer(...), { partialize }))
//   login        — POST /api/auth/login, set token + user + isAuthenticated
//   logout       — useBookingStore.getState().reset() THEN clear own state
//   refreshToken — POST /api/auth/refresh; on failure call logout()
//   isAdmin()          — get().user?.role === "admin"
//   canCreateBooking() — role in ["admin", "school_admin"]
//   hasPermission(p)   — get().user?.permissions.includes(p)
//
// persist options:
//   name: "auth-storage"
//   storage: createJSONStorage(() => localStorage)
//   partialize: (s) => ({ token: s.token, user: s.user })  ← only these 2 fields
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useBookingStore } from "./solution_01";

interface User {
    id: number;
    name: string;
    email: string;
    role: "admin" | "school_admin" | "teacher" | "student";
    permissions: string[];
}

interface LoginCredential {
    email: string;
    password: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (credentials: LoginCredential) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<void>;
    isAdmin: () => boolean;
    canCreateBooking: () => boolean;
    hasPermission: (permission: string) => boolean;
}

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

export const useAuthStore = create<AuthState>()(
    persist(
        immer((set, get) => ({
            ...initialState,

            login: async (credentials) => {
                set((s) => {
                    s.isLoading = true;
                    s.error = null;
                });

                try {
                    const res = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(credentials),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const json = await res.json();
                    set((s) => {
                        s.user = json.user;
                        s.token = json.token;
                        s.isAuthenticated = true;
                        s.isLoading = false;
                    });
                } catch (err) {
                    set((s) => {
                        s.isLoading = false;
                        s.error = err instanceof Error ? err.message : "Login failed";
                    });
                }
            },

            logout: () => {
                useBookingStore.getState().reset();
                set({ ...initialState });
            },

            refreshToken: async () => {
                try {
                    const res = await fetch("/api/auth/refresh", { method: "POST" });
                    if (!res.ok) throw new Error("Refresh failed");
                    const json = await res.json();
                    set((s) => {
                        s.token = json.token;
                    });
                } catch {
                    get().logout();
                }
            },

            isAdmin: () => get().user?.role === "admin",

            canCreateBooking: () =>
                ["admin", "school_admin"].includes(get().user?.role ?? ""),

            hasPermission: (permission) =>
                get().user?.permissions.includes(permission) ?? false,
        })),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({ token: s.token, user: s.user }),
        },
    ),
);

/*
================================================================
TIPS
================================================================

PERSIST MIDDLEWARE — WHAT IT DOES
-----------------------------------
• persist(immer(...), options) — wraps the store and saves state to localStorage automatically
• on page refresh: Zustand reads localStorage → restores saved state → user stays logged in
• without persist: every page refresh loses the token → user must log in again

PARTIALIZE — SAVE ONLY WHAT YOU NEED
--------------------------------------
• partialize: (s) => ({ token: s.token, user: s.user })
• "partial" = only a part of the store is saved, not all of it
• functions (login, logout...) cannot be serialized to JSON → never save them
• isLoading, error always start as false/null → no point saving them
• rule: only save fields that need to survive a page refresh

CREATESTORAGE VS LOCALSTORAGE DIRECTLY
----------------------------------------
• createJSONStorage(() => localStorage) — Zustand's wrapper for localStorage
• handles JSON.parse / JSON.stringify automatically
• lazy (() => localStorage) — safe for SSR (Next.js), localStorage not accessed until needed
• without createJSONStorage: you would need to manually parse/stringify on every read/write

STORE COMPOSITION — CALLING ANOTHER STORE ON LOGOUT
-----------------------------------------------------
• logout must clear booking data too — otherwise stale bookings remain after login as a different user
• useBookingStore.getState().reset() — reads the booking store's current state and calls reset()
• .getState() — access a Zustand store outside React (no hook needed)
• rule: call .getState() when you need to read or trigger another store from inside an action

GET() FOR READ-ONLY SELECTORS
-------------------------------
• isAdmin, canCreateBooking, hasPermission — never use set() here
• they only READ state via get() and return a boolean
• get().user?.role — optional chaining: safe if user is null (before login)
• ?? "" — nullish coalescing: if role is undefined, use "" so .includes() works without throwing

OPTIONAL CHAINING ?. WITH ARRAYS
----------------------------------
• get().user?.permissions.includes(permission) ?? false
• if user is null → user?.permissions is undefined → .includes() would throw
• ?. short-circuits: if user is null, the whole expression returns undefined
• ?? false — if undefined, return false instead
• pattern: nullable?.chain.of.calls ?? safeDefault

PERSIST + IMMER MIDDLEWARE ORDER
----------------------------------
• create<AuthState>()(persist(immer(...), options))
• immer is innermost — it handles the set() mutation style
• persist is outermost — it wraps the whole store and manages localStorage sync
• rule: immer always inside persist, never the other way around

================================================================
*/
