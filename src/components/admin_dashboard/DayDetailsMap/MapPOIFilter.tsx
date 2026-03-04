"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import { searchPlacesByFilter, placesToGeoJSON } from "@/src/supabase/places";
import { setPOILayerVisibility } from "@/src/map/scripts/poi-layers";
import { FILTER_GROUPS } from "../../filter_category_groups/filter_groups";

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
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [fetching, setFetching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<string, HTMLDivElement>>(new Map());
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
        !dropdownRef.current.contains(e.target as Node) &&
        !dropdownMenuRef.current?.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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
        const center = map.getCenter();

        // Build group/category arrays for the RPC
        const allGroups: string[] = [];
        const allCategories: string[] = [];
        for (const gKey of newGroups) {
          const group = FILTER_GROUPS.find((g) => g.key === gKey);
          if (!group) continue;
          const subs = newSubcats.get(gKey);
          if (subs && subs.size > 0) {
            allCategories.push(...Array.from(subs));
          } else {
            const groupCats = Array.isArray(group.categoryGroup)
              ? group.categoryGroup
              : [group.categoryGroup];
            allGroups.push(...groupCats);
          }
        }

        const matched = await searchPlacesByFilter(
          allGroups,
          allCategories,
          { lat: center.lat, lng: center.lng },
          500,
        );

        // Guard: filter may have changed while fetching
        if (activeFilterRef.current?.groups !== newGroups) return;

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

  const openDropdownPanel = (gKey: string) => {
    if (openDropdown === gKey) {
      setOpenDropdown(null);
      return;
    }
    const el = pillRefs.current.get(gKey);
    if (el) {
      const rect = el.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpenDropdown(gKey);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Scrollable pill strip — overflow-x clips only this strip, not the portaled dropdowns */}
      <div
        className="flex items-center w-120 mt-2 gap-1.5 overflow-x-auto px-3 py-2 backdrop-blur-sm rounded-2xl shadow-md border border-white/60 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTER_GROUPS.map((group) => {
          const isActive = activeGroups.has(group.key);
          const subcats = activeSubcats.get(group.key);
          const subcatCount = subcats?.size ?? 0;
          const isOpen = openDropdown === group.key;

          return (
            <div
              key={group.key}
              className="relative shrink-0"
              ref={(el) => {
                if (el) pillRefs.current.set(group.key, el);
                else pillRefs.current.delete(group.key);
              }}
            >
              {/* Pill */}
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
                {/* Chevron — opens subcategory dropdown via portal */}
                <button
                  className={`flex items-center pr-2 py-1.5 pl-0.5 border-l transition-colors ${
                    isActive
                      ? "border-white/20 hover:bg-black/10"
                      : "border-gray-200 hover:bg-gray-100"
                  } ${isOpen ? "opacity-100" : "opacity-60"}`}
                  onClick={() => openDropdownPanel(group.key)}
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
            </div>
          );
        })}

        {/* Clear all */}
        {activeGroups.size > 0 && (
          <button
            onClick={clearAll}
            className="shrink-0 px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 bg-white/90 transition-colors"
          >
            ✕ Clear
          </button>
        )}

        {/* Loading indicator */}
        {fetching && (
          <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
        )}
      </div>

      {/* Dropdowns rendered as portals so they escape overflow-x-auto clipping */}
      {FILTER_GROUPS.map((group) => {
        if (openDropdown !== group.key || !dropdownPos) return null;
        const isActive = activeGroups.has(group.key);
        const subcats = activeSubcats.get(group.key);
        const subcatCount = subcats?.size ?? 0;

        return typeof document !== "undefined"
          ? createPortal(
              <div
                key={group.key}
                ref={dropdownMenuRef}
                className="fixed z-9999 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-44"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
              >
                {/* Toggle whole group */}
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
              </div>,
              document.body,
            )
          : null;
      })}
    </div>
  );
}
