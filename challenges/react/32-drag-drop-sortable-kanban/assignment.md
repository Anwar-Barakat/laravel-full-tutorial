# REACT_TEST_34 — Drag & Drop • Sortable • Kanban

**Time:** 25 minutes | **Stack:** React + TypeScript + dnd-kit

---

## Problem 01 — Booking Kanban Board (Medium)

Build a kanban board where bookings can be dragged between status columns using dnd-kit.

---

### Package overview

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers
```

| Package | Purpose |
|---|---|
| `@dnd-kit/core` | `DndContext`, `useDraggable`, `useDroppable`, `DragOverlay` |
| `@dnd-kit/sortable` | `SortableContext`, `useSortable`, `arrayMove` |
| `@dnd-kit/utilities` | `CSS.Transform.toString` |
| `@dnd-kit/modifiers` | `restrictToWindowEdges`, `restrictToParentElement`, `restrictToVerticalAxis` |

---

### Types

```ts
type BookingStatus = "pending" | "confirmed" | "paid" | "completed"

interface Booking {
  id: number
  school_name: string
  trip_date: string
  student_count: number
  status: BookingStatus
  amount: number
}

interface Column {
  id: BookingStatus
  title: string
  color: string
}

const COLUMNS: Column[] = [
  { id: "pending",   title: "Pending",   color: "bg-yellow-100" },
  { id: "confirmed", title: "Confirmed", color: "bg-blue-100"   },
  { id: "paid",      title: "Paid",      color: "bg-green-100"  },
  { id: "completed", title: "Completed", color: "bg-gray-100"   },
]
```

---

### KanbanBoard — DndContext setup

```tsx
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent, DragOverEvent,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, closestCenter,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable"

