// ============================================================
// Problem 02 — Animated Components & Transitions
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// Shared types
// ============================================================

type ToastVariant = "success" | "error" | "warning" | "info";

// ============================================================
// components/Toast.tsx
// ============================================================

const TOAST_CLASSES: Record<ToastVariant, string> = {
    success: "bg-green-600 dark:bg-green-700",
    error:   "bg-red-600   dark:bg-red-700",
    warning: "bg-amber-500 dark:bg-amber-600",
    info:    "bg-blue-600  dark:bg-blue-700",
};

const TOAST_ICONS: Record<ToastVariant, string> = {
    success: "✓", error: "✕", warning: "⚠", info: "ℹ",
};

interface ToastProps {
    message:   string;
    variant:   ToastVariant;
    isVisible: boolean;
    onDismiss: () => void;
    duration?: number;
}

export function Toast({ message, variant, isVisible, onDismiss, duration = 4000 }: ToastProps) {
    useEffect(() => {
        if (!isVisible) return;
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
    }, [isVisible, duration, onDismiss]);

    return (
        // translate-x-full = off-screen right; translate-x-0 = in view
        // pointer-events-none when hidden so it doesn't block clicks
        <div
            role="alert"
            aria-live="polite"
            className={`
                fixed top-4 right-4 z-50
                flex items-center gap-3
                px-4 py-3 rounded-xl shadow-lg
                text-white text-sm font-medium
                max-w-sm w-full

                transform transition-all duration-300 ease-out
                ${isVisible
                    ? "translate-x-0 opacity-100"
                    : "translate-x-full opacity-0 pointer-events-none"
                }
                ${TOAST_CLASSES[variant]}
            `}
        >
            <span className="text-lg flex-shrink-0" aria-hidden="true">
                {TOAST_ICONS[variant]}
            </span>
            <span className="flex-1">{message}</span>
            <button
                onClick={onDismiss}
                aria-label="Dismiss notification"
                className="flex-shrink-0 opacity-75 hover:opacity-100 transition-opacity"
            >
                ✕
            </button>
        </div>
    );
}

// ============================================================
// hooks/useToast.ts
// ============================================================

interface ToastItem {
    id:      string;
    message: string;
    variant: ToastVariant;
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, variant: ToastVariant = "info") => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, variant }]);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, toast, dismiss };
}

// Toast container — renders all active toasts stacked
export function ToastContainer() {
    const { toasts, dismiss } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-label="Notifications">
            {toasts.map((t) => (
                <Toast
                    key={t.id}
                    message={t.message}
                    variant={t.variant}
                    isVisible={true}
                    onDismiss={() => dismiss(t.id)}
                />
            ))}
        </div>
    );
}

// ============================================================
// components/Dropdown.tsx
// ============================================================

interface DropdownProps {
    trigger:  React.ReactNode;
    children: React.ReactNode;
    align?:   "left" | "right";
}

export function Dropdown({ trigger, children, align = "right" }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setIsOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {trigger}
            </button>

            {/* Dropdown panel — scale + opacity transition */}
            <div
                role="menu"
                className={`
                    absolute z-20 mt-1 w-48
                    ${align === "right" ? "right-0" : "left-0"}
                    bg-white dark:bg-gray-800
                    rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10
                    py-1 overflow-hidden

                    transform transition-all duration-200 ease-out origin-top-right
                    ${isOpen
                        ? "opacity-100 scale-100 pointer-events-auto"
                        : "opacity-0 scale-95 pointer-events-none"
                    }
                `}
            >
                {children}
            </div>
        </div>
    );
}

export function DropdownItem({
    children,
    onClick,
    variant = "default",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "default" | "danger";
}) {
    return (
        <button
            role="menuitem"
            onClick={onClick}
            className={`
                w-full text-left px-4 py-2 text-sm
                transition-colors duration-100
                ${variant === "danger"
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }
            `}
        >
            {children}
        </button>
    );
}

// ============================================================
// components/Skeleton.tsx + ContentFade
// ============================================================

export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        />
    );
}

// BookingCard skeleton — matches real card layout
export function BookingCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <div className="flex gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );
}

// Crossfade: skeleton fades out → content fades in
interface ContentFadeProps {
    isLoading: boolean;
    skeleton:  React.ReactNode;
    children:  React.ReactNode;
}

