// ============================================================
// Problem 02 — Virtual List for 10K Items
// ============================================================



// ============================================================
// hooks/useVirtualList.ts
//
// options: { itemCount, itemHeight (number | fn), containerHeight, overscan? = 3 }
// returns: { virtualItems, totalHeight, scrollToIndex }
//
// const [scrollTop, setScrollTop] = useState(0)
// useEffect: containerRef.addEventListener("scroll", passive)
//            setScrollTop(el.scrollTop)
//
// getItemHeight = useCallback(
//   index => typeof itemHeight === "function" ? itemHeight(index) : itemHeight
// , [itemHeight])
//
// itemOffsets (dynamic only) = useMemo:
//   if itemHeight is number → return null (use formula)
//   else: offsets[0]=0; offsets[i+1] = offsets[i] + itemHeight(i)
//
// totalHeight = useMemo:
//   fixed:   itemCount * itemHeight
//   dynamic: itemOffsets[itemCount]
//
// startIndex / endIndex = useMemo:
//   fixed (O(1)):
//     start = Math.floor(scrollTop / itemHeight)
//     end   = Math.min(itemCount-1, Math.ceil((scrollTop + containerHeight) / itemHeight))
//   dynamic (O(log n) binary search through offsets):
//     find first index where offset >= scrollTop
//     walk endIndex until offset > scrollTop + containerHeight
//
// overscanStart = Math.max(0, startIndex - overscan)
// overscanEnd   = Math.min(itemCount - 1, endIndex + overscan)
//
// virtualItems = useMemo:
//   for i = overscanStart to overscanEnd:
//     start = fixed ? i * itemHeight : itemOffsets[i]
//     push { index: i, start, size: getItemHeight(i) }
//
// scrollToIndex = useCallback:
//   offset = fixed ? index * itemHeight : itemOffsets[index]
//   containerRef.current.scrollTop = offset
// ============================================================



// ============================================================
// components/VirtualList.tsx
//
// const containerRef = useRef<HTMLDivElement>(null)
// const [containerHeight, setContainerHeight] = useState(600)
//
// useEffect: ResizeObserver on containerRef
//   setContainerHeight(entry.contentRect.height)
//   initial: setContainerHeight(el.clientHeight)
//   return: observer.disconnect()
//
// const { virtualItems, totalHeight } = useVirtualList(containerRef, { ... })
//
// render:
//   <div ref={containerRef} style={{ overflow: "auto", ...style }}
//        role="list" aria-rowcount={items.length}>
//     <div style={{ height: totalHeight, position: "relative" }}>
//       {virtualItems.map(({ index, start, size }) => (
//         <div key={index}
//              role="listitem"
//              style={{
//                position: "absolute", top: 0, left: 0, right: 0,
//                height: size,
//                transform: `translateY(${start}px)`  ← GPU composited, no reflow
//              }}>
//           {renderItem(items[index], index)}
//         </div>
//       ))}
//     </div>
//   </div>
// ============================================================



// ============================================================
// Algorithm summary
//
// 10,000 items, itemHeight=64, containerHeight=600, overscan=5:
//   visible:  ceil(600 / 64) = 10 items
//   rendered: 10 + 5 + 5    = 20 DOM nodes (constant, regardless of total)
//
// Scroll to 1000px:
//   startIndex = floor(1000 / 64) = 15
//   endIndex   = ceil((1000 + 600) / 64) = 25
//   with overscan: render indices 10 → 30
//   items 0-9 unmounted, 31+ not mounted
//
// Total height spacer:
//   10000 * 64 = 640,000px
//   browser scrollbar reflects this — but only 20 DOM nodes exist
//
// Key choices:
//   transform: translateY (not top) — GPU layer, no layout reflow
//   { passive: true } on scroll — browser can optimize scrolling
//   ResizeObserver (not window.resize) — responds to container resize too
// ============================================================
