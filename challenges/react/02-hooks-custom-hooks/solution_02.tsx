// ============================================================
// Problem 02 — useDebounce & useLocalStorage Generic Hooks
// ============================================================



// ============================================================
// hooks/useDebounce.ts
// useDebounce<T>(value: T, delay: number): T
// (useEffect: setTimeout → setDebouncedValue, cleanup: clearTimeout)
// ============================================================



// ============================================================
// hooks/useLocalStorage.ts
// useLocalStorage<T>(key: string, initialValue: T): [T, Setter<T>]
// (lazy useState initialiser — localStorage read on mount only)
// (SSR guard: typeof window === "undefined")
// (JSON.parse error → return initialValue)
// (setValue: value instanceof Function branch for updater form)
// (JSON.stringify error → log, don't throw)
// ============================================================