function KanbanBoard() {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
      // distance: 8px — prevents accidental drags on click
      // alternative: delay: { distance: 5 } for touch
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // enables keyboard-driven reordering (Space to pick up, arrow keys, Space to drop)
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveBooking(bookings.find(b => b.id === active.id) ?? null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeBooking = bookings.find(b => b.id === active.id)
    const overIsColumn = COLUMNS.some(c => c.id === over.id)

    if (activeBooking && overIsColumn && activeBooking.status !== over.id) {
      // Moving over a column → update status immediately for live feedback
      setBookings(prev =>
        prev.map(b => b.id === active.id
          ? { ...b, status: over.id as BookingStatus }
          : b
        )
      )
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveBooking(null)
    if (!over) return

    const booking = bookings.find(b => b.id === active.id)
    if (booking && booking.status !== active.data.current?.sortable?.containerId) {
      // Persist status change to API
      await fetch(`/api/bookings/${booking.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: booking.status }),
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      // closestCorners: best for kanban (corner-to-corner matching)
      // closestCenter: best for sortable lists (center-to-center)
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            bookings={bookings.filter(b => b.status === column.id)}
          />
        ))}
      </div>

      {/* DragOverlay: rendered outside normal DOM flow (portal) */}
      {/* Shows a copy of dragged item at cursor — original stays in place */}
      <DragOverlay>
        {activeBooking && (
          <BookingCard booking={activeBooking} isDragOverlay />
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

---

### KanbanColumn — useDroppable

```tsx
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

function KanbanColumn({ column, bookings }: { column: Column; bookings: Booking[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,       // ← column id used as drop target identifier
    data: { type: "column", columnId: column.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        kanban-column w-72 min-h-48 rounded-lg p-3
        ${column.color}
        ${isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}
      `}
      // isOver: true when a draggable item is over this column
    >
      <h2 className="font-semibold mb-3">
        {column.title}
        <span className="ml-2 text-sm text-gray-500">({bookings.length})</span>
      </h2>

      <SortableContext
        items={bookings.map(b => b.id)}
        // items: array of IDs — must match useSortable id
        strategy={verticalListSortingStrategy}
        // strategy: how drop position is calculated
        // verticalListSortingStrategy: columns of cards (most common)
        // horizontalListSortingStrategy: rows of items
        // rectSortingStrategy: grids
      >
        <div className="flex flex-col gap-2">
          {bookings.map(booking => (
            <SortableBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
```

---

### SortableBookingCard — useSortable

```tsx
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

function SortableBookingCard({ booking }: { booking: Booking }) {
  const {
    attributes,       // aria-* + role="button" + tabIndex
    listeners,        // onPointerDown, onKeyDown etc.
    setNodeRef,       // ref for DOM element
    transform,        // position delta during drag
    transition,       // transition string during release
    isDragging,       // true while this item is being dragged
    over,             // the droppable this item is currently over
  } = useSortable({
    id: booking.id,
    data: { type: "booking", booking },
    // data: available in event.active.data.current in DndContext handlers
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // CSS.Transform.toString: converts {x,y,scaleX,scaleY} to CSS string
    transition,
    opacity: isDragging ? 0.4 : 1,
    // Make original semi-transparent while DragOverlay shows at cursor
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}   // spread ARIA attributes
      {...listeners}    // spread event listeners (enables drag)
      className={`booking-card bg-white rounded-lg p-3 shadow-sm cursor-grab
        ${isDragging ? "cursor-grabbing shadow-none" : ""}`}
    >
      <p className="font-medium">{booking.school_name}</p>
      <p className="text-sm text-gray-500">{booking.trip_date}</p>
      <p className="text-sm">{booking.student_count} students</p>
    </div>
  )
}
```

---

### BookingCard for DragOverlay

```tsx
// Separate component without useSortable — used ONLY in DragOverlay
// DragOverlay needs a clean component without drag listeners/refs
function BookingCard({
  booking,
  isDragOverlay = false,
}: {
  booking: Booking
  isDragOverlay?: boolean
}) {
  return (
    <div className={`
      booking-card bg-white rounded-lg p-3 shadow-sm
      ${isDragOverlay ? "shadow-xl cursor-grabbing rotate-2 scale-105" : ""}
    `}>
      <p className="font-medium">{booking.school_name}</p>
      <p className="text-sm text-gray-500">{booking.trip_date}</p>
      <p className="text-sm">{booking.student_count} students</p>
    </div>
  )
}
```

**Why DragOverlay?**
- Without it: the dragged element moves in the DOM → layout shifts in source column
- With it: original stays in place (semi-transparent), a floating copy follows the cursor
- The floating copy is portal-rendered outside any `overflow:hidden` parent

---

### Keyboard accessibility

```tsx
// useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
// enables full keyboard control automatically:
//
// Tab        → focus a sortable item
// Space      → pick up item (start drag)
// Arrow keys → move to new position
// Space/Enter→ drop at current position
// Escape     → cancel drag, return to original position
//
// The {...attributes} spread adds:
//   role="button"
//   tabIndex={0}
//   aria-roledescription="sortable"
//   aria-describedby  → points to hidden instructions element
//   aria-pressed (while dragging)
//
// Announce drag events to screen readers:
// <DndContext announcements={{
//   onDragStart: ({ active }) => `Picked up booking ${active.id}`,
//   onDragOver:  ({ active, over }) => over
//     ? `Booking ${active.id} is over ${over.id}`
//     : `Booking ${active.id} is no longer over a drop zone`,
//   onDragEnd:   ({ active, over }) => over
//     ? `Booking ${active.id} was dropped into ${over.id}`
//     : `Booking ${active.id} was dropped back to its original position`,
//   onDragCancel: ({ active }) => `Drag cancelled for booking ${active.id}`,
// }}>
```

---

## Problem 02 — Multi-Container Sorting & Constraints (Hard)

Sorting within + between containers, business rule constraints, drag handles, undo, and mobile support.

---

### Multi-container sorting (reorder within AND between columns)

```tsx
// Key: track both the ITEM being dragged and the CONTAINER it's over
// In handleDragOver: detect if we moved to a different container

function KanbanBoard() {
  // bookingsByStatus: Record<BookingStatus, Booking[]>
  // This preserves ORDER within each column (not just filtering)
  const [bookingsByStatus, setBookingsByStatus] = useState<Record<BookingStatus, Booking[]>>({
    pending:   [],
    confirmed: [],
    paid:      [],
    completed: [],
  })

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeContainer = findContainer(active.id)  // which column is item in?
    const overContainer   = findContainer(over.id)    // which column is over target in?
    // findContainer: searches bookingsByStatus to find which status key holds the id

    if (!activeContainer || !overContainer) return
    if (activeContainer === overContainer) return  // same column → let SortableContext handle

    // Different column: move item from one column to the other
    setBookingsByStatus(prev => {
      const activeItems = prev[activeContainer]
      const overItems   = prev[overContainer]
      const activeIndex = activeItems.findIndex(b => b.id === active.id)
      const overIndex   = overItems.findIndex(b => b.id === over.id)

      // Insert at correct position in target column
      const newOverItems = [...overItems]
      const [moved] = activeItems.splice(activeIndex, 1)
      newOverItems.splice(overIndex >= 0 ? overIndex : overItems.length, 0, {
        ...moved,
        status: overContainer,
      })

      return {
        ...prev,
        [activeContainer]: activeItems.filter(b => b.id !== active.id),
        [overContainer]:   newOverItems,
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer   = findContainer(over.id)

    if (activeContainer && overContainer && activeContainer === overContainer) {
      // Same column: reorder only
      setBookingsByStatus(prev => {
        const items = prev[activeContainer]
        const oldIndex = items.findIndex(b => b.id === active.id)
        const newIndex = items.findIndex(b => b.id === over.id)
        return { ...prev, [activeContainer]: arrayMove(items, oldIndex, newIndex) }
        // arrayMove: from @dnd-kit/sortable — immutably moves item from old to new index
      })
    }

    setActiveBooking(null)
  }
}
```

---

### Business rule constraints

```tsx
// Rule: cannot drag "completed" bookings back to "pending"
// Implement in: onDragOver + visual feedback

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:   ["confirmed"],
  confirmed: ["pending", "paid"],
  paid:      ["confirmed", "completed"],
  completed: [],  // ← terminal state, no moves allowed
}

function canMove(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

// In handleDragOver:
const activeStatus = findContainer(active.id)
const targetStatus = findContainer(over.id) ?? over.id as BookingStatus
if (activeStatus && !canMove(activeStatus, targetStatus)) return

// Visual feedback on invalid drop zones:
function KanbanColumn({ column, activeBookingStatus }: {
  column: Column
  activeBookingStatus: BookingStatus | null
}) {
  const isRestricted = activeBookingStatus !== null
    && !canMove(activeBookingStatus, column.id)

  return (
    <div className={`kanban-column ${isRestricted ? "opacity-40 cursor-not-allowed" : ""}`}>
      {isRestricted && (
        <div className="text-red-400 text-xs text-center mb-2">Not allowed</div>
      )}
      {/* ... */}
    </div>
  )
}
```

---

### Drag handle (grip icon only)

```tsx
import { useSortable } from "@dnd-kit/sortable"

function SortableBookingCard({ booking }: { booking: Booking }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: booking.id })
  // setActivatorNodeRef: attach to the HANDLE element (not the whole card)

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      {/* Handle: only this element starts drag */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}             // ← listeners go on the HANDLE, not the card
        className="cursor-grab p-1 touch-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      {/* Rest of card — NOT draggable on its own */}
      <div {...attributes}>       {/* ← ARIA attributes go on card root */}
        <p>{booking.school_name}</p>
      </div>
    </div>
  )
}
```

**Key distinction:** `listeners` (drag events) go on the handle. `attributes` (ARIA) go on the card root.
Without `setActivatorNodeRef`, the entire card starts the drag on any click.

---

### Undo last drag

```tsx
// Store history as a stack of snapshots
function KanbanBoard() {
  const [bookingsByStatus, setBookingsByStatus] = useState<Record<BookingStatus, Booking[]>>({...})
  const historyRef = useRef<Array<Record<BookingStatus, Booking[]>>>([])
  // useRef not useState: history doesn't need to trigger re-renders

  const snapshotBeforeDrag = useRef<Record<BookingStatus, Booking[]> | null>(null)

  const handleDragStart = () => {
    // Snapshot state BEFORE drag begins
    snapshotBeforeDrag.current = JSON.parse(JSON.stringify(bookingsByStatus))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (snapshotBeforeDrag.current) {
      historyRef.current.push(snapshotBeforeDrag.current)
      if (historyRef.current.length > 10) historyRef.current.shift()  // cap at 10
    }
    snapshotBeforeDrag.current = null
    // ... rest of drag end logic
  }

  const undo = useCallback(() => {
    const previous = historyRef.current.pop()
    if (previous) setBookingsByStatus(previous)
  }, [])

  // Keyboard shortcut:
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [undo])

  return (
    <>
      <button onClick={undo} disabled={historyRef.current.length === 0}>
        Undo (⌘Z)
      </button>
      {/* DndContext... */}
    </>
  )
}
```

---

### Animation on drop with Framer Motion

```tsx
import { motion, AnimatePresence } from "framer-motion"

// Wrap SortableBookingCard in motion.div for layout animations
function SortableBookingCard({ booking }: { booking: Booking }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } =
    useSortable({ id: booking.id })

  return (
    // motion.div handles layout animations, useSortable handles DnD
    <motion.div
      ref={setNodeRef}
      layout                          // ← smoothly animates position changes
      layoutId={`booking-${booking.id}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      {...attributes}
      {...listeners}
    >
      <BookingCard booking={booking} />
    </motion.div>
  )
}

// Wrap column content in AnimatePresence for exit animations:
<AnimatePresence>
  {bookings.map(b => <SortableBookingCard key={b.id} booking={b} />)}
</AnimatePresence>
```

---

### Mobile touch support

```tsx
import { TouchSensor, MouseSensor } from "@dnd-kit/core"

// Separate MouseSensor + TouchSensor (instead of PointerSensor)
// for better mobile control:
const sensors = useSensors(
  useSensor(MouseSensor, {
    activationConstraint: { distance: 10 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,         // ← hold 250ms before drag starts (prevents scroll interference)
      tolerance: 5,       // ← allow 5px movement during delay without cancelling
    },
  })
)

// IMPORTANT: prevent default touch events on drag handles to avoid scroll conflict:
// <div onTouchStart={e => e.preventDefault()} className="drag-handle touch-none">
// Or via CSS: touch-action: none (Tailwind: touch-none)
// Apply to the element with drag listeners, not the whole card

// Modifier: keep overlay within window bounds on mobile:
import { restrictToWindowEdges } from "@dnd-kit/modifiers"
<DndContext modifiers={[restrictToWindowEdges]}>
```

---

### Collision detection strategies

```tsx
// closestCenter: distance from draggable center to droppable center
//   Best for: flat sortable lists, grids
//   Problem: in kanban, drags to column edge might not register

// closestCorners: distance from draggable corners to droppable corners
//   Best for: kanban boards (columns are large areas)
//   More forgiving for partially-overlapping items

// rectIntersection: area of overlap (default)
//   Best for: when items must substantially overlap before registering

// Custom collision detection for kanban + sort within:
import { pointerWithin, rectIntersection, getFirstCollision } from "@dnd-kit/core"

function customCollisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  // 1. Try pointer-within for column detection
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions

  // 2. Fall back to rect intersection for items
  return rectIntersection(args)
}

<DndContext collisionDetection={customCollisionDetection}>
```

---

### Key concepts summary

| Concept | Rule |
|---|---|
| `DndContext` | Single root — wrap entire drag context |
| `useDroppable` | Make a container accept drops (`setNodeRef`, `isOver`) |
| `useDraggable` | Low-level dragging (`attributes`, `listeners`, `setNodeRef`, `transform`) |
| `useSortable` | = useDraggable + useDroppable combined — use for sortable items |
| `SortableContext` | Provides sorting strategy to `useSortable` children |
| `DragOverlay` | Floating copy at cursor — portal-rendered, original stays in place |
| `arrayMove` | Immutable reorder: `arrayMove(items, oldIndex, newIndex)` |
| `setActivatorNodeRef` | Attach drag listeners to a handle element only |
| `closestCorners` | Best collision detection for kanban boards |
| `PointerSensor` distance | Prevent accidental drags: `activationConstraint: { distance: 8 }` |
| `TouchSensor` delay | Prevent scroll conflict: `activationConstraint: { delay: 250 }` |
| `touch-none` | CSS `touch-action: none` on drag handle — required for touch drag |
| `announcements` | Screen reader messages for drag events |
| `isDragging` opacity | Make original semi-transparent while overlay shows at cursor |
