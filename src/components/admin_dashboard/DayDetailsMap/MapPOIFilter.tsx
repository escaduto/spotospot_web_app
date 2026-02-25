"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import { fetchPOIsInBounds, placesToGeoJSON } from "@/src/supabase/places";
import { setPOILayerVisibility } from "@/src/map/scripts/poi-layers";

// -------------------------------------------------
// Filter group definitions
// -------------------------------------------------

interface SubCategory {
  key: string;
  label: string;
}

interface FilterGroup {
  key: string;
  categoryGroup: string | string[]; // maps to tile `category_group`
  label: string;
  emoji: string;
  color: string;
  subcategories: SubCategory[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "eat",
    categoryGroup: "food_and_drink",
    label: "Restaurants & Cafés",
    emoji: "🍽️",
    color: "#E74C3C",
    subcategories: [
      { key: "restaurant", label: "Restaurant" },
      { key: "cafe", label: "Café" },
      { key: "bakery", label: "Bakery" },
      { key: "bar", label: "Bar" },
      { key: "pub", label: "Pub" },
      { key: "fast_food_restaurant", label: "Fast Food" },
      { key: "ice_cream_shop", label: "Ice Cream" },
      { key: "dessert_shop", label: "Dessert" },
      { key: "tea_room", label: "Tea Room" },
      { key: "brewery", label: "Brewery" },
      { key: "winery", label: "Winery" },
      { key: "food_court", label: "Food Court" },
    ],
  },
  {
    key: "nature",
    categoryGroup: "parks_and_nature",
    label: "Parks & Nature",
    emoji: "🌿",
    color: "#27AE60",
    subcategories: [
      { key: "park", label: "Park" },
      { key: "national_park", label: "National Park" },
      { key: "beach", label: "Beach" },
      { key: "waterfall", label: "Waterfall" },
      { key: "hiking_trail", label: "Hiking Trail" },
      { key: "garden", label: "Garden" },
      { key: "nature_reserve", label: "Nature Reserve" },
      { key: "forest", label: "Forest" },
      { key: "lake", label: "Lake" },
      { key: "river", label: "River" },
      { key: "hot_spring", label: "Hot Spring" },
      { key: "cave", label: "Cave" },
      { key: "canyon", label: "Canyon" },
      { key: "dog_park", label: "Dog Park" },
    ],
  },
  {
    key: "shopping",
    categoryGroup: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    color: "#E91E63",
    subcategories: [
      { key: "shopping_mall", label: "Shopping Mall" },
      { key: "market", label: "Market" },
      { key: "farmers_market", label: "Farmers Market" },
      { key: "night_market", label: "Night Market" },
      { key: "clothing_store", label: "Clothing" },
      { key: "grocery_store", label: "Grocery" },
      { key: "supermarket", label: "Supermarket" },
      { key: "souvenir_shop", label: "Souvenirs" },
      { key: "gift_shop", label: "Gift Shop" },
      { key: "bookstore", label: "Bookstore" },
      { key: "antique_shop", label: "Antiques" },
    ],
  },
  {
    key: "sightseeing",
    categoryGroup: ["tourism_and_attractions", "arts_and_culture"],
    label: "Sightseeing",
    emoji: "🗺️",
    color: "#F39C12",
    subcategories: [
      { key: "tourist_attraction", label: "Attraction" },
      { key: "landmark", label: "Landmark" },
      { key: "monument", label: "Monument" },
      { key: "historic_site", label: "Historic Site" },
      { key: "castle", label: "Castle" },
      { key: "viewpoint", label: "Viewpoint" },
      { key: "observation_deck", label: "Observation Deck" },
      { key: "theme_park", label: "Theme Park" },
      { key: "zoo", label: "Zoo" },
      { key: "aquarium", label: "Aquarium" },
      { key: "museum", label: "Museum" },
      { key: "art_gallery", label: "Art Gallery" },
      { key: "theater", label: "Theater" },
      { key: "cinema", label: "Cinema" },
    ],
  },
];

// -------------------------------------------------
// Props
// -------------------------------------------------

interface MapPOIFilterProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  /** Called when the map moves/zooms while a filter is active (use to show a "Search here" button) */
  onBoundsChanged?: () => void;
  /** Assign this ref to imperatively trigger a re-fetch with the current bounds */
  refetchRef?: React.MutableRefObject<(() => void) | null>;
}

// -------------------------------------------------
// Component
// -------------------------------------------------

