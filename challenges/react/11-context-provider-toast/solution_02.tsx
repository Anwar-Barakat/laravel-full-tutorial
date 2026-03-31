// ============================================================
// Problem 02 — Composable Provider Stack
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import React from "react";

// ── SECTION 1 — ThemeContext types ────────────────────────────
// Theme = "light" | "dark" | "system"
// ResolvedTheme = "light" | "dark"
// ThemeContextValue: { theme, resolvedTheme, setTheme, toggle }



// ── SECTION 2 — ThemeProvider ────────────────────────────────
// useState: read localStorage ?? "system"
// useState: read window.matchMedia("(prefers-color-scheme: dark)")
//
// useEffect: listen for OS theme changes
//   mq.addEventListener("change", handler)
//   cleanup: removeEventListener
//
// resolvedTheme = theme === "system" ? systemTheme : theme
//
// useEffect [resolvedTheme, theme]:
//   document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
//   localStorage.setItem("theme", theme)
//
// toggle(): dark or (system+dark) → "light"; else → "dark"
//
// useTheme(): throw if no context



// ── SECTION 3 — AuthContext ───────────────────────────────────
// User: id, name, email, role, permissions: string[]
// AuthContextValue: user, isAuthenticated, isLoading, login, logout, hasPermission
//
// AuthProvider:
//   useToast() ← works because AuthProvider is BELOW ToastProvider
//   useEffect (mount): check localStorage token → GET /api/auth/me → setUser
//   login(email, password): POST → save token → setUser → toast.success
//   logout(): POST → remove token → setUser(null) → toast.info
//   hasPermission(p): user?.permissions.includes(p) ?? false
//
// useAuth(): throw if no context



// ── SECTION 4 — composeProviders ─────────────────────────────
// type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>
//
// composeProviders(...providers):
//   return ComposedProviders({ children }) {
//     providers.reduceRight(
//       (acc, Provider) => <Provider>{acc}</Provider>,
//       children as React.ReactElement
//     )
//   }
//
// const AppProviders = composeProviders(
//   ThemeProvider,   // outermost
//   ToastProvider,
//   AuthProvider,    // can call useToast() ✓
//   QueryProvider,   // innermost
// )



// ── SECTION 5 — useAppProviders hook ─────────────────────────
// interface AppContexts { theme, auth, toast }
//
// useAppProviders():
//   return { theme: useTheme(), auth: useAuth(), toast: useToast() }
