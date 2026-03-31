// ============================================================
// Problem 03 — Virtual List for 10K Items
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// Shared types
// ============================================================

interface Booking {
    id:          number;
    school_name: string;
    status:      "pending" | "confirmed" | "paid" | "cancelled";
    amount:      number;
}

interface VirtualListProps<T> {
    items:      T[];
    itemHeight: number;
    overscan?:  number;
    renderItem: (item: T, index: number) => React.ReactNode;
    style?:     React.CSSProperties;
    className?: string;
}

// ============================================================
// hooks/useVirtualList.ts
// ============================================================

interface UseVirtualListOptions {
    itemCount:       number;
    itemHeight:      number;
    containerHeight: number;
    overscan?:       number;
}

interface VirtualItem {
    index: number;
    start: number;
    size:  number;
}

export function useVirtualList(
    containerRef: React.RefObject<HTMLElement>,
    options:      UseVirtualListOptions,
) {
    const { itemCount, itemHeight, containerHeight, overscan = 3 } = options;

    const [scrollTop, setScrollTop] = useState(0);

    // Sync scroll position — passive: true tells browser we won't preventDefault
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleScroll = () => setScrollTop(el.scrollTop);
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, [containerRef]);

    // Total height of all items — needed for the scrollbar spacer
    const totalHeight = itemCount * itemHeight;

    // Which items are visible — O(1) for fixed height
    const startIndex = Math.max(0,
        Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
        itemCount - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    // Build the list of items to render
    const virtualItems = useMemo(() => {
        const items: VirtualItem[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            items.push({
                index: i,
                start: i * itemHeight,  // absolute top position
                size:  itemHeight,
            });
        }
        return items;
    }, [startIndex, endIndex, itemHeight]);

    return { virtualItems, totalHeight };
}

// ============================================================
// components/VirtualList.tsx
// ============================================================

export function VirtualList<T>({
    items,
    itemHeight,
    overscan = 3,
    renderItem,
    style,
    className = "",
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Measure container height — ResizeObserver handles layout changes
    // (not just window resize — works when sidebar opens/closes too)
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setContainerHeight(entry.contentRect.height);
        });
        observer.observe(el);

        // Initial measurement — ResizeObserver fires async so we also read sync
        setContainerHeight(el.clientHeight);

        return () => observer.disconnect();
    }, []);

    const { virtualItems, totalHeight } = useVirtualList(containerRef, {
        itemCount:  items.length,
        itemHeight,
        containerHeight,
        overscan,
    });

    return (
        // Scroll container — fixed height, overflow scroll
        <div
            ref={containerRef}
            className={`overflow-auto relative ${className}`}
            style={style}
            role="list"
            aria-rowcount={items.length}
        >
            {/* Full height spacer — makes scrollbar proportional to all items
                without rendering all items in the DOM */}
            <div style={{ height: totalHeight, position: "relative" }}>
                {virtualItems.map(({ index, start, size }) => (
                    // translateY instead of top — GPU composited, no layout reflow
                    <div
                        key={index}
                        role="listitem"
                        style={{
                            position:  "absolute",
                            top:       0,
                            left:      0,
                            right:     0,
                            height:    size,
                            transform: `translateY(${start}px)`,
                        }}
                    >
                        {renderItem(items[index], index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Usage — BookingVirtualList
// 10,000 items, only ~20 DOM nodes rendered at any time
// ============================================================

export function BookingVirtualList({ bookings }: { bookings: Booking[] }) {
    return (
        <VirtualList
            items={bookings}
            itemHeight={64}    // each row = 64px
            overscan={5}       // 5 extra rows above and below viewport
            style={{ height: "600px" }}
            renderItem={(booking) => (
                <div
                    className="flex items-center px-4 border-b border-gray-100 hover:bg-gray-50"
                    style={{ height: 64 }}
                >
                    <span className="font-medium">{booking.school_name}</span>
                    <span className="ml-auto text-sm text-gray-500 capitalize">
                        {booking.status}
                    </span>
                    <span className="ml-4 text-sm font-medium">
                        {new Intl.NumberFormat("en-AE", {
                            style:    "currency",
                            currency: "AED",
                        }).format(booking.amount)}
                    </span>
                </div>
            )}
        />
    );
}

/*
================================================================
TIPS
================================================================

WHY VIRTUALIZATION
-------------------
• Without it: render 10,000 <div>s → browser lays out all → slow initial render
• With it: only ~20 DOM nodes regardless of list size → fast at any scale
• Rule of thumb: use virtualization when list > 100 items and rows are complex

USEVIRTUALLIST — VISIBLE RANGE CALCULATION
--------------------------------------------
• scrollTop = how far the user has scrolled
• startIndex = first visible item = Math.floor(scrollTop / itemHeight)
• endIndex   = last visible item  = Math.ceil((scrollTop + containerHeight) / itemHeight)
• overscan   = extra items above + below to prevent blank rows during fast scroll

TOTAL HEIGHT SPACER
---------------------
• div with height = itemCount * itemHeight — creates full scrollbar
• items inside are absolute positioned — taken out of normal flow
• scrollbar shows correct proportion without rendering all items

TRANSFORM VS TOP
-----------------
• top: Xpx       — triggers layout recalculation on every scroll
• translateY(Xpx) — GPU composited layer — no layout, no paint — smooth 60fps

RESIZEOBSERVER VS WINDOW RESIZE
----------------------------------
• window.addEventListener("resize") — only fires when browser window resizes
• ResizeObserver — fires when the element itself resizes (sidebar toggle, etc.)
• always use ResizeObserver for element measurements

PASSIVE SCROLL LISTENER
-------------------------
• { passive: true } — tells browser "I won't call preventDefault()"
• browser can start scrolling immediately without waiting for JS
• always add passive: true to scroll/touch listeners that don't prevent default

OVERSCAN
---------
• without overscan: fast scroll shows blank rows before items mount
• overscan = 3-5: pre-render rows just outside viewport → smooth scrolling
• higher overscan = smoother scroll but more DOM nodes

================================================================
*/
