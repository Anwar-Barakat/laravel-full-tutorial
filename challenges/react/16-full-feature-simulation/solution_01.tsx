// ============================================================
// Problem 01 — Destination Browser (Full Build)
// ============================================================



// ============================================================
// types/destination.ts
// ============================================================

interface Destination {
  id:                number
  name:              string
  city:              string
  country:           string
  image_url:         string
  price_per_student: number
  available_spots:   number
  total_spots:       number
  description:       string
  tags:              string[]
  rating:            number
  duration_days:     number
}

interface DestinationFilters {
  search: string
  city:   string
}

interface UseDestinationsReturn {
  destinations:         Destination[]
  filteredDestinations: Destination[]
  filters:              DestinationFilters
  setSearch:            (search: string) => void
  setCity:              (city: string) => void
  cities:               string[]
  isLoading:            boolean
  error:                string | null
  retry:                () => void
}



// ============================================================
// hooks/useDestinations.ts  [Min 2–7]
// ============================================================

import { useState, useEffect, useMemo } from "react"

export function useDestinations(): UseDestinationsReturn {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [filters,      setFilters]      = useState<DestinationFilters>({ search: "", city: "" })
  const [retryCount,   setRetryCount]   = useState(0)

  // Re-runs whenever retryCount increments — that's the retry mechanism
  useEffect(() => {
    setIsLoading(true)
    setError(null)

    fetch("/api/destinations")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Destination[]) => setDestinations(data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [retryCount])

  // Derived: unique sorted cities — recomputes only when destinations change
  const cities = useMemo(
    () => [...new Set(destinations.map((d) => d.city))].sort(),
    [destinations]
  )

  // Derived: filtered list — recomputes only when data or filters change
  const filteredDestinations = useMemo(() => {
    const search = filters.search.toLowerCase()
    return destinations.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(search) ||
        d.city.toLowerCase().includes(search)
      const matchesCity = !filters.city || d.city === filters.city
      return matchesSearch && matchesCity
    })
  }, [destinations, filters])

  return {
    destinations,
    filteredDestinations,
    filters,
    setSearch: (search) => setFilters((prev) => ({ ...prev, search })),
    setCity:   (city)   => setFilters((prev) => ({ ...prev, city })),
    cities,
    isLoading,
    error,
    retry: () => setRetryCount((prev) => prev + 1),
  }
}



// ============================================================
// components/DestinationCard.tsx  [Min 7–12]
// ============================================================

interface DestinationCardProps {
  destination: Destination
  onClick:     (d: Destination) => void
}

export function DestinationCard({ destination, onClick }: DestinationCardProps) {
  const spotsLow = destination.available_spots < 10

  return (
    <div
      onClick={() => onClick(destination)}
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer
                 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      {/* Image with availability badge */}
      <div className="relative">
        <img
          src={destination.image_url}
          alt={destination.name}
          className="w-full h-48 object-cover"
        />
        <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${
          spotsLow
            ? "bg-red-100 text-red-700"
            : "bg-green-100 text-green-700"
        }`}>
          {destination.available_spots} spots left
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-gray-900">{destination.name}</h3>
          <StarRating rating={destination.rating} />
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {destination.city}, {destination.country}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {destination.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-blue-600 font-bold">£{destination.price_per_student}/student</span>
          <span className="text-xs text-gray-400">{destination.duration_days} days</span>
        </div>
      </div>
    </div>
  )
}



// ============================================================
// components/DestinationBrowser.tsx  [Min 12–20]
// ============================================================

export function DestinationBrowser(): JSX.Element {
  const {
    filteredDestinations,
    filters,
    setSearch,
    setCity,
    cities,
    isLoading,
    error,
    retry,
  } = useDestinations()

  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Destination Browser</h1>
      <p className="text-gray-500 mb-8">Find the perfect trip for your students</p>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          placeholder="Search destinations…"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <select
          value={filters.city}
          onChange={(e) => setCity(e.target.value)}
          className="border rounded-lg px-4 py-2 bg-white"
        >
          <option value="">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="text-center py-16">
          <p className="text-red-600 mb-4">Failed to load destinations: {error}</p>
          <button
            onClick={retry}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Showing {filteredDestinations.length} destination{filteredDestinations.length !== 1 ? "s" : ""}
          </p>

          {/* Empty state */}
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-gray-500">No destinations match your filters.</p>
              <button
                onClick={() => { setSearch(""); setCity("") }}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDestinations.map((d) => (
                <DestinationCard
                  key={d.id}
                  destination={d}
                  onClick={setSelectedDestination}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedDestination && (
        <DestinationModal
          destination={selectedDestination}
          onClose={() => setSelectedDestination(null)}
        />
      )}
    </div>
  )
}



// ============================================================
// components/DestinationModal.tsx  [Min 20–23]
// ============================================================

interface DestinationModalProps {
  destination: Destination
  onClose:     () => void
}

export function DestinationModal({ destination, onClose }: DestinationModalProps) {
  // Escape key + scroll lock — both cleaned up on unmount
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const fullyBooked = destination.available_spots === 0

  return (
    // Backdrop — close only when clicking backdrop itself, not the panel
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Panel */}
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Hero image */}
        <div className="relative">
          <img
            src={destination.image_url}
            alt={destination.name}
            className="w-full h-64 object-cover rounded-t-2xl"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 bg-white/80 rounded-full p-2 hover:bg-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1">{destination.name}</h2>
          <p className="text-gray-500 mb-4">{destination.city}, {destination.country}</p>
          <p className="text-gray-700 mb-6">{destination.description}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xl font-bold text-blue-600">£{destination.price_per_student}</p>
              <p className="text-xs text-gray-500">per student</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xl font-bold text-green-600">{destination.available_spots}</p>
              <p className="text-xs text-gray-500">spots left</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xl font-bold text-purple-600">{destination.duration_days}</p>
              <p className="text-xs text-gray-500">days</p>
            </div>
          </div>

          <button
            disabled={fullyBooked}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fullyBooked ? "Fully Booked" : "Book This Trip"}
          </button>
        </div>
      </div>
    </div>
  )
}


/*
================================================================
TIPS
================================================================

DERIVED STATE WITH useMemo
--------------------------
• cities = useMemo over [...new Set(...)].sort() — computed once per destinations change
• filteredDestinations = useMemo over [destinations, filters] — recomputes only when data or filters change
• Never derive inside render without memoisation — runs on every re-render

RETRY PATTERN
-------------
• retryCount in useEffect deps — incrementing it triggers a fresh fetch
• setRetryCount(prev => prev + 1) — the value doesn't matter, just that it changes
• setError(null) at start of each fetch — clears previous error before new attempt

SCROLL LOCK
-----------
• document.body.style.overflow = "hidden" in modal open; restore in cleanup
• Cleanup runs both on unmount and when onClose identity changes
• Without cleanup: body stays locked if user navigates while modal is open

MODAL BACKDROP CLOSE
--------------------
• e.target === e.currentTarget — only closes when clicking the backdrop itself
• Without this check: clicks inside the panel bubble up and close the modal
• Escape key listener added in same useEffect with same cleanup pattern

SKELETON LOADING
----------------
• Array.from({ length: 6 }) — creates iterable without actual values
• animate-pulse on the skeleton container — Tailwind handles the pulsing animation
• Match skeleton height/layout to real card to prevent layout shift on load

AVAILABILITY BADGE
------------------
• spots < 10 → red badge — urgency cue for the user
• tags.slice(0, 3) — cap at 3 tags to keep card compact
• disabled + "Fully Booked" text — no click needed, state is obvious

================================================================
*/
