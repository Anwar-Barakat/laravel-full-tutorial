// ============================================================
// Problem 02 — Multi-Container Sorting & Constraints
// ============================================================



// ============================================================
// Multi-container sorting (reorder within AND between columns)
//
// State: bookingsByStatus: Record<BookingStatus, Booking[]>
//   ← preserves ORDER within each column (not just status filter)
//
// findContainer(id): search bookingsByStatus for which column holds id
//   Object.keys(bookingsByStatus).find(key => bookingsByStatus[key].some(b => b.id === id))
//
// handleDragOver — cross-column move:
//   activeContainer = findContainer(active.id)
//   overContainer   = findContainer(over.id) ?? over.id  (item or column itself)
//   if activeContainer === overContainer: return (same column, SortableContext handles)
//   Move item: splice from activeContainer, insert at correct index in overContainer
//   Update item.status = overContainer
//
// handleDragEnd — same-column reorder:
//   if activeContainer === overContainer:
//     arrayMove(items, oldIndex, newIndex)
//
// Why track by status map not flat array:
//   Flat array: filter by status for each column, lose order information
//   Status map: explicit order per column, arrayMove works correctly
// ============================================================



// ============================================================
// Business rule constraints
//
// ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
//   pending:   ["confirmed"],
//   confirmed: ["pending", "paid"],
//   paid:      ["confirmed", "completed"],
//   completed: [],   ← terminal state, no moves allowed
// }
//
// canMove(from, to): boolean
//   return ALLOWED_TRANSITIONS[from].includes(to)
//
// Enforce in handleDragOver:
//   if (!canMove(activeStatus, targetStatus)) return
//   ← prevents state update = no live feedback in restricted column
//
// Visual feedback on invalid columns:
//   Pass activeBookingStatus to each column
//   isRestricted = activeBookingStatus && !canMove(activeBookingStatus, column.id)
//   dim column: className={isRestricted ? "opacity-40" : ""}
//   show tooltip: {isRestricted && <span>Not allowed</span>}
// ============================================================



// ============================================================
// Drag handle — setActivatorNodeRef
//
// const { attributes, listeners, setNodeRef, setActivatorNodeRef, ... } =
//   useSortable({ id: booking.id })
//
// WRONG (whole card drags on any click):
//   <div ref={setNodeRef} {...attributes} {...listeners}>
//
// CORRECT (only handle starts drag):
//   <div ref={setNodeRef} {...attributes}>          ← ARIA on card root
//     <button
//       ref={setActivatorNodeRef}                   ← drag starts from here
//       {...listeners}                              ← events on handle
//       className="cursor-grab touch-none"
//       aria-label="Drag to reorder"
//     >
//       ⠿ (grip icon)
//     </button>
//     <p>{booking.school_name}</p>                  ← rest of card NOT draggable
//   </div>
//
// touch-none (touch-action: none) on handle: required for touch drag
//   Without it: browser handles touch as scroll, drag never starts
// ============================================================



// ============================================================
// Undo last drag
//
// historyRef = useRef<Array<Record<BookingStatus, Booking[]>>>([])
//   ← useRef not useState: history doesn't trigger re-renders
//
// snapshotBeforeDrag = useRef(null)
//
// handleDragStart:
//   snapshotBeforeDrag.current = JSON.parse(JSON.stringify(bookingsByStatus))
//   ← deep clone entire state before any changes
//
// handleDragEnd:
//   historyRef.current.push(snapshotBeforeDrag.current)
//   if historyRef.current.length > 10: historyRef.current.shift()  ← cap history
//   snapshotBeforeDrag.current = null
//
// undo():
//   const previous = historyRef.current.pop()
//   if previous: setBookingsByStatus(previous)
//
// Keyboard shortcut:
//   window.addEventListener("keydown", e => {
//     if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo() }
//   })
//   ← useEffect cleanup removes listener on unmount
// ============================================================



// ============================================================
// Animation on drop with Framer Motion
//
// Combine useSortable + motion.div:
//   motion.div handles CSS animations
//   useSortable handles DnD transform/transition
//
// <motion.div
//   ref={setNodeRef}
//   layout                                    ← smooth reposition on list changes
//   layoutId={`booking-${booking.id}`}        ← shared layout across columns
//   style={{
//     transform: CSS.Transform.toString(transform),
//     transition,                             ← dnd-kit release transition
//     zIndex: isDragging ? 10 : undefined,
//   }}
//   initial={{ opacity:0, scale:0.9 }}
//   animate={{ opacity: isDragging ? 0.4 : 1, scale:1 }}
//   exit={{ opacity:0, scale:0.9, transition:{ duration:0.15 } }}
//   {...attributes} {...listeners}
// >
//
// Wrap column items in AnimatePresence for exit animations:
//   <AnimatePresence>{bookings.map(b => <SortableBookingCard key={b.id} .../>)}</AnimatePresence>
//
// Note: don't use Framer layout alongside dnd-kit transform on the same property
//   dnd-kit controls transform during drag, Framer controls layout after drop
//   They compose safely because dnd-kit uses inline style, Framer uses layout
// ============================================================



// ============================================================
// Mobile touch support
//
// Replace PointerSensor with separate Mouse + Touch sensors:
//
// useSensor(MouseSensor, { activationConstraint: { distance:10 } })
// useSensor(TouchSensor, {
//   activationConstraint: {
//     delay: 250,       ← hold 250ms before drag starts
//     tolerance: 5,     ← allow 5px movement during delay
//   }
// })
// delay prevents scroll interference: brief tap = scroll, hold = drag
//
// touch-none on drag handle (CSS touch-action: none):
//   Required: browser must not handle touch as scroll
//   Tailwind: className="touch-none"
//   Or inline: style={{ touchAction: "none" }}
//
// restrictToWindowEdges modifier:
//   import { restrictToWindowEdges } from "@dnd-kit/modifiers"
//   <DndContext modifiers={[restrictToWindowEdges]}>
//   ← prevents overlay from going off-screen on mobile
// ============================================================



// ============================================================
// Collision detection — custom strategy
//
// For kanban with sortable items inside columns, combine strategies:
//
// customCollisionDetection(args):
//   1. Try pointerWithin first (most precise on columns)
//   2. Fall back to rectIntersection for items
//
// import { pointerWithin, rectIntersection } from "@dnd-kit/core"
//
// function customCollisionDetection(args) {
//   const pointerCollisions = pointerWithin(args)
//   if (pointerCollisions.length > 0) return pointerCollisions
//   return rectIntersection(args)
// }
//
// <DndContext collisionDetection={customCollisionDetection}>
// ============================================================



// ============================================================
// Key concepts
//
// useSortable vs useDraggable + useDroppable:
//   useSortable = both combined + SortableContext integration
//   Use useSortable for ALL sortable items
//   Use useDraggable alone only for non-sortable drag sources (e.g. palette)
//   Use useDroppable alone for columns/zones that don't sort themselves
//
// data prop on useSortable/useDroppable:
//   data: { type:"booking", booking }
//   Access in handlers: event.active.data.current?.type
//   Distinguish between dragging a booking vs a column header
//
// arrayMove (key function):
//   import { arrayMove } from "@dnd-kit/sortable"
//   arrayMove([a,b,c,d], 0, 2) → [b,c,a,d]
//   Immutable — returns new array
//   Use ONLY for same-container reorder in handleDragEnd
//   Cross-container: splice + insert manually
//
// isDragging opacity pattern:
//   Original: opacity 0.4 (ghost — still occupies space)
//   DragOverlay: full opacity, follows cursor
//   Never hide original entirely — layout must remain to show drop position
// ============================================================
