// ============================================================
// Problem 02 — useDebounce & useLocalStorage Generic Hooks
// ============================================================

// ============================================================
// hooks/useDebounce.ts
// useDebounce<T>(value: T, delay: number): T
// (useEffect: setTimeout → setDebouncedValue, cleanup: clearTimeout)
// ============================================================

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// ============================================================
// hooks/useLocalStorage.ts
// useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]
// ============================================================

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
): [T, (value: T) => void] {

    // Step 1 — read from localStorage on mount (once only)
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) as T : initialValue;
        } catch {
            return initialValue; // corrupted data → use default
        }
    });

    // Step 2 — save to localStorage whenever storedValue changes
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (err) {
            console.error(`useLocalStorage: error writing key "${key}"`, err);
        }
    }, [key, storedValue]);

    // Step 3 — return exactly like useState
    return [storedValue, setStoredValue];
}

/*
================================================================
TIPS
================================================================

GENERICS <T>
------------
• function useDebounce<T>(value: T, delay: number): T
• <T> is a type placeholder — caller decides the actual type at call site
• useDebounce("search", 300)  → T = string
• useDebounce(42, 300)        → T = number
• useDebounce(filters, 300)   → T = BookingFilters
• rule: use <T> when the hook should work with any type

USEDEBOUNCE — HOW CLEANUP WORKS
---------------------------------
• user types "a"   → timer starts (delay ms)
• user types "ab"  → cleanup cancels "a" timer, new timer starts
• user types "abc" → cleanup cancels "ab" timer, new timer starts
• delay ms passes  → setDebouncedValue("abc") fires once
• without return () => clearTimeout(timer): stale timers fire after unmount

LAZY USESTATE INITIALISER
--------------------------
• useState(() => expensiveWork())  ← function runs ONCE on mount only
• useState(expensiveWork())        ← runs on EVERY render (result ignored after first)
• localStorage.getItem is I/O — always use lazy initialiser for it
• the () => wrapping is what makes it lazy

SSR GUARD
----------
• typeof window === "undefined" → true in Node.js / Next.js server render
• localStorage does not exist on the server → accessing it throws ReferenceError
• always guard before accessing window or localStorage in a hook
• return initialValue on server — hook still works, just not persisted

ITEM !== NULL CHECK
--------------------
• localStorage.getItem(key) returns null when key does not exist
• it returns the string "null" when you stored null
• if (item) would fail for stored values like "false", "0", ""
• if (item !== null) is the correct check — only fails when key is truly missing

VALUE INSTANCEOF FUNCTION
--------------------------
• mirrors useState setter API exactly
• setValue("dark")                    → value instanceof Function = false → use directly
• setValue(prev => prev === "dark")   → value instanceof Function = true → call with storedValue
• call value(storedValue) to get the new value, then store it

JSON ERROR HANDLING
--------------------
• JSON.parse throws  → corrupted localStorage → catch → return initialValue silently
• JSON.stringify throws → circular reference or quota exceeded → catch → console.error, don't throw
• state is still updated in memory even if localStorage write fails
• rule: corrupted storage should never crash the app

================================================================
*/
