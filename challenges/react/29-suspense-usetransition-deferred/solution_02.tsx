// ============================================================
// Problem 02 — Advanced Concurrent Features
// ============================================================



// ============================================================
// useOptimistic — instant UI feedback (React 19)
//
// const [optimisticBooking, addOptimisticUpdate] = useOptimistic(
//   booking,   ← server state (source of truth)
//   (current, newStatus: Booking["status"]) => ({ ...current, status: newStatus })
//   ← reducer: how to merge optimistic value into current state
// )
//
// updateStatus(newStatus):
//   startTransition(async () => {
//     addOptimisticUpdate(newStatus)   ← instantly updates optimisticBooking in UI
//     await fetch(`/api/bookings/${id}/status`, { method:"PATCH", body:{status} })
//     ← if throws: optimistic state AUTOMATICALLY REVERTS to original booking
//     ← if succeeds: stays at optimistic value until real state update arrives
//   })
//
// Render: use optimisticBooking (not booking) for display
// Dim while isPending: className={isPending ? "opacity-75" : ""}
// Disable select while isPending: disabled={isPending}
// ============================================================



// ============================================================
// Nested Suspense boundaries (progressive streaming)
//
// function BookingDetailPage({ bookingId }):
//   bookingResource = useBookingResource({ id: String(bookingId) })
//
//   <Suspense fallback={<PageSkeleton />}>            ← outer: whole page
//     <BookingDetail resource={bookingResource}>
//
//       <Suspense fallback={<CommentsSkeleton />}>    ← inner: comments independent
//         <CommentsSection bookingId={bookingId} />
//       </Suspense>
//
//       <Suspense fallback={<AttachmentsSkeleton />}> ← inner: attachments independent
//         <AttachmentsList bookingId={bookingId} />
//       </Suspense>
//
//     </BookingDetail>
//   </Suspense>
//
// Why nest: booking detail (critical) shows first
// Comments/attachments load in background without blocking the main content
// Each boundary is independently resolvable
// ============================================================



// ============================================================
// Transition-based navigation
//
// function NavigationLink({ to, children }):
//   const [isPending, startTransition] = useTransition()
//
//   handleClick(e):
//     e.preventDefault()
//     startTransition(() => {
//       navigate(to)   ← current page stays visible while new page loads
//     })
//
//   <a href={to} onClick={handleClick} aria-disabled={isPending}>
//     {children}
//     {isPending && <span className="animate-pulse" />}  ← subtle pending indicator
//   </a>
//
// Without transition: React unmounts current page → suspense fallback flashes
// With transition: current page stays while new page's Suspense resolves
// ============================================================



// ============================================================
// use() hook — React 19 (replaces createResource pattern)
//
// import { use } from "react"
//
// function BookingDetail({ bookingPromise: Promise<Booking> }):
//   const booking = use(bookingPromise)   ← suspends until resolved, no .read() needed
//   return <div>{booking.school_name}</div>
//
// Parent:
//   State: bookingPromise: Promise<Booking> | null = null
//
//   handleSelect(id):
//     setBookingPromise(fetch(`/api/bookings/${id}`).then(r => r.json()))
//     ← create promise in handler, NOT in render
//
//   {bookingPromise && (
//     <Suspense fallback={<DetailSkeleton />}>
//       <BookingDetail bookingPromise={bookingPromise} />
//     </Suspense>
//   )}
//
// createResource vs use():
//   createResource (React 18): manual status tracking, works today
//   use(promise)  (React 19): built-in, same mechanic, cleaner API
// ============================================================



// ============================================================
// startTransition — standalone import (no isPending needed)
//
// import { startTransition } from "react"
//
// function handleFilterChange(filter):
//   startTransition(() => {
//     setActiveFilter(filter)
//   })
//
// Use when you don't need the isPending flag for UI feedback
// Same interruptible semantics as useTransition's startTransition
// ============================================================



// ============================================================
// Key concepts
//
// Suspense mechanism:
//   pending  → component throws Promise → Suspense shows fallback
//   resolved → component returns value  → normal render
//   rejected → component throws Error   → ErrorBoundary catches
//
// useTransition — when to use:
//   tab/page navigation, search with re-suspension, heavy state updates
//   DO NOT use for: input values, drag, scroll (must be instant)
//
// useDeferredValue — when to use:
//   receive value as prop (can't wrap in startTransition)
//   deferring expensive useMemo computation
//   isStale = value !== deferredValue → show opacity hint
//
// SuspenseList:
//   "forwards" + "collapsed" → feed/list (sequential reveal)
//   "together"               → dashboard (all-or-nothing reveal)
//
// useOptimistic revert:
//   async action throws → React auto-reverts to original state
//   async action succeeds → optimistic value persists until real update
//
// aria-busy="true" on Suspense container:
//   signals loading state to screen readers
//   pair with aria-label="Loading [content name]"
// ============================================================
