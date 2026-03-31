// ============================================================
// Problem 01 — Toast Notification System
// ============================================================

import { createContext, useContext, useState, useCallback, useRef } from "react";
import React from "react";

// ── SECTION 1 — Types ─────────────────────────────────────────
// ToastVariant = "success" | "error" | "info" | "warning"
//
// Toast interface:
//   id, message, variant, duration (ms; 0 = persistent), isLeaving (bool)
//
// ToastContextValue interface:
//   toasts: Toast[]
//   success(message, duration?) → string (id)
//   error(message, duration?)   → string
//   info(message, duration?)    → string
//   warning(message, duration?) → string
//   dismiss(id): void
//   dismissAll(): void



// ── SECTION 2 — Context + DEFAULT_DURATIONS ───────────────────
// createContext<ToastContextValue | null>(null)
//
// DEFAULT_DURATIONS: Record<ToastVariant, number>
//   success: 3000, error: 6000, info: 4000, warning: 5000



// ── SECTION 3 — ToastProvider ────────────────────────────────
// useState<Toast[]>([])
// useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())  ← timer ids
//
// startDismiss(id):
//   clearTimeout + delete from timers map
//   setToasts: mark isLeaving: true
//   setTimeout 300ms: filter out from array
//
// addToast(message, variant, duration?):
//   id = crypto.randomUUID()
//   push new toast to state (isLeaving: false)
//   if ms > 0: schedule startDismiss + save timer id
//   return id
//
// success/error/info/warning = useCallback → addToast with variant
// dismiss    = useCallback → startDismiss
// dismissAll = useCallback → forEach startDismiss
//
// return <ToastContext.Provider value={...}>{children}<ToastContainer /></Provider>



// ── SECTION 4 — useToast hook ─────────────────────────────────
// useContext(ToastContext)
// if !ctx → throw new Error("useToast must be used inside <ToastProvider>")
// return ctx



// ── SECTION 5 — ToastContainer ───────────────────────────────
// VARIANT_CLASSES: Record<ToastVariant, string>
//   success: "bg-green-600", error: "bg-red-600"
//   info: "bg-blue-600",     warning: "bg-amber-500"
//
// VARIANT_ICONS: Record<ToastVariant, string>
//   success: "✓", error: "✕", info: "ℹ", warning: "⚠"
//
// <div aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
//   each toast:
//     role="alert", pointer-events-auto, transition-all duration-300
//     isLeaving → "translate-x-full opacity-0"
//     !isLeaving → "translate-x-0 opacity-100"
//     show: icon | message | dismiss button
