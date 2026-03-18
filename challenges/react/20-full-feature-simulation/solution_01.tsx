// ============================================================
// Problem 01 — Destination Browser (Full Build)
// ============================================================



// ============================================================
// types/destination.ts
//
// interface Destination:
//   id, name, city, country, image_url, price_per_student,
//   available_spots, total_spots, description, tags: string[],
//   rating (1-5), duration_days
//
// interface DestinationFilters: { search: string; city: string }
//
// interface UseDestinationsReturn:
//   destinations, filteredDestinations, filters,
//   setSearch, setCity, cities: string[], isLoading, error, retry
// ============================================================



// ============================================================
// hooks/useDestinations.ts  [Min 2–7]
//
// State: destinations=[], isLoading=true, error=null
// State: filters={ search:"", city:"" }, retryCount=0
//
// Fetch useEffect([retryCount]):
//   setIsLoading(true); setError(null)
//   fetch("/api/destinations")
//     .then(r => { if !r.ok throw new Error(`HTTP ${r.status}`); return r.json() })
//     .then(setDestinations)
//     .catch(err => setError(err.message))
//     .finally(() => setIsLoading(false))
//
// cities = useMemo(() => [...new Set(destinations.map(d => d.city))].sort(), [destinations])
//
// filteredDestinations = useMemo(() => destinations.filter(d => {
//   matchesSearch = d.name.toLowerCase().includes(search) || d.city.toLowerCase().includes(search)
//   matchesCity   = !city || d.city === city
//   return matchesSearch && matchesCity
// }), [destinations, filters])
//
// setSearch = (search) => setFilters(prev => ({ ...prev, search }))
// setCity   = (city)   => setFilters(prev => ({ ...prev, city }))
// retry     = ()       => setRetryCount(prev => prev + 1)
// ============================================================



// ============================================================
// components/DestinationCard.tsx  [Min 7–12]
//
// Props: { destination: Destination; onClick: (d: Destination) => void }
//
// Outer div: hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer
//
// Image section:
//   <img> h-48 object-cover
//   availability badge (top-right): red if spots < 10, green otherwise
//
// Content section:
//   name + StarRating (rating)
//   city, country subtitle
//   tags.slice(0,3) → blue pill badges
//   price (£X/student) + duration_days (X days)
// ============================================================



// ============================================================
// components/DestinationBrowser.tsx  [Min 12–20]
//
// State: selectedDestination: Destination | null = null
// Hook: useDestinations()
//
// Render structure:
//   Header — title + subtitle
//
//   Filter bar (flex-col sm:flex-row gap-4):
//     <input type="search"> → setSearch(e.target.value)
//     <select> All cities + cities.map(option) → setCity(e.target.value)
//
//   Loading skeleton (isLoading):
//     grid 1/2/3 cols, 6 cards with animate-pulse
//     h-48 image placeholder + 3 text line placeholders
//
//   Error state (!isLoading && error):
//     red message + "Try again" button → retry()
//
//   Results (!isLoading && !error):
//     count label "Showing N destination(s)"
//     Empty state (filteredDestinations.length === 0):
//       🔍 icon + "No destinations match" + "Clear filters" button
//         → setSearch("") + setCity("")
//     Grid: filteredDestinations.map(<DestinationCard onClick={setSelectedDestination} />)
//
//   {selectedDestination && <DestinationModal ... onClose={() => setSelectedDestination(null)} />}
// ============================================================



// ============================================================
// components/DestinationModal.tsx  [Min 20–23]
//
// Props: { destination: Destination; onClose: () => void }
//
// Escape key useEffect:
//   document.addEventListener("keydown", e => e.key === "Escape" && onClose())
//   cleanup: removeEventListener
//
// Scroll lock useEffect:
//   document.body.style.overflow = "hidden"
//   cleanup: document.body.style.overflow = ""
//
// Backdrop: onClick → close if e.target === e.currentTarget
//
// Panel content:
//   Hero image (h-64 object-cover rounded-t-2xl) + close ✕ button (absolute top-right)
//   name, city/country, description
//   Stats grid (3 cols): price / available_spots / duration_days
//   "Book This Trip" button — disabled + "Fully Booked" if available_spots === 0
// ============================================================