export function ContentFade({ isLoading, skeleton, children }: ContentFadeProps) {
    return (
        <div className="relative">
            {/* Skeleton fades out */}
            <div className={`transition-opacity duration-300 ${
                isLoading ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            }`}>
                {skeleton}
            </div>
            {/* Content fades in */}
            <div className={`transition-opacity duration-300 ${
                isLoading ? "opacity-0" : "opacity-100"
            }`}>
                {children}
            </div>
        </div>
    );
}

// ============================================================
// StaggeredList<T>
// ============================================================

interface StaggeredListProps<T> {
    items:      T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    keyFn:      (item: T) => string | number;
}

export function StaggeredList<T>({ items, renderItem, keyFn }: StaggeredListProps<T>) {
    return (
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li
                    key={keyFn(item)}
                    // Inline style for stagger delay — Tailwind can't generate delay-[${i*50}ms] at runtime
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="opacity-0 translate-y-2 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
                >
                    {renderItem(item, i)}
                </li>
            ))}
        </ul>
    );
}

// Add to your CSS file (v4):
// @keyframes fadeSlideIn {
//   0%   { opacity: 0; transform: translateY(8px); }
//   100% { opacity: 1; transform: translateY(0); }
// }

// ============================================================
// hooks/usePrefersReducedMotion.ts
// ============================================================

export function usePrefersReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReduced(mq.matches);
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return prefersReduced;
}

// Usage: if prefersReduced → skip animation classes
// Tailwind: motion-reduce:transition-none motion-reduce:animate-none

/*
================================================================
TIPS
================================================================

TOAST — SLIDE IN FROM RIGHT
------------------------------
• translate-x-full → off-screen to the right (hidden)
• translate-x-0    → in view (visible)
• opacity-0 + pointer-events-none — invisible AND unclickable when hidden
• transition-all duration-300 — animates both transform and opacity together
• setTimeout(onDismiss, duration) — auto-dismiss; cleared on unmount/re-trigger
• role="alert" aria-live="polite" — screen reader announces new toasts

DROPDOWN — SCALE + OPACITY OPEN/CLOSE
----------------------------------------
• scale-95 opacity-0 → scale-100 opacity-100 on open
• origin-top-right — scales from the top-right corner (where trigger usually is)
• pointer-events-none when closed — invisible panel doesn't block clicks
• mousedown outside ref.current → close — standard click-outside pattern
• ring-1 ring-black/5 — subtle border using shadow ring (works better than border in dark)

SKELETON — ANIMATE-PULSE
--------------------------
• animate-pulse — Tailwind built-in, uses CSS animation to fade in/out
• aria-hidden="true" — skeleton is decorative, screen readers skip it
• match the real card layout — same spacing, same proportions
• rounded-full for badge skeletons, plain rounded for text blocks

CONTENTFADE — CROSSFADE PATTERN
----------------------------------
• both skeleton and content are in the DOM simultaneously
• skeleton: opacity-100 → opacity-0 (fades out) + absolute to remove from flow
• content:  opacity-0  → opacity-100 (fades in)
• absolute inset-0 on hidden skeleton — taken out of flow so content takes its place
• pointer-events-none — hidden skeleton doesn't intercept clicks

STAGGEREDLIST — INLINE STYLE FOR DELAY
-----------------------------------------
• Tailwind can't generate delay-[${i*50}ms] dynamically at runtime — not in the source
• style={{ animationDelay }} — inline style is the only way for dynamic values
• animate-[fadeSlideIn_0.3s_ease-out_forwards] — arbitrary animation value
• forwards fill — keeps final state (opacity-1) after animation ends
• opacity-0 translate-y-2 as base classes — initial state before animation runs

USEPREFERSREDUCEDMOTION
--------------------------
• window.matchMedia("(prefers-reduced-motion: reduce)") — OS accessibility setting
• addEventListener "change" — updates if user changes OS setting while page is open
• motion-reduce:transition-none motion-reduce:animate-none — Tailwind prefix
• always respect this setting — some users get dizzy or have seizures from motion

ANIMATION CHEATSHEET
----------------------
• Fade in:           opacity-0 → opacity-100  transition-opacity duration-200
• Slide from right:  translate-x-full → translate-x-0  transition-transform duration-300
• Scale open:        scale-95 opacity-0 → scale-100 opacity-100  transition-all duration-200
• Skeleton pulse:    animate-pulse bg-gray-200 dark:bg-gray-700
• Stagger delay:     style={{ animationDelay: `${i * 50}ms` }}
• Reduce motion:     motion-reduce:transition-none motion-reduce:animate-none

================================================================
*/
