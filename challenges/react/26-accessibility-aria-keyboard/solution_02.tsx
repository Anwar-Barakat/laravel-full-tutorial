// ============================================================
// Problem 02 — Advanced Accessibility Patterns
// ============================================================



// ============================================================
// hooks/useRovingTabIndex.ts
//
// function useRovingTabIndex<T extends HTMLElement>(itemCount):
//   { activeIndex, setActiveIndex, getItemProps }
//
// State: activeIndex = 0
// Ref: itemRefs = useRef<(T|null)[]>([])
//
// focusItem = useCallback((index) => {
//   clamped = Math.max(0, Math.min(index, itemCount-1))
//   setActiveIndex(clamped)
//   itemRefs.current[clamped]?.focus()
// }, [itemCount])
//
// getItemProps = useCallback((index) => ({
//   tabIndex: index === activeIndex ? 0 : -1,  ← only active item in tab order
//   onFocus: () => setActiveIndex(index),
//   ref: (el) => { itemRefs.current[index] = el },
//   onKeyDown: (e) => {
//     ArrowRight / ArrowDown → focusItem(activeIndex + 1)
//     ArrowLeft  / ArrowUp   → focusItem(activeIndex - 1)
//     Home                   → focusItem(0)
//     End                    → focusItem(itemCount - 1)
//     all: e.preventDefault()
//   },
// }), [activeIndex, focusItem, itemCount])
//
// Usage — tab list:
//   role="tablist"
//   {tabs.map((tab, i) =>
//     <button role="tab" aria-selected={i===activeTab} {...getItemProps(i)} />
//   )}
// ============================================================



// ============================================================
// components/a11y/DataTable.tsx
//
// State: focusedCell = { row:0, col:0 }, sortKey, sortDir
// Ref: cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map())
//
// cellKey(row, col) = `${row}-${col}`
//
// handleCellKeyDown(e, row, col):
//   ArrowRight: col = min(col+1, colCount-1)
//   ArrowLeft:  col = max(col-1, 0)
//   ArrowDown:  row = min(row+1, rowCount-1)
//   ArrowUp:    row = max(row-1, 0)
//   Home:       col = 0
//   End:        col = colCount-1
//   e.preventDefault(); setFocusedCell(next); cellRefs.current.get(cellKey(r,c))?.focus()
//
// Render:
//   <div role="region" aria-label={caption}>
//   <table>
//     <caption className="sr-only">{caption}</caption>   ← always include, sr-only is fine
//     <thead>
//       <th scope="col"
//           aria-sort={sortable ? (sortKey===col ? sortDir+"ending" : "none") : undefined}>
//         sortable → <button onClick={handleSort}> with SortIcon
//       </th>
//     </thead>
//     <tbody>
//       <td
//         ref={el => cellRefs.current.set(cellKey(ri, ci), el)}
//         tabIndex={focusedCell matches ? 0 : -1}
//         onFocus={() => setFocusedCell({row:ri, col:ci})}
//         onKeyDown={e => handleCellKeyDown(e, ri, ci)}
//         className="focus:ring-2 focus:ring-inset focus:ring-blue-500"
//       >
//     </tbody>
//   </table>
//
// aria-sort values: "ascending" | "descending" | "none" | "other"
// ============================================================



// ============================================================
// hooks/useFocusOnRouteChange.ts
//
// function useFocusOnRouteChange(headingRef: React.RefObject<HTMLHeadingElement>): void
//
// const location = useLocation()
//
// useEffect([location.pathname]):
//   timer = setTimeout(() => headingRef.current?.focus(), 50)
//   ← small delay: let React finish rendering new page
//   cleanup: clearTimeout(timer)
//
// Usage on every page:
//   const h1Ref = useRef<HTMLHeadingElement>(null)
//   useFocusOnRouteChange(h1Ref)
//   <h1 ref={h1Ref} tabIndex={-1} className="focus:outline-none">
//     ← tabIndex={-1}: not in tab order but can receive programmatic focus
// ============================================================



// ============================================================
// hooks/useReducedMotion.ts
//
// function useReducedMotion(): boolean
//
// State init: () => matchMedia("(prefers-reduced-motion: reduce)").matches
//
// useEffect([]):
//   mq = window.matchMedia("(prefers-reduced-motion: reduce)")
//   handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
//   mq.addEventListener("change", handler)   ← listens for OS preference change
//   cleanup: removeEventListener
//
// return prefersReduced
//
// Usage:
//   const reduceMotion = useReducedMotion()
//   className={reduceMotion ? "opacity-100" : "animate-fade-in duration-300"}
//   ← never remove transitions from focus indicators, just slow animations
// ============================================================



// ============================================================
// hooks/useLiveRegion.ts
//
// function useLiveRegion(politeness="polite"):
//   { announce: (message) => void, regionRef: React.RefObject<HTMLDivElement> }
//
// regionRef = useRef<HTMLDivElement>(null)
//
// announce = useCallback((message) => {
//   el = regionRef.current; if !el: return
//   el.textContent = ""
//   setTimeout(() => { el.textContent = message }, 100)
// }, [])
//
// Usage — embed region in component:
//   <div ref={regionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
//   useEffect([results.length]):
//     announce(`${results.length} result${results.length!==1?"s":""} found`)
// ============================================================



// ============================================================
// ARIA reference
//
// Dialog:   role="dialog" aria-modal="true" aria-labelledby aria-describedby
// Combobox: role="combobox" aria-expanded aria-controls aria-activedescendant
//           list: role="listbox" | options: role="option" aria-selected aria-disabled
// Table:    <caption> (sr-only) | <th scope="col"> | aria-sort
// Tabs:     role="tablist" > role="tab" aria-selected aria-controls
//           + role="tabpanel" aria-labelledby
// Landmarks: <header>=banner, <nav>=navigation, <main>=main,
//            <footer>=contentinfo, <aside>=complementary
//
// aria-live: "polite" (wait for idle) vs "assertive" (interrupt immediately)
// aria-atomic="true": announce whole region, not just changed text
//
// Focus rules:
//   modal open  → focus first/initial element inside
//   modal close → return focus to trigger element
//   route change → focus <h1> of new page
//   tabIndex={-1}: programmatically focusable, not in tab order
// ============================================================
