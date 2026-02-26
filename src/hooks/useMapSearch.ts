import { useState, useCallback, useRef, useEffect } from "react";
import { searchPlaces } from "@/src/supabase/places";
import { getPOIConfig } from "@/src/map/scripts/poi-config";

// -------------------------------------------------
// Types
// -------------------------------------------------

export interface MapSearchResult {
  id: string;
  /** "places" | "landuse_features" | "building_features" */
  place_table: string;
  place_source_id: string;
  name: string;
  category: string | null;
  category_group: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  importance_score: number;
  /** Pre-computed display colour from poi-config */
  color: string;
  icon: string;
}

// -------------------------------------------------
// Hook
// -------------------------------------------------

export function useMapSearch(mapCenter?: { lng: number; lat: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        setLoading(false);
        return;
      }

      const fetchId = ++fetchIdRef.current;
      setLoading(true);

      try {
        const places = await searchPlaces(q.trim(), 40, mapCenter);

        if (fetchId !== fetchIdRef.current) return;

        // Normalise to MapSearchResult
        const merged: MapSearchResult[] = places.map((p) => {
          const cfg = getPOIConfig(p.category ?? null);
          return {
            id: p.id,
            place_table: p.place_table || "places",
            place_source_id: p.place_source_id || p.id,
            name: p.name_default || p.name_en || "",
            category: p.category ?? null,
            category_group: p.category_group ?? null,
            address: p.address ?? null,
            city: p.city ?? null,
            country: p.country ?? null,
            lat: p.lat ?? null,
            lng: p.lng ?? null,
            importance_score: p.popularity_score ?? 0,
            color: cfg.color,
            icon: cfg.icon,
          };
        });

        setResults(merged);
        setIsOpen(merged.length > 0);
      } catch (err) {
        console.error("MapSearch error:", err);
        setResults([]);
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    },
    [mapCenter],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 350);
    },
    [search],
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { query, results, loading, isOpen, handleQueryChange, clear, close };
}
