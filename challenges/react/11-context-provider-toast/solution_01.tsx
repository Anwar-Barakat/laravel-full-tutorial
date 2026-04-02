// ============================================================
// Problem 01 — Theme Provider
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import React from "react";

// ============================================================
// Types
// ============================================================

type Theme         = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
    theme:         Theme;
    resolvedTheme: ResolvedTheme;
    setTheme:      (t: Theme) => void;
    toggle:        () => void;
}

// ============================================================
// Context
// ============================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================
// ThemeProvider
// ============================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Read persisted choice from localStorage — avoids flash of wrong theme on reload
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem("theme") as Theme) ?? "system",
    );

    // Read OS preference on first render
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );

    // Listen for OS preference changes at runtime
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) =>
            setSystemTheme(e.matches ? "dark" : "light");
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    // "system" resolves to whatever the OS is currently set to
    const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

    // Apply "dark" class to <html> + persist to localStorage
    useEffect(() => {
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
        localStorage.setItem("theme", theme);
    }, [resolvedTheme, theme]);

    const setThemeState = useCallback((t: Theme) => setTheme(t), []);

    const toggle = useCallback(() => {
        setTheme(prev =>
            prev === "dark" || (prev === "system" && resolvedTheme === "dark")
                ? "light"
                : "dark",
        );
    }, [resolvedTheme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ============================================================
// useTheme hook
// ============================================================

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be inside <ThemeProvider>");
    return ctx;
}

/*
================================================================
TIPS
================================================================

theme vs resolvedTheme
------------------------
• theme         = user's CHOICE: "light" | "dark" | "system"
• resolvedTheme = ACTUAL value:  always "light" | "dark"
• "system" resolves via window.matchMedia("(prefers-color-scheme: dark)")
• Save theme to localStorage — preserves "system" choice on reload

localStorage IN useState INITIALISER
--------------------------------------
• Runs ONCE on mount — reads persisted value before first render
• Avoids flash: page starts with correct theme immediately
• Without: page always starts "system" then jumps → visible flash

WHY BOTH useState AND useEffect FOR OS THEME
----------------------------------------------
• useState initialiser — reads OS preference ONCE on page load
• useEffect listener  — watches for changes WHILE page is open
• Without useEffect: theme only updates on page reload, not live OS changes

document.documentElement.classList.toggle("dark", condition)
-------------------------------------------------------------
• Adds "dark" to <html> when true, removes when false
• Tailwind dark: variants activate when <html class="dark"> is present

================================================================
*/
