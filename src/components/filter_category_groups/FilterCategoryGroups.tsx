import { useCallback, useRef, useState } from "react";
import { FILTER_GROUPS } from "./filter_groups";
import { GeoJSONSource } from "maplibre-gl";
import { placesToGeoJSON, searchPlacesByFilter } from "@/src/supabase/places";

interface Props {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  selectedDest: {
    bbox: number[] | null;
  } | null;
  SEARCH_POIS_SRC?: string;
}
function FilterCategoryGroups({
  mapRef,
  mapLoaded,
  selectedDest,
  SEARCH_POIS_SRC = "search-pois",
}: Props) {
  // ── Filter state ──────────────────────────────────────────────────────────

  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const activeFilterRef = useRef<Set<string> | null>(null);

  // ── POI filter: toggle a group ────────────────────────────────────────────

  const applyFilter = useCallback(
    async (groups: Set<string>) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      const src = map.getSource(SEARCH_POIS_SRC) as GeoJSONSource | undefined;
      if (!src) return;

      if (groups.size === 0) {
        activeFilterRef.current = null;
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      activeFilterRef.current = groups;
      setFetching(true);

      try {
        const center = map.getCenter();
        const allGroups: string[] = [];
        for (const gKey of groups) {
          const group = FILTER_GROUPS.find((g) => g.key === gKey);
          if (!group) continue;
          const cg = Array.isArray(group.categoryGroup)
            ? group.categoryGroup
            : [group.categoryGroup];
          allGroups.push(...cg);
        }

        const matched = await searchPlacesByFilter(
          allGroups,
          [],
          { lat: center.lat, lng: center.lng },
          300,
        );

        // Scope to destination bbox when available
        const bbox = selectedDest?.bbox;
        const scoped =
          bbox && bbox.length >= 4
            ? matched.filter(
                (p) =>
                  p.lng >= bbox[0] &&
                  p.lat >= bbox[1] &&
                  p.lng <= bbox[2] &&
                  p.lat <= bbox[3],
              )
            : matched;

        if (activeFilterRef.current !== groups) return; // stale
        src.setData(placesToGeoJSON(scoped));
      } catch (err) {
        console.error("CreatePlanMapOverlay filter error:", err);
      } finally {
        setFetching(false);
      }
    },
    [mapRef, mapLoaded, selectedDest, SEARCH_POIS_SRC],
  );

  const toggleFilterGroup = useCallback(
    (gKey: string) => {
      setActiveGroups((prev) => {
        const next = new Set(prev);
        if (next.has(gKey)) next.delete(gKey);
        else next.add(gKey);
        applyFilter(next);
        return next;
      });
    },
    [applyFilter],
  );

  const clearFilter = useCallback(() => {
    setActiveGroups(new Set());
    applyFilter(new Set());
  }, [applyFilter]);

  return (
    <div className="absolute top-14 left-3 z-1 flex items-center gap-1.5 max-w-[calc(100%-24px)] overflow-x-auto [&::-webkit-scrollbar]:hidden">
      <div
        className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-2xl shadow-md border border-white/60 px-2.5 py-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTER_GROUPS.map((group) => {
          const isActive = activeGroups.has(group.key);
          return (
            <button
              key={group.key}
              onClick={() => toggleFilterGroup(group.key)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: group.color,
                      borderColor: group.color,
                    }
                  : {}
              }
            >
              {group.label}
            </button>
          );
        })}

        {activeGroups.size > 0 && (
          <button
            onClick={clearFilter}
            className="shrink-0 px-2.5 py-1 rounded-full text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 bg-white transition-colors"
          >
            ✕ Clear
          </button>
        )}

        {fetching && (
          <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 border-t-teal-600 animate-spin" />
        )}
      </div>
    </div>
  );
}

export default FilterCategoryGroups;