export default function MapPOIFilter({
  mapRef,
  mapLoaded,
  onBoundsChanged,
  refetchRef,
}: MapPOIFilterProps) {
  // Map from group key → set of active subcategory keys
  // An empty set means "all in this group"
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());
  const [activeSubcats, setActiveSubcats] = useState<Map<string, Set<string>>>(
    new Map(),
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Track whether a filter is currently applied so we can refetch on map move
  const activeFilterRef = useRef<{
    groups: Set<string>;
    subcats: Map<string, Set<string>>;
  } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Client-side filter: does a place belong to any of the active groups/subcats?
  const placeMatchesFilter = (
    place: { category_group: string | null; category: string | null },
    groups: Set<string>,
    subcats: Map<string, Set<string>>,
  ): boolean => {
    for (const gKey of groups) {
      const group = FILTER_GROUPS.find((g) => g.key === gKey);
      if (!group) continue;
      const groupCats = Array.isArray(group.categoryGroup)
        ? group.categoryGroup
        : [group.categoryGroup];
      if (!groupCats.includes(place.category_group ?? "")) continue;
      // Group matches — check subcats
      const subs = subcats.get(gKey);
      if (!subs || subs.size === 0) return true; // no subcat filter → accept all in group
      if (place.category && subs.has(place.category)) return true;
    }
    return false;
  };

  // Fetch from Supabase and push into the "search-pois" GeoJSON source
  const applyFilter = useCallback(
    async (newGroups: Set<string>, newSubcats: Map<string, Set<string>>) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      const source = map.getSource("search-pois") as GeoJSONSource | undefined;

      if (newGroups.size === 0) {
        activeFilterRef.current = null;
        source?.setData({ type: "FeatureCollection", features: [] });
        setPOILayerVisibility(map, true);
        return;
      }

      activeFilterRef.current = { groups: newGroups, subcats: newSubcats };
      setFetching(true);

      try {
        const mapBounds = map.getBounds();
        const bounds = {
          minLng: mapBounds.getWest(),
          maxLng: mapBounds.getEast(),
          minLat: mapBounds.getSouth(),
          maxLat: mapBounds.getNorth(),
        };
        const center = map.getCenter();

        // Fetch all POIs + landuse in the current viewport, sorted by proximity
        const allInBounds = await fetchPOIsInBounds(
          bounds,
          { lng: center.lng, lat: center.lat },
          500,
        );

        // Guard: filter may have changed while we were fetching
        if (activeFilterRef.current?.groups !== newGroups) return;

        // Client-side category/group filter
        const matched = allInBounds.filter((p) =>
          placeMatchesFilter(
            { category_group: p.category_group, category: p.category },
            newGroups,
            newSubcats,
          ),
        );

        const geojson = placesToGeoJSON(matched);
        source?.setData(geojson);
        setPOILayerVisibility(map, false);
      } catch (err) {
        console.error("MapPOIFilter fetch error:", err);
      } finally {
        setFetching(false);
      }
    },
    [mapRef, mapLoaded],
  );

  // Expose refetch function via ref so parent can trigger it
  useEffect(() => {
    if (refetchRef) {
      refetchRef.current = () => {
        if (activeFilterRef.current) {
          applyFilter(
            activeFilterRef.current.groups,
            activeFilterRef.current.subcats,
          );
        }
      };
    }
    return () => {
      if (refetchRef) refetchRef.current = null;
    };
  }, [applyFilter, refetchRef]);

  // On map moveend: if a filter is active, notify parent so it can show "Search here"
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const onMoveEnd = () => {
      if (activeFilterRef.current) onBoundsChanged?.();
    };
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [mapRef, mapLoaded, onBoundsChanged]);

  const toggleGroup = (gKey: string) => {
    const nextGroups = new Set(activeGroups);
    const nextSubcats = new Map(activeSubcats);
    if (nextGroups.has(gKey)) {
      nextGroups.delete(gKey);
      nextSubcats.delete(gKey);
    } else {
      nextGroups.add(gKey);
    }
    setActiveGroups(nextGroups);
    setActiveSubcats(nextSubcats);
    applyFilter(nextGroups, nextSubcats);
    setOpenDropdown(null);
  };

  const toggleSubcat = (gKey: string, catKey: string) => {
    const nextGroups = new Set(activeGroups);
    nextGroups.add(gKey); // ensure parent group is active

    const nextSubcats = new Map(activeSubcats);
    const existing = new Set(nextSubcats.get(gKey) ?? []);
    if (existing.has(catKey)) {
      existing.delete(catKey);
    } else {
      existing.add(catKey);
    }
    if (existing.size === 0) {
      nextSubcats.delete(gKey);
    } else {
      nextSubcats.set(gKey, existing);
    }

    setActiveGroups(nextGroups);
    setActiveSubcats(nextSubcats);
    applyFilter(nextGroups, nextSubcats);
  };

  const clearAll = () => {
    const emptyGroups = new Set<string>();
    const emptySubcats = new Map<string, Set<string>>();
    setActiveGroups(emptyGroups);
    setActiveSubcats(emptySubcats);
    applyFilter(emptyGroups, emptySubcats);
    setOpenDropdown(null);
  };

  return (
    <div
      className="relative flex items-center gap-1.5 flex-wrap"
      ref={dropdownRef}
    >
      {FILTER_GROUPS.map((group) => {
        const isActive = activeGroups.has(group.key);
        const subcats = activeSubcats.get(group.key);
        const subcatCount = subcats?.size ?? 0;
        const isOpen = openDropdown === group.key;

        return (
          <div key={group.key} className="relative">
            {/* Pill — label area toggles group; chevron opens subcat dropdown */}
            <div
              className={`flex items-center rounded-full text-xs font-semibold shadow-sm border transition-all overflow-hidden ${
                isActive
                  ? "text-white border-transparent shadow-md"
                  : "bg-white/90 text-gray-700 border-gray-200"
              }`}
              style={
                isActive
                  ? { backgroundColor: group.color, borderColor: group.color }
                  : {}
              }
            >
              {/* Label — toggles whole group */}
              <button
                className={`flex items-center gap-1 pl-3 pr-2 py-1.5 transition-colors ${
                  isActive ? "hover:bg-black/10" : "hover:bg-gray-100"
                }`}
                onClick={() => toggleGroup(group.key)}
              >
                <span>{group.label}</span>
                {subcatCount > 0 && (
                  <span className="bg-white/30 rounded-full px-1.5 text-[10px]">
                    {subcatCount}
                  </span>
                )}
              </button>
              {/* Chevron — opens subcategory dropdown */}
              <button
                className={`flex items-center pr-2 py-1.5 pl-0.5 border-l transition-colors ${
                  isActive
                    ? "border-white/20 hover:bg-black/10"
                    : "border-gray-200 hover:bg-gray-100"
                } ${isOpen ? "opacity-100" : "opacity-60"}`}
                onClick={() => setOpenDropdown(isOpen ? null : group.key)}
              >
                <span
                  className="transition-transform duration-150"
                  style={{
                    display: "inline-block",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  ▾
                </span>
              </button>
            </div>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-45">
                {/* Toggle whole group row */}
                <button
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-1 transition-colors ${
                    isActive && subcatCount === 0
                      ? "text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={
                    isActive && subcatCount === 0
                      ? { backgroundColor: group.color }
                      : {}
                  }
                  onClick={() => toggleGroup(group.key)}
                >
                  {/* <span>{group.emoji}</span> */}
                  <span>All {group.label}</span>
                  {isActive && subcatCount === 0 && (
                    <span className="ml-auto">✓</span>
                  )}
                </button>
                <div className="border-t border-gray-100 pt-1 space-y-0.5 max-h-64 overflow-y-auto">
                  {group.subcategories.map((sub) => {
                    const isSub = subcats?.has(sub.key) ?? false;
                    return (
                      <button
                        key={sub.key}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                          isSub
                            ? "font-semibold text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        style={isSub ? { backgroundColor: group.color } : {}}
                        onClick={() => toggleSubcat(group.key, sub.key)}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isSub
                              ? "bg-white/30 border-white/50"
                              : "border-gray-300"
                          }`}
                        >
                          {isSub && (
                            <svg
                              viewBox="0 0 10 10"
                              className="w-2.5 h-2.5"
                              fill="none"
                            >
                              <path
                                d="M1.5 5L4 7.5L8.5 2.5"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Clear all */}
      {activeGroups.size > 0 && (
        <button
          onClick={clearAll}
          className="px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 bg-white/90 transition-colors"
        >
          ✕ Clear
        </button>
      )}

      {/* Loading indicator */}
      {fetching && (
        <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
      )}
    </div>
  );
}
