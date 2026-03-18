// ============================================================
// Problem 01 — Render Profiling & Debug Hooks
// ============================================================



// ============================================================
// hooks/useWhyDidYouRender.ts
//
// useRef to store previous props (prevPropsRef)
//
// useEffect (NO dep array — runs after every render):
//   compare all keys from prevProps and current props
//   if prevProps[key] !== props[key] → record { from, to }
//   if typeof both === "function" → append hint "(wrap in useCallback!)"
//   console.group(`[${componentName}] Re-rendered because:`)
//     log each changed key with from/to values
//   console.groupEnd()
//   prevPropsRef.current = props  ← update for next render
// ============================================================



// ============================================================
// components/ProfilerWrapper.tsx
//
// Props: { id: string; children: ReactNode; onRender?: ProfilerOnRenderCallback }
//
// defaultOnRender(id, phase, actualDuration, baseDuration, ...):
//   if actualDuration > 16 → console.warn (> 60fps frame budget)
//   else → console.log `[id] Render took Xms (phase)`
//
// return <Profiler id={id} onRender={onRender ?? defaultOnRender}>{children}</Profiler>
//
// Profiler props: id (string), onRender (callback)
// phase values: "mount" | "update" | "nested-update"
// ============================================================



// ============================================================
// useMemo — WRONG vs RIGHT
//
// WRONG: useMemo for trivial string lookup — overhead > computation
//   const label = useMemo(() => STATUS_LABELS[status], [status])
//
// RIGHT: useMemo for expensive derivation (sort + filter large array)
//   const stats = useMemo(() => ({
//     total, paid count, revenue sum, topSchool (sorted)
//   }), [bookings])
//
// React.memo — WRONG: inline object prop creates new ref every render
//   <MemoizedCard style={{ color: "red" }} />  ← memo never bails out
//
// React.memo — RIGHT: stable reference from module scope constant
//   const STATUS_STYLE = { paid: { color: "green" }, ... }
//   <StableCard booking={b} />  ← no inline objects
// ============================================================



// ============================================================
// hooks/useStableCallback.ts
//
// fnRef = useRef(fn)
//
// useLayoutEffect (no dep array):
//   fnRef.current = fn  ← sync update before effects read it
//
// return useCallback((...args) => fnRef.current(...args), [])
//   ← stable identity, always calls latest fn, no stale closure
// ============================================================



// ============================================================
// Context splitting — WRONG vs RIGHT
//
// WRONG: one context with bookings + selectedId + filter
//   → every consumer re-renders when selectedId changes
//
// RIGHT: three separate contexts by update frequency:
//   BookingDataContext   — bookings[] (changes rarely)
//   BookingUIContext     — selectedId + setSelected (changes on click)
//   BookingFilterContext — filter + setFilter (changes on input)
//
// Each context value wrapped in useMemo independently
// BookingTable only subscribes to BookingDataContext → no re-render on selection
// ============================================================
