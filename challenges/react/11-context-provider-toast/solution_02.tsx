// ============================================================
// Problem 02 — Auth Provider
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import React from "react";

// ── useToast from solution_01 (import in real app) ────────────
declare function useToast(): {
    success: (message: string) => string;
    info:    (message: string) => string;
    error:   (message: string) => string;
};

// ============================================================
// Types
// ============================================================

interface User {
    id:          number;
    name:        string;
    email:       string;
    role:        "admin" | "school_admin" | "staff";
    permissions: string[];
}

interface AuthContextValue {
    user:            User | null;
    isAuthenticated: boolean;
    isLoading:       boolean;
    login:           (email: string, password: string) => Promise<void>;
    logout:          () => Promise<void>;
    hasPermission:   (permission: string) => boolean;
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// AuthProvider
// ============================================================

const api = {
    get:  async <T>(url: string): Promise<T> =>
        fetch(url).then(r => r.json()),
    post: async <T>(url: string, body: unknown): Promise<T> =>
        fetch(url, { method: "POST", body: JSON.stringify(body) }).then(r => r.json()),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user,      setUser]      = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); // true until session checked

    // useToast() works here because AuthProvider is placed BELOW ToastProvider
    // Provider ordering rule: if B needs context from A, A must wrap B
    const toast = useToast();

    // Restore session on mount — check if stored token is still valid
    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            api.get<{ data: User }>("/api/auth/me")
                .then(res => setUser(res.data))
                .catch(() => localStorage.removeItem("auth_token"))
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post<{ data: User; token: string }>(
            "/api/auth/login", { email, password }
        );
        localStorage.setItem("auth_token", res.token);
        setUser(res.data);
        toast.success(`Welcome back, ${res.data.name}!`);
    }, [toast]);

    const logout = useCallback(async () => {
        await api.post("/api/auth/logout", {});
        localStorage.removeItem("auth_token");
        setUser(null);
        toast.info("You have been logged out.");
    }, [toast]);

    const hasPermission = useCallback(
        (permission: string) => user?.permissions.includes(permission) ?? false,
        [user]
    );

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: user !== null,
            isLoading,
            login,
            logout,
            hasPermission,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// useAuth hook
// ============================================================

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
    return ctx;
}

/*
================================================================
TIPS
================================================================

isLoading: true ON INIT
-------------------------
• Prevents flash of unauthenticated UI while session is being checked
• Show a spinner while isLoading, then render the real UI
• Without it: page shows "Sign In" for a split second even when logged in

SESSION RESTORE IN useEffect
------------------------------
• Runs once on mount — validates token stored in localStorage
• .catch() — removes expired/invalid token silently
• .finally() — always sets isLoading: false so UI unblocks

AuthProvider BELOW ToastProvider
----------------------------------
• AuthProvider calls useToast() — ToastProvider must wrap it
• Rule: if B needs context from A, A must appear ABOVE B in the tree
• login()  → toast.success — shows welcome message
• logout() → toast.info   — shows logout confirmation

hasPermission
--------------
• user?.permissions.includes(p) ?? false
• ?. safe if user is null (not logged in)
• ?? false — defaults to false when user is null

createContext<T | null>(null)
------------------------------
• null default + null guard in useAuth()
• if (!ctx) throw new Error(...) → clear error vs silent crash

================================================================
*/
