"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserLocation {
  lat: number;
  lng: number;
  city: string | null;
  country: string | null;
  /** null = still loading, false = failed / blocked */
  resolved: boolean | null;
}

interface LocationState {
  location: UserLocation | null;
  loading: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

// Fallback: San Francisco
const FALLBACK: UserLocation = {
  lat: 37.7749,
  lng: -122.4194,
  city: null,
  country: null,
  resolved: false,
};

// ── Context ───────────────────────────────────────────────────────────────────

const LocationContext = createContext<LocationState>({
  location: null,
  loading: true,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      try {
        // freeipapi.com — no API key required, CORS-safe, returns JSON
        const res = await fetch("https://freeipapi.com/api/json", {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error("ip api failed");
        const json = await res.json();
        if (cancelled) return;

        const lat = Number(json.latitude);
        const lng = Number(json.longitude);
        if (!isFinite(lat) || !isFinite(lng)) throw new Error("invalid coords");

        setState({
          loading: false,
          location: {
            lat,
            lng,
            city: (json.cityName as string) ?? null,
            country: (json.countryName as string) ?? null,
            resolved: true,
          },
        });
      } catch {
        if (!cancelled) {
          setState({ loading: false, location: FALLBACK });
        }
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LocationContext.Provider value={state}>
      {children}
    </LocationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUserLocation(): LocationState {
  return useContext(LocationContext);
}
