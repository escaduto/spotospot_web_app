import { useState, useCallback, useRef, useEffect } from "react";
import { PlacePointResult, searchPlaces } from "../supabase/places";

/**
 * Debounced autocomplete search hook for the places table.
 */
export function usePlacesSearch(mapCenter?: { lng: number; lat: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlacePointResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0); // Track requests to ignore stale responses

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
        const data = await searchPlaces(q.trim(), 100, mapCenter);

        // Only update if this is still the latest request
        if (fetchId === fetchIdRef.current) {
          setResults(data);
          setIsOpen(data.length > 0);
        }
      } catch (error) {
        if (fetchId === fetchIdRef.current) {
          console.error("Search error:", error);
          setResults([]);
        }
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [mapCenter],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Increase debounce to reduce unnecessary queries
      debounceRef.current = setTimeout(() => search(value), 400);
    },
    [search],
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { query, results, loading, isOpen, handleQueryChange, clear, close };
}
