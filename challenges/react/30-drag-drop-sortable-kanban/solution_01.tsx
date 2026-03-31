// ============================================================
// Problem 01 — Booking Kanban Board
// ============================================================



// ============================================================
// Package roles
//
// @dnd-kit/core     → DndContext, useDroppable, useDraggable, DragOverlay, sensors
// @dnd-kit/sortable → SortableContext, useSortable, arrayMove
// @dnd-kit/utilities→ CSS.Transform.toString
// @dnd-kit/modifiers→ restrictToWindowEdges, restrictToParentElement
// ============================================================



// ============================================================
// Sensors — how drag is initiated
//
// useSensors(
//   useSensor(PointerSensor, {
//     activationConstraint: { distance: 8 }
//     ← must move 8px before drag starts (prevents accidental drag on click)
//   }),
//   useSensor(KeyboardSensor, {
//     coordinateGetter: sortableKeyboardCoordinates
//     ← enables Space to pick up, arrows to move, Space/Enter to drop, Escape to cancel
//   })
// )
//
// Pass sensors to <DndContext sensors={sensors}>
// ============================================================



// ============================================================
// DndContext — root drag context
//
// <DndContext
//   sensors={sensors}
//   collisionDetection={closestCorners}   ← best for kanban (large column areas)
//   onDragStart={handleDragStart}         ← set activeBooking for DragOverlay
//   onDragOver={handleDragOver}           ← update status on column hover (live feedback)
//   onDragEnd={handleDragEnd}             ← persist change to API, clear activeBooking
// >
//
// collisionDetection options:
//   closestCorners  → kanban boards (corners of drag vs corners of drop)
//   closestCenter   → sortable lists (center-to-center)
//   rectIntersection→ overlap area (default)
// ============================================================



// ============================================================
// handleDragStart / handleDragOver / handleDragEnd
//
// handleDragStart: ({ active }) =>
//   setActiveBooking(bookings.find(b => b.id === active.id))
//   ← snapshot for DragOverlay
//
// handleDragOver: ({ active, over }) =>
//   if !over: return
//   overIsColumn = COLUMNS.some(c => c.id === over.id)
//   if overIsColumn && booking.status !== over.id:
//     setBookings(prev => prev.map(b =>
//       b.id === active.id ? { ...b, status: over.id } : b
//     ))
//   ← update status immediately for live column feedback
//
// handleDragEnd: ({ active, over }) =>
//   setActiveBooking(null)
//   if !over: return
//   await fetch PATCH /api/bookings/{id}/status
//   ← persist final status to server
// ============================================================



// ============================================================
// KanbanColumn — useDroppable
//
// const { setNodeRef, isOver } = useDroppable({
//   id: column.id,                          ← column's BookingStatus as id
//   data: { type:"column", columnId:column.id }
// })
//
// <div ref={setNodeRef}
//      className={isOver ? "ring-2 ring-blue-400" : ""}>
//   ← isOver: true when draggable is hovering over this column
//
// Inside: <SortableContext
//   items={bookings.map(b => b.id)}
//   strategy={verticalListSortingStrategy}
// >
// strategies: verticalListSortingStrategy | horizontalListSortingStrategy | rectSortingStrategy
// ============================================================



// ============================================================
// SortableBookingCard — useSortable
//
// const {
//   attributes,    ← aria-* role tabIndex (spread on root element)
//   listeners,     ← onPointerDown onKeyDown (spread on element OR handle)
//   setNodeRef,    ← ref for DOM element
//   transform,     ← position delta {x,y,scaleX,scaleY} during drag
//   transition,    ← CSS transition string for release animation
//   isDragging,    ← true while THIS item is being dragged
// } = useSortable({ id: booking.id, data: { type:"booking", booking } })
//
// style = {
//   transform: CSS.Transform.toString(transform),
//   transition,
//   opacity: isDragging ? 0.4 : 1,   ← semi-transparent: overlay shows at cursor
// }
//
// <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
// ============================================================



// ============================================================
// DragOverlay — floating copy at cursor
//
// Rendered outside normal DOM flow (portal)
// Avoids layout shifts in source column
// Avoids overflow:hidden clipping
//
// <DragOverlay>
//   {activeBooking && (
//     <BookingCard booking={activeBooking} isDragOverlay />
//   )}
// </DragOverlay>
//
// BookingCard (for DragOverlay): plain component, no useSortable
// isDragOverlay styling: shadow-xl cursor-grabbing rotate-2 scale-105
//
// Why separate component: DragOverlay needs no drag listeners/refs
// ============================================================



// ============================================================
// Keyboard accessibility
//
// KeyboardSensor + sortableKeyboardCoordinates provides:
//   Tab    → focus sortable item
//   Space  → pick up / drop
//   Arrows → move to new position
//   Escape → cancel, return to origin
//
// {...attributes} spreads:
//   role="button", tabIndex=0
//   aria-roledescription="sortable"
//   aria-describedby → hidden instructions element
//
// Screen reader announcements:
// <DndContext announcements={{
//   onDragStart: ({ active }) => `Picked up ${active.id}`,
//   onDragOver:  ({ active, over }) => over
//     ? `Over ${over.id}`
//     : `No longer over a drop zone`,
//   onDragEnd:   ({ active, over }) => over
//     ? `Dropped into ${over.id}`
//     : `Returned to original position`,
//   onDragCancel: () => `Drag cancelled`,
// }}>
// ============================================================



// ============================================================
// Key concepts
//
// arrayMove (from @dnd-kit/sortable):
//   arrayMove(items, oldIndex, newIndex)
//   ← immutable reorder of array items
//   ← use in handleDragEnd when item dropped in same column
//
// active.data.current:
//   object passed as data: {...} to useSortable/useDraggable/useDroppable
//   access in DragEvent handlers: event.active.data.current?.type
//   use to distinguish "booking" vs "column" in over target
//
// collectionDetection placement:
//   closestCorners: drag corners measured against drop corners
//   Works well when columns are large areas containing items
//   Items inside column are also droppables → closestCorners handles overlap
// ============================================================
